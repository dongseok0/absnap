import { useState, useEffect } from 'react'
import { createApiClient } from '../../shared/api'
import StatCard from '../components/StatCard'
import ConfidenceBadge from '../components/ConfidenceBadge'
import SiteSelector from '../components/SiteSelector'
import type { AuthState, Site, Test, TestResult } from '../../shared/types'

const API_BASE = (typeof __API_BASE__ !== 'undefined' ? __API_BASE__ : 'http://localhost:8787')

interface Props {
  auth: AuthState
  activeSite: Site | null
  setActiveSite(s: Site | null): void
  onLogout(): void
  onNewTest(): void
  onViewDetail(testId: string): void
  onSettings(): void
  refreshKey?: number
  resolvingSite?: boolean
}

export default function Dashboard({ auth, activeSite, setActiveSite, onNewTest, onViewDetail, onSettings, refreshKey = 0, resolvingSite = false }: Props) {
  const api = createApiClient(API_BASE, auth.accessToken)
  const [sites, setSites] = useState<Site[]>([])
  const [tests, setTests] = useState<Test[]>([])
  const [results, setResults] = useState<Record<string, TestResult>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getSites().then((ss) => {
      setSites(ss)
      if (!activeSite && ss.length > 0) setActiveSite(ss[0])
      if (!activeSite && ss.length === 0) setLoading(false)
    }).catch(() => {
      if (!activeSite) setLoading(false)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!activeSite) return
    setLoading(true)
    api.getTests(activeSite.id).then(async (ts) => {
      setTests(ts)
      const resultMap: Record<string, TestResult> = {}
      await Promise.all(
        ts.filter((t) => t.status === 'running').map(async (t) => {
          try { resultMap[t.id] = await api.getResults(t.id) } catch { /* no results yet */ }
        })
      )
      setResults(resultMap)
      setLoading(false)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSite?.id, refreshKey])

  async function handleStop(testId: string) {
    await api.updateTest(testId, { status: 'paused' })
    setTests((prev) => prev.map((t) => t.id === testId ? { ...t, status: 'paused' } : t))
  }

  const running = tests.filter((t) => t.status === 'running')
  const completed = tests.filter((t) => t.status !== 'running')

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
        <span className="font-bold text-gray-900">ABSnap</span>
        <div className="flex items-center gap-2">
          <SiteSelector sites={sites} activeSite={activeSite} onChange={setActiveSite} />
          <button onClick={onSettings} className="text-gray-400 hover:text-gray-600 text-base">⚙️</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {resolvingSite && activeSite === null ? (
          <div className="text-center py-8 text-gray-400 text-sm">현재 페이지 연결 중...</div>
        ) : loading ? (
          <div className="text-center py-8 text-gray-400 text-sm">로딩 중...</div>
        ) : activeSite === null ? (
          <div className="text-center py-8 text-gray-400 text-sm">
            <p>등록된 사이트가 없습니다</p>
            <button onClick={onSettings} className="mt-2 text-blue-500 text-xs underline">사이트 추가하기</button>
          </div>
        ) : (
          <>
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              활성 테스트 ({running.length})
            </h2>
            {running.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">실행 중인 테스트가 없습니다</p>
            )}
            {running.map((test) => {
              const res = results[test.id]
              const controlV = res?.variants.find((v) => v.id === 'control')
              const variantV = res?.variants.find((v) => v.id !== 'control')
              const firstGoal = test.goals[0]?.id
              const analysis = firstGoal ? res?.analysis[firstGoal] : undefined

              return (
                <div key={test.id} className="border border-gray-200 rounded-lg p-3">
                  <div className="font-medium text-sm text-gray-900 mb-0.5">{test.name}</div>
                  <div className="text-xs text-gray-400 mb-2">{test.urlPattern}</div>

                  {res && controlV && variantV && firstGoal ? (
                    <>
                      <div className="flex gap-2 mb-2">
                        <StatCard label="Control" rate={controlV.conversionRate[firstGoal] ?? 0} count={controlV.impressions} />
                        <StatCard label="Variant A" rate={variantV.conversionRate[firstGoal] ?? 0} count={variantV.impressions} isVariant lift={analysis?.lift} />
                      </div>
                      {analysis && <ConfidenceBadge confidence={analysis.confidence} />}
                    </>
                  ) : (
                    <p className="text-xs text-gray-400">데이터 수집 중...</p>
                  )}

                  <div className="flex gap-2 mt-2">
                    <button onClick={() => onViewDetail(test.id)} className="text-xs text-blue-500 hover:underline">상세</button>
                    <button onClick={() => handleStop(test.id)} className="text-xs text-gray-400 hover:text-red-500">중지</button>
                  </div>
                </div>
              )
            })}

            {completed.length > 0 && (
              <details className="mt-2">
                <summary className="text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer">
                  완료된 테스트 ({completed.length})
                </summary>
                <div className="mt-2 space-y-2">
                  {completed.map((t) => (
                    <div key={t.id} className="border border-gray-100 rounded-lg p-2">
                      <span className="text-sm text-gray-600">{t.name}</span>
                      <button onClick={() => onViewDetail(t.id)} className="ml-2 text-xs text-blue-500">보기</button>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </>
        )}
      </div>

      <div className="p-3 border-t border-gray-100">
        <button onClick={onNewTest} className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
          + 새 테스트 만들기
        </button>
      </div>
    </div>
  )
}
