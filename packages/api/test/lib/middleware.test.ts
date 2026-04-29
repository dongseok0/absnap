import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'
import { requireAuth } from '../../src/lib/middleware'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

function makeApp() {
  const app = new Hono<{ Bindings: { SUPABASE_URL: string; SUPABASE_ANON_KEY: string }; Variables: { userId: string; token: string } }>()
  app.use('/protected', requireAuth)
  app.get('/protected', (c) => c.json({ userId: c.get('userId') }))
  return app
}

const env = { SUPABASE_URL: 'https://test.supabase.co', SUPABASE_ANON_KEY: 'anon-key' }

describe('requireAuth', () => {
  beforeEach(() => mockFetch.mockReset())

  it('rejects requests without Authorization header', async () => {
    const res = await makeApp().request('/protected', {}, env)
    expect(res.status).toBe(401)
  })

  it('rejects requests with invalid token', async () => {
    mockFetch.mockResolvedValueOnce(new Response('', { status: 401 }))
    const res = await makeApp().request('/protected', { headers: { Authorization: 'Bearer bad-token' } }, env)
    expect(res.status).toBe(401)
  })

  it('allows requests with valid token and sets userId', async () => {
    mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({ id: 'user-123' }), { status: 200 }))
    const res = await makeApp().request('/protected', { headers: { Authorization: 'Bearer good-token' } }, env)
    expect(res.status).toBe(200)
    const body = await res.json<{ userId: string }>()
    expect(body.userId).toBe('user-123')
  })
})
