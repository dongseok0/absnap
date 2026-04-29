import type { Test } from './types'

export const STORAGE_KEY_PREFIX = '_abs_'

export function assignVariant(test: Test): string {
  const key = `${STORAGE_KEY_PREFIX}${test.id}`

  const existing = localStorage.getItem(key)
  if (existing) return existing

  if (Math.random() * 100 > test.trafficPercent) {
    localStorage.setItem(key, 'excluded')
    return 'excluded'
  }

  const rand = Math.random() * 100
  let cumulative = 0

  for (const variant of test.variants) {
    cumulative += variant.weight
    if (rand < cumulative) {
      localStorage.setItem(key, variant.id)
      return variant.id
    }
  }

  localStorage.setItem(key, 'control')
  return 'control'
}
