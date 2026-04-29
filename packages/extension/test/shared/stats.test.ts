import { describe, it, expect } from 'vitest'
import { calculateZTest, getConfidenceLevel, confidenceLabel } from '../../src/shared/stats'

describe('calculateZTest', () => {
  it('detects significant lift', () => {
    const r = calculateZTest(1000, 30, 1000, 50)
    expect(r.significant).toBe(true)
    expect(r.confidence).toBeGreaterThan(0.95)
    expect(r.lift).toBeGreaterThan(0)
  })
})

describe('getConfidenceLevel', () => {
  it('returns insufficient for < 80%', () => { expect(getConfidenceLevel(0.5)).toBe('insufficient') })
  it('returns trending for 80-95%', () => { expect(getConfidenceLevel(0.87)).toBe('trending') })
  it('returns significant for 95-99%', () => { expect(getConfidenceLevel(0.97)).toBe('significant') })
  it('returns strong for >= 99%', () => { expect(getConfidenceLevel(0.995)).toBe('strong') })
})

describe('confidenceLabel', () => {
  it('returns correct emoji + text pairs', () => {
    expect(confidenceLabel('insufficient')).toMatch(/데이터 부족/)
    expect(confidenceLabel('trending')).toMatch(/트렌드/)
    expect(confidenceLabel('significant')).toMatch(/유의미/)
    expect(confidenceLabel('strong')).toMatch(/강한/)
  })
})
