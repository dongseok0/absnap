import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'
import eventsRoutes from '../../src/routes/events'

const { mockInsert, mockAggregateEvents } = vi.hoisted(() => ({
  mockInsert: vi.fn().mockResolvedValue({ error: null }),
  mockAggregateEvents: vi.fn().mockResolvedValue(undefined)
}))
vi.mock('../../src/lib/db', () => ({
  getServiceClient: vi.fn(() => ({
    from: vi.fn().mockReturnValue({ insert: mockInsert })
  }))
}))
vi.mock('../../src/lib/cron', () => ({
  aggregateEvents: mockAggregateEvents
}))

const env = {
  SUPABASE_URL: 'https://test.supabase.co',
  SUPABASE_ANON_KEY: 'anon',
  SUPABASE_SERVICE_ROLE_KEY: 'service',
  CONFIG_BUCKET: {} as R2Bucket
}

function makeApp() {
  const app = new Hono<{ Bindings: typeof env }>()
  app.route('/events', eventsRoutes)
  return app
}

const validPayload = {
  siteId: 'site_abc',
  session: { uid: 'anon-user-123', url: 'https://example.com/pricing', ts: 1714000000000 },
  events: [
    { testId: 'test_001', variantId: 'control', goalId: null, type: 'impression', ts: 1714000000000 },
    { testId: 'test_001', variantId: 'control', goalId: 'goal_signup', type: 'conversion', ts: 1714000001000 }
  ]
}

describe('POST /events', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 204 for valid event batch', async () => {
    const res = await makeApp().request('/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validPayload)
    }, env)
    expect(res.status).toBe(204)
  })

  it('returns 400 for missing siteId', async () => {
    const { siteId: _, ...noSiteId } = validPayload
    const res = await makeApp().request('/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(noSiteId)
    }, env)
    expect(res.status).toBe(400)
  })

  it('returns 400 for empty events array', async () => {
    const res = await makeApp().request('/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...validPayload, events: [] })
    }, env)
    expect(res.status).toBe(400)
  })

  it('inserts all events with session data flattened', async () => {
    await makeApp().request('/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validPayload)
    }, env)

    expect(mockInsert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          site_id: 'site_abc',
          test_id: 'test_001',
          variant_id: 'control',
          event_type: 'impression',
          uid: 'anon-user-123'
        })
      ])
    )
  })

  it('refreshes aggregate results after events are inserted', async () => {
    await makeApp().request('/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validPayload)
    }, env)

    expect(mockAggregateEvents).toHaveBeenCalledTimes(1)
  })

  it('returns 500 when aggregate refresh fails', async () => {
    mockAggregateEvents.mockRejectedValueOnce(new Error('aggregate failed'))

    const res = await makeApp().request('/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validPayload)
    }, env)

    expect(res.status).toBe(500)
  })
})
