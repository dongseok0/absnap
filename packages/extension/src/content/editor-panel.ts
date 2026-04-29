import type { Mutation } from '../shared/types'
import { generateSelector } from './selector'
import { applyPreview, revertPreview } from './mutations-preview'
import {
  buildMutationsFromForm,
  createEditorFormState,
  getEditorConfig,
  type EditorFormState,
  type EditorTabId,
  type MutationAction
} from './mutation-form-model'

export interface EditorCallbacks {
  onMutationAdded(mutation: Mutation): void
  onDone(mutations: Mutation[]): void
  onCancel(): void
}

const PANEL_ID = '__abs_editor_panel'
const mutations: Mutation[] = []

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function fieldStyle(extra = ''): string {
  return `width:100%; margin-top:4px; padding:7px 8px; border:1px solid #d1d5db; border-radius:6px; box-sizing:border-box; font-size:12px; ${extra}`
}

function label(text: string): string {
  return `<label style="font-size:11px;color:#6b7280;font-weight:600">${text}</label>`
}

function renderTextControls(state: EditorFormState): string {
  const input = state.text.length > 56
    ? `<textarea data-abs-field="text" rows="4" style="${fieldStyle('resize:vertical')}">${escapeHtml(state.text)}</textarea>`
    : `<input data-abs-field="text" value="${escapeHtml(state.text)}" style="${fieldStyle()}" placeholder="새 문구 입력" />`
  return `
    <div style="margin-bottom:12px">
      ${label('문구')}
      ${input}
    </div>
  `
}

function renderColorControls(state: EditorFormState): string {
  const presets = [
    ['#2563eb', '파란 CTA'],
    ['#16a34a', '초록 CTA'],
    ['#111827', '검정 CTA'],
    ['#dc2626', '빨간 CTA']
  ]

  return `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">
      <div>
        ${label('배경색')}
        <input data-abs-field="backgroundColor" type="color" value="${escapeHtml(state.backgroundColor)}" style="${fieldStyle('height:34px;padding:3px')}" />
      </div>
      <div>
        ${label('글자색')}
        <input data-abs-field="textColor" type="color" value="${escapeHtml(state.textColor)}" style="${fieldStyle('height:34px;padding:3px')}" />
      </div>
    </div>
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">
      ${presets.map(([color, name]) => `
        <button type="button" data-abs-color-preset="${color}" style="
          border:1px solid #e5e7eb; border-radius:999px; padding:4px 8px;
          background:${color}; color:${color === '#111827' ? '#fff' : '#f9fafb'};
          cursor:pointer; font-size:11px;
        ">${name}</button>
      `).join('')}
    </div>
  `
}

function renderSizeControls(state: EditorFormState): string {
  return `
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:12px">
      <div>
        ${label('글자 크기')}
        <input data-abs-field="fontSize" type="number" min="0" value="${escapeHtml(state.fontSize)}" style="${fieldStyle()}" placeholder="16" />
      </div>
      <div>
        ${label('너비')}
        <input data-abs-field="width" type="number" min="0" value="${escapeHtml(state.width)}" style="${fieldStyle()}" placeholder="자동" />
      </div>
      <div>
        ${label('높이')}
        <input data-abs-field="height" type="number" min="0" value="${escapeHtml(state.height)}" style="${fieldStyle()}" placeholder="자동" />
      </div>
    </div>
    <p style="font-size:11px;color:#9ca3af;margin:0 0 12px">숫자는 px 단위로 적용됩니다.</p>
  `
}

function renderLinkControls(state: EditorFormState): string {
  return `
    <div style="margin-bottom:12px">
      ${label('이동할 URL')}
      <input data-abs-field="href" value="${escapeHtml(state.href)}" style="${fieldStyle()}" placeholder="/signup 또는 https://..." />
    </div>
  `
}

function renderImageControls(state: EditorFormState): string {
  return `
    <div style="margin-bottom:12px">
      ${label('이미지 URL')}
      <input data-abs-field="imageUrl" value="${escapeHtml(state.imageUrl)}" style="${fieldStyle()}" placeholder="https://example.com/image.png" />
    </div>
  `
}

function renderHideControls(): string {
  return `
    <div style="border:1px solid #fee2e2;background:#fef2f2;border-radius:8px;padding:10px;margin-bottom:12px">
      <div style="font-size:12px;font-weight:600;color:#991b1b;margin-bottom:3px">이 요소 숨기기</div>
      <p style="font-size:11px;color:#b91c1c;margin:0">variant에서만 이 요소가 보이지 않도록 처리합니다.</p>
    </div>
  `
}

