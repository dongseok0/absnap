export type MutationType = 'text' | 'html' | 'style' | 'attribute' | 'visibility' | 'class' | 'image'

export interface Mutation {
  selector: string
  type: MutationType
  value?: string
  property?: string
  attribute?: string
  add?: string[]
  remove?: string[]
}

export interface Variant {
  id: string
  weight: number
  mutations?: Mutation[]
}

export interface Goal {
  id: string
  type: 'click' | 'pageview'
  selector?: string
  urlPattern?: string
}

export interface Test {
  id: string
  siteId: string
  name: string
  status: 'running' | 'paused' | 'completed'
  urlPattern: string
  trafficPercent: number
  variants: Variant[]
  goals: Goal[]
  createdAt: string
  startedAt?: string
  completedAt?: string
}

export interface Site {
  id: string
  name: string
  domain: string
  createdAt: string
}

export interface VariantResult {
  id: string
  impressions: number
  conversions: Record<string, number>
  conversionRate: Record<string, number>
}

export interface GoalAnalysis {
  lift: number
  confidence: number
  significant: boolean
  recommendedSampleSize: number
  estimatedDaysRemaining: number | null
}

export interface TestResult {
  testId: string
  status: string
  duration: string
  variants: VariantResult[]
  analysis: Record<string, GoalAnalysis>
}

export type ConfidenceLevel = 'insufficient' | 'trending' | 'significant' | 'strong'

export interface AuthState {
  accessToken: string
  refreshToken?: string
  expiresAt?: number
  userId: string
  email: string
}

export type BgMessage =
  | { type: 'GET_AUTH' }
  | { type: 'SET_AUTH'; payload: AuthState }
  | { type: 'CLEAR_AUTH' }
  | { type: 'ACTIVATE_EDITOR' }
  | { type: 'ACTIVATE_GOAL_PICKER'; payload?: { mutations?: Mutation[] } }

export type BgResponse<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string }
