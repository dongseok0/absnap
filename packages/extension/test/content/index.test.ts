import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('content script UI guards', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubGlobal('chrome', {
      runtime: {
        onMessage: { addListener: vi.fn() },
        sendMessage: vi.fn()
      }
    })
    document.body.innerHTML = ''
  })

  it('treats editor panel descendants as ABSnap UI elements', async () => {
    const { isAbsUiElement } = await import('../../src/content/index')
    document.body.innerHTML = `
      <div id="__abs_editor_panel">
        <button data-abs-action="color">색상</button>
      </div>
      <button id="page-cta">페이지 버튼</button>
    `

    expect(isAbsUiElement(document.querySelector('[data-abs-action="color"]'))).toBe(true)
    expect(isAbsUiElement(document.querySelector('#__abs_editor_panel'))).toBe(true)
    expect(isAbsUiElement(document.querySelector('#page-cta'))).toBe(false)
  })
})
