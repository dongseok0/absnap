import { useState, useEffect } from 'react'
import { createApiClient } from '../../shared/api'
import StatCard from '../components/StatCard'
import ConfidenceBadge from '../components/ConfidenceBadge'
import type { AuthState, Site, TestResult } from '../../shared/types'

const API_BASE = (typeof __API_BASE__ !== 'undefined' ? __API_BASE__ : 'http://localhost:8787')

interface Props {
  auth: AuthState
  activeSite: Site | null
  setActiveSite(s: Site | null): void
  onLogout(): void
  testId: string
  onBack(): void
}

export default function TestDetail({ auth, testId, onBack }: Props) {
  const api = createApiClient(API_BASE, auth.accessToken)
  const [results, setResults] = useState<TestResult | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getResults(testId)
      .then((res) => { setResults(res); setLoading(false) })
      .catch(() => setLoading(false))
  }, [testId])

  if (loading) return <div className="p-4 text-sm text-gray-400 text-center py-8">로딩 중...</div>

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100">
        <button onClick={onBack} className="text-gray-400 hover:text-gray-600">←</button>
        <span className="font-semibold text-sm text-gray-900 truncate">테스트 상세</span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {!results ? (
          <p className="text-sm text-gray-400 text-center py-8">결과가 아직 없습니다</p>
        ) : (
          <>
            <div className="flex justify-between text-xs text-gray-400">
              <span>기간: {results.duration}</span>
              <span className={`capitalize font-medium ${results.status === 'running' ? 'text-green-600' : 'text-gray-500'}`}>
                {results.status}
              </span>
            </div>

            {Object.entries(results.analysis).map(([goalId, analysis]) => {
              const control = results.variants.find((v) => v.id === 'control')
              const variant = results.variants.find((v) => v.id !== 'control')
              if (!control || !variant) return null

              return (
                <div key={goalId} className="border border-gray-200 rounded-lg p-3">
                  <div className="text-xs text-gray-500 mb-2 uppercase tracking-wide">목표: {goalId}</div>
                  <div className="flex gap-4 mb-3">
                    <StatCard label="Control" rate={control.conversionRate[goalId] ?? 0} count={control.impressions} />
                    <StatCard label="Variant A" rate={variant.conversionRate[goalId] ?? 0} count={variant.impressions} isVariant lift={analysis.lift} />
                  </div>
                  <ConfidenceBadge confidence={analysis.confidence} />
                  {analysis.estimatedDaysRemaining !== null && analysis.estimatedDaysRemaining > 0 && (
                    <p className="text-xs text-gray-400 mt-1">예상 잔여 기간: {analysis.estimatedDaysRemaining}일</p>
                  )}
                </div>
              )
            })}
          </>
        )}
      </div>
    </div>
  )
}
