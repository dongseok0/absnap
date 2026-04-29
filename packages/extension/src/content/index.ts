import { highlightElement, hideHighlight, destroyHighlight } from './highlighter'
import { createEditorPanel, destroyEditorPanel } from './editor-panel'
import { generateSelector } from './selector'
import { isAbsUiElement } from './ui-guards'
import type { Mutation } from '../shared/types'

let activeMode: 'editor' | 'goal-picker' | null = null

function activate(mode: 'editor' | 'goal-picker') {
  if (activeMode) return
  activeMode = mode

  const toast = document.createElement('div')
  toast.textContent = mode === 'editor' ? '요소를 클릭해서 편집하세요' : '전환 목표로 사용할 버튼을 클릭하세요'
  Object.assign(toast.style, {
    position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
    background: '#111827', color: 'white', padding: '8px 16px',
    borderRadius: '24px', fontSize: '13px', zIndex: '2147483646',
    fontFamily: '-apple-system, sans-serif'
  })
  toast.id = '__abs_toast'
  document.body.appendChild(toast)

  document.addEventListener('mouseover', onHover, true)
  document.addEventListener('click', onClick, true)
  document.addEventListener('keydown', onEsc, true)
}

function deactivate() {
  activeMode = null
  document.removeEventListener('mouseover', onHover, true)
  document.removeEventListener('click', onClick, true)
  document.removeEventListener('keydown', onEsc, true)
  destroyHighlight()
  destroyEditorPanel()
  document.getElementById('__abs_toast')?.remove()
}

function onHover(e: MouseEvent) {
  if (isAbsUiElement(e.target)) return
  highlightElement(e.target as Element)
}

function onClick(e: MouseEvent) {
  const target = e.target as Element
  if (isAbsUiElement(target)) return
  e.preventDefault()
  e.stopPropagation()
  hideHighlight()

  if (activeMode === 'goal-picker') {
    const selector = generateSelector(target).selector
    chrome.runtime.sendMessage({ type: 'GOAL_SELECTED', payload: { selector } })
    deactivate()
    return
  }

  createEditorPanel(target, {
    onMutationAdded(_mutation: Mutation) { /* collected inside panel */ },
    onDone(mutations: Mutation[]) {
      chrome.runtime.sendMessage({ type: 'EDITOR_DONE', payload: { mutations } })
      deactivate()
    },
    onCancel: deactivate
  })
}

function onEsc(e: KeyboardEvent) {
  if (e.key === 'Escape') deactivate()
}

// Wait for activation message from service worker — do NOT auto-activate
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'ACTIVATE_EDITOR') {
    activate('editor')
    sendResponse({ ok: true })
  }
  if (msg.type === 'ACTIVATE_GOAL_PICKER') {
    activate('goal-picker')
    sendResponse({ ok: true })
  }
})
