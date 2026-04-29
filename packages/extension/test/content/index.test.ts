import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
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
    const { isAbsUiElement } = await import('../../src/content/ui-guards')
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

  it('keeps the content entry executable as an injected classic script', () => {
    const source = readFileSync(resolve(__dirname, '../../src/content/index.ts'), 'utf8')

    expect(source).not.toMatch(/^\s*export\s+/m)
  })
})
