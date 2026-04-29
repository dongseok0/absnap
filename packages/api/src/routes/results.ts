import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { requireAuth } from '../lib/middleware'
import { getUserClient } from '../lib/db'
import { calculateZTest, calculateSampleSize, formatDuration } from '../lib/stats'
import type { Env, TestResult, VariantResult, GoalAnalysis } from '../types'

type Variables = { userId: string; token: string }
const results = new Hono<{ Bindings: Env; Variables: Variables }>()

results.use('*', requireAuth)

results.get('/:testId', async (c) => {
  const db = getUserClient(c.env, c.get('token'))
  const testId = c.req.param('testId')

  const { data: test, error: testErr } = await db.from('tests').select('*').eq('id', testId).single()
  if (testErr || !test) throw new HTTPException(404, { message: 'Test not found' })

  const { data: rows } = await db.from('results').select('*').eq('test_id', testId).order('variant_id')
  const resultRows = rows ?? []

  const impressionMap: Record<string, number> = {}
  const conversionMap: Record<string, Record<string, number>> = {}

  for (const row of resultRows) {
    if (row.goal_id === '__impression__') {
      impressionMap[row.variant_id] = row.impressions
    } else {
      if (!conversionMap[row.variant_id]) conversionMap[row.variant_id] = {}
      conversionMap[row.variant_id][row.goal_id] = row.conversions
    }
  }

  const variantResults: VariantResult[] = test.variants.map((v: { id: string }) => {
    const impressions = impressionMap[v.id] ?? 0
    const conversions = conversionMap[v.id] ?? {}
    const conversionRate: Record<string, number> = {}
    for (const [goalId, count] of Object.entries(conversions)) {
      conversionRate[goalId] = impressions > 0 ? (count as number) / impressions : 0
    }
    return { id: v.id, impressions, conversions, conversionRate }
  })

  const control = variantResults.find((v) => v.id === 'control') ?? variantResults[0]
  const analysis: Record<string, GoalAnalysis> = {}

  for (const goal of test.goals as Array<{ id: string }>) {
    const goalId = goal.id
    const controlConversions = (control.conversions[goalId] as number) ?? 0
    const controlImpressions = control.impressions

    for (const variant of variantResults) {
      if (variant.id === control.id) continue
      const variantConversions = (variant.conversions[goalId] as number) ?? 0
      const stats = calculateZTest(controlImpressions, controlConversions, variant.impressions, variantConversions)
      const recommendedSampleSize = calculateSampleSize(0.03, 0.2)
      const dailyRate = controlImpressions > 0 && test.started_at
        ? controlImpressions / ((Date.now() - new Date(test.started_at).getTime()) / 86400000)
        : null
      const estimatedDaysRemaining = dailyRate && dailyRate > 0
        ? Math.ceil((recommendedSampleSize - variant.impressions) / dailyRate)
        : null

      analysis[goalId] = { ...stats, recommendedSampleSize, estimatedDaysRemaining }
    }
  }

  const duration = test.started_at
    ? formatDuration(Date.now() - new Date(test.started_at).getTime())
    : '0h 0m'

  const result: TestResult = { testId: test.id, status: test.status, duration, variants: variantResults, analysis }
  return c.json(result)
})

export default results
