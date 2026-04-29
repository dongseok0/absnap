import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'
import testsRoutes from '../../src/routes/tests'

const mockSupabase = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  single: vi.fn(),
  order: vi.fn().mockReturnThis(),
}

vi.mock('../../src/lib/db', () => ({
  getUserClient: vi.fn(() => mockSupabase),
  getServiceClient: vi.fn(() => mockSupabase),
}))

vi.mock('../../src/lib/middleware', () => ({
  requireAuth: vi.fn(async (c: any, next: any) => {
    c.set('userId', 'user-abc')
    c.set('token', 'fake-token')
    await next()
  })
}))

vi.mock('../../src/lib/r2', () => ({
  writeConfig: vi.fn().mockResolvedValue(undefined)
}))

const env = {
  SUPABASE_URL: 'https://test.supabase.co',
  SUPABASE_ANON_KEY: 'anon',
  SUPABASE_SERVICE_ROLE_KEY: 'service',
  CONFIG_BUCKET: {} as R2Bucket
}

function makeApp() {
  const app = new Hono<{ Bindings: typeof env }>()
  app.route('/tests', testsRoutes)
  return app
}

const sampleTest = {
  id: 'test_001',
  site_id: 'site_abc',
  name: 'Pricing headline test',
  status: 'paused',
  url_pattern: '/pricing*',
  traffic_percent: 100,
  variants: [
    { id: 'control', weight: 50 },
    { id: 'variant_a', weight: 50, mutations: [{ selector: 'h1', type: 'text', value: 'New Headline' }] }
  ],
  goals: [{ id: 'goal_cta', type: 'click', selector: '.cta-button' }],
  created_at: '2026-04-22T00:00:00Z'
}

describe('POST /tests', () => {
  beforeEach(() => vi.clearAllMocks())

  it('creates a test and returns 201', async () => {
    mockSupabase.single.mockResolvedValueOnce({ data: sampleTest, error: null })

    const res = await makeApp().request('/tests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer token' },
      body: JSON.stringify({
        siteId: 'site_abc',
        name: 'Pricing headline test',
        urlPattern: '/pricing*',
        variants: sampleTest.variants,
        goals: sampleTest.goals
      })
    }, env)

    expect(res.status).toBe(201)
  })

  it('returns 400 when siteId is missing', async () => {
    const res = await makeApp().request('/tests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer token' },
      body: JSON.stringify({ name: 'Test', urlPattern: '/*' })
    }, env)
    expect(res.status).toBe(400)
  })
})

describe('PATCH /tests/:testId', () => {
  it('updates test status to running', async () => {
    const updated = { ...sampleTest, status: 'running', started_at: '2026-04-22T01:00:00Z' }
    mockSupabase.single.mockResolvedValueOnce({ data: updated, error: null })

    const res = await makeApp().request('/tests/test_001', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer token' },
      body: JSON.stringify({ status: 'running' })
    }, env)

    expect(res.status).toBe(200)
    const body = await res.json<{ status: string }>()
    expect(body.status).toBe('running')
  })
})

describe('POST /tests/:testId/publish', () => {
  it('publishes config to R2 and returns 200', async () => {
    mockSupabase.single
      .mockResolvedValueOnce({ data: { ...sampleTest, status: 'running' }, error: null })
      .mockResolvedValueOnce({ data: { domain: 'example.com' }, error: null })
    mockSupabase.order.mockResolvedValueOnce({ data: [{ ...sampleTest, status: 'running' }], error: null })

    const { writeConfig } = await import('../../src/lib/r2')

    const res = await makeApp().request('/tests/test_001/publish', {
      method: 'POST',
      headers: { Authorization: 'Bearer token' }
    }, env)

    expect(res.status).toBe(200)
    expect(writeConfig).toHaveBeenCalledWith(env, 'site_abc', expect.objectContaining({ siteId: 'site_abc' }))
  })
})
