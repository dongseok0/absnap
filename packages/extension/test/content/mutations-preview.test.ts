import { describe, it, expect, beforeEach } from 'vitest'
import { applyPreview, revertPreview } from '../../src/content/mutations-preview'
import type { Mutation } from '../../src/shared/types'

describe('applyPreview + revertPreview', () => {
  beforeEach(() => { document.body.innerHTML = '<h1 class="title">Original</h1>' })

  it('applyPreview changes text and revertPreview restores it', () => {
    const mutation: Mutation = { selector: '.title', type: 'text', value: 'New Text' }
    applyPreview([mutation])
    expect(document.querySelector('.title')!.textContent).toBe('New Text')
    revertPreview()
    expect(document.querySelector('.title')!.textContent).toBe('Original')
  })

  it('applyPreview applies style mutation and revertPreview reverts it', () => {
    document.body.innerHTML = '<button class="cta">Buy</button>'
    const mutation: Mutation = { selector: '.cta', type: 'style', property: 'backgroundColor', value: 'rgb(34, 197, 94)' }
    applyPreview([mutation])
    expect((document.querySelector('.cta') as HTMLElement).style.backgroundColor).not.toBe('')
    revertPreview()
    expect((document.querySelector('.cta') as HTMLElement).style.backgroundColor).toBe('')
  })

  it('applyPreview is idempotent — calling twice reverts then re-applies', () => {
    const mutation: Mutation = { selector: '.title', type: 'text', value: 'Changed' }
    applyPreview([mutation])
    applyPreview([mutation])
    revertPreview()
    expect(document.querySelector('.title')!.textContent).toBe('Original')
  })

  it('applyPreview applies attribute mutation and revertPreview restores it', () => {
    document.body.innerHTML = '<a class="cta" href="/old">Buy</a>'
    const mutation: Mutation = { selector: '.cta', type: 'attribute', attribute: 'href', value: '/new' }
    applyPreview([mutation])
    expect(document.querySelector('.cta')!.getAttribute('href')).toBe('/new')
    revertPreview()
    expect(document.querySelector('.cta')!.getAttribute('href')).toBe('/old')
  })

  it('applyPreview applies image mutation and revertPreview restores src', () => {
    document.body.innerHTML = '<img class="hero" src="/old.png" />'
    const mutation: Mutation = { selector: '.hero', type: 'image', value: '/new.png' }
    applyPreview([mutation])
    expect(document.querySelector('.hero')!.getAttribute('src')).toBe('/new.png')
    revertPreview()
    expect(document.querySelector('.hero')!.getAttribute('src')).toBe('/old.png')
  })

  it('applyPreview applies visibility mutation and revertPreview restores display', () => {
    document.body.innerHTML = '<div class="banner">Sale</div>'
    const mutation: Mutation = { selector: '.banner', type: 'visibility', value: 'hidden' }
    applyPreview([mutation])
    expect((document.querySelector('.banner') as HTMLElement).style.display).toBe('none')
    revertPreview()
    expect((document.querySelector('.banner') as HTMLElement).style.display).toBe('')
  })

  it('applyPreview applies class mutation and revertPreview restores classes', () => {
    document.body.innerHTML = '<div class="box old">Box</div>'
    const mutation: Mutation = { selector: '.box', type: 'class', add: ['new'], remove: ['old'] }
    applyPreview([mutation])
    expect(document.querySelector('.box')!.classList.contains('new')).toBe(true)
    expect(document.querySelector('.box')!.classList.contains('old')).toBe(false)
    revertPreview()
    expect(document.querySelector('.box')!.className).toBe('box old')
  })
})
