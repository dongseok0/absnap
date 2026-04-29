import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { HTTPException } from 'hono/http-exception'
import publicRoutes from './routes/public'
import authRoutes from './routes/auth'
import sitesRoutes from './routes/sites'
import testsRoutes from './routes/tests'
import eventsRoutes from './routes/events'
import resultsRoutes from './routes/results'
import { getServiceClient } from './lib/db'
import { aggregateEvents } from './lib/cron'
import type { Env } from './types'

const app = new Hono<{ Bindings: Env }>()

app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Authorization', 'Content-Type'],
  maxAge: 86400
}))

app.route('/', publicRoutes)
app.route('/auth', authRoutes)
app.route('/sites', sitesRoutes)
app.route('/tests', testsRoutes)
app.route('/events', eventsRoutes)
app.route('/results', resultsRoutes)

app.onError((err, c) => {
  if (err instanceof HTTPException) return err.getResponse()
  console.error(err)
  return c.json({ error: 'Internal server error' }, 500)
})

export default {
  fetch: app.fetch,
  async scheduled(_event: ScheduledEvent, env: Env, _ctx: ExecutionContext) {
    const db = getServiceClient(env)
    await aggregateEvents(db)
  }
}
