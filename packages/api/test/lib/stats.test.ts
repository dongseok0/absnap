import { describe, it, expect } from 'vitest'
import { calculateZTest, calculateSampleSize, formatDuration } from '../../src/lib/stats'

describe('calculateZTest', () => {
  it('returns significant result when confidence >= 0.95', () => {
    const result = calculateZTest(1000, 30, 1000, 50)
    expect(result.confidence).toBeGreaterThan(0.95)
    expect(result.significant).toBe(true)
    expect(result.lift).toBeCloseTo(0.667, 1)
  })

  it('returns not significant when sample too small', () => {
    const result = calculateZTest(50, 2, 50, 3)
    expect(result.significant).toBe(false)
    expect(result.confidence).toBeLessThan(0.95)
  })

  it('returns zero lift when rates are equal', () => {
    const result = calculateZTest(1000, 30, 1000, 30)
    expect(result.lift).toBeCloseTo(0, 5)
    expect(result.significant).toBe(false)
  })

  it('handles zero control conversions safely', () => {
    const result = calculateZTest(100, 0, 100, 5)
    expect(result.lift).toBe(0)
    expect(Number.isFinite(result.confidence)).toBe(true)
  })
})

describe('calculateSampleSize', () => {
  it('returns positive integer for typical inputs', () => {
    const n = calculateSampleSize(0.03, 0.2)
    expect(n).toBeGreaterThan(0)
    expect(Number.isInteger(n)).toBe(true)
  })

  it('requires more samples for smaller MDE', () => {
    const n1 = calculateSampleSize(0.03, 0.1)
    const n2 = calculateSampleSize(0.03, 0.3)
    expect(n1).toBeGreaterThan(n2)
  })
})

describe('formatDuration', () => {
  it('formats milliseconds into human-readable duration', () => {
    expect(formatDuration(5 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000)).toBe('5d 3h')
    expect(formatDuration(2 * 60 * 60 * 1000)).toBe('2h 0m')
    expect(formatDuration(30 * 60 * 1000)).toBe('0h 30m')
  })
})
