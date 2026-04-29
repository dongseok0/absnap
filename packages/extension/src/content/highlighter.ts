const HIGHLIGHT_ID = '__abs_highlight'

function getOrCreateOverlay(): HTMLElement {
  let overlay = document.getElementById(HIGHLIGHT_ID) as HTMLElement | null
  if (!overlay) {
    overlay = document.createElement('div')
    overlay.id = HIGHLIGHT_ID
    Object.assign(overlay.style, {
      position: 'fixed',
      pointerEvents: 'none',
      zIndex: '2147483647',
      outline: '2px solid #3b82f6',
      outlineOffset: '2px',
      background: 'rgba(59, 130, 246, 0.08)',
      transition: 'all 0.1s ease',
      boxSizing: 'border-box'
    })
    document.body.appendChild(overlay)
  }
  return overlay
}

export function highlightElement(el: Element): void {
  const rect = el.getBoundingClientRect()
  const overlay = getOrCreateOverlay()
  Object.assign(overlay.style, {
    top: `${rect.top}px`,
    left: `${rect.left}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    display: 'block'
  })
}

export function hideHighlight(): void {
  const overlay = document.getElementById(HIGHLIGHT_ID) as HTMLElement | null
  if (overlay) overlay.style.display = 'none'
}

export function destroyHighlight(): void {
  document.getElementById(HIGHLIGHT_ID)?.remove()
}
