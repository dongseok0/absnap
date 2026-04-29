// Abramowitz and Stegun approximation for normal CDF
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

export function calculateSampleSize(baseRate: number, mde: number): number {
  const p1 = baseRate
  const p2 = baseRate * (1 + mde)
  const pAvg = (p1 + p2) / 2
  const numerator = Math.pow(1.96 * Math.sqrt(2 * pAvg * (1 - pAvg)) + 0.842 * Math.sqrt(p1 * (1 - p1) + p2 * (1 - p2)), 2)
  const denominator = Math.pow(p2 - p1, 2)
  return Math.ceil(numerator / denominator)
}

export function formatDuration(ms: number): string {
  const totalMinutes = Math.floor(ms / 60000)
  const days = Math.floor(totalMinutes / 1440)
  const hours = Math.floor((totalMinutes % 1440) / 60)
  const minutes = totalMinutes % 60
  if (days > 0) return `${days}d ${hours}h`
  return `${hours}h ${minutes}m`
}
