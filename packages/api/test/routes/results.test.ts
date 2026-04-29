import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'
import resultsRoutes from '../../src/routes/results'
import type { TestResult } from '../../src/types'

const sampleTest = {
  id: 'test_001', status: 'running', site_id: 'site_abc',
  url_pattern: '/pricing',
  variants: [{ id: 'control', weight: 50 }, { id: 'variant_a', weight: 50 }],
  goals: [{ id: 'goal_signup', type: 'click', selector: '.cta' }],
  created_at: '2026-04-01T00:00:00Z', started_at: '2026-04-01T12:00:00Z'
}

const sampleResults = [
  { test_id: 'test_001', variant_id: 'control', goal_id: '__impression__', impressions: 1234, conversions: 1234 },
  { test_id: 'test_001', variant_id: 'variant_a', goal_id: '__impression__', impressions: 1201, conversions: 1201 },
  { test_id: 'test_001', variant_id: 'control', goal_id: 'goal_signup', impressions: 1234, conversions: 39 },
  { test_id: 'test_001', variant_id: 'variant_a', goal_id: 'goal_signup', impressions: 1201, conversions: 49 },
]

const mockDb = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  single: vi.fn(),
  order: vi.fn().mockReturnThis(),
}

vi.mock('../../src/lib/db', () => ({
  getUserClient: vi.fn(() => mockDb)
}))

vi.mock('../../src/lib/middleware', () => ({
  requireAuth: vi.fn(async (c: any, next: any) => { c.set('userId', 'user-abc'); c.set('token', 'token'); await next() })
}))

const env = { SUPABASE_URL: 'https://test.supabase.co', SUPABASE_ANON_KEY: 'anon', SUPABASE_SERVICE_ROLE_KEY: 'service', CONFIG_BUCKET: {} as R2Bucket }

function makeApp() {
  const app = new Hono<{ Bindings: typeof env }>()
  app.route('/results', resultsRoutes)
  return app
}

describe('GET /results/:testId', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns shaped result with z-test analysis', async () => {
    mockDb.single.mockResolvedValueOnce({ data: sampleTest, error: null })
    mockDb.order.mockResolvedValueOnce({ data: sampleResults, error: null })

    const res = await makeApp().request('/results/test_001', { headers: { Authorization: 'Bearer token' } }, env)
    expect(res.status).toBe(200)

    const body = await res.json<TestResult>()
    expect(body.testId).toBe('test_001')
    expect(body.variants).toHaveLength(2)
    expect(body.analysis.goal_signup).toBeDefined()
    expect(body.analysis.goal_signup.lift).toBeGreaterThan(0)
  })

  it('returns 404 for non-existent test', async () => {
    mockDb.single.mockResolvedValueOnce({ data: null, error: { message: 'not found' } })
    const res = await makeApp().request('/results/nonexistent', { headers: { Authorization: 'Bearer token' } }, env)
    expect(res.status).toBe(404)
  })
})
