export type Env = {
  SUPABASE_URL: string
  SUPABASE_ANON_KEY: string
  SUPABASE_SERVICE_ROLE_KEY: string
  AUTH_REDIRECT_URL?: string
  CONFIG_BUCKET: R2Bucket
  ENVIRONMENT: string
}

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
  userId: string
  name: string
  domain: string
  createdAt: string
}

export interface ConfigJson {
  siteId: string
  tests: Array<{
    id: string
    status: string
    urlPattern: string
    trafficPercent: number
    variants: Variant[]
    goals: Goal[]
    createdAt: string
    startedAt?: string
  }>
}

export interface EventPayload {
  siteId: string
  session: {
    uid: string
    url: string
    ref?: string
    ua?: string
    ts: number
  }
  events: Array<{
    testId: string
    variantId: string
    goalId: string | null
    type: 'impression' | 'conversion'
    ts: number
  }>
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
