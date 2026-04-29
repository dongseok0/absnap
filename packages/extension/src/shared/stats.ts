import type { ConfidenceLevel } from './types'

function normalCDF(z: number): number {
  if (z < 0) return 1 - normalCDF(-z)
  const t = 1 / (1 + 0.2316419 * z)
  const d = 0.3989423 * Math.exp(-z * z / 2)
  const poly = t * (0.3193815 + t * (-0.3565638 + t * (1.7814779 + t * (-1.8212560 + t * 1.3302744))))
  return 1 - d * poly
}

export function calculateZTest(
  controlImpressions: number,
  controlConversions: number,
  variantImpressions: number,
  variantConversions: number
): { zScore: number; confidence: number; significant: boolean; lift: number } {
  if (controlImpressions === 0 || variantImpressions === 0) {
    return { zScore: 0, confidence: 0, significant: false, lift: 0 }
  }
  const p1 = variantConversions / variantImpressions
  const p2 = controlConversions / controlImpressions
  const pPooled = (variantConversions + controlConversions) / (controlImpressions + variantImpressions)
  const se = Math.sqrt(pPooled * (1 - pPooled) * (1 / variantImpressions + 1 / controlImpressions))
  if (se === 0) return { zScore: 0, confidence: 0, significant: false, lift: 0 }
  const zScore = (p1 - p2) / se
  const confidence = 1 - 2 * (1 - normalCDF(Math.abs(zScore)))
  const lift = p2 > 0 ? (p1 - p2) / p2 : 0
  return { zScore, confidence, significant: confidence >= 0.95, lift }
}

export function getConfidenceLevel(confidence: number): ConfidenceLevel {
  if (confidence >= 0.99) return 'strong'
  if (confidence >= 0.95) return 'significant'
  if (confidence >= 0.80) return 'trending'
  return 'insufficient'
}

export function confidenceLabel(level: ConfidenceLevel): string {
  switch (level) {
    case 'insufficient': return '🔴 데이터 부족'
    case 'trending':     return '🟡 트렌드 보임'
    case 'significant':  return '🟢 유의미'
    case 'strong':       return '✅ 강한 확신'
  }
}
