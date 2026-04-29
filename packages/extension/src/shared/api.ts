import type { Site, Test, TestResult } from './types'

interface AuthResponse {
  access_token?: string
  refresh_token?: string
  expires_at?: number
  user?: { id: string; email: string }
  id?: string
  email?: string
}

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
    this.name = 'ApiError'
  }
}

async function request<T>(url: string, options: RequestInit): Promise<T> {
  const res = await fetch(url, options)
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText })) as {
      error?: string
      message?: string
      msg?: string
      error_code?: string
    }
    const detail = body.error ?? body.message ?? body.msg ?? body.error_code ?? res.statusText ?? `HTTP ${res.status}`
    throw new ApiError(detail, res.status)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export interface ApiClient {
  login(email: string, password: string): Promise<AuthResponse>
  signup(email: string, password: string): Promise<AuthResponse>
  refresh(refreshToken: string): Promise<AuthResponse>
  getSites(): Promise<Site[]>
  createSite(name: string, domain: string): Promise<Site>
  getTests(siteId: string): Promise<Test[]>
  createTest(data: { siteId: string; name: string; urlPattern: string; trafficPercent?: number; variants: unknown[]; goals: unknown[] }): Promise<Test>
  updateTest(testId: string, data: Partial<Pick<Test, 'status' | 'name' | 'variants' | 'goals' | 'trafficPercent'>>): Promise<Test>
  deleteTest(testId: string): Promise<void>
  publishTest(testId: string): Promise<{ published: boolean }>
  getResults(testId: string): Promise<TestResult>
}

export function createApiClient(baseUrl: string, token: string): ApiClient {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  }

  return {
    login: (email, password) => request(`${baseUrl}/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    }),
    signup: (email, password) => request(`${baseUrl}/auth/signup`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    }),
    refresh: (refreshToken) => request(`${baseUrl}/auth/refresh`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken })
    }),
    getSites: () => request<Site[]>(`${baseUrl}/sites`, { headers }),
    createSite: (name, domain) => request<Site>(`${baseUrl}/sites`, {
      method: 'POST', headers, body: JSON.stringify({ name, domain })
    }),
    getTests: (siteId) => request<Test[]>(`${baseUrl}/tests?siteId=${siteId}`, { headers }),
    createTest: (data) => request<Test>(`${baseUrl}/tests`, {
      method: 'POST', headers, body: JSON.stringify(data)
    }),
    updateTest: (testId, data) => request<Test>(`${baseUrl}/tests/${testId}`, {
      method: 'PATCH', headers, body: JSON.stringify(data)
    }),
    deleteTest: (testId) => request<void>(`${baseUrl}/tests/${testId}`, { method: 'DELETE', headers }),
    publishTest: (testId) => request<{ published: boolean }>(`${baseUrl}/tests/${testId}/publish`, {
      method: 'POST', headers
    }),
    getResults: (testId) => request<TestResult>(`${baseUrl}/results/${testId}`, { headers })
  }
}
