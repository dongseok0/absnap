import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Site } from '../../src/shared/types'
import App from '../../src/popup/App'

;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('../../src/popup/pages/Login', () => ({
  default: ({ onLogin }: { onLogin(auth: unknown): void }) => (
    <button data-testid="login" onClick={() => onLogin({ accessToken: 'token', userId: 'user_1', email: 'a@example.com' })}>
      login
    </button>
  )
}))

vi.mock('../../src/popup/pages/Dashboard', () => ({
  default: ({ activeSite, onNewTest }: { activeSite: Site | null; onNewTest(): void }) => (
    <button data-testid="dashboard" data-active-site={activeSite?.domain ?? ''} onClick={onNewTest}>
      new test
    </button>
  )
}))

vi.mock('../../src/popup/pages/TestCreate', () => ({
  default: ({ onCreated }: { onCreated(): void }) => (
    <button data-testid="create" onClick={onCreated}>
      create
    </button>
  )
}))

vi.mock('../../src/popup/pages/TestDetail', () => ({
  default: () => <div data-testid="detail" />
}))

vi.mock('../../src/popup/pages/Settings', () => ({
  default: () => <div data-testid="settings" />
}))

const auth = { accessToken: 'token', userId: 'user_1', email: 'a@example.com' }
const authWithRefresh = { ...auth, refreshToken: 'refresh-old' }
const sendMessage = vi.fn()
const storageGet = vi.fn()
const storageSet = vi.fn()
const storageRemove = vi.fn()
const tabsQuery = vi.fn()
const api = {
  refresh: vi.fn(),
  getSites: vi.fn(),
  createSite: vi.fn()
}

vi.mock('../../src/shared/api', () => ({
  ApiError: class ApiError extends Error {
    constructor(message: string, readonly status: number) {
      super(message)
      this.name = 'ApiError'
    }
  },
  createApiClient: () => api
}))

const currentSite: Site = {
  id: 'site_current',
  name: 'perkmine.com',
  domain: 'perkmine.com',
  createdAt: '2026-04-27T00:00:00.000Z'
}

function renderApp(): { container: HTMLDivElement; root: Root } {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  act(() => {
    root.render(<App />)
  })
  return { container, root }
}

async function flush(): Promise<void> {
  await act(async () => {
    await Promise.resolve()
  })
}

describe('Popup App navigation persistence', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    sendMessage.mockReset()
    storageGet.mockReset()
    storageSet.mockReset()
    storageRemove.mockReset()
    storageSet.mockResolvedValue(undefined)
    storageRemove.mockResolvedValue(undefined)
    tabsQuery.mockReset().mockResolvedValue([{ url: 'https://perkmine.com/privacy' }])
    api.refresh.mockReset().mockResolvedValue({
      access_token: 'token-new',
      refresh_token: 'refresh-new',
      user: { id: 'user_1', email: 'a@example.com' }
    })
    api.getSites.mockReset().mockResolvedValue([])
    api.createSite.mockReset().mockResolvedValue(currentSite)

    sendMessage.mockImplementation((message: { type: string }) => {
      if (message.type === 'GET_AUTH') return Promise.resolve({ ok: true, data: auth })
      if (message.type === 'SET_AUTH') return Promise.resolve({ ok: true, data: null })
      if (message.type === 'CLEAR_AUTH') return Promise.resolve({ ok: true, data: null })
      return Promise.resolve({ ok: false, error: 'unexpected message' })
    })

    vi.stubGlobal('chrome', {
      runtime: { sendMessage },
      tabs: { query: tabsQuery },
      storage: {
        local: {
          get: storageGet,
          set: storageSet,
          remove: storageRemove
        }
      }
    })
  })

  it('reopens authenticated popup on the saved create page', async () => {
    storageGet.mockResolvedValue({ absnap_popup_page: { name: 'create' } })

    const { container, root } = renderApp()
    await flush()

    expect(storageGet).toHaveBeenCalledWith('absnap_popup_page')
    expect(container.querySelector('[data-testid="create"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="dashboard"]')).toBeNull()

    act(() => root.unmount())
  })

  it('persists the create page when a new test flow starts', async () => {
    storageGet.mockResolvedValue({})

    const { container, root } = renderApp()
    await flush()

    const dashboard = container.querySelector<HTMLButtonElement>('[data-testid="dashboard"]')
    expect(dashboard).not.toBeNull()

    await act(async () => {
      dashboard!.click()
      await Promise.resolve()
    })

    expect(container.querySelector('[data-testid="create"]')).not.toBeNull()
    expect(storageSet).toHaveBeenLastCalledWith({ absnap_popup_page: { name: 'create' } })

    act(() => root.unmount())
  })

  it('creates and selects a site from the current tab when none exists', async () => {
    storageGet.mockResolvedValue({})

    const { container, root } = renderApp()
    await flush()
    await flush()

    expect(tabsQuery).toHaveBeenCalledWith({ active: true, currentWindow: true })
    expect(api.createSite).toHaveBeenCalledWith('perkmine.com', 'perkmine.com')
    expect(container.querySelector('[data-testid="dashboard"]')?.getAttribute('data-active-site')).toBe('perkmine.com')

    act(() => root.unmount())
  })

  it('selects an existing site matching the current tab domain', async () => {
    storageGet.mockResolvedValue({})
    api.getSites.mockResolvedValue([currentSite])

    const { container, root } = renderApp()
    await flush()
    await flush()

    expect(api.createSite).not.toHaveBeenCalled()
    expect(container.querySelector('[data-testid="dashboard"]')?.getAttribute('data-active-site')).toBe('perkmine.com')

    act(() => root.unmount())
  })

  it('clears stored auth and returns to login when the saved token is expired', async () => {
    storageGet.mockResolvedValue({})
    api.getSites.mockRejectedValue(new Error('Invalid or expired token'))

    const { container, root } = renderApp()
    await flush()
    await flush()

    expect(sendMessage).toHaveBeenCalledWith({ type: 'CLEAR_AUTH' })
    expect(storageRemove).toHaveBeenCalledWith('absnap_popup_page')
    expect(container.querySelector('[data-testid="login"]')).not.toBeNull()

    act(() => root.unmount())
  })

  it('refreshes an expired saved token before clearing auth', async () => {
    storageGet.mockResolvedValue({})
    sendMessage.mockImplementation((message: { type: string }) => {
      if (message.type === 'GET_AUTH') return Promise.resolve({ ok: true, data: authWithRefresh })
      if (message.type === 'SET_AUTH') return Promise.resolve({ ok: true, data: null })
      if (message.type === 'CLEAR_AUTH') return Promise.resolve({ ok: true, data: null })
      return Promise.resolve({ ok: false, error: 'unexpected message' })
    })
    api.getSites
      .mockRejectedValueOnce(new Error('Unauthorized'))
      .mockResolvedValueOnce([currentSite])

    const { container, root } = renderApp()
    await flush()
    await flush()
    await flush()

    expect(api.refresh).toHaveBeenCalledWith('refresh-old')
    expect(sendMessage).toHaveBeenCalledWith({
      type: 'SET_AUTH',
      payload: expect.objectContaining({
        accessToken: 'token-new',
        refreshToken: 'refresh-new'
      })
    })
    expect(sendMessage).not.toHaveBeenCalledWith({ type: 'CLEAR_AUTH' })
    expect(container.querySelector('[data-testid="dashboard"]')?.getAttribute('data-active-site')).toBe('perkmine.com')

    act(() => root.unmount())
  })
})
