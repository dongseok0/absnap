import { Hono } from 'hono'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import auth from '../../src/routes/auth'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

const env = {
  SUPABASE_URL: 'https://test.supabase.co',
  SUPABASE_ANON_KEY: 'anon',
  SUPABASE_SERVICE_ROLE_KEY: 'service',
  AUTH_REDIRECT_URL: 'https://api.example.com/auth/confirmed'
}

function makeApp() {
  const app = new Hono()
  app.route('/auth', auth)
  return app
}

describe('auth routes', () => {
  beforeEach(() => mockFetch.mockReset())

  it('passes the configured confirmation redirect URL to Supabase signup', async () => {
    mockFetch.mockResolvedValue(new Response(JSON.stringify({
      id: 'user_1',
      email: 'a@example.com'
    }), { status: 200 }))

    const res = await makeApp().request('/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'a@example.com', password: 'password' })
    }, env)

    expect(res.status).toBe(200)
    expect(mockFetch).toHaveBeenCalledWith(
      'https://test.supabase.co/auth/v1/signup?redirect_to=https%3A%2F%2Fapi.example.com%2Fauth%2Fconfirmed',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ email: 'a@example.com', password: 'password' })
      })
    )
  })

  it('renders the email confirmation landing page', async () => {
    const res = await makeApp().request('/auth/confirmed', {}, env)
    expect(res.status).toBe(200)
    await expect(res.text()).resolves.toContain('이메일 확인이 완료되었습니다')
  })

  it('refreshes Supabase access tokens with a refresh token', async () => {
    mockFetch.mockResolvedValue(new Response(JSON.stringify({
      access_token: 'new-access',
      refresh_token: 'new-refresh',
      user: { id: 'user_1', email: 'a@example.com' }
    }), { status: 200 }))

    const res = await makeApp().request('/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: 'old-refresh' })
    }, env)

    expect(res.status).toBe(200)
    expect(mockFetch).toHaveBeenCalledWith(
      'https://test.supabase.co/auth/v1/token?grant_type=refresh_token',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ refresh_token: 'old-refresh' })
      })
    )
    await expect(res.json()).resolves.toMatchObject({ access_token: 'new-access' })
  })
})
