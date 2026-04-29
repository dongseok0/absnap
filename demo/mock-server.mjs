/**
 * ABSnap Mock API Server
 * ----------------------
 * Runs on http://localhost:8787 — no Supabase required.
 * All data is kept in memory; restarting resets everything.
 *
 * Usage:
 *   node demo/mock-server.mjs
 */

import { createServer } from 'http'
import { randomUUID } from 'crypto'

// ── In-memory store ─────────────────────────────────────────────────────────

const store = {
  users: [
    { id: 'user_001', email: 'test@example.com', password: 'password' }
  ],
  sites: [
    {
      id: 'demo_site_001',
      userId: 'user_001',
      name: 'Demo Site',
      domain: 'localhost',
      createdAt: new Date().toISOString()
    }
  ],
  tests: [],
  events: [],
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function json(res, status, body) {
  const payload = JSON.stringify(body, null, 2)
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  })
  res.end(payload)
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', chunk => data += chunk)
    req.on('end', () => {
      try { resolve(data ? JSON.parse(data) : {}) }
      catch { reject(new Error('Invalid JSON')) }
    })
    req.on('error', reject)
  })
}

function mockResults(test) {
  const goals = test.goals ?? []
  const variants = test.variants ?? []

  // Simulate some data: control gets 3% CR, variant gets 4.2% CR
  const control = variants.find(v => v.id === 'control') ?? variants[0]
  const variant = variants.find(v => v.id !== 'control') ?? variants[1]

  if (!control || !variant) return null

  const controlImpressions = 843
  const variantImpressions = 857
  const analysisMap = {}
  const controlConversions = {}
  const variantConversions = {}
  const controlRates = {}
  const variantRates = {}

  for (const goal of goals) {
    const cc = 25   // 3.0% CR for control
    const vc = 36   // 4.2% CR for variant
    controlConversions[goal.id] = cc
    variantConversions[goal.id] = vc
    controlRates[goal.id] = cc / controlImpressions
    variantRates[goal.id] = vc / variantImpressions

    // Simple z-test calculation
    const p1 = vc / variantImpressions
    const p2 = cc / controlImpressions
    const pPool = (vc + cc) / (variantImpressions + controlImpressions)
    const se = Math.sqrt(pPool * (1 - pPool) * (1 / variantImpressions + 1 / controlImpressions))
    const z = se > 0 ? (p1 - p2) / se : 0
    const confidence = Math.min(0.97, 0.5 + Math.abs(z) * 0.15)
    const lift = p2 > 0 ? (p1 - p2) / p2 : 0

    analysisMap[goal.id] = {
      lift,
      confidence,
      significant: confidence >= 0.95,
      recommendedSampleSize: 1600,
      estimatedDaysRemaining: confidence >= 0.95 ? 0 : 4,
    }
  }

  const startedAt = test.startedAt ?? test.createdAt
  const durationMs = Date.now() - new Date(startedAt).getTime()
  const days = Math.floor(durationMs / 86400000)
  const hours = Math.floor((durationMs % 86400000) / 3600000)
  const duration = days > 0 ? `${days}d ${hours}h` : `${hours}h`

  return {
    testId: test.id,
    status: test.status,
    duration,
    variants: [
      {
        id: control.id,
        impressions: controlImpressions,
        conversions: controlConversions,
        conversionRate: controlRates,
      },
      {
        id: variant.id,
        impressions: variantImpressions,
        conversions: variantConversions,
        conversionRate: variantRates,
      },
    ],
    analysis: analysisMap,
  }
}

// ── Router ───────────────────────────────────────────────────────────────────

