import { describe, it, expect, beforeEach } from 'vitest'
import { injectAntiflicker, hideSelectors, showSelectors } from '../src/antiflicker'

describe('injectAntiflicker', () => {
  beforeEach(() => { document.head.innerHTML = '' })

  it('injects a style tag with __abs_antiflicker id', () => {
    injectAntiflicker()
    const style = document.getElementById('__abs_antiflicker')
    expect(style).not.toBeNull()
    expect(style!.tagName).toBe('STYLE')
    expect(style!.textContent).toContain('__abs_hide')
  })

  it('does not inject twice if called again', () => {
    injectAntiflicker()
    injectAntiflicker()
    expect(document.querySelectorAll('#__abs_antiflicker')).toHaveLength(1)
  })
})

describe('hideSelectors + showSelectors', () => {
  beforeEach(() => { document.body.innerHTML = ''; document.head.innerHTML = '' })

  it('hideSelectors adds __abs_hide class to matching elements', () => {
    document.body.innerHTML = '<h1 class="hero">Title</h1>'
    injectAntiflicker()
    hideSelectors(['h1.hero'])
    expect(document.querySelector('h1.hero')!.classList.contains('__abs_hide')).toBe(true)
  })

  it('showSelectors removes __abs_hide class', () => {
    document.body.innerHTML = '<h1 class="hero __abs_hide">Title</h1>'
    showSelectors(['h1.hero'])
    expect(document.querySelector('h1.hero')!.classList.contains('__abs_hide')).toBe(false)
  })

  it('showSelectors does not throw for missing elements', () => {
    expect(() => showSelectors(['.nonexistent'])).not.toThrow()
  })
})
