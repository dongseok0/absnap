import { useState, useEffect } from 'react'
import { createApiClient } from '../../shared/api'
import type { AuthState, Site } from '../../shared/types'

const API_BASE = (typeof __API_BASE__ !== 'undefined' ? __API_BASE__ : 'http://localhost:8787')
const CDN_BASE = (typeof __CDN_BASE__ !== 'undefined' ? __CDN_BASE__ : 'https://cdn.absnap.com')

interface Props {
  auth: AuthState
  activeSite: Site | null
  setActiveSite(s: Site | null): void
  onLogout(): void
  onBack(): void
}

export default function Settings({ auth, setActiveSite, onLogout, onBack }: Props) {
  const api = createApiClient(API_BASE, auth.accessToken)
  const [sites, setSites] = useState<Site[]>([])
  const [newName, setNewName] = useState('')
  const [newDomain, setNewDomain] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => { api.getSites().then(setSites) }, [])

  async function handleAddSite(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError(null)
    try {
      const site = await api.createSite(newName, newDomain)
      setSites((prev) => [site, ...prev])
      setActiveSite(site)
      setNewName(''); setNewDomain('')
      onBack()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100">
        <button onClick={onBack} className="text-gray-400 hover:text-gray-600">←</button>
        <span className="font-semibold text-sm text-gray-900">설정</span>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        <section>
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">사이트 추가</h2>
          <form onSubmit={handleAddSite} className="space-y-2">
            <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="사이트 이름" required
              className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm" />
            <input value={newDomain} onChange={(e) => setNewDomain(e.target.value)} placeholder="도메인 (예: example.com)" required
              className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm" />
            {error && <p className="text-xs text-red-500">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full py-1.5 bg-blue-600 text-white rounded text-sm disabled:opacity-50">
              {loading ? '추가 중...' : '사이트 추가'}
            </button>
          </form>
        </section>

        {sites.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">등록된 사이트</h2>
            {sites.map((site) => (
              <div key={site.id} className="border border-gray-100 rounded p-2 mb-2">
                <div className="text-sm font-medium text-gray-800">{site.name}</div>
                <div className="text-xs text-gray-400 mb-2">{site.domain}</div>
                <div className="bg-gray-50 rounded p-2 text-xs font-mono text-gray-600 break-all">
                  {'<script src="'}{CDN_BASE}{'/ab.js"'}<br />
                  {'  data-site="'}{site.id}{'">'}<br />
                  {'</script>'}
                </div>
                <p className="text-xs text-gray-400 mt-1">위 코드를 사이트 &lt;head&gt;에 추가하세요</p>
              </div>
            ))}
          </section>
        )}

        <section>
          <div className="text-xs text-gray-400 mb-1">{auth.email}</div>
          <button onClick={onLogout} className="text-xs text-red-400 hover:text-red-600">로그아웃</button>
        </section>
      </div>
    </div>
  )
}
