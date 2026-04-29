import { beforeEach, describe, expect, it, vi } from 'vitest'

const push = vi.fn()

function installCurrentScript(siteId: string) {
  const script = document.createElement('script')
  script.setAttribute('data-site', siteId)
  Object.defineProperty(document, 'currentScript', {
    value: script,
    configurable: true
  })
}

async function importSdkWithAssignment(variantId: string) {
  vi.doMock('../src/env', () => ({
    API_BASE: 'https://api.absnap.test',
    CDN_BASE: 'https://cdn.absnap.test'
  }))
  vi.doMock('../src/antiflicker', () => ({
    injectAntiflicker: vi.fn(),
    hideSelectors: vi.fn(),
    showSelectors: vi.fn()
  }))
  vi.doMock('../src/config', () => ({
    loadConfig: vi.fn().mockResolvedValue({
      siteId: 'site_abc',
      tests: [{
        id: 'test_001',
        status: 'running',
        urlPattern: '/demo',
        trafficPercent: 100,
        variants: [
          { id: 'control', weight: 50 },
          { id: 'variant_a', weight: 50, mutations: [] }
        ],
        goals: [{ id: 'goal_cta', type: 'click', selector: '.cta-button' }],
        createdAt: '2026-04-27T00:00:00Z'
      }]
    })
  }))
  vi.doMock('../src/assign', () => ({
    assignVariant: vi.fn(() => variantId)
  }))
  vi.doMock('../src/events', () => ({
    createEventTracker: vi.fn(() => ({
      push,
      flush: vi.fn(),
      destroy: vi.fn()
    }))
  }))

  await import('../src/index')
  await Promise.resolve()
}

describe('ab.js runtime', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.restoreAllMocks()
    push.mockClear()
    localStorage.clear()
    history.replaceState({}, '', '/demo')
    document.body.innerHTML = '<button class="cta-button">CTA</button>'
    installCurrentScript('site_abc')
  })

  it('tracks click goals for control assignments', async () => {
    await importSdkWithAssignment('control')

    document.querySelector<HTMLButtonElement>('.cta-button')!.click()

    expect(push).toHaveBeenCalledWith(expect.objectContaining({
      testId: 'test_001',
      variantId: 'control',
      goalId: 'goal_cta',
      type: 'conversion'
    }))
  })
})
