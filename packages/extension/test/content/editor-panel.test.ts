import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createEditorPanel } from '../../src/content/editor-panel'

describe('createEditorPanel', () => {
  beforeEach(() => {
    document.body.innerHTML = '<a class="cta" href="/old">Buy now</a><img class="hero" src="/old.png" />'
  })

  it('renders non-technical product controls for a link CTA', () => {
    createEditorPanel(document.querySelector('.cta')!, {
      onMutationAdded: vi.fn(),
      onDone: vi.fn(),
      onCancel: vi.fn()
    })

    expect(document.querySelector('#__abs_editor_panel')?.textContent).toContain('버튼 편집')
    expect(document.querySelector('#__abs_editor_panel')?.textContent).toContain('텍스트')
    expect(document.querySelector('#__abs_editor_panel')?.textContent).toContain('색상')
    expect(document.querySelector('#__abs_editor_panel')?.textContent).toContain('링크')
    expect(document.querySelector('#__abs_type_select')).toBeNull()
  })

  it('adds a text mutation from the visible text control', () => {
    const onMutationAdded = vi.fn()
    createEditorPanel(document.querySelector('.cta')!, {
      onMutationAdded,
      onDone: vi.fn(),
      onCancel: vi.fn()
    })

    const textInput = document.querySelector<HTMLInputElement>('[data-abs-field="text"]')!
    textInput.value = 'Start free'
    textInput.dispatchEvent(new Event('input', { bubbles: true }))
    document.querySelector<HTMLButtonElement>('#__abs_add_btn')!.click()

    expect(onMutationAdded).toHaveBeenCalledWith(expect.objectContaining({
      type: 'text',
      value: 'Start free'
    }))
  })

  it('renders image controls for an image element', () => {
    createEditorPanel(document.querySelector('.hero')!, {
      onMutationAdded: vi.fn(),
      onDone: vi.fn(),
      onCancel: vi.fn()
    })

    expect(document.querySelector('#__abs_editor_panel')?.textContent).toContain('이미지 편집')
    expect(document.querySelector<HTMLInputElement>('[data-abs-field="imageUrl"]')!.value).toContain('/old.png')
  })

  it('keeps the done action after adding a change', () => {
    createEditorPanel(document.querySelector('.cta')!, {
      onMutationAdded: vi.fn(),
      onDone: vi.fn(),
      onCancel: vi.fn()
    })

    document.querySelector<HTMLButtonElement>('#__abs_add_btn')!.click()
    expect(document.querySelector('#__abs_done_btn')?.textContent).toBe('다음: 테스트 설정')
  })
})
