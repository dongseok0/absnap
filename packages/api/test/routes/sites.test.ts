import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'
import sitesRoutes from '../../src/routes/sites'

const mockSupabase = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  single: vi.fn(),
  order: vi.fn().mockReturnThis(),
}

vi.mock('../../src/lib/db', () => ({
  getUserClient: vi.fn(() => mockSupabase)
}))

vi.mock('../../src/lib/middleware', () => ({
  requireAuth: vi.fn(async (c: any, next: any) => {
    c.set('userId', 'user-abc')
    c.set('token', 'fake-token')
    await next()
  })
}))

const env = {
  SUPABASE_URL: 'https://test.supabase.co',
  SUPABASE_ANON_KEY: 'anon',
  SUPABASE_SERVICE_ROLE_KEY: 'service',
  CONFIG_BUCKET: {} as R2Bucket
}

function makeApp() {
  const app = new Hono<{ Bindings: typeof env }>()
  app.route('/sites', sitesRoutes)
  return app
}

describe('POST /sites', () => {
  beforeEach(() => vi.clearAllMocks())

  it('creates a site and returns 201', async () => {
    const newSite = { id: 'site_abc', name: 'My Site', domain: 'example.com', user_id: 'user-abc', created_at: '2026-04-22T00:00:00Z' }
    mockSupabase.single.mockResolvedValueOnce({ data: newSite, error: null })

    const res = await makeApp().request('/sites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer token' },
      body: JSON.stringify({ name: 'My Site', domain: 'example.com' })
    }, env)

    expect(res.status).toBe(201)
    const body = await res.json<{ id: string }>()
    expect(body.id).toBe('site_abc')
  })

  it('returns 400 for missing name', async () => {
    const res = await makeApp().request('/sites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer token' },
      body: JSON.stringify({ domain: 'example.com' })
    }, env)
    expect(res.status).toBe(400)
  })
})

describe('GET /sites', () => {
  it('returns list of sites', async () => {
    const sites = [{ id: 'site_abc', name: 'My Site', domain: 'example.com' }]
    mockSupabase.order.mockResolvedValueOnce({ data: sites, error: null })

    const res = await makeApp().request('/sites', {
      headers: { Authorization: 'Bearer token' }
    }, env)

    expect(res.status).toBe(200)
    const body = await res.json<typeof sites>()
    expect(body).toHaveLength(1)
  })
})
