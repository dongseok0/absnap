import type { AuthState, BgMessage, BgResponse, Mutation } from '../shared/types'

const AUTH_STORAGE_KEY = 'absnap_auth'
const PENDING_MUTATIONS_KEY = 'absnap_pending_mutations'
const PENDING_GOAL_SELECTOR_KEY = 'absnap_pending_goal_selector'

async function getAuth(): Promise<AuthState | null> {
  const result = await chrome.storage.local.get(AUTH_STORAGE_KEY)
  return (result[AUTH_STORAGE_KEY] as AuthState) ?? null
}

async function setAuth(auth: AuthState): Promise<void> {
  await chrome.storage.local.set({ [AUTH_STORAGE_KEY]: auth })
}

async function clearAuth(): Promise<void> {
  await chrome.storage.local.remove(AUTH_STORAGE_KEY)
}

chrome.runtime.onMessage.addListener(
  (message: BgMessage
    | { type: 'EDITOR_DONE'; payload: { mutations: Mutation[] } }
    | { type: 'GET_PENDING_MUTATIONS' }
    | { type: 'GOAL_SELECTED'; payload: { selector: string } }
    | { type: 'GET_PENDING_GOAL_SELECTOR' },
   _sender,
   sendResponse: (r: BgResponse) => void) => {
    (async () => {
      try {
        switch (message.type) {
          case 'GET_AUTH': {
            const auth = await getAuth()
            sendResponse({ ok: true, data: auth })
            break
          }
          case 'SET_AUTH': {
            await setAuth((message as { type: 'SET_AUTH'; payload: AuthState }).payload)
            sendResponse({ ok: true, data: null })
            break
          }
          case 'CLEAR_AUTH': {
            await clearAuth()
            sendResponse({ ok: true, data: null })
            break
          }
          case 'ACTIVATE_EDITOR':
          case 'ACTIVATE_GOAL_PICKER': {
            if (message.type === 'ACTIVATE_GOAL_PICKER') {
              const { payload } = message as { type: 'ACTIVATE_GOAL_PICKER'; payload?: { mutations?: Mutation[] } }
              if (payload?.mutations && payload.mutations.length > 0) {
                await chrome.storage.local.set({ [PENDING_MUTATIONS_KEY]: payload.mutations })
              }
            }

            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
            if (!tab?.id) throw new Error('No active tab')
            const contentMessage = { type: message.type }

            try {
              // Happy path: content script already live on this tab
              await chrome.tabs.sendMessage(tab.id, contentMessage)
            } catch {
              // Tab was open before the extension loaded/reloaded — inject now.
              // 'assets/content.js' is a stable filename set in vite.config.ts
              // rollupOptions.output.entryFileNames so it never has a hash suffix.
              await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['assets/content.js'],
              })
              // Give the script a tick to register its message listener
              await new Promise<void>((r) => setTimeout(r, 50))
              await chrome.tabs.sendMessage(tab.id, contentMessage)
            }

            sendResponse({ ok: true, data: null })
            break
          }
          case 'EDITOR_DONE': {
            // Popup is closed by the time this arrives — persist mutations so
            // TestCreate can read them when the popup reopens.
            const { payload } = message as { type: 'EDITOR_DONE'; payload: { mutations: Mutation[] } }
            await chrome.storage.local.set({ [PENDING_MUTATIONS_KEY]: payload.mutations })
            await chrome.action.openPopup?.().catch(() => {/* user can still reopen manually */})
            sendResponse({ ok: true, data: null })
            break
          }
          case 'GET_PENDING_MUTATIONS': {
            const result = await chrome.storage.local.get(PENDING_MUTATIONS_KEY)
            const mutations = (result[PENDING_MUTATIONS_KEY] as Mutation[]) ?? null
            // Consume and clear in one shot
            if (mutations) await chrome.storage.local.remove(PENDING_MUTATIONS_KEY)
            sendResponse({ ok: true, data: mutations })
            break
          }
          case 'GOAL_SELECTED': {
            const { payload } = message as { type: 'GOAL_SELECTED'; payload: { selector: string } }
            await chrome.storage.local.set({ [PENDING_GOAL_SELECTOR_KEY]: payload.selector })
            await chrome.action.openPopup?.().catch(() => {/* user can still reopen manually */})
            sendResponse({ ok: true, data: null })
            break
          }
          case 'GET_PENDING_GOAL_SELECTOR': {
            const result = await chrome.storage.local.get(PENDING_GOAL_SELECTOR_KEY)
            const selector = (result[PENDING_GOAL_SELECTOR_KEY] as string) ?? null
            if (selector) await chrome.storage.local.remove(PENDING_GOAL_SELECTOR_KEY)
            sendResponse({ ok: true, data: selector })
            break
          }
          default:
            sendResponse({ ok: false, error: 'Unknown message type' })
        }
      } catch (err) {
        sendResponse({ ok: false, error: (err as Error).message })
      }
    })()
    return true  // keep message channel open for async response
  }
)