function renderAdvancedControls(state: EditorFormState): string {
  return `
    <details open style="margin-bottom:12px">
      <summary style="font-size:12px;font-weight:600;color:#374151;cursor:pointer;margin-bottom:8px">고급 편집</summary>
      <div style="display:grid;gap:8px">
        <div>
          ${label('CSS Selector')}
          <input data-abs-field="selector" value="${escapeHtml(state.selector)}" style="${fieldStyle('font-family:monospace')}" />
        </div>
        <div>
          ${label('HTML 직접 변경')}
          <textarea data-abs-field="html" rows="3" style="${fieldStyle('resize:vertical')}">${escapeHtml(state.html)}</textarea>
          <button type="button" data-abs-advanced-action="advanced-html" style="margin-top:5px;border:1px solid #d1d5db;background:white;border-radius:5px;padding:4px 8px;font-size:11px;cursor:pointer">HTML 변경 선택</button>
        </div>
        <div>
          ${label('속성 변경')}
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">
            <input data-abs-field="attributeName" value="${escapeHtml(state.attributeName)}" style="${fieldStyle()}" placeholder="href" />
            <input data-abs-field="attributeValue" value="${escapeHtml(state.attributeValue)}" style="${fieldStyle()}" placeholder="값" />
          </div>
          <button type="button" data-abs-advanced-action="advanced-attribute" style="margin-top:5px;border:1px solid #d1d5db;background:white;border-radius:5px;padding:4px 8px;font-size:11px;cursor:pointer">속성 변경 선택</button>
        </div>
        <div>
          ${label('클래스 추가/삭제')}
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">
            <input data-abs-field="classAdd" value="${escapeHtml(state.classAdd)}" style="${fieldStyle()}" placeholder="추가할 클래스" />
            <input data-abs-field="classRemove" value="${escapeHtml(state.classRemove)}" style="${fieldStyle()}" placeholder="삭제할 클래스" />
          </div>
          <button type="button" data-abs-advanced-action="advanced-class" style="margin-top:5px;border:1px solid #d1d5db;background:white;border-radius:5px;padding:4px 8px;font-size:11px;cursor:pointer">클래스 변경 선택</button>
        </div>
      </div>
    </details>
  `
}

function renderControls(activeTab: EditorTabId, state: EditorFormState): string {
  switch (activeTab) {
    case 'text': return renderTextControls(state)
    case 'color': return renderColorControls(state)
    case 'size': return renderSizeControls(state)
    case 'link': return renderLinkControls(state)
    case 'image': return renderImageControls(state)
    case 'hide': return renderHideControls()
    case 'advanced': return renderAdvancedControls(state)
  }
}

