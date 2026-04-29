const STYLE_ID = '__abs_antiflicker'

export function injectAntiflicker(): void {
  if (document.getElementById(STYLE_ID)) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = '.__abs_hide { opacity: 0 !important; }'
  document.head.appendChild(style)
}

export function hideSelectors(selectors: string[]): void {
  for (const sel of selectors) {
    try {
      document.querySelectorAll(sel).forEach((el) => el.classList.add('__abs_hide'))
    } catch { /* fail-silent */ }
  }
}

export function showSelectors(selectors: string[]): void {
  for (const sel of selectors) {
    try {
      document.querySelectorAll(sel).forEach((el) => el.classList.remove('__abs_hide'))
    } catch { /* fail-silent */ }
  }
}
