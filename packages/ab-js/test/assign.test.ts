import { describe, it, expect, vi, beforeEach } from 'vitest'
import { assignVariant, STORAGE_KEY_PREFIX } from '../src/assign'
import type { Test } from '../src/types'

const baseTest: Test = {
  id: 'test_001',
  status: 'running',
  urlPattern: '/pricing',
  trafficPercent: 100,
  variants: [
    { id: 'control', weight: 50 },
    { id: 'variant_a', weight: 50 }
  ],
  goals: [],
  createdAt: '2026-04-22T00:00:00Z'
}

describe('assignVariant', () => {
  beforeEach(() => localStorage.clear())

  it('returns existing assignment from localStorage', () => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}test_001`, 'variant_a')
    const result = assignVariant(baseTest)
    expect(result).toBe('variant_a')
  })

  it('assigns control and persists to localStorage', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.25)
    const result = assignVariant(baseTest)
    expect(result).toBe('control')
    expect(localStorage.getItem(`${STORAGE_KEY_PREFIX}test_001`)).toBe('control')
  })

  it('assigns variant_a when random is in second bucket', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.5)
      .mockReturnValueOnce(0.75)
    const result = assignVariant(baseTest)
    expect(result).toBe('variant_a')
  })

  it('excludes user when random exceeds trafficPercent', () => {
    const test50pct: Test = { ...baseTest, trafficPercent: 50 }
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const result = assignVariant(test50pct)
    expect(result).toBe('excluded')
    expect(localStorage.getItem(`${STORAGE_KEY_PREFIX}test_001`)).toBe('excluded')
  })

  it('falls back to control when weights do not cover full range', () => {
    const badTest: Test = { ...baseTest, variants: [{ id: 'control', weight: 40 }] }
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const result = assignVariant(badTest)
    expect(result).toBe('control')
  })
})
