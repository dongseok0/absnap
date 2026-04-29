import { useState, useEffect } from 'react'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import TestCreate from './pages/TestCreate'
import TestDetail from './pages/TestDetail'
import Settings from './pages/Settings'
import { ApiError, createApiClient } from '../shared/api'
import type { AuthState, Site } from '../shared/types'

const POPUP_PAGE_STORAGE_KEY = 'absnap_popup_page'
const API_BASE = (typeof __API_BASE__ !== 'undefined' ? __API_BASE__ : 'http://localhost:8787')

type Page =
  | { name: 'login' }
  | { name: 'dashboard' }
  | { name: 'create' }
  | { name: 'detail'; testId: string }
  | { name: 'settings' }

export default function App() {
  const [auth, setAuth] = useState<AuthState | null>(null)
  const [page, setPage] = useState<Page>({ name: 'login' })
  const [activeSite, setActiveSite] = useState<Site | null>(null)
  const [loading, setLoading] = useState(true)
  const [resolvingSite, setResolvingSite] = useState(false)
  const [dashboardRefreshKey, setDashboardRefreshKey] = useState(0)

  useEffect(() => {
    chrome.runtime.sendMessage({ type: 'GET_AUTH' }).then(async (res: { ok: boolean; data: AuthState | null }) => {
      if (res.ok && res.data) {
        setAuth(res.data)
        setPage(await getSavedPage())
      }
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    if (!auth || page.name === 'login') return
    chrome.storage.local.set({ [POPUP_PAGE_STORAGE_KEY]: page }).catch(() => {/* ignore */})
  }, [auth, page])

  useEffect(() => {
    if (!auth || activeSite) return

    let cancelled = false
    const currentAuth = auth

    async function clearExpiredAuth() {
      await chrome.runtime.sendMessage({ type: 'CLEAR_AUTH' }).catch(() => {/* ignore */})
      await chrome.storage.local.remove(POPUP_PAGE_STORAGE_KEY).catch(() => {/* ignore */})
      if (cancelled) return
      setAuth(null)
      setActiveSite(null)
      setResolvingSite(false)
      setPage({ name: 'login' })
    }

    async function refreshAuth(): Promise<AuthState | null> {
      const refreshToken = currentAuth.refreshToken
      if (!refreshToken) return null

      try {
        const res = await createApiClient(API_BASE, '').refresh(refreshToken)
        if (!res.access_token) return null

        const nextAuth: AuthState = {
          ...currentAuth,
          accessToken: res.access_token,
          refreshToken: res.refresh_token ?? refreshToken,
          expiresAt: res.expires_at
        }
        await chrome.runtime.sendMessage({ type: 'SET_AUTH', payload: nextAuth })
        if (cancelled) return null
        setAuth(nextAuth)
        return nextAuth
      } catch {
        return null
      }
    }

    async function selectSiteForCurrentTab() {
      setResolvingSite(true)
      const domain = await getCurrentTabDomain()
      if (!domain || cancelled) {
        if (!cancelled) setResolvingSite(false)
        return
      }

      try {
        const api = createApiClient(API_BASE, currentAuth.accessToken)
        const sites = await api.getSites()
        if (cancelled) return

        const existing = sites.find((site) => normalizeDomain(site.domain) === domain)
        if (existing) {
          setActiveSite(existing)
          return
        }

        const site = await api.createSite(domain, domain)
        if (!cancelled) setActiveSite(site)
      } catch (err) {
        if (!cancelled && isExpiredAuthError(err)) {
          const refreshed = await refreshAuth()
          if (!refreshed && !cancelled) await clearExpiredAuth()
        }
        // Dashboard and TestCreate still expose manual recovery paths.
      } finally {
        if (!cancelled) setResolvingSite(false)
      }
    }

    selectSiteForCurrentTab()

    return () => {
      cancelled = true
    }
  }, [auth, activeSite])

  useEffect(() => {
    if (activeSite && resolvingSite) setResolvingSite(false)
  }, [activeSite, resolvingSite])

  async function handleLogin(authState: AuthState) {
    await chrome.runtime.sendMessage({ type: 'SET_AUTH', payload: authState })
    setAuth(authState)
    setPage({ name: 'dashboard' })
  }

  async function handleLogout() {
    await chrome.runtime.sendMessage({ type: 'CLEAR_AUTH' })
    await chrome.storage.local.remove(POPUP_PAGE_STORAGE_KEY).catch(() => {/* ignore */})
    setAuth(null)
    setActiveSite(null)
    setResolvingSite(false)
    setPage({ name: 'login' })
  }

  function handleCreated() {
    setDashboardRefreshKey((key) => key + 1)
    setPage({ name: 'dashboard' })
  }

  if (loading) {
    return <div className="flex items-center justify-center h-48 text-gray-400 text-sm">로딩 중...</div>
  }

  if (!auth || page.name === 'login') {
    return <Login onLogin={handleLogin} />
  }

  const commonProps = { auth, activeSite, setActiveSite, onLogout: handleLogout }

  switch (page.name) {
    case 'dashboard':
      return <Dashboard {...commonProps} refreshKey={dashboardRefreshKey} resolvingSite={resolvingSite} onNewTest={() => setPage({ name: 'create' })} onViewDetail={(id) => setPage({ name: 'detail', testId: id })} onSettings={() => setPage({ name: 'settings' })} />
    case 'create':
      return <TestCreate {...commonProps} onBack={() => setPage({ name: 'dashboard' })} onCreated={handleCreated} />
    case 'detail':
      return <TestDetail {...commonProps} testId={page.testId} onBack={() => setPage({ name: 'dashboard' })} />
    case 'settings':
      return <Settings {...commonProps} onBack={() => setPage({ name: 'dashboard' })} />
  }
}

async function getSavedPage(): Promise<Page> {
  try {
    const result = await chrome.storage.local.get(POPUP_PAGE_STORAGE_KEY)
    return parseSavedPage(result[POPUP_PAGE_STORAGE_KEY])
  } catch {
    return { name: 'dashboard' }
  }
}

function parseSavedPage(value: unknown): Page {
  if (!value || typeof value !== 'object' || !('name' in value)) return { name: 'dashboard' }

  const page = value as { name: unknown; testId?: unknown }
  if (page.name === 'create' || page.name === 'settings' || page.name === 'dashboard') return { name: page.name }
  if (page.name === 'detail' && typeof page.testId === 'string') return { name: 'detail', testId: page.testId }
  return { name: 'dashboard' }
}

async function getCurrentTabDomain(): Promise<string | null> {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!tab?.url) return null
    const url = new URL(tab.url)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    return normalizeDomain(url.hostname)
  } catch {
    return null
  }
}

function normalizeDomain(value: string): string {
  const normalized = value.trim().toLowerCase()
  if (!normalized) return ''

  try {
    const url = new URL(normalized.includes('://') ? normalized : `https://${normalized}`)
    return stripWww(url.hostname)
  } catch {
    return stripWww(normalized.split('/')[0])
  }
}

function stripWww(hostname: string): string {
  return hostname.replace(/^www\./, '')
}

function isExpiredAuthError(err: unknown): boolean {
  if (err instanceof ApiError && err.status === 401) return true
  const message = err instanceof Error ? err.message.toLowerCase() : ''
  return message.includes('invalid or expired token') || message.includes('jwt expired') || message.includes('unauthorized') || message.includes('401')
}
