import { describe, it, expect, beforeEach } from 'vitest'
import { generateSelector } from '../../src/content/selector'

describe('generateSelector', () => {
  beforeEach(() => { document.body.innerHTML = '' })

  it('prefers data-testid (stable)', () => {
    document.body.innerHTML = '<button data-testid="cta-btn">Click</button>'
    const el = document.querySelector('button')!
    const result = generateSelector(el)
    expect(result.selector).toBe('[data-testid="cta-btn"]')
    expect(result.grade).toBe('stable')
    expect(result.isUnique).toBe(true)
  })

  it('uses unique #id (stable)', () => {
    document.body.innerHTML = '<h1 id="main-headline">Title</h1>'
    const el = document.querySelector('#main-headline')!
    const result = generateSelector(el)
    expect(result.selector).toBe('#main-headline')
    expect(result.grade).toBe('stable')
  })

  it('uses role + aria-label (stable)', () => {
    document.body.innerHTML = '<button role="button" aria-label="Submit form">Go</button>'
    const el = document.querySelector('button')!
    const result = generateSelector(el)
    expect(result.selector).toBe('[role="button"][aria-label="Submit form"]')
    expect(result.grade).toBe('stable')
  })

  it('falls back to tag + class (moderate)', () => {
    document.body.innerHTML = '<button class="cta-primary">Buy Now</button>'
    const el = document.querySelector('button')!
    const result = generateSelector(el)
    expect(result.grade).toBe('moderate')
    expect(result.isUnique).toBe(true)
  })

  it('falls back to nth-child for unstyled elements (fragile)', () => {
    document.body.innerHTML = '<div><div><p>Target</p></div></div>'
    const el = document.querySelector('p')!
    const result = generateSelector(el)
    expect(result.grade).toBe('fragile')
    expect(result.isUnique).toBe(true)
  })

  it('filters out dynamic state classes', () => {
    document.body.innerHTML = '<button class="cta-btn active hover">Click</button>'
    const el = document.querySelector('button')!
    const result = generateSelector(el)
    expect(result.selector).not.toContain('.active')
    expect(result.selector).not.toContain('.hover')
  })
})
