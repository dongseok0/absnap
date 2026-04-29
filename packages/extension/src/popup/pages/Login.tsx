import { useState } from 'react'
import { createApiClient } from '../../shared/api'
import type { AuthState } from '../../shared/types'

const API_BASE = (typeof __API_BASE__ !== 'undefined' ? __API_BASE__ : 'http://localhost:8787')

interface Props {
  onLogin(auth: AuthState): void
}

export default function Login({ onLogin }: Props) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<'login' | 'signup'>('login')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setNotice(null)
    try {
      const client = createApiClient(API_BASE, '')
      const res = mode === 'login'
        ? await client.login(email, password)
        : await client.signup(email, password)
      const user = res.user ?? (res.id ? { id: res.id, email: res.email ?? email } : null)

      if (!res.access_token || !user?.id) {
        if (mode === 'signup') {
          setNotice('가입 요청이 완료됐습니다. 이메일 확인 후 로그인해주세요.')
          setMode('login')
          return
        }
        throw new Error('로그인 응답에 세션 정보가 없습니다')
      }

      onLogin({
        accessToken: res.access_token,
        refreshToken: res.refresh_token,
        expiresAt: res.expires_at,
        userId: user.id,
        email: user.email
      })
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4">
      <div className="flex items-center gap-2 mb-6">
        <span className="text-2xl font-bold text-gray-900">ABSnap</span>
        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Beta</span>
      </div>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="text-xs text-gray-500 block mb-1">이메일</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">비밀번호</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        {notice && <p className="text-xs text-blue-600">{notice}</p>}
        {error && <p className="text-xs text-red-500">{error}</p>}
        <button type="submit" disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
          {loading ? '처리 중...' : mode === 'login' ? '로그인' : '회원가입'}
        </button>
        <button type="button" onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
          className="w-full text-xs text-gray-400 hover:text-gray-600">
          {mode === 'login' ? '계정이 없으신가요? 회원가입' : '이미 계정이 있으신가요? 로그인'}
        </button>
      </form>
    </div>
  )
}
