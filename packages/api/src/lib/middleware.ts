import { createMiddleware } from 'hono/factory'
import { HTTPException } from 'hono/http-exception'
import type { Env } from '../types'

export const requireAuth = createMiddleware<{ Bindings: Env; Variables: { userId: string; token: string } }>(
  async (c, next) => {
    const authHeader = c.req.header('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      throw new HTTPException(401, { message: 'Missing authorization header' })
    }

    const token = authHeader.slice(7)

    const res = await fetch(`${c.env.SUPABASE_URL}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: c.env.SUPABASE_ANON_KEY
      }
    })

    if (!res.ok) {
      throw new HTTPException(401, { message: 'Invalid or expired token' })
    }

    const user = await res.json<{ id: string }>()
    c.set('userId', user.id)
    c.set('token', token)
    await next()
  }
)
