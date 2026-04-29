import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { getServiceClient } from '../lib/db'
import { aggregateEvents } from '../lib/cron'
import type { Env, EventPayload } from '../types'

const events = new Hono<{ Bindings: Env }>()

events.post('/', async (c) => {
  const body = await c.req.json<EventPayload>().catch(() => null)
  if (!body?.siteId || !body.session || !body.events?.length) {
    throw new HTTPException(400, { message: 'siteId, session, and non-empty events are required' })
  }

  const rows = body.events.map((ev) => ({
    site_id: body.siteId,
    test_id: ev.testId,
    variant_id: ev.variantId,
    goal_id: ev.goalId ?? null,
    event_type: ev.type,
    uid: body.session.uid,
    url: body.session.url,
    ref: body.session.ref ?? null,
    ts: ev.ts
  }))

  const db = getServiceClient(c.env)
  const { error } = await db.from('events').insert(rows)
  if (error) throw new HTTPException(500, { message: error.message })

  await aggregateEvents(db)

  return new Response(null, { status: 204 })
})

export default events
