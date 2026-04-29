import { describe, it, expect, beforeEach } from 'vitest'
import { applyMutations } from '../src/mutate'
import type { Mutation } from '../src/types'

function createEl(tag: string, attrs: Record<string, string> = {}, text = ''): HTMLElement {
  const el = document.createElement(tag)
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  el.textContent = text
  document.body.appendChild(el)
  return el
}

describe('applyMutations', () => {
  beforeEach(() => { document.body.innerHTML = '' })

  it('text: changes textContent', () => {
    const el = createEl('h1', { class: 'hero' }, 'Old headline')
    applyMutations([{ selector: 'h1.hero', type: 'text', value: 'New headline' }])
    expect(el.textContent).toBe('New headline')
  })

  it('html: changes innerHTML', () => {
    const el = createEl('div', { id: 'content' })
    applyMutations([{ selector: '#content', type: 'html', value: '<strong>bold</strong>' }])
    expect(el.innerHTML).toBe('<strong>bold</strong>')
  })

  it('style: sets inline style property', () => {
    const el = createEl('button', { class: 'cta' })
    applyMutations([{ selector: '.cta', type: 'style', property: 'backgroundColor', value: '#22c55e' }])
    expect(el.style.backgroundColor).toBeTruthy()
  })

  it('attribute: sets attribute value', () => {
    const el = createEl('a', { href: '/old' })
    applyMutations([{ selector: 'a', type: 'attribute', attribute: 'href', value: '/new' }])
    expect(el.getAttribute('href')).toBe('/new')
  })

  it('visibility: hidden sets display:none', () => {
    const el = createEl('div', { class: 'banner' })
    applyMutations([{ selector: '.banner', type: 'visibility', value: 'hidden' }])
    expect(el.style.display).toBe('none')
  })

  it('visibility: visible removes display:none', () => {
    const el = createEl('div', { class: 'banner' })
    el.style.display = 'none'
    applyMutations([{ selector: '.banner', type: 'visibility', value: 'visible' }])
    expect(el.style.display).toBe('')
  })

  it('class: adds and removes classes', () => {
    const el = createEl('div', { class: 'box old-class' })
    applyMutations([{ selector: '.box', type: 'class', add: ['new-class'], remove: ['old-class'] }])
    expect(el.classList.contains('new-class')).toBe(true)
    expect(el.classList.contains('old-class')).toBe(false)
  })

  it('image: sets img src', () => {
    const el = createEl('img', { src: '/old.jpg', class: 'hero-img' })
    applyMutations([{ selector: '.hero-img', type: 'image', value: '/new.jpg' }])
    expect(el.getAttribute('src')).toBe('/new.jpg')
  })

  it('skips non-matching selectors without throwing', () => {
    expect(() => {
      applyMutations([{ selector: '.nonexistent', type: 'text', value: 'x' }])
    }).not.toThrow()
  })

  it('skips failing mutations and continues the rest', () => {
    const el = createEl('h2', { class: 'title' }, 'Original')
    const mutations: Mutation[] = [
      { selector: '.nonexistent', type: 'text', value: 'ignored' },
      { selector: '.title', type: 'text', value: 'Applied' }
    ]
    applyMutations(mutations)
    expect(el.textContent).toBe('Applied')
  })
})
