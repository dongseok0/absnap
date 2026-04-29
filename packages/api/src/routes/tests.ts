import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { requireAuth } from '../lib/middleware'
import { getUserClient } from '../lib/db'
import { writeConfig } from '../lib/r2'
import type { Env, ConfigJson } from '../types'

type Variables = { userId: string; token: string }
const tests = new Hono<{ Bindings: Env; Variables: Variables }>()

tests.use('*', requireAuth)

tests.post('/', async (c) => {
  const body = await c.req.json<{
    siteId?: string; name?: string; urlPattern?: string
    trafficPercent?: number; variants?: unknown[]; goals?: unknown[]
  }>()
  if (!body.siteId || !body.name || !body.urlPattern) {
    throw new HTTPException(400, { message: 'siteId, name, and urlPattern are required' })
  }

  const db = getUserClient(c.env, c.get('token'))
  const { data, error } = await db
    .from('tests')
    .insert({
      site_id: body.siteId,
      name: body.name,
      url_pattern: body.urlPattern,
      traffic_percent: body.trafficPercent ?? 100,
      variants: body.variants ?? [],
      goals: body.goals ?? []
    })
    .select()
    .single()

  if (error) throw new HTTPException(500, { message: error.message })
  return c.json(data, 201)
})

tests.get('/', async (c) => {
  const siteId = c.req.query('siteId')
  if (!siteId) throw new HTTPException(400, { message: 'siteId query param required' })

  const db = getUserClient(c.env, c.get('token'))
  const { data, error } = await db
    .from('tests')
    .select('*')
    .eq('site_id', siteId)
    .order('created_at', { ascending: false })

  if (error) throw new HTTPException(500, { message: error.message })
  return c.json(data)
})

tests.get('/:testId', async (c) => {
  const db = getUserClient(c.env, c.get('token'))
  const { data, error } = await db
    .from('tests')
    .select('*')
    .eq('id', c.req.param('testId'))
    .single()

  if (error || !data) throw new HTTPException(404, { message: 'Test not found' })
  return c.json(data)
})

tests.patch('/:testId', async (c) => {
  const body = await c.req.json<{ status?: string; name?: string; trafficPercent?: number; variants?: unknown[]; goals?: unknown[] }>()

  const updates: Record<string, unknown> = {}
  if (body.name !== undefined) updates.name = body.name
  if (body.trafficPercent !== undefined) updates.traffic_percent = body.trafficPercent
  if (body.variants !== undefined) updates.variants = body.variants
  if (body.goals !== undefined) updates.goals = body.goals
  if (body.status !== undefined) {
    updates.status = body.status
    if (body.status === 'running') updates.started_at = new Date().toISOString()
    if (body.status === 'completed') updates.completed_at = new Date().toISOString()
  }

  const db = getUserClient(c.env, c.get('token'))
  const { data, error } = await db
    .from('tests')
    .update(updates)
    .eq('id', c.req.param('testId'))
    .select()
    .single()

  if (error || !data) throw new HTTPException(404, { message: 'Test not found' })
  return c.json(data)
})

tests.delete('/:testId', async (c) => {
  const db = getUserClient(c.env, c.get('token'))
  const { error } = await db.from('tests').delete().eq('id', c.req.param('testId'))
  if (error) throw new HTTPException(500, { message: error.message })
  return new Response(null, { status: 204 })
})

tests.post('/:testId/publish', async (c) => {
  const db = getUserClient(c.env, c.get('token'))

  const { data: test, error: testErr } = await db
    .from('tests')
    .select('*')
    .eq('id', c.req.param('testId'))
    .single()
  if (testErr || !test) throw new HTTPException(404, { message: 'Test not found' })

  const { data: allTests, error: allErr } = await db
    .from('tests')
    .select('*')
    .eq('site_id', test.site_id)
    .eq('status', 'running')
    .order('created_at')
  if (allErr) throw new HTTPException(500, { message: allErr.message })

  const config: ConfigJson = {
    siteId: test.site_id,
    tests: (allTests ?? []).map((t) => ({
      id: t.id,
      status: t.status,
      urlPattern: t.url_pattern,
      trafficPercent: t.traffic_percent,
      variants: t.variants,
      goals: t.goals,
      createdAt: t.created_at,
      startedAt: t.started_at
    }))
  }

  await writeConfig(c.env, test.site_id, config)
  return c.json({ published: true, siteId: test.site_id, testCount: config.tests.length })
})

export default tests
