import type { SupabaseClient } from '@supabase/supabase-js'

export async function aggregateEvents(db: SupabaseClient): Promise<void> {
  const cutoff = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()

  const { data: events, error } = await db
    .from('events')
    .select('test_id, variant_id, goal_id, event_type')
    .gte('created_at', cutoff)

  if (error) throw new Error(error.message)
  if (!events?.length) return

  const counts: Record<string, { impressions: number; conversions: number }> = {}

  for (const ev of events) {
    const key = `${ev.test_id}|${ev.variant_id}|${ev.goal_id ?? '__impression__'}`
    if (!counts[key]) counts[key] = { impressions: 0, conversions: 0 }
    if (ev.event_type === 'impression') counts[key].impressions++
    if (ev.event_type === 'conversion') counts[key].conversions++
  }

  const upserts = Object.entries(counts).map(([key, c]) => {
    const [testId, variantId, goalId] = key.split('|')
    return { test_id: testId, variant_id: variantId, goal_id: goalId, ...c, updated_at: new Date().toISOString() }
  })

  const testIds = Array.from(new Set(upserts.map((row) => row.test_id)))
  const { data: existingTests, error: testsError } = await db
    .from('tests')
    .select('id')
    .in('id', testIds)

  if (testsError) throw new Error(testsError.message)

  const existingTestIds = new Set((existingTests ?? []).map((test) => test.id))
  const validUpserts = upserts.filter((row) => existingTestIds.has(row.test_id))
  if (validUpserts.length === 0) return

  const { error: upsertError } = await db.from('results').upsert(validUpserts, { onConflict: 'test_id,variant_id,goal_id', ignoreDuplicates: false })
  if (upsertError) throw new Error(upsertError.message)
}
