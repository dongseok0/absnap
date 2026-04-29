import type { Mutation } from './types'

function applyOne(el: Element, m: Mutation): void {
  switch (m.type) {
    case 'text':
      if (m.value !== undefined) el.textContent = m.value
      break
    case 'html':
      if (m.value !== undefined) (el as HTMLElement).innerHTML = m.value
      break
    case 'style':
      if (m.property && m.value !== undefined) {
        const cssProp = m.property.replace(/([A-Z])/g, '-$1').toLowerCase()
        ;(el as HTMLElement).style.setProperty(cssProp, m.value)
      }
      break
    case 'attribute':
      if (m.attribute && m.value !== undefined) el.setAttribute(m.attribute, m.value)
      break
    case 'visibility':
      if (m.value === 'hidden') (el as HTMLElement).style.display = 'none'
      else if (m.value === 'visible') (el as HTMLElement).style.display = ''
      break
    case 'class':
      if (m.add) el.classList.add(...m.add)
      if (m.remove) el.classList.remove(...m.remove)
      break
    case 'image':
      if (m.value !== undefined) el.setAttribute('src', m.value)
      break
  }
}

export function applyMutations(mutations: Mutation[]): void {
  for (const m of mutations) {
    try {
      const els = document.querySelectorAll(m.selector)
      els.forEach((el) => applyOne(el, m))
    } catch { /* fail-silent per mutation */ }
  }
}
