import type { AbEvent, EventBatch } from './types'

const BATCH_INTERVAL = 5000
const BATCH_MAX_SIZE = 20
const UID_KEY = '_abs_uid'

function getOrCreateUid(): string {
  let uid = localStorage.getItem(UID_KEY)
  if (!uid) {
    uid = Math.random().toString(36).slice(2) + Date.now().toString(36)
    localStorage.setItem(UID_KEY, uid)
  }
  return uid
}

function send(siteId: string, apiBase: string, events: AbEvent[]): void {
  const payload: EventBatch = {
    siteId,
    session: {
      uid: getOrCreateUid(),
      url: location.href,
      ref: document.referrer,
      ua: navigator.userAgent,
      ts: Date.now()
    },
    events
  }
  const body = JSON.stringify(payload)
  const url = `${apiBase}/events`

  if (navigator.sendBeacon) {
    navigator.sendBeacon(url, body)
  } else {
    fetch(url, { method: 'POST', body, keepalive: true }).catch(() => { /* fail-silent */ })
  }
}

export interface EventTracker {
  push(event: AbEvent): void
  flush(): void
  destroy(): void
}

export function createEventTracker(siteId: string, apiBase: string): EventTracker {
  const queue: AbEvent[] = []
  let timer: ReturnType<typeof setInterval> | null = null

  function flush() {
    if (queue.length === 0) return
    const batch = queue.splice(0)
    send(siteId, apiBase, batch)
  }

  timer = setInterval(flush, BATCH_INTERVAL)

  return {
    push(event: AbEvent) {
      queue.push(event)
      if (queue.length >= BATCH_MAX_SIZE) flush()
    },
    flush,
    destroy() {
      if (timer !== null) clearInterval(timer)
      flush()
    }
  }
}
