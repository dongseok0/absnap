import { act, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Site } from '../../src/shared/types'
import TestCreate from '../../src/popup/pages/TestCreate'

;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const api = {
  getSites: vi.fn(),
  createTest: vi.fn(),
  updateTest: vi.fn(),
  publishTest: vi.fn()
}

vi.mock('../../src/shared/api', () => ({
  createApiClient: () => api
}))

const site: Site = {
  id: 'site_1',
  name: 'Example',
  domain: 'example.com',
  createdAt: '2026-04-27T00:00:00.000Z'
}

const sendMessage = vi.fn()

function renderTestCreate(activeSite: Site | null = null): { container: HTMLDivElement; root: Root; setActiveSite: ReturnType<typeof vi.fn>; onCreated: ReturnType<typeof vi.fn> } {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  const setActiveSite = vi.fn()
  const onCreated = vi.fn()
  function Harness() {
    const [currentSite, setCurrentSite] = useState<Site | null>(activeSite)
    return (
      <TestCreate
        auth={{ accessToken: 'token', userId: 'user_1', email: 'a@example.com' }}
        activeSite={currentSite}
        setActiveSite={(nextSite) => {
          setActiveSite(nextSite)
          setCurrentSite(nextSite)
        }}
        onLogout={vi.fn()}
        onBack={vi.fn()}
        onCreated={onCreated}
      />
    )
  }

  act(() => {
    root.render(<Harness />)
  })
  return { container, root, setActiveSite, onCreated }
}

async function flush(): Promise<void> {
  await act(async () => {
    await Promise.resolve()
  })
}

describe('TestCreate', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    sendMessage.mockReset().mockResolvedValue({
      ok: true,
      data: [{ selector: '.hero', type: 'text', value: 'New headline' }]
    })
    api.getSites.mockReset().mockResolvedValue([site])
    api.createTest.mockReset().mockResolvedValue({ id: 'test_1' })
    api.updateTest.mockReset().mockResolvedValue({ id: 'test_1' })
    api.publishTest.mockReset().mockResolvedValue({ published: true })

    vi.stubGlobal('chrome', {
      runtime: { sendMessage }
    })
  })

  it('creates a test after reopening directly into configuration without an active site', async () => {
    const { container, root, setActiveSite, onCreated } = renderTestCreate(null)
    await flush()

    expect(setActiveSite).toHaveBeenCalledWith(site)

    const addGoalButton = Array.from(container.querySelectorAll('button')).find((button) => button.textContent === '목표 추가')
    expect(addGoalButton).toBeDefined()

    await act(async () => {
      addGoalButton!.click()
      await Promise.resolve()
    })

    const nextButton = Array.from(container.querySelectorAll('button')).find((button) => button.textContent === '다음')
    expect(nextButton).toBeDefined()

    await act(async () => {
      nextButton!.click()
      await Promise.resolve()
    })

    const nameInput = container.querySelector<HTMLInputElement>('input[placeholder="예: 프라이싱 헤드라인 테스트"]')
    expect(nameInput).not.toBeNull()

    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(nameInput, '생산성 멀티플라이어')
      nameInput!.dispatchEvent(new Event('input', { bubbles: true }))
      await Promise.resolve()
    })

    const startButton = Array.from(container.querySelectorAll('button')).find((button) => button.textContent === '테스트 시작 🚀')
    expect(startButton).toBeDefined()

    await act(async () => {
      startButton!.click()
      await Promise.resolve()
    })

    expect(api.createTest).toHaveBeenCalledWith(expect.objectContaining({
      siteId: 'site_1',
      name: '생산성 멀티플라이어'
    }))
    expect(api.updateTest).toHaveBeenCalledWith('test_1', { status: 'running' })
    expect(api.publishTest).toHaveBeenCalledWith('test_1')
    expect(onCreated).toHaveBeenCalled()

    act(() => root.unmount())
  })

  it('lets users pick a click goal selector from the page', async () => {
    sendMessage
      .mockResolvedValueOnce({ ok: true, data: [{ selector: '.hero', type: 'text', value: 'New headline' }] })
      .mockResolvedValueOnce({ ok: true, data: null })

    const closeSpy = vi.spyOn(window, 'close').mockImplementation(() => undefined)
    const { container, root } = renderTestCreate(site)
    await flush()

    const pickButton = Array.from(container.querySelectorAll('button')).find((button) => button.textContent === '페이지에서 선택')
    expect(pickButton).toBeDefined()

    await act(async () => {
      pickButton!.click()
      await Promise.resolve()
    })

    expect(sendMessage).toHaveBeenCalledWith({
      type: 'ACTIVATE_GOAL_PICKER',
      payload: { mutations: [{ selector: '.hero', type: 'text', value: 'New headline' }] }
    })
    expect(closeSpy).toHaveBeenCalled()

    closeSpy.mockRestore()
    act(() => root.unmount())
  })

  it('fills the goal selector when reopening after page selection', async () => {
    sendMessage
      .mockResolvedValueOnce({ ok: true, data: [{ selector: '.hero', type: 'text', value: 'New headline' }] })
      .mockResolvedValueOnce({ ok: true, data: '[data-testid="hero-cta"]' })

    const { container, root } = renderTestCreate(site)
    await flush()

    const selectorInput = container.querySelector<HTMLInputElement>('input[placeholder="CSS 셀렉터 (예: .cta-button)"]')
    expect(selectorInput?.value).toBe('[data-testid="hero-cta"]')

    act(() => root.unmount())
  })
})
