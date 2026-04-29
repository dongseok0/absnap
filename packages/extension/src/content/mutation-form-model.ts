import type { Mutation } from '../shared/types'

export type ElementKind = 'button' | 'image' | 'text' | 'element'
export type EditorTabId = 'text' | 'color' | 'size' | 'link' | 'image' | 'hide' | 'advanced'
export type MutationAction =
  | EditorTabId
  | 'advanced-html'
  | 'advanced-attribute'
  | 'advanced-class'

export interface EditorTab {
  id: EditorTabId
  label: string
}

export interface EditorConfig {
  kind: ElementKind
  title: string
  tabs: EditorTab[]
}

export interface EditorFormState {
  selector: string
  text: string
  backgroundColor: string
  textColor: string
  fontSize: string
  width: string
  height: string
  href: string
  imageUrl: string
  html: string
  attributeName: string
  attributeValue: string
  classAdd: string
  classRemove: string
}

const TAB_LABELS: Record<EditorTabId, string> = {
  text: '텍스트',
  color: '색상',
  size: '크기',
  link: '링크',
  image: '이미지',
  hide: '숨기기',
  advanced: '고급'
}

function tabs(ids: EditorTabId[]): EditorTab[] {
  return ids.map((id) => ({ id, label: TAB_LABELS[id] }))
}

export function inferElementKind(el: Element): ElementKind {
  const tag = el.tagName.toLowerCase()
  if (tag === 'img') return 'image'
  if (tag === 'button' || tag === 'a' || (el as HTMLElement).getAttribute('role') === 'button') return 'button'
  if ((el.textContent ?? '').trim().length > 0) return 'text'
  return 'element'
}

export function getEditorConfig(el: Element): EditorConfig {
  const kind = inferElementKind(el)

  if (kind === 'image') {
    return { kind, title: '이미지 편집', tabs: tabs(['image', 'size', 'hide', 'advanced']) }
  }

  if (kind === 'button') {
    const hasHref = el.tagName.toLowerCase() === 'a' && el.hasAttribute('href')
    return {
      kind,
      title: '버튼 편집',
      tabs: tabs(hasHref
        ? ['text', 'color', 'size', 'link', 'hide', 'advanced']
        : ['text', 'color', 'size', 'hide', 'advanced'])
    }
  }

  if (kind === 'text') {
    return { kind, title: '텍스트 편집', tabs: tabs(['text', 'color', 'size', 'hide', 'advanced']) }
  }

  return { kind, title: '요소 편집', tabs: tabs(['color', 'size', 'hide', 'advanced']) }
}

function numericPxValue(value: string): string {
  return value.replace('px', '').trim()
}

export function createEditorFormState(el: Element, selector: string): EditorFormState {
  const htmlEl = el as HTMLElement

  return {
    selector,
    text: (el.textContent ?? '').trim(),
    backgroundColor: htmlEl.style.backgroundColor || '#2563eb',
    textColor: htmlEl.style.color || '#ffffff',
    fontSize: numericPxValue(htmlEl.style.fontSize),
    width: numericPxValue(htmlEl.style.width),
    height: numericPxValue(htmlEl.style.height),
    href: el.getAttribute('href') ?? '',
    imageUrl: el.getAttribute('src') ?? '',
    html: htmlEl.innerHTML,
    attributeName: '',
    attributeValue: '',
    classAdd: '',
    classRemove: ''
  }
}

function px(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const n = Number(trimmed)
  if (!Number.isFinite(n) || n < 0) return null
  return `${n}px`
}

function words(value: string): string[] {
  return value.split(/\s+/).map((part) => part.trim()).filter(Boolean)
}

export function buildMutationsFromForm(action: MutationAction, state: EditorFormState): Mutation[] {
  switch (action) {
    case 'text':
      return [{ selector: state.selector, type: 'text', value: state.text }]
    case 'color': {
      const mutations: Mutation[] = []
      const backgroundColor = state.backgroundColor.trim()
      const textColor = state.textColor.trim()
      if (backgroundColor) {
        mutations.push({ selector: state.selector, type: 'style', property: 'backgroundColor', value: backgroundColor })
      }
      if (textColor) {
        mutations.push({ selector: state.selector, type: 'style', property: 'color', value: textColor })
      }
      return mutations
    }
    case 'size': {
      const mutations: Mutation[] = []
      const fontSize = px(state.fontSize)
      const width = px(state.width)
      const height = px(state.height)
      if (fontSize) mutations.push({ selector: state.selector, type: 'style', property: 'fontSize', value: fontSize })
      if (width) mutations.push({ selector: state.selector, type: 'style', property: 'width', value: width })
      if (height) mutations.push({ selector: state.selector, type: 'style', property: 'height', value: height })
      return mutations
    }
    case 'link':
      return state.href.trim()
        ? [{ selector: state.selector, type: 'attribute', attribute: 'href', value: state.href.trim() }]
        : []
    case 'image':
      return state.imageUrl.trim()
        ? [{ selector: state.selector, type: 'image', value: state.imageUrl.trim() }]
        : []
    case 'hide':
      return [{ selector: state.selector, type: 'visibility', value: 'hidden' }]
    case 'advanced-html':
      return [{ selector: state.selector, type: 'html', value: state.html }]
    case 'advanced-attribute':
      return state.attributeName.trim()
        ? [{ selector: state.selector, type: 'attribute', attribute: state.attributeName.trim(), value: state.attributeValue }]
        : []
    case 'advanced-class': {
      const add = words(state.classAdd)
      const remove = words(state.classRemove)
      return add.length > 0 || remove.length > 0
        ? [{ selector: state.selector, type: 'class', add, remove }]
        : []
    }
    default:
      return []
  }
}
