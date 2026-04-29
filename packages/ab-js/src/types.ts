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
  status: 'running' | 'paused' | 'completed'
  urlPattern: string
  trafficPercent: number
  variants: Variant[]
  goals: Goal[]
  createdAt: string
  startedAt?: string
}

export interface SiteConfig {
  siteId: string
  tests: Test[]
}

export interface AbEvent {
  testId: string
  variantId: string
  goalId: string | null
  type: 'impression' | 'conversion'
  ts: number
}

export interface EventBatch {
  siteId: string
  session: {
    uid: string
    url: string
    ref: string
    ua: string
    ts: number
  }
  events: AbEvent[]
}
