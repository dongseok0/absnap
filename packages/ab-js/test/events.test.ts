import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createEventTracker } from '../src/events'

describe('createEventTracker', () => {
  let mockSendBeacon: ReturnType<typeof vi.fn>
  let mockFetch: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.useFakeTimers()
    localStorage.clear()

    mockSendBeacon = vi.fn().mockReturnValue(true)
    mockFetch = vi.fn().mockResolvedValue(new Response('', { status: 204 }))

    Object.defineProperty(navigator, 'sendBeacon', { value: mockSendBeacon, writable: true, configurable: true })
    vi.stubGlobal('fetch', mockFetch)
  })

  afterEach(() => vi.useRealTimers())

  it('does not flush when queue is empty', () => {
    const tracker = createEventTracker('site_abc', 'https://api.absnap.com')
    tracker.flush()
    expect(mockSendBeacon).not.toHaveBeenCalled()
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('flushes immediately when BATCH_MAX_SIZE is reached', () => {
    const tracker = createEventTracker('site_abc', 'https://api.absnap.com')
    for (let i = 0; i < 20; i++) {
      tracker.push({ testId: 'test_001', variantId: 'control', goalId: null, type: 'impression', ts: Date.now() })
    }
    expect(mockSendBeacon).toHaveBeenCalledTimes(1)
  })

  it('flushes after BATCH_INTERVAL timer fires', () => {
    const tracker = createEventTracker('site_abc', 'https://api.absnap.com')
    tracker.push({ testId: 'test_001', variantId: 'control', goalId: null, type: 'impression', ts: Date.now() })
    expect(mockSendBeacon).not.toHaveBeenCalled()
    vi.advanceTimersByTime(5000)
    expect(mockSendBeacon).toHaveBeenCalledTimes(1)
  })

  it('sendBeacon payload has correct shape', () => {
    const tracker = createEventTracker('site_abc', 'https://api.absnap.com')
    for (let i = 0; i < 20; i++) {
      tracker.push({ testId: 'test_001', variantId: 'variant_a', goalId: 'goal_cta', type: 'conversion', ts: 1714000000 + i })
    }
    const [url, body] = mockSendBeacon.mock.calls[0]
    expect(url).toBe('https://api.absnap.com/events')
    const payload = JSON.parse(body as string)
    expect(payload.siteId).toBe('site_abc')
    expect(payload.session.uid).toMatch(/^[a-z0-9]+$/)
    expect(payload.events).toHaveLength(20)
    expect(payload.events[0].type).toBe('conversion')
  })

  it('falls back to fetch when sendBeacon is unavailable', () => {
    Object.defineProperty(navigator, 'sendBeacon', { value: undefined, writable: true, configurable: true })
    const tracker = createEventTracker('site_abc', 'https://api.absnap.com')
    for (let i = 0; i < 20; i++) {
      tracker.push({ testId: 't', variantId: 'c', goalId: null, type: 'impression', ts: i })
    }
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('generates a persistent anonymous uid stored in localStorage', () => {
    const tracker1 = createEventTracker('site_abc', 'https://api.absnap.com')
    for (let i = 0; i < 20; i++) tracker1.push({ testId: 't', variantId: 'c', goalId: null, type: 'impression', ts: i })
    const uid1 = JSON.parse(mockSendBeacon.mock.calls[0][1] as string).session.uid

    mockSendBeacon.mockClear()

    const tracker2 = createEventTracker('site_abc', 'https://api.absnap.com')
    for (let i = 0; i < 20; i++) tracker2.push({ testId: 't', variantId: 'c', goalId: null, type: 'impression', ts: i })
    const uid2 = JSON.parse(mockSendBeacon.mock.calls[0][1] as string).session.uid

    expect(uid1).toBe(uid2)
  })
})
