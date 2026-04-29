import { beforeEach, describe, expect, it, vi } from 'vitest'

type MessageListener = (
  message: unknown,
  sender: unknown,
  sendResponse: (response: unknown) => void
) => true | undefined

const storageSet = vi.fn()
const openPopup = vi.fn()
const tabsQuery = vi.fn()
const tabsSendMessage = vi.fn()
let listener: MessageListener

describe('background service worker', () => {
  beforeEach(async () => {
    vi.resetModules()
    storageSet.mockReset().mockResolvedValue(undefined)
    openPopup.mockReset().mockResolvedValue(undefined)
    tabsQuery.mockReset().mockResolvedValue([{ id: 123 }])
    tabsSendMessage.mockReset().mockResolvedValue({ ok: true })

    vi.stubGlobal('chrome', {
      runtime: {
        onMessage: {
          addListener: vi.fn((nextListener: MessageListener) => {
            listener = nextListener
          })
        }
      },
      storage: {
        local: {
          set: storageSet,
          get: vi.fn(),
          remove: vi.fn()
        }
      },
      action: {
        openPopup
      },
      tabs: {
        query: tabsQuery,
        sendMessage: tabsSendMessage
      },
      scripting: {
        executeScript: vi.fn()
      }
    })

    await import('../../src/background/service-worker')
  })

  it('opens the popup after receiving editor mutations', async () => {
    const sendResponse = vi.fn()

    listener(
      { type: 'EDITOR_DONE', payload: { mutations: [{ selector: '.cta', type: 'text', value: 'Start' }] } },
      {},
      sendResponse
    )

    await vi.waitFor(() => {
      expect(sendResponse).toHaveBeenCalledWith({ ok: true, data: null })
    })

    expect(storageSet).toHaveBeenCalledWith({
      absnap_pending_mutations: [{ selector: '.cta', type: 'text', value: 'Start' }]
    })
    expect(openPopup).toHaveBeenCalled()
  })

  it('stores a picked goal selector and opens the popup', async () => {
    const sendResponse = vi.fn()

    listener(
      { type: 'GOAL_SELECTED', payload: { selector: '[data-testid="hero-cta"]' } },
      {},
      sendResponse
    )

    await vi.waitFor(() => {
      expect(sendResponse).toHaveBeenCalledWith({ ok: true, data: null })
    })

    expect(storageSet).toHaveBeenCalledWith({
      absnap_pending_goal_selector: '[data-testid="hero-cta"]'
    })
    expect(openPopup).toHaveBeenCalled()
  })

  it('preserves current mutations before activating the goal picker', async () => {
    const sendResponse = vi.fn()

    listener(
      { type: 'ACTIVATE_GOAL_PICKER', payload: { mutations: [{ selector: '.hero', type: 'text', value: 'New headline' }] } },
      {},
      sendResponse
    )

    await vi.waitFor(() => {
      expect(sendResponse).toHaveBeenCalledWith({ ok: true, data: null })
    })

    expect(storageSet).toHaveBeenCalledWith({
      absnap_pending_mutations: [{ selector: '.hero', type: 'text', value: 'New headline' }]
    })
    expect(tabsSendMessage).toHaveBeenCalledWith(123, { type: 'ACTIVATE_GOAL_PICKER' })
  })
})
