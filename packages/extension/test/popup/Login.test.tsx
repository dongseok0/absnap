import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Login from '../../src/popup/pages/Login'

;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const api = vi.hoisted(() => ({
  login: vi.fn(),
  signup: vi.fn()
}))

vi.mock('../../src/shared/api', () => ({
  createApiClient: () => api
}))

function renderLogin(onLogin = vi.fn()): { container: HTMLDivElement; root: Root; onLogin: ReturnType<typeof vi.fn> } {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  act(() => {
    root.render(<Login onLogin={onLogin} />)
  })
  return { container, root, onLogin }
}

function changeInput(input: HTMLInputElement, value: string): void {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
  setter?.call(input, value)
  input.dispatchEvent(new Event('input', { bubbles: true }))
}

async function flush(): Promise<void> {
  await act(async () => {
    await Promise.resolve()
  })
}

describe('Login', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    api.login.mockReset()
    api.signup.mockReset()
  })

  it('shows a confirmation notice when signup returns no session', async () => {
    api.signup.mockResolvedValue({
      id: 'user_1',
      email: 'a@example.com'
    })
    const { container, root, onLogin } = renderLogin()

    await act(async () => {
      container.querySelector<HTMLButtonElement>('button[type="button"]')!.click()
      changeInput(container.querySelector<HTMLInputElement>('input[type="email"]')!, 'a@example.com')
      changeInput(container.querySelector<HTMLInputElement>('input[type="password"]')!, 'password')
      container.querySelector<HTMLFormElement>('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
      await Promise.resolve()
    })
    await flush()

    expect(onLogin).not.toHaveBeenCalled()
    expect(container.textContent).toContain('가입 요청이 완료됐습니다')
    expect(container.textContent).toContain('로그인')

    act(() => root.unmount())
  })

  it('logs in when signup returns a session', async () => {
    api.signup.mockResolvedValue({
      access_token: 'access',
      refresh_token: 'refresh',
      user: { id: 'user_1', email: 'a@example.com' }
    })
    const { container, root, onLogin } = renderLogin()

    await act(async () => {
      container.querySelector<HTMLButtonElement>('button[type="button"]')!.click()
      changeInput(container.querySelector<HTMLInputElement>('input[type="email"]')!, 'a@example.com')
      changeInput(container.querySelector<HTMLInputElement>('input[type="password"]')!, 'password')
      container.querySelector<HTMLFormElement>('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
      await Promise.resolve()
    })
    await flush()

    expect(onLogin).toHaveBeenCalledWith({
      accessToken: 'access',
      refreshToken: 'refresh',
      expiresAt: undefined,
      userId: 'user_1',
      email: 'a@example.com'
    })

    act(() => root.unmount())
  })
})
