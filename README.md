# ABSnap

Lightweight A/B testing with a visual editor. No code changes required on your site.

- **Chrome Extension** — point-and-click visual editor to build variant UI changes
- **~2KB client script** — drop one `<script>` tag; assigns variants, tracks conversions
- **Cloudflare Workers API** — edge-deployed, Supabase-backed, R2-cached config delivery
- **Real-time results** — two-proportion z-test, confidence levels, lift, sample-size ETA

---

## Table of Contents

- [Architecture](#architecture)
- [Quickstart (local, no Supabase)](#quickstart-local-no-supabase)
- [Full Setup](#full-setup)
  - [1. Supabase](#1-supabase)
  - [2. Cloudflare R2](#2-cloudflare-r2)
  - [3. API](#3-api)
  - [4. ab.js](#4-abjs)
  - [5. Chrome Extension](#5-chrome-extension)
- [How to Use](#how-to-use)
- [Development](#development)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Your website                                                   │
│  <script src="cdn.../ab.js" data-site="SITE_ID"></script>       │
│                                                                 │
│  ab.js (2KB)                                                    │
│  ├── fetch config from CDN (R2, 5-min cache)                    │
│  ├── assign visitor to variant (localStorage)                   │
│  ├── apply DOM mutations                                        │
│  └── batch events → POST /events                                │
└─────────────┬──────────────────────────┬────────────────────────┘
              │                          │
              ▼                          ▼
   ┌──────────────────┐      ┌──────────────────────┐
   │  Cloudflare R2   │      │  Cloudflare Workers  │
   │  config/{id}.json│      │  (Hono API)          │
   └──────────────────┘      │  /sites  /tests      │
                             │  /events /results    │
                             └──────────┬───────────┘
                                        │
                                        ▼
                             ┌──────────────────────┐
                             │  Supabase (Postgres) │
                             │  sites, tests,       │
                             │  events, results     │
                             └──────────────────────┘
                                        ▲
                             ┌──────────┴───────────┐
                             │  Chrome Extension    │
                             │  Visual editor       │
                             │  Dashboard           │
                             └──────────────────────┘
```

---

## Quickstart (local, no Supabase)

Test the full flow locally with the included mock API server. No credentials needed.

**Prerequisites:** Node.js 18+, pnpm, Chrome

```bash
# 1. Clone and install
git clone https://github.com/your-org/absnap.git
cd absnap
pnpm install

# 2. Start the mock API (replaces Cloudflare Workers + Supabase)
node demo/mock-server.mjs
# → http://localhost:8787
# → Pre-loaded: test@example.com / password

# 3. Build the extension (defaults to localhost:8787)
cd packages/extension
pnpm build

# 4. Load the extension in Chrome
#    chrome://extensions → Enable "Developer mode" → "Load unpacked" → select packages/extension/dist/

# 5. Serve the demo landing page
cd /path/to/absnap
npx serve .
# → open http://localhost:3000/demo/
```

Now open the ABSnap popup, log in with `test@example.com` / `password`, and create a test on the demo page.

---

## Full Setup

### 1. Supabase

1. Create a free project at [supabase.com](https://supabase.com)
2. Run the migration in **SQL Editor**:

```sql
-- paste contents of packages/api/migrations/001_initial.sql
```

3. Note your credentials from **Project Settings → API**:
   - Project URL
   - `anon` key
   - `service_role` key

### 2. Cloudflare R2

```bash
# Create the config bucket
npx wrangler r2 bucket create your-config-bucket

# Create a preview bucket for local dev
npx wrangler r2 bucket create your-config-preview-bucket
```

### 3. API

```bash
cd packages/api

# Set secrets (never go in wrangler.toml)
npx wrangler secret put SUPABASE_ANON_KEY
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY

# Configure non-secret runtime vars outside git.
# For local dev, put SUPABASE_URL in packages/api/.dev.vars.
# For deployed Workers, set SUPABASE_URL in the Cloudflare dashboard or with wrangler vars.

# Local dev
pnpm dev
# → http://localhost:8787

# Run tests
pnpm test
```

**Required env / secrets:**

| Name | Where | Description |
|---|---|---|
| `SUPABASE_URL` | Cloudflare var / `.dev.vars` | Supabase project URL |
| `SUPABASE_ANON_KEY` | wrangler secret | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | wrangler secret | Supabase service role key |
| `CONFIG_BUCKET` | `wrangler.toml` R2 binding | R2 bucket for config JSON |

### 4. ab.js

```bash
cd packages/ab-js

# Build with your production URLs
ABSNAP_API_BASE=$ABSNAP_API_BASE \
ABSNAP_CDN_BASE=$ABSNAP_CDN_BASE \
pnpm build
# → dist/ab.js (≤5KB gzip budget enforced)

# Upload dist/ab.js to your CDN-backed storage bucket
```

Embed in your site's `<head>`:

```html
<script src="$ABSNAP_CDN_BASE/ab.js" data-site="YOUR_SITE_ID"></script>
```

`YOUR_SITE_ID` is created when you add a site in the extension. Open **Settings** (⚙️), add your site, then copy the generated embed snippet shown under **등록된 사이트**. Use the `data-site` value from that snippet.

### 5. Chrome Extension

```bash
cd packages/extension

# Build against your production API
VITE_API_BASE=https://your-api.workers.dev pnpm build

# Load in Chrome:
# chrome://extensions → Developer mode → Load unpacked → packages/extension/dist/
```

---

## How to Use

### Add your site

1. Open the ABSnap extension → **Settings** (⚙️)
2. Enter your site name and domain → **사이트 추가**
3. Copy the generated embed snippet shown under **등록된 사이트** and add it to your site's `<head>`

### Create a test

1. Navigate to the page you want to test
2. Open the extension → **+ 새 테스트 만들기**
3. Click **에디터 열기** — the popup closes and a hover overlay activates
4. Click any element on the page — an edit panel appears
5. Choose a mutation type and enter the new value

   | Type | What it changes |
   |---|---|
   | 텍스트 변경 | Element's text content |
   | HTML 변경 | Inner HTML |
   | 스타일 변경 | CSS property (e.g. background color) |
   | 숨기기/보이기 | Element visibility |
   | 이미지 URL 변경 | `src` attribute |

6. Click **변경사항 추가** → add more elements if needed → **테스트 시작**
7. Click the extension icon again — the wizard resumes with your mutations saved
8. Set a **conversion goal**: click a button or visit a URL pattern
9. Name your test, set the URL pattern it runs on, adjust the traffic split
10. Click **테스트 시작 🚀** — the test is live immediately

### Read results

The dashboard shows live stats per test:

- **Impressions** — unique visitors who saw each variant
- **Conversion rate** — percentage who completed the goal
- **Lift** — relative change vs. control (+12%)
- **Confidence** — statistical significance

| Badge | Confidence | Meaning |
|---|---|---|
| 🔴 데이터 부족 | < 80% | Not enough data yet |
| 🟡 트렌드 보임 | 80–95% | Trending, keep running |
| 🟢 유의미 | 95–99% | Statistically significant |
| ✅ 강한 확신 | ≥ 99% | High confidence result |

Click **상세** on any test for a per-goal breakdown and an estimated days-remaining.

### Stop a test

Click **중지** on the dashboard. The test status changes to `paused` and ab.js stops assigning new visitors.

---

## Development

```bash
pnpm install          # install all packages from repo root
```

### Run everything locally

```bash
# Terminal 1 — mock API (or: cd packages/api && pnpm dev for real Workers)
node demo/mock-server.mjs

# Terminal 2 — extension (watch mode, rebuilds on save)
cd packages/extension && pnpm dev

# Terminal 3 — ab.js (watch mode)
cd packages/ab-js && pnpm build:watch

# Terminal 4 — demo page
npx serve .    # open http://localhost:3000/demo/
```

After any extension rebuild, go to `chrome://extensions` and click the **↺ refresh** button on ABSnap.

### Tests

```bash
pnpm test                        # run all packages
cd packages/api && pnpm test     # API unit tests (Hono routes, stats, middleware)
cd packages/ab-js && pnpm test   # ab.js unit tests (urlmatch, assign, mutate, events)
cd packages/extension && pnpm test  # extension unit tests (selector, mutations-preview, stats, api client)
```

### Type checking

```bash
cd packages/api && pnpm typecheck
cd packages/ab-js && pnpm typecheck
cd packages/extension && pnpm typecheck
```

### Environment variables at a glance

| Package | Variable | Default | Description |
|---|---|---|---|
| `api` | `SUPABASE_URL` | — | Supabase project URL |
| `api` | `SUPABASE_ANON_KEY` | — | Supabase anon key (secret) |
| `api` | `SUPABASE_SERVICE_ROLE_KEY` | — | Supabase service role key (secret) |
| `ab-js` | `ABSNAP_API_BASE` | `http://localhost:8787` | API base URL (build-time) |
| `ab-js` | `ABSNAP_CDN_BASE` | `http://localhost:4321` | CDN base URL (build-time) |
| `extension` | `VITE_API_BASE` | `http://localhost:8787` | API base URL (build-time) |
| `extension` | `VITE_CDN_BASE` | `http://localhost:4321` | CDN base URL (build-time) |

## Tech Stack

| Layer | Tech |
|---|---|
| API | [Hono](https://hono.dev) v4, [Cloudflare Workers](https://workers.cloudflare.com), [Supabase](https://supabase.com) |
| Database | Supabase PostgreSQL with Row Level Security |
| Config CDN | Cloudflare R2 |
| Client script | Vanilla TypeScript, [esbuild](https://esbuild.github.io) (IIFE, ≤5KB gzip) |
| Extension | React 18, Tailwind CSS v3, [Vite](https://vitejs.dev), [@crxjs/vite-plugin](https://crxjs.dev), Manifest V3 |
| Testing | [Vitest](https://vitest.dev), [happy-dom](https://github.com/capricorn86/happy-dom) |
| Statistics | Two-proportion z-test, Abramowitz & Stegun normal CDF approximation |

---

## Project Structure

```
absnap/
├── packages/
│   ├── api/                    # Cloudflare Workers API
│   │   ├── migrations/         # SQL schema (run once in Supabase)
│   │   └── src/
│   │       ├── index.ts        # Hono app entry + scheduled handler
│   │       ├── routes/         # auth, sites, tests, events, results
│   │       ├── lib/            # db, middleware, r2, stats, cron
│   │       └── types.ts
│   │
│   ├── ab-js/                  # ~2KB client script
│   │   ├── src/                # config, assign, mutate, events, antiflicker, urlmatch
│   │   ├── build.mjs           # esbuild config + size budget check
│   │   └── dist/ab.js          # built output
│   │
│   └── extension/              # Chrome Extension (MV3)
│       ├── src/
│       │   ├── background/     # service-worker.ts — auth + message broker
│       │   ├── content/        # visual editor injected into pages
│       │   ├── popup/          # React app (Login, Dashboard, TestCreate, TestDetail, Settings)
│       │   └── shared/         # types, api client, stats
│       ├── manifest.json
│       └── dist/               # built extension (load unpacked from here)
│
└── demo/
    ├── index.html              # sample landing page for local testing
    └── mock-server.mjs         # in-memory API server (no Supabase needed)
```

---

## Extension Permissions

The Chrome extension requests the minimum permissions needed to function. Here is why each one is required:

| Permission | Why |
|---|---|
| `storage` | Saves your login session (`chrome.storage.local`) and temporary editor state (mutations, goal selector) between popup opens |
| `tabs` | Reads active tab URL/domain context so ABSnap targets the editor and associates tests with the correct site |
| `activeTab` | Restricts tab access to only the tab currently in focus — no background tab access |
| `scripting` | Injects `assets/content.js` (the visual editor) into the active tab when you click "에디터 열기". Only fires on explicit user action, never automatically |
| `host_permissions` (API URL) | Allows fetch calls to the ABSnap backend for auth, test management, and results |
| `host_permissions` (CDN URL) | Allows fetching the `ab.js` embed snippet URL shown in Settings |

**The extension never injects scripts automatically.** The content script (visual editor) is injected only on explicit user action (`activeTab` + `scripting`), and only into the single tab that is active at the time.

---

## License

MIT
