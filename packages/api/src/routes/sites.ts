import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { requireAuth } from '../lib/middleware'
import { getUserClient } from '../lib/db'
import type { Env } from '../types'

type Variables = { userId: string; token: string }
const sites = new Hono<{ Bindings: Env; Variables: Variables }>()

sites.use('*', requireAuth)

sites.post('/', async (c) => {
  const body = await c.req.json<{ name?: string; domain?: string }>()
  if (!body.name || !body.domain) throw new HTTPException(400, { message: 'name and domain are required' })

  const db = getUserClient(c.env, c.get('token'))
  const { data, error } = await db
    .from('sites')
    .insert({ name: body.name, domain: body.domain, user_id: c.get('userId') })
    .select()
    .single()

  if (error) throw new HTTPException(500, { message: error.message })
  return c.json(data, 201)
})

sites.get('/', async (c) => {
  const db = getUserClient(c.env, c.get('token'))
  const { data, error } = await db
    .from('sites')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw new HTTPException(500, { message: error.message })
  return c.json(data)
})

sites.delete('/:siteId', async (c) => {
  const db = getUserClient(c.env, c.get('token'))
  const { error } = await db
    .from('sites')
    .delete()
    .eq('id', c.req.param('siteId'))

  if (error) throw new HTTPException(500, { message: error.message })
  return new Response(null, { status: 204 })
})

export default sites
