import { describe, expect, it, vi } from 'vitest'
import { aggregateEvents } from '../../src/lib/cron'

function makeDb(upsertResult: unknown, existingTests = [{ id: 'test_1' }]) {
  const upsertResults = vi.fn().mockResolvedValue(upsertResult)
  const gte = vi.fn().mockResolvedValue({
    data: [
      { test_id: 'test_1', variant_id: 'control', goal_id: null, event_type: 'impression' }
    ],
    error: null
  })
  const selectEvents = vi.fn(() => ({ gte }))
  const inTests = vi.fn().mockResolvedValue({ data: existingTests, error: null })
  const selectTests = vi.fn(() => ({ in: inTests }))
  const from = vi.fn((table: string) => {
    if (table === 'events') return { select: selectEvents }
    if (table === 'tests') return { select: selectTests }
    return { upsert: upsertResults }
  })
  return { from, upsertResults }
}

describe('aggregateEvents', () => {
  it('throws when result upsert fails', async () => {
    const db = makeDb({ data: null, error: { message: 'permission denied' } })

    await expect(aggregateEvents(db as never)).rejects.toThrow('permission denied')
  })

  it('skips events for tests that no longer exist', async () => {
    const db = makeDb({ data: [], error: null }, [])

    await aggregateEvents(db as never)

    expect(db.upsertResults).not.toHaveBeenCalled()
  })
})
