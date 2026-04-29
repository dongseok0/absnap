import type { Mutation } from '../shared/types'

interface Revert {
  el: HTMLElement
  property: 'textContent' | 'innerHTML' | 'style' | 'attribute' | 'class' | 'src' | 'display'
  oldValue: string
  extraKey?: string
}

const pending: Revert[] = []

function captureAndApply(mutation: Mutation): void {
  const els = Array.from(document.querySelectorAll<HTMLElement>(mutation.selector))
  for (const el of els) {
    switch (mutation.type) {
      case 'text': {
        pending.push({ el, property: 'textContent', oldValue: el.textContent ?? '' })
        el.textContent = mutation.value ?? ''
        break
      }
      case 'html': {
        pending.push({ el, property: 'innerHTML', oldValue: el.innerHTML })
        el.innerHTML = mutation.value ?? ''
        break
      }
      case 'style': {
        if (!mutation.property) break
        const cssProp = mutation.property.replace(/([A-Z])/g, '-$1').toLowerCase()
        pending.push({ el, property: 'style', oldValue: el.style.getPropertyValue(cssProp) ?? '', extraKey: cssProp })
        el.style.setProperty(cssProp, mutation.value ?? '')
        break
      }
      case 'attribute': {
        if (!mutation.attribute) break
        pending.push({ el, property: 'attribute', oldValue: el.getAttribute(mutation.attribute) ?? '', extraKey: mutation.attribute })
        el.setAttribute(mutation.attribute, mutation.value ?? '')
        break
      }
      case 'visibility': {
        pending.push({ el, property: 'display', oldValue: el.style.display })
        el.style.display = mutation.value === 'hidden' ? 'none' : ''
        break
      }
      case 'class': {
        pending.push({ el, property: 'class', oldValue: el.className })
        if (mutation.add) el.classList.add(...mutation.add)
        if (mutation.remove) el.classList.remove(...mutation.remove)
        break
      }
      case 'image': {
        pending.push({ el, property: 'src', oldValue: el.getAttribute('src') ?? '' })
        el.setAttribute('src', mutation.value ?? '')
        break
      }
    }
  }
}

export function applyPreview(mutations: Mutation[]): void {
  revertPreview()
  for (const m of mutations) {
    try { captureAndApply(m) } catch { /* fail-silent */ }
  }
}

export function revertPreview(): void {
  while (pending.length > 0) {
    const { el, property, oldValue, extraKey } = pending.pop()!
    try {
      switch (property) {
        case 'textContent': el.textContent = oldValue; break
        case 'innerHTML': el.innerHTML = oldValue; break
        case 'style': el.style.setProperty(extraKey!, oldValue); break
        case 'attribute': el.setAttribute(extraKey!, oldValue); break
        case 'display': el.style.display = oldValue; break
        case 'class': el.className = oldValue; break
        case 'src': el.setAttribute('src', oldValue); break
      }
    } catch { /* fail-silent */ }
  }
}
