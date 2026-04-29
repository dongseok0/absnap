import { describe, it, expect, vi, beforeEach } from 'vitest'
import { loadConfig, CACHE_KEY_PREFIX, CACHE_TTL_MS } from '../src/config'
import type { SiteConfig } from '../src/types'

const mockConfig: SiteConfig = {
  siteId: 'site_abc',
  tests: [{ id: 'test_001', status: 'running', urlPattern: '/pricing*', trafficPercent: 100, variants: [], goals: [], createdAt: '2026-04-22T00:00:00Z' }]
}

describe('loadConfig', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('fetches from CDN when cache is empty', async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response(JSON.stringify(mockConfig)))
    vi.stubGlobal('fetch', mockFetch)

    const result = await loadConfig('site_abc', 'https://cdn.absnap.com')
    expect(result).toEqual(mockConfig)
    expect(mockFetch).toHaveBeenCalledWith('https://cdn.absnap.com/config/site_abc.json')
  })

  it('stores fetched config in localStorage with timestamp', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(mockConfig))))
    await loadConfig('site_abc', 'https://cdn.absnap.com')

    const cached = localStorage.getItem(`${CACHE_KEY_PREFIX}site_abc`)
    expect(cached).not.toBeNull()
    const { data, ts } = JSON.parse(cached!)
    expect(data).toEqual(mockConfig)
    expect(typeof ts).toBe('number')
  })

  it('returns cached config if TTL has not expired', async () => {
    const mockFetch = vi.fn()
    vi.stubGlobal('fetch', mockFetch)
    localStorage.setItem(`${CACHE_KEY_PREFIX}site_abc`, JSON.stringify({ data: mockConfig, ts: Date.now() }))

    const result = await loadConfig('site_abc', 'https://cdn.absnap.com')
    expect(result).toEqual(mockConfig)
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('re-fetches if cache is expired', async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response(JSON.stringify(mockConfig)))
    vi.stubGlobal('fetch', mockFetch)
    localStorage.setItem(`${CACHE_KEY_PREFIX}site_abc`, JSON.stringify({
      data: mockConfig,
      ts: Date.now() - CACHE_TTL_MS - 1000
    }))

    await loadConfig('site_abc', 'https://cdn.absnap.com')
    expect(mockFetch).toHaveBeenCalled()
  })

  it('returns null and does not throw if fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network error')))
    const result = await loadConfig('site_abc', 'https://cdn.absnap.com')
    expect(result).toBeNull()
  })

  it('returns stale cache if fetch fails but cache exists', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network error')))
    localStorage.setItem(`${CACHE_KEY_PREFIX}site_abc`, JSON.stringify({
      data: mockConfig,
      ts: Date.now() - CACHE_TTL_MS - 1000
    }))

    const result = await loadConfig('site_abc', 'https://cdn.absnap.com')
    expect(result).toEqual(mockConfig)
  })
})
