import { useState, useEffect } from 'react'
import { createApiClient } from '../../shared/api'
import type { AuthState, Site, Mutation, Goal } from '../../shared/types'

const API_BASE = (typeof __API_BASE__ !== 'undefined' ? __API_BASE__ : 'http://localhost:8787')

interface Props {
  auth: AuthState
  activeSite: Site | null
  setActiveSite(s: Site | null): void
  onLogout(): void
  onBack(): void
  onCreated(): void
}

type Step = 'activate-editor' | 'set-goals' | 'configure' | 'done'

export default function TestCreate({ auth, activeSite, setActiveSite, onBack, onCreated }: Props) {
  const api = createApiClient(API_BASE, auth.accessToken)
  const [step, setStep] = useState<Step>('activate-editor')
  const [mutations, setMutations] = useState<Mutation[]>([])
  const [goals, setGoals] = useState<Goal[]>([])
  const [name, setName] = useState('')
  const [urlPattern, setUrlPattern] = useState('/*')
  const [traffic, setTraffic] = useState(50)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [goalType, setGoalType] = useState<'click' | 'pageview'>('click')
  const [goalSelector, setGoalSelector] = useState('.cta-button')
  const [goalUrl, setGoalUrl] = useState('/thank-you')

  // When popup opens, check if the editor already finished while popup was closed.
  // The service worker stores mutations in chrome.storage under PENDING_MUTATIONS_KEY.
  useEffect(() => {
    chrome.runtime.sendMessage<unknown, { ok: boolean; data: Mutation[] | null }>(
      { type: 'GET_PENDING_MUTATIONS' }
    ).then((res) => {
      if (res.ok && res.data && res.data.length > 0) {
        setMutations(res.data)
        setStep('set-goals')
      }
    }).catch(() => {/* ignore */})
  }, [])

  useEffect(() => {
    chrome.runtime.sendMessage<unknown, { ok: boolean; data: string | null }>(
      { type: 'GET_PENDING_GOAL_SELECTOR' }
    ).then((res) => {
      if (res.ok && res.data) {
        setGoalType('click')
        setGoalSelector(res.data)
      }
    }).catch(() => {/* ignore */})
  }, [])

  useEffect(() => {
    if (activeSite) return
    let cancelled = false

    api.getSites().then((sites) => {
      if (cancelled) return
      if (sites.length > 0) {
        setActiveSite(sites[0])
      } else {
        setError('등록된 사이트가 없습니다. 설정에서 사이트를 먼저 추가하세요.')
      }
    }).catch((err) => {
      if (!cancelled) setError((err as Error).message)
    })

    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSite?.id])

  async function activateEditor() {
    try {
      // Tell service worker to activate the content script on the current tab.
      // Content script is already injected by the manifest declaration — the
      // service worker just sends it a { type: 'ACTIVATE_EDITOR' } message.
      const res = await chrome.runtime.sendMessage<unknown, { ok: boolean; error?: string }>(
        { type: 'ACTIVATE_EDITOR' }
      )
      if (!res.ok) { setError(res.error ?? 'Unknown error'); return }
    } catch (err) {
      setError((err as Error).message)
      return
    }
    // Close popup so the user can interact with the page.
    // When done, the content script → service worker → chrome.storage → this
    // useEffect (on next popup open) brings mutations back.
    window.close()
  }

  function addGoal() {
    const goal: Goal = goalType === 'click'
      ? { id: `goal_${Date.now()}`, type: 'click', selector: goalSelector }
      : { id: `goal_${Date.now()}`, type: 'pageview', urlPattern: goalUrl }
    setGoals((prev) => [...prev, goal])
  }

  async function activateGoalPicker() {
    try {
      const res = await chrome.runtime.sendMessage<unknown, { ok: boolean; error?: string }>(
        { type: 'ACTIVATE_GOAL_PICKER', payload: { mutations } }
      )
      if (!res.ok) { setError(res.error ?? 'Unknown error'); return }
    } catch (err) {
      setError((err as Error).message)
      return
    }
    window.close()
  }

  async function handleCreate() {
    if (!name) return
    if (!activeSite) {
      setError('사이트 정보를 불러오는 중입니다. 잠시 후 다시 시도하세요.')
      return
    }
    setLoading(true); setError(null)
    try {
      const variants = [
        { id: 'control', weight: 100 - traffic },
        { id: 'variant_a', weight: traffic, mutations }
      ]
      const test = await api.createTest({ siteId: activeSite.id, name, urlPattern, trafficPercent: 100, variants, goals })
      await api.updateTest(test.id, { status: 'running' })
      await api.publishTest(test.id)
      onCreated()
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
        <span className="font-semibold text-sm text-gray-900">새 테스트 만들기</span>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {step === 'activate-editor' && (
          <div className="text-center py-6 space-y-3">
            <div className="text-4xl">🎨</div>
            <p className="text-sm text-gray-700">비주얼 에디터로 변경하고 싶은 요소를 클릭하세요</p>
            {error && <p className="text-xs text-red-500">{error}</p>}
            <button onClick={activateEditor}
              className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
              에디터 열기
            </button>
          </div>
        )}

        {step === 'set-goals' && (
          <div className="space-y-3">
            <div className="bg-green-50 border border-green-200 rounded p-2 text-xs text-green-700">
              ✓ {mutations.length}개 변경사항 수집됨
            </div>
            <h3 className="text-sm font-medium text-gray-900">전환 목표 설정</h3>
            <div>
              <select value={goalType} onChange={(e) => setGoalType(e.target.value as 'click' | 'pageview')}
                className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm mb-2">
                <option value="click">버튼 클릭</option>
                <option value="pageview">페이지 방문</option>
              </select>
              {goalType === 'click' ? (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input value={goalSelector} onChange={(e) => setGoalSelector(e.target.value)}
                      placeholder="CSS 셀렉터 (예: .cta-button)"
                      className="min-w-0 flex-1 border border-gray-300 rounded px-3 py-1.5 text-sm font-mono" />
                    <button type="button" onClick={activateGoalPicker}
                      className="shrink-0 px-3 py-1.5 bg-gray-900 text-white rounded text-xs hover:bg-gray-800">
                      페이지에서 선택
                    </button>
                  </div>
                  <p className="text-[11px] text-gray-400">직접 입력하거나 페이지에서 목표 버튼을 클릭해 선택하세요.</p>
                </div>
              ) : (
                <input value={goalUrl} onChange={(e) => setGoalUrl(e.target.value)}
                  placeholder="URL 패턴 (예: /thank-you)"
                  className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm font-mono" />
              )}
              <button onClick={addGoal} className="mt-2 w-full py-1.5 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200">
                목표 추가
              </button>
              {goals.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {goals.map((g) => (
                    <li key={g.id} className="text-xs text-gray-500 bg-gray-50 rounded px-2 py-1">
                      {g.type === 'click' ? `클릭: ${g.selector}` : `방문: ${g.urlPattern}`}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <button onClick={() => setStep('configure')} disabled={goals.length === 0}
              className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50">
              다음
            </button>
          </div>
        )}

        {step === 'configure' && (
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-500 block mb-1">테스트 이름</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 프라이싱 헤드라인 테스트"
                className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">URL 패턴</label>
              <input value={urlPattern} onChange={(e) => setUrlPattern(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm font-mono" />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Variant 트래픽 비율: {traffic}%</label>
              <input type="range" min={10} max={90} value={traffic} onChange={(e) => setTraffic(Number(e.target.value))}
                className="w-full" />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>Control: {100 - traffic}%</span>
                <span>Variant A: {traffic}%</span>
              </div>
            </div>
            {error && <p className="text-xs text-red-500">{error}</p>}
            <button onClick={handleCreate} disabled={loading || !name || !activeSite}
              className="w-full py-2 bg-green-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-green-700">
              {loading ? '생성 중...' : '테스트 시작 🚀'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
