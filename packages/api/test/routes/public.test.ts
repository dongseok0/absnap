import { Hono } from 'hono'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import publicRoutes from '../../src/routes/public'

const mockConfigBucket = {
  get: vi.fn()
}

const env = {
  SUPABASE_URL: 'https://test.supabase.co',
  SUPABASE_ANON_KEY: 'anon',
  SUPABASE_SERVICE_ROLE_KEY: 'service',
  CONFIG_BUCKET: mockConfigBucket as unknown as R2Bucket,
  ENVIRONMENT: 'test'
}

function makeApp() {
  const app = new Hono<{ Bindings: typeof env }>()
  app.route('/', publicRoutes)
  return app
}

describe('public routes', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders the privacy policy page', async () => {
    const res = await makeApp().request('/privacy', {}, env)

    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/html')
    const html = await res.text()
    expect(html).toContain('ABSnap Privacy Policy')
    expect(html).toContain('What ABSnap Does')
    expect(html).toContain('Data Collected by the Chrome Extension')
    expect(html).toContain('What the Extension Does Not Collect')
    expect(html).toContain('Data Collected by ab.js')
    expect(html).toContain('How Data Is Used')
    expect(html).toContain('Storage and Retention')
    expect(html).toContain('Extension Permissions')
    expect(html).toContain('Data Deletion')
    expect(html).toContain('Contact')
  })

  it('serves ab.js from the config bucket', async () => {
    mockConfigBucket.get.mockResolvedValueOnce({
      body: new Response('console.log("absnap");').body
    })

    const res = await makeApp().request('/ab.js', {}, env)

    expect(mockConfigBucket.get).toHaveBeenCalledWith('ab.js')
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('application/javascript; charset=utf-8')
    expect(res.headers.get('cache-control')).toBe('public, max-age=300')
    await expect(res.text()).resolves.toBe('console.log("absnap");')
  })

  it('returns 404 when ab.js is missing from the config bucket', async () => {
    mockConfigBucket.get.mockResolvedValueOnce(null)

    const res = await makeApp().request('/ab.js', {}, env)

    expect(mockConfigBucket.get).toHaveBeenCalledWith('ab.js')
    expect(res.status).toBe(404)
    await expect(res.text()).resolves.toBe('ab.js not found')
  })

  it('returns 404 when ab.js has no body', async () => {
    mockConfigBucket.get.mockResolvedValueOnce({})

    const res = await makeApp().request('/ab.js', {}, env)

    expect(mockConfigBucket.get).toHaveBeenCalledWith('ab.js')
    expect(res.status).toBe(404)
    await expect(res.text()).resolves.toBe('ab.js not found')
  })
})
