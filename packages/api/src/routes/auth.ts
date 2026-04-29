import { Hono } from 'hono'
import type { Env } from '../types'

const auth = new Hono<{ Bindings: Env }>()

auth.post('/signup', async (c) => {
  const body = await c.req.json()
  const redirectUrl = c.env.AUTH_REDIRECT_URL ?? new URL('/auth/confirmed', c.req.url).toString()
  const signupUrl = new URL('/auth/v1/signup', c.env.SUPABASE_URL)
  signupUrl.searchParams.set('redirect_to', redirectUrl)

  const res = await fetch(signupUrl.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: c.env.SUPABASE_ANON_KEY },
    body: JSON.stringify(body)
  })
  const data = await res.json()
  return c.json(data, res.status as 200)
})

auth.post('/login', async (c) => {
  const body = await c.req.json()
  const res = await fetch(`${c.env.SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: c.env.SUPABASE_ANON_KEY },
    body: JSON.stringify(body)
  })
  const data = await res.json()
  return c.json(data, res.status as 200)
})

auth.post('/refresh', async (c) => {
  const body = await c.req.json()
  const res = await fetch(`${c.env.SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: c.env.SUPABASE_ANON_KEY },
    body: JSON.stringify({ refresh_token: body.refresh_token })
  })
  const data = await res.json()
  return c.json(data, res.status as 200)
})

auth.get('/confirmed', (c) => {
  return c.html(`<!doctype html>
<html lang="ko">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>ABSnap 이메일 확인 완료</title>
    <style>
      body { margin: 0; font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #f8fafc; color: #0f172a; }
      main { min-height: 100vh; display: grid; place-items: center; padding: 24px; }
      section { max-width: 420px; background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 28px; box-shadow: 0 12px 30px rgba(15, 23, 42, 0.08); }
      h1 { margin: 0 0 10px; font-size: 22px; }
      p { margin: 0; color: #475569; line-height: 1.6; }
    </style>
  </head>
  <body>
    <main>
      <section>
        <h1>이메일 확인이 완료되었습니다</h1>
        <p>Chrome 확장 프로그램으로 돌아가 로그인해주세요.</p>
      </section>
    </main>
  </body>
</html>`)
})

export default auth