async function router(req, res) {
  const url = new URL(req.url, 'http://localhost:8787')
  const path = url.pathname
  const method = req.method

  // CORS preflight
  if (method === 'OPTIONS') { json(res, 204, {}); return }

  console.log(`  ${method} ${path}`)

  // ── Auth ──────────────────────────────────────────────────────────────────

  if (path === '/auth/login' && method === 'POST') {
    const { email, password } = await readBody(req)
    const user = store.users.find(u => u.email === email && u.password === password)
    if (!user) return json(res, 401, { error: 'Invalid email or password' })
    return json(res, 200, {
      access_token: `mock-token-${user.id}`,
      user: { id: user.id, email: user.email }
    })
  }

  if (path === '/auth/signup' && method === 'POST') {
    const { email, password } = await readBody(req)
    if (store.users.find(u => u.email === email)) {
      return json(res, 400, { error: 'Email already registered' })
    }
    const user = { id: `user_${randomUUID().slice(0, 8)}`, email, password }
    store.users.push(user)
    // Auto-create a site for new users
    store.sites.push({
      id: `site_${randomUUID().slice(0, 8)}`,
      userId: user.id,
      name: 'My First Site',
      domain: 'example.com',
      createdAt: new Date().toISOString()
    })
    return json(res, 201, {
      access_token: `mock-token-${user.id}`,
      user: { id: user.id, email: user.email }
    })
  }

  // ── Require auth from here ────────────────────────────────────────────────

  const authHeader = req.headers['authorization'] ?? ''
  const token = authHeader.replace('Bearer ', '')
  const userId = token.startsWith('mock-token-') ? token.replace('mock-token-', '') : null
  if (!userId) return json(res, 401, { error: 'Unauthorized' })
  const currentUser = store.users.find(u => u.id === userId)
  if (!currentUser) return json(res, 401, { error: 'Unauthorized' })

  // ── Sites ─────────────────────────────────────────────────────────────────

  if (path === '/sites' && method === 'GET') {
    return json(res, 200, store.sites.filter(s => s.userId === userId))
  }

  if (path === '/sites' && method === 'POST') {
    const { name, domain } = await readBody(req)
    const site = {
      id: `site_${randomUUID().slice(0, 8)}`,
      userId,
      name,
      domain,
      createdAt: new Date().toISOString()
    }
    store.sites.push(site)
    return json(res, 201, site)
  }

  // ── Tests ─────────────────────────────────────────────────────────────────

  if (path === '/tests' && method === 'GET') {
    const siteId = url.searchParams.get('siteId')
    return json(res, 200, store.tests.filter(t => t.siteId === siteId))
  }

  if (path === '/tests' && method === 'POST') {
    const body = await readBody(req)
    const test = {
      id: `test_${randomUUID().slice(0, 8)}`,
      status: 'paused',
      createdAt: new Date().toISOString(),
      ...body,
    }
    store.tests.push(test)
    return json(res, 201, test)
  }

  const testMatch = path.match(/^\/tests\/([^/]+)$/)
  if (testMatch) {
    const testId = testMatch[1]
    const idx = store.tests.findIndex(t => t.id === testId)

    if (method === 'PATCH') {
      if (idx === -1) return json(res, 404, { error: 'Test not found' })
      const updates = await readBody(req)
      if (updates.status === 'running' && !store.tests[idx].startedAt) {
        updates.startedAt = new Date().toISOString()
      }
      store.tests[idx] = { ...store.tests[idx], ...updates }
      return json(res, 200, store.tests[idx])
    }

    if (method === 'DELETE') {
      if (idx !== -1) store.tests.splice(idx, 1)
      return json(res, 204, {})
    }
  }

  const publishMatch = path.match(/^\/tests\/([^/]+)\/publish$/)
  if (publishMatch && method === 'POST') {
    const testId = publishMatch[1]
    const test = store.tests.find(t => t.id === testId)
    if (!test) return json(res, 404, { error: 'Test not found' })
    console.log(`  → Published config for test "${test.name}"`)
    return json(res, 200, { published: true })
  }

  // ── Events ────────────────────────────────────────────────────────────────

  if (path === '/events' && method === 'POST') {
    const body = await readBody(req)
    store.events.push(...(body.events ?? []))
    return json(res, 204, {})
  }

  // ── Results ───────────────────────────────────────────────────────────────

  const resultsMatch = path.match(/^\/results\/([^/]+)$/)
  if (resultsMatch && method === 'GET') {
    const testId = resultsMatch[1]
    const test = store.tests.find(t => t.id === testId)
    if (!test) return json(res, 404, { error: 'Test not found' })
    const results = mockResults(test)
    if (!results) return json(res, 404, { error: 'No results yet' })
    return json(res, 200, results)
  }

  // ── 404 ───────────────────────────────────────────────────────────────────
  return json(res, 404, { error: `No route: ${method} ${path}` })
}

// ── Start ─────────────────────────────────────────────────────────────────

const PORT = 8787
createServer(async (req, res) => {
  try {
    await router(req, res)
  } catch (err) {
    console.error('  ✗ Error:', err.message)
    json(res, 500, { error: err.message })
  }
}).listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════╗
║   ABSnap Mock API  →  localhost:${PORT}   ║
╚══════════════════════════════════════════╝

Pre-loaded test account:
  email:    test@example.com
  password: password

Pre-loaded site:
  id:       demo_site_001
  name:     Demo Site
  domain:   localhost

All data is in-memory. Restart to reset.
`)
})
