import { beforeEach, describe, expect, it } from 'vitest'
import {
  buildMutationsFromForm,
  createEditorFormState,
  getEditorConfig,
  inferElementKind
} from '../../src/content/mutation-form-model'

describe('mutation-form-model', () => {
  beforeEach(() => { document.body.innerHTML = '' })

  it('infers button elements as button editors', () => {
    const button = document.createElement('button')
    button.textContent = 'Start now'

    expect(inferElementKind(button)).toBe('button')
    expect(getEditorConfig(button).title).toBe('버튼 편집')
    expect(getEditorConfig(button).tabs.map((tab) => tab.id)).toEqual(['text', 'color', 'size', 'hide', 'advanced'])
  })

  it('infers links as button editors with link controls', () => {
    const link = document.createElement('a')
    link.href = '/pricing'
    link.textContent = 'See pricing'

    const config = getEditorConfig(link)

    expect(config.title).toBe('버튼 편집')
    expect(config.tabs.map((tab) => tab.id)).toEqual(['text', 'color', 'size', 'link', 'hide', 'advanced'])
  })

  it('infers images as image editors', () => {
    const img = document.createElement('img')
    img.src = '/hero.png'

    const config = getEditorConfig(img)

    expect(config.title).toBe('이미지 편집')
    expect(config.tabs.map((tab) => tab.id)).toEqual(['image', 'size', 'hide', 'advanced'])
  })

  it('creates default state from current element values', () => {
    const link = document.createElement('a')
    link.href = 'https://example.com/start'
    link.textContent = 'Start'
    link.style.backgroundColor = 'rgb(37, 99, 235)'
    link.style.color = 'rgb(255, 255, 255)'

    const state = createEditorFormState(link, '[data-testid="hero-cta"]')

    expect(state.selector).toBe('[data-testid="hero-cta"]')
    expect(state.text).toBe('Start')
    expect(state.backgroundColor).toBe('rgb(37, 99, 235)')
    expect(state.textColor).toBe('rgb(255, 255, 255)')
    expect(state.href).toBe('https://example.com/start')
  })

  it('builds text mutation', () => {
    const state = createEditorFormState(document.createElement('button'), '.cta')
    state.text = 'Try free'

    expect(buildMutationsFromForm('text', state)).toEqual([
      { selector: '.cta', type: 'text', value: 'Try free' }
    ])
  })

  it('builds color mutations without CSS property typing', () => {
    const state = createEditorFormState(document.createElement('button'), '.cta')
    state.backgroundColor = '#2563eb'
    state.textColor = '#ffffff'

    expect(buildMutationsFromForm('color', state)).toEqual([
      { selector: '.cta', type: 'style', property: 'backgroundColor', value: '#2563eb' },
      { selector: '.cta', type: 'style', property: 'color', value: '#ffffff' }
    ])
  })

  it('builds numeric size mutations with px units', () => {
    const state = createEditorFormState(document.createElement('button'), '.cta')
    state.fontSize = '18'
    state.width = '220'
    state.height = '48'

    expect(buildMutationsFromForm('size', state)).toEqual([
      { selector: '.cta', type: 'style', property: 'fontSize', value: '18px' },
      { selector: '.cta', type: 'style', property: 'width', value: '220px' },
      { selector: '.cta', type: 'style', property: 'height', value: '48px' }
    ])
  })

  it('builds link, image, hide, and advanced mutations', () => {
    const state = createEditorFormState(document.createElement('a'), '.cta')
    state.href = '/signup'
    state.imageUrl = '/new.png'
    state.html = '<strong>New</strong>'
    state.attributeName = 'aria-label'
    state.attributeValue = 'Start signup'
    state.classAdd = 'primary large'
    state.classRemove = 'old'

    expect(buildMutationsFromForm('link', state)).toEqual([
      { selector: '.cta', type: 'attribute', attribute: 'href', value: '/signup' }
    ])
    expect(buildMutationsFromForm('image', state)).toEqual([
      { selector: '.cta', type: 'image', value: '/new.png' }
    ])
    expect(buildMutationsFromForm('hide', state)).toEqual([
      { selector: '.cta', type: 'visibility', value: 'hidden' }
    ])
    expect(buildMutationsFromForm('advanced-html', state)).toEqual([
      { selector: '.cta', type: 'html', value: '<strong>New</strong>' }
    ])
    expect(buildMutationsFromForm('advanced-attribute', state)).toEqual([
      { selector: '.cta', type: 'attribute', attribute: 'aria-label', value: 'Start signup' }
    ])
    expect(buildMutationsFromForm('advanced-class', state)).toEqual([
      { selector: '.cta', type: 'class', add: ['primary', 'large'], remove: ['old'] }
    ])
  })
})
