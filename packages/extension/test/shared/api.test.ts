import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ApiError, createApiClient } from '../../src/shared/api'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

const BASE = 'https://api.absnap.com'
const TOKEN = 'test-jwt-token'

describe('createApiClient', () => {
  beforeEach(() => mockFetch.mockReset())

  it('sends Authorization header on authenticated requests', async () => {
    mockFetch.mockResolvedValue(new Response(JSON.stringify([]), { status: 200 }))
    const client = createApiClient(BASE, TOKEN)
    await client.getSites()
    const [, options] = mockFetch.mock.calls[0]
    expect(options.headers['Authorization']).toBe(`Bearer ${TOKEN}`)
  })

  it('getSites returns array', async () => {
    const sites = [{ id: 'site_abc', name: 'My Site', domain: 'example.com' }]
    mockFetch.mockResolvedValue(new Response(JSON.stringify(sites), { status: 200 }))
    const result = await createApiClient(BASE, TOKEN).getSites()
    expect(result).toEqual(sites)
  })

  it('createTest sends POST with body', async () => {
    const newTest = { id: 'test_001', name: 'Test', siteId: 'site_abc' }
    mockFetch.mockResolvedValue(new Response(JSON.stringify(newTest), { status: 201 }))
    const client = createApiClient(BASE, TOKEN)
    await client.createTest({ siteId: 'site_abc', name: 'Test', urlPattern: '/*', variants: [], goals: [] })
    const [url, options] = mockFetch.mock.calls[0]
    expect(url).toBe(`${BASE}/tests`)
    expect(options.method).toBe('POST')
  })

  it('refresh sends refresh token without Authorization header', async () => {
    mockFetch.mockResolvedValue(new Response(JSON.stringify({
      access_token: 'new-token',
      refresh_token: 'new-refresh',
      user: { id: 'user_1', email: 'a@example.com' }
    }), { status: 200 }))

    await createApiClient(BASE, TOKEN).refresh('old-refresh')

    const [url, options] = mockFetch.mock.calls[0]
    expect(url).toBe(`${BASE}/auth/refresh`)
    expect(options.method).toBe('POST')
    expect(options.headers).toEqual({ 'Content-Type': 'application/json' })
    expect(JSON.parse(options.body as string)).toEqual({ refresh_token: 'old-refresh' })
  })

  it('throws on non-2xx responses', async () => {
    mockFetch.mockResolvedValue(new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }))
    await expect(createApiClient(BASE, TOKEN).getSites()).rejects.toMatchObject({
      status: 401,
      message: 'Unauthorized'
    })
  })

  it('uses Supabase msg field for error messages', async () => {
    mockFetch.mockResolvedValue(new Response(JSON.stringify({
      error_code: 'over_email_send_rate_limit',
      msg: 'email rate limit exceeded'
    }), { status: 429 }))

    await expect(createApiClient(BASE, TOKEN).signup('a@example.com', 'password')).rejects.toMatchObject({
      status: 429,
      message: 'email rate limit exceeded'
    })
  })

  it('throws ApiError with status when the response body is not JSON', async () => {
    mockFetch.mockResolvedValue(new Response('Unauthorized', { status: 401, statusText: 'Unauthorized' }))

    await expect(createApiClient(BASE, TOKEN).getSites()).rejects.toBeInstanceOf(ApiError)
    await expect(createApiClient(BASE, TOKEN).getSites()).rejects.toMatchObject({
      status: 401,
      message: 'Unauthorized'
    })
  })
})
