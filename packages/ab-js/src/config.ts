import type { SiteConfig } from './types'

export const CACHE_KEY_PREFIX = '_abs_cfg_'
export const CACHE_TTL_MS = 5 * 60 * 1000

interface CachedConfig {
  data: SiteConfig
  ts: number
}

function readCache(siteId: string): CachedConfig | null {
  try {
    const raw = localStorage.getItem(`${CACHE_KEY_PREFIX}${siteId}`)
    return raw ? (JSON.parse(raw) as CachedConfig) : null
  } catch {
    return null
  }
}

function writeCache(siteId: string, data: SiteConfig): void {
  try {
    localStorage.setItem(`${CACHE_KEY_PREFIX}${siteId}`, JSON.stringify({ data, ts: Date.now() }))
  } catch { /* ignore quota errors */ }
}

export async function loadConfig(siteId: string, cdnBase: string): Promise<SiteConfig | null> {
  const cached = readCache(siteId)
  const isFresh = cached && Date.now() - cached.ts < CACHE_TTL_MS

  if (isFresh) return cached.data

  try {
    const res = await fetch(`${cdnBase}/config/${siteId}.json`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const config = await res.json() as SiteConfig
    writeCache(siteId, config)
    return config
  } catch {
    return cached?.data ?? null
  }
}
