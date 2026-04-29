export type SelectorGrade = 'stable' | 'moderate' | 'fragile'

export interface SelectorResult {
  selector: string
  grade: SelectorGrade
  isUnique: boolean
}

const DYNAMIC_CLASSES = /^(active|selected|hover|focus|disabled|open|closed|is-|has-)$/

function verify(selector: string): boolean {
  try { return document.querySelectorAll(selector).length === 1 } catch { return false }
}

function matchCount(selector: string): number {
  try { return document.querySelectorAll(selector).length } catch { return 0 }
}

function buildNthSelector(el: Element): string {
  const parts: string[] = []
  let current: Element | null = el
  while (current && current !== document.body) {
    const tag = current.tagName.toLowerCase()
    const parent = current.parentElement
    if (parent) {
      const siblings = Array.from(parent.children).filter((c) => c.tagName === current!.tagName)
      const idx = siblings.indexOf(current as HTMLElement) + 1
      parts.unshift(siblings.length > 1 ? `${tag}:nth-of-type(${idx})` : tag)
    } else {
      parts.unshift(tag)
    }
    current = current.parentElement
  }
  return parts.join(' > ')
}

export function generateSelector(el: Element): SelectorResult {
  // Priority 1: data-testid
  const testId = el.getAttribute('data-testid')
  if (testId) {
    const sel = `[data-testid="${testId}"]`
    return { selector: sel, grade: 'stable', isUnique: verify(sel) }
  }

  // Priority 2: unique non-numeric ID
  if (el.id && !/^\d/.test(el.id)) {
    const sel = `#${CSS.escape(el.id)}`
    if (verify(sel)) return { selector: sel, grade: 'stable', isUnique: true }
  }

  // Priority 3: role + aria-label
  const role = el.getAttribute('role')
  const label = el.getAttribute('aria-label')
  if (role && label) {
    const sel = `[role="${role}"][aria-label="${label}"]`
    if (verify(sel)) return { selector: sel, grade: 'stable', isUnique: true }
  }

  // Priority 4: tag + stable class combination
  const tag = el.tagName.toLowerCase()
  const stableClasses = Array.from(el.classList).filter((c) => !DYNAMIC_CLASSES.test(c))
  if (stableClasses.length > 0) {
    const sel = `${tag}.${stableClasses.join('.')}`
    const count = matchCount(sel)
    return { selector: sel, grade: 'moderate', isUnique: count === 1 }
  }

  // Priority 5: nth-child fallback
  const nthSel = buildNthSelector(el)
  return { selector: nthSel, grade: 'fragile', isUnique: verify(nthSel) }
}
