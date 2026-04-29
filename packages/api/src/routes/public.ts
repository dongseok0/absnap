import { Hono } from 'hono'
import type { Env } from '../types'

const publicRoutes = new Hono<{ Bindings: Env }>()

const privacyHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>ABSnap Privacy Policy</title>
    <style>
      body { margin: 0; font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #f8fafc; color: #0f172a; }
      main { max-width: 860px; margin: 0 auto; padding: 48px 20px; }
      h1 { margin: 0 0 8px; font-size: 32px; }
      h2 { margin: 32px 0 10px; font-size: 20px; }
      p, li { color: #334155; line-height: 1.65; }
      table { width: 100%; border-collapse: collapse; margin: 16px 0; background: white; }
      th, td { border: 1px solid #e2e8f0; padding: 10px 12px; text-align: left; vertical-align: top; }
      th { background: #f1f5f9; color: #0f172a; }
      code { background: #e2e8f0; border-radius: 4px; padding: 2px 4px; }
    </style>
  </head>
  <body>
    <main>
      <h1>ABSnap Privacy Policy</h1>
      <p><strong>Last updated:</strong> 2026-04-28</p>

      <h2>What ABSnap Does</h2>
      <p>ABSnap is an A/B testing tool that lets website owners visually edit their own websites and measure which version performs better.</p>

      <h2>Data Collected by the Chrome Extension</h2>
      <p>When you sign up, ABSnap stores your email address and authentication data for login. When you create sites and tests, ABSnap stores site names, domains, test settings, CSS selectors, mutations, and conversion goals that you configure.</p>
      <p>Your session token is stored locally in <code>chrome.storage.local</code> and is sent only to the ABSnap API as an Authorization header.</p>

      <h2>What the Extension Does Not Collect</h2>
      <ul>
        <li>Browsing history</li>
        <li>Passwords or form data from pages you visit</li>
        <li>Arbitrary page content from websites you visit</li>
        <li>Personal data of your website visitors</li>
      </ul>

      <h2>Data Collected by ab.js</h2>
      <p>When you embed <code>ab.js</code> on your website, ABSnap collects anonymous experiment events such as impressions and conversions. Events include a random anonymous visitor ID, page URL, referrer, user agent, timestamp, test ID, variant ID, goal ID, and event type.</p>

      <h2>How Data Is Used</h2>
      <table>
        <thead><tr><th>Data</th><th>Use</th></tr></thead>
        <tbody>
          <tr><td>Account data</td><td>Authentication only</td></tr>
          <tr><td>Site and test configuration</td><td>Serve variants and manage tests</td></tr>
          <tr><td>Anonymous event data</td><td>Compute conversion rates, lift, confidence, and sample size</td></tr>
        </tbody>
      </table>

      <h2>Storage and Retention</h2>
      <p>Account, site, test, and result data is stored in Supabase. Test configuration cache is stored in Cloudflare R2. Session tokens and visitor variant assignments are stored locally on user or visitor devices. Raw events are retained for 90 days; aggregated results are retained indefinitely.</p>

      <h2>Extension Permissions</h2>
      <table>
        <thead><tr><th>Permission</th><th>Why it is needed</th></tr></thead>
        <tbody>
          <tr><td><code>storage</code></td><td>Saves login session, settings, and pending editor state locally.</td></tr>
          <tr><td><code>tabs</code></td><td>Identifies the active tab so ABSnap targets the correct page.</td></tr>
          <tr><td><code>activeTab</code></td><td>Limits page access to the tab the user is actively viewing.</td></tr>
          <tr><td><code>scripting</code></td><td>Injects the visual editor only after explicit user action.</td></tr>
        </tbody>
      </table>

      <h2>Data Deletion</h2>
      <p>To request account and data deletion, email <a href="mailto:dongseok0@gmail.com">dongseok0@gmail.com</a>. Server-side data will be deleted within 30 days of request.</p>

      <h2>Contact</h2>
      <p>Questions? Email <a href="mailto:dongseok0@gmail.com">dongseok0@gmail.com</a>.</p>
    </main>
  </body>
</html>`

publicRoutes.get('/privacy', (c) => {
  return c.html(privacyHtml)
})

publicRoutes.get('/ab.js', async (c) => {
  const object = await c.env.CONFIG_BUCKET.get('ab.js')

  if (!object?.body) {
    return c.text('ab.js not found', 404)
  }

  return new Response(object.body, {
    headers: {
      'content-type': 'application/javascript; charset=utf-8',
      'cache-control': 'public, max-age=300'
    }
  })
})

export default publicRoutes
