import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Site } from '../../src/shared/types'
import Dashboard from '../../src/popup/pages/Dashboard'

;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const api = {
  getSites: vi.fn(),
  getTests: vi.fn(),
  getResults: vi.fn(),
  updateTest: vi.fn()
}

vi.mock('../../src/shared/api', () => ({
  createApiClient: () => api
}))

const activeSite: Site = {
  id: 'site_1',
  name: 'Example',
  domain: 'example.com',
  createdAt: '2026-04-27T00:00:00.000Z'
}

function renderDashboard(refreshKey: number, site: Site | null = activeSite): { container: HTMLDivElement; root: Root } {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  act(() => {
    root.render(
      <Dashboard
        auth={{ accessToken: 'token', userId: 'user_1', email: 'a@example.com' }}
        activeSite={site}
        setActiveSite={vi.fn()}
        onLogout={vi.fn()}
        onNewTest={vi.fn()}
        onViewDetail={vi.fn()}
        onSettings={vi.fn()}
        refreshKey={refreshKey}
      />
    )
  })
  return { container, root }
}

async function flush(): Promise<void> {
  await act(async () => {
    await Promise.resolve()
  })
}

describe('Dashboard refresh', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    api.getSites.mockReset().mockResolvedValue([activeSite])
    api.getTests.mockReset().mockResolvedValue([])
    api.getResults.mockReset().mockResolvedValue({})
    api.updateTest.mockReset()
  })

  it('refetches tests when the refresh key changes for the same active site', async () => {
    const { root } = renderDashboard(0)
    await flush()

    expect(api.getTests).toHaveBeenCalledTimes(1)
    expect(api.getTests).toHaveBeenLastCalledWith('site_1')

    await act(async () => {
      root.render(
        <Dashboard
          auth={{ accessToken: 'token', userId: 'user_1', email: 'a@example.com' }}
          activeSite={activeSite}
          setActiveSite={vi.fn()}
          onLogout={vi.fn()}
          onNewTest={vi.fn()}
          onViewDetail={vi.fn()}
          onSettings={vi.fn()}
          refreshKey={1}
        />
      )
      await Promise.resolve()
    })

    expect(api.getTests).toHaveBeenCalledTimes(2)
    expect(api.getTests).toHaveBeenLastCalledWith('site_1')

    act(() => root.unmount())
  })

  it('shows the empty-site state instead of loading forever when there are no sites', async () => {
    api.getSites.mockResolvedValue([])

    const { container, root } = renderDashboard(0, null)
    await flush()

    expect(container.textContent).toContain('등록된 사이트가 없습니다')
    expect(container.textContent).not.toContain('로딩 중...')
    expect(api.getTests).not.toHaveBeenCalled()

    act(() => root.unmount())
  })

  it('shows current-page connection state while the app is resolving a site', async () => {
    api.getSites.mockResolvedValue([])

    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)
    act(() => {
      root.render(
        <Dashboard
          auth={{ accessToken: 'token', userId: 'user_1', email: 'a@example.com' }}
          activeSite={null}
          setActiveSite={vi.fn()}
          onLogout={vi.fn()}
          onNewTest={vi.fn()}
          onViewDetail={vi.fn()}
          onSettings={vi.fn()}
          resolvingSite
        />
      )
    })
    await flush()

    expect(container.textContent).toContain('현재 페이지 연결 중...')
    expect(container.textContent).not.toContain('사이트 추가하기')

    act(() => root.unmount())
  })

  it('does not show current-page connection state once a site is selected', async () => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)
    act(() => {
      root.render(
        <Dashboard
          auth={{ accessToken: 'token', userId: 'user_1', email: 'a@example.com' }}
          activeSite={activeSite}
          setActiveSite={vi.fn()}
          onLogout={vi.fn()}
          onNewTest={vi.fn()}
          onViewDetail={vi.fn()}
          onSettings={vi.fn()}
          resolvingSite
        />
      )
    })
    await flush()

    expect(container.textContent).not.toContain('현재 페이지 연결 중...')
    expect(api.getTests).toHaveBeenCalledWith('site_1')

    act(() => root.unmount())
  })
})