function collectState(panel: HTMLElement, baseState: EditorFormState): EditorFormState {
  const field = (name: keyof EditorFormState): string => {
    const el = panel.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[data-abs-field="${name}"]`)
    return el?.value ?? baseState[name]
  }

  return {
    selector: field('selector'),
    text: field('text'),
    backgroundColor: field('backgroundColor'),
    textColor: field('textColor'),
    fontSize: field('fontSize'),
    width: field('width'),
    height: field('height'),
    href: field('href'),
    imageUrl: field('imageUrl'),
    html: field('html'),
    attributeName: field('attributeName'),
    attributeValue: field('attributeValue'),
    classAdd: field('classAdd'),
    classRemove: field('classRemove')
  }
}

function actionFor(activeTab: EditorTabId, panel: HTMLElement): MutationAction {
  if (activeTab !== 'advanced') return activeTab
  return (panel.dataset.absAdvancedAction as MutationAction | undefined) ?? 'advanced-html'
}

export function createEditorPanel(targetEl: Element, callbacks: EditorCallbacks): void {
  renderEditorPanel(targetEl, callbacks)
}

function renderEditorPanel(
  targetEl: Element,
  callbacks: EditorCallbacks,
  activeTab?: EditorTabId,
  previousState?: EditorFormState
): void {
  document.getElementById(PANEL_ID)?.remove()

  const selectorResult = generateSelector(targetEl)
  const config = getEditorConfig(targetEl)
  const selectedTab = activeTab ?? config.tabs[0].id
  const baseState = previousState ?? createEditorFormState(targetEl, selectorResult.selector)

  const panel = document.createElement('div')
  panel.id = PANEL_ID
  panel.dataset.absActiveTab = selectedTab
  panel.innerHTML = `
    <div style="
      position: fixed; top: 20px; right: 20px; z-index: 2147483647;
      background: white; border: 1px solid #e5e7eb; border-radius: 8px;
      padding: 14px; width: 320px; box-shadow: 0 4px 24px rgba(0,0,0,0.15);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 13px; color: #111827;
    ">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px">
        <strong>${config.title}</strong>
        <button id="__abs_panel_close" style="background:none;border:none;cursor:pointer;font-size:16px">✕</button>
      </div>

      <div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:12px">
        ${config.tabs.map((tab) => `
          <button type="button" data-abs-action="${tab.id}" style="
            border:1px solid ${tab.id === selectedTab ? '#111827' : '#e5e7eb'};
            background:${tab.id === selectedTab ? '#111827' : '#fff'};
            color:${tab.id === selectedTab ? '#fff' : '#374151'};
            border-radius:999px; padding:5px 9px; font-size:12px; cursor:pointer;
          ">${tab.label}</button>
        `).join('')}
      </div>

      ${renderControls(selectedTab, baseState)}

      <button id="__abs_preview_btn" style="
        width:100%; padding:7px; margin-bottom:6px; background:#2563eb;
        color:white; border:none; border-radius:6px; cursor:pointer; font-size:13px;
      ">미리보기</button>

      <button id="__abs_add_btn" style="
        width:100%; padding:7px; margin-bottom:6px; background:#111827;
        color:white; border:none; border-radius:6px; cursor:pointer; font-size:13px;
      ">변경사항 추가</button>

      ${mutations.length > 0 ? `
        <div style="font-size:11px;color:#6b7280;margin-bottom:8px">${mutations.length}개 변경사항 추가됨</div>
        <button id="__abs_done_btn" style="
          width:100%; padding:7px; background:#22c55e;
          color:white; border:none; border-radius:6px; cursor:pointer; font-size:13px;
        ">다음: 테스트 설정</button>
      ` : ''}
    </div>
  `

  document.body.appendChild(panel)

  panel.querySelector('#__abs_panel_close')!.addEventListener('click', () => {
    revertPreview()
    panel.remove()
    callbacks.onCancel()
  })

  panel.querySelectorAll<HTMLButtonElement>('[data-abs-action]').forEach((button) => {
    button.addEventListener('click', () => {
      renderEditorPanel(targetEl, callbacks, button.dataset.absAction as EditorTabId, collectState(panel, baseState))
    })
  })

  panel.querySelectorAll<HTMLButtonElement>('[data-abs-color-preset]').forEach((button) => {
    button.addEventListener('click', () => {
      const backgroundInput = panel.querySelector<HTMLInputElement>('[data-abs-field="backgroundColor"]')
      const textInput = panel.querySelector<HTMLInputElement>('[data-abs-field="textColor"]')
      if (backgroundInput) backgroundInput.value = button.dataset.absColorPreset ?? backgroundInput.value
      if (textInput) textInput.value = '#ffffff'
    })
  })

  panel.querySelectorAll<HTMLButtonElement>('[data-abs-advanced-action]').forEach((button) => {
    button.addEventListener('click', () => {
      panel.dataset.absAdvancedAction = button.dataset.absAdvancedAction
    })
  })

  panel.querySelector('#__abs_preview_btn')!.addEventListener('click', () => {
    const state = collectState(panel, baseState)
    const built = buildMutationsFromForm(actionFor(selectedTab, panel), state)
    if (built.length > 0) applyPreview([...mutations, ...built])
  })

  panel.querySelector('#__abs_add_btn')!.addEventListener('click', () => {
    const state = collectState(panel, baseState)
    const built = buildMutationsFromForm(actionFor(selectedTab, panel), state)
    if (built.length === 0) return
    mutations.push(...built)
    built.forEach((mutation) => callbacks.onMutationAdded(mutation))
    renderEditorPanel(targetEl, callbacks, selectedTab, state)
  })

  panel.querySelector('#__abs_done_btn')?.addEventListener('click', () => {
    revertPreview()
    panel.remove()
    callbacks.onDone([...mutations])
    mutations.length = 0
  })
}

export function destroyEditorPanel(): void {
  document.getElementById(PANEL_ID)?.remove()
  mutations.length = 0
  revertPreview()
}
