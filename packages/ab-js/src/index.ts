import { injectAntiflicker, hideSelectors, showSelectors } from './antiflicker'
import { loadConfig } from './config'
import { matchesPattern } from './urlmatch'
import { assignVariant } from './assign'
import { applyMutations } from './mutate'
import { createEventTracker } from './events'
import { API_BASE, CDN_BASE } from './env'
import type { Goal, Test } from './types'
import type { EventTracker } from './events'
const ANTIFLICKER_TIMEOUT = 2000

;(function () {
  try {
    // Step 1: Inject anti-flicker CSS synchronously
    injectAntiflicker()

    // Step 2: Extract SITE_ID from script tag
    const script = document.currentScript as HTMLScriptElement | null
    const siteId = script?.getAttribute('data-site')
    if (!siteId) return

    const tracker = createEventTracker(siteId, API_BASE)

    // Step 3: Flush on page-leave
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') tracker.flush()
    })

    // Step 4: Async — load config and apply tests
    const flicker: string[] = []
    let flickerTimerId: ReturnType<typeof setTimeout> | null = null

    loadConfig(siteId, CDN_BASE).then((config) => {
      if (!config?.tests?.length) return

      for (const test of config.tests) {
        if (test.status !== 'running') continue
        if (!matchesPattern(test.urlPattern, location.href)) continue

        const variantId = assignVariant(test)

        if (variantId === 'excluded') continue

        if (variantId === 'control') {
          tracker.push({ testId: test.id, variantId, goalId: null, type: 'impression', ts: Date.now() })
          attachGoalTracking(test, variantId, tracker)
          continue
        }

        const variant = test.variants.find((v) => v.id === variantId)
        if (!variant?.mutations?.length) {
          tracker.push({ testId: test.id, variantId, goalId: null, type: 'impression', ts: Date.now() })
          attachGoalTracking(test, variantId, tracker)
          continue
        }

        const selectors = variant.mutations.map((m) => m.selector)
        flicker.push(...selectors)

        if (!flickerTimerId) {
          flickerTimerId = setTimeout(() => showSelectors(flicker), ANTIFLICKER_TIMEOUT)
        }

        hideSelectors(selectors)

        const applyAndReveal = () => {
          applyMutations(variant.mutations!)
          showSelectors(selectors)
          if (flickerTimerId) { clearTimeout(flickerTimerId); flickerTimerId = null }

          tracker.push({ testId: test.id, variantId, goalId: null, type: 'impression', ts: Date.now() })
          attachGoalTracking(test, variantId, tracker)
        }

        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', applyAndReveal, { once: true })
        } else {
          applyAndReveal()
        }
      }
    }).catch(() => {
      showSelectors(flicker)
      if (flickerTimerId) clearTimeout(flickerTimerId)
    })
  } catch {
    // Top-level fail-silent
  }
})()

function attachGoalTracking(test: Test, variantId: string, tracker: EventTracker): void {
  const trackPageviewGoals = () => {
    for (const goal of test.goals) {
      if (goal.type === 'pageview' && goal.urlPattern && matchesPattern(goal.urlPattern, location.href)) {
        tracker.push({ testId: test.id, variantId, goalId: goal.id, type: 'conversion', ts: Date.now() })
      }
    }
  }

  for (const goal of test.goals) {
    if (goal.type === 'click' && goal.selector) {
      document.querySelectorAll(goal.selector).forEach((el) => {
        el.addEventListener('click', () => {
          tracker.push({ testId: test.id, variantId, goalId: goal.id, type: 'conversion', ts: Date.now() })
        }, { once: true })
      })
    }
  }

  trackPageviewGoals()
  addSpaPageviewListeners(test, variantId, trackPageviewGoals)
}

function addSpaPageviewListeners(test: Test, variantId: string, trackPageviewGoals: () => void): void {
  if (!hasPageviewGoals(test.goals)) return

  const key = `__abs_pv_${test.id}_${variantId}`
  const win = window as unknown as Record<string, boolean>
  if (win[key]) return
  win[key] = true

  window.addEventListener('popstate', trackPageviewGoals)
  window.addEventListener('hashchange', trackPageviewGoals)
}

function hasPageviewGoals(goals: Goal[]): boolean {
  return goals.some((goal) => goal.type === 'pageview' && Boolean(goal.urlPattern))
}
