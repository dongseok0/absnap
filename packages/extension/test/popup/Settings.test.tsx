import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Site } from '../../src/shared/types'
import Settings from '../../src/popup/pages/Settings'

;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const api = {
  getSites: vi.fn(),
  createSite: vi.fn()
}

vi.mock('../../src/shared/api', () => ({
  createApiClient: () => api
}))

const createdSite: Site = {
  id: 'site_new',
  name: 'perkmine',
  domain: 'perkmine.com',
  createdAt: '2026-04-27T00:00:00.000Z'
}

function renderSettings(): {
  container: HTMLDivElement
  root: Root
  setActiveSite: ReturnType<typeof vi.fn>
  onBack: ReturnType<typeof vi.fn>
} {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  const setActiveSite = vi.fn()
  const onBack = vi.fn()

  act(() => {
    root.render(
      <Settings
        auth={{ accessToken: 'token', userId: 'user_1', email: 'test@example.com' }}
        activeSite={null}
        setActiveSite={setActiveSite}
        onLogout={vi.fn()}
        onBack={onBack}
      />
    )
  })

  return { container, root, setActiveSite, onBack }
}

async function flush(): Promise<void> {
  await act(async () => {
    await Promise.resolve()
  })
}

function setInputValue(input: HTMLInputElement, value: string): void {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(input, value)
  input.dispatchEvent(new Event('input', { bubbles: true }))
}

describe('Settings', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    api.getSites.mockReset().mockResolvedValue([])
    api.createSite.mockReset().mockResolvedValue(createdSite)
  })

  it('selects the newly created site and returns to Dashboard', async () => {
    const { container, root, setActiveSite, onBack } = renderSettings()
    await flush()

    const inputs = container.querySelectorAll<HTMLInputElement>('input')
    expect(inputs).toHaveLength(2)

    await act(async () => {
      setInputValue(inputs[0], 'perkmine')
      setInputValue(inputs[1], 'perkmine.com')
      await Promise.resolve()
    })

    const addButton = Array.from(container.querySelectorAll('button')).find((button) => button.textContent === '사이트 추가')
    expect(addButton).toBeDefined()

    await act(async () => {
      addButton!.click()
      await Promise.resolve()
    })

    expect(api.createSite).toHaveBeenCalledWith('perkmine', 'perkmine.com')
    expect(setActiveSite).toHaveBeenCalledWith(createdSite)
    expect(onBack).toHaveBeenCalled()

    act(() => root.unmount())
  })
})
