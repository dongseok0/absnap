# ABSnap Privacy Policy

_Last updated: 2026-04-28_

## What ABSnap Does

ABSnap is an A/B testing tool. It lets you visually edit your website and measure which version performs better. It consists of three parts:

- **Chrome Extension** — lets you build and manage tests
- **ab.js client script** — runs on your website and assigns visitors to variants
- **API server** — stores test configurations and event data

---

## Data Collected by the Chrome Extension

### Account data
When you sign up, we store your **email address** and a hashed password on our servers (Supabase). This is used only for authentication.

### Site and test configuration
When you create a site or test, the following is stored on our servers:
- Site name and domain
- Test name, URL pattern, traffic split
- Variant definitions (CSS selectors + DOM mutations you configure)
- Goal definitions (CSS selectors or URL patterns)

This data is associated with your account and is only accessible by you.

### Auth tokens
Your session token is stored in `chrome.storage.local` on your device. It never leaves your browser except as an `Authorization` header sent to our API.

### What the extension does NOT collect
- Browsing history
- Passwords or form data from pages you visit
- Page content or text from websites you visit
- Personal data of your website's visitors

---

## Data Collected by ab.js (on your website)

When you embed `ab.js` on your website, it collects anonymous event data from your visitors:

| Field | Description |
|---|---|
| Anonymous UID | Random ID generated in `localStorage` — not linked to any personal identity |
| URL | The page URL where an event occurred |
| Referrer | HTTP referrer header |
| User agent | Browser/OS string |
| Timestamp | When the event occurred |
| Test & variant IDs | Which test and variant the visitor was assigned to |
| Goal ID | Which conversion goal was triggered (if any) |
| Event type | `impression` (page load) or `conversion` (goal completed) |

**No personal data is collected.** The anonymous UID is random and cannot be used to identify a visitor across sites or link to any real-world identity.

This data is sent to our API and aggregated to produce conversion rates and statistical results. Raw events are retained for 90 days; aggregated results are retained indefinitely.

---

## How Data Is Used

- **Account data** — authentication only
- **Test configuration** — to serve the correct variant to your visitors via the CDN config cache
- **Event data** — to compute conversion rates, lift, and statistical significance shown in the dashboard

We do not sell, share, or use your data for advertising.

---

## Data Storage

| Data | Where |
|---|---|
| Account, sites, tests, results | Supabase (PostgreSQL), hosted in the EU |
| Test config cache | Cloudflare R2 (edge CDN) |
| Session token | Your device only (`chrome.storage.local`) |
| Variant assignment | Your visitors' devices only (`localStorage`) |

---

## Permissions Used by the Chrome Extension

| Permission | Why it is needed |
|---|---|
| `storage` | Saves your login session and pending editor state locally on your device |
| `tabs` | Reads the active tab's ID to inject the visual editor into the correct page |
| `activeTab` | Restricts tab access to only the tab you are actively viewing |
| `scripting` | Injects the visual editor content script into the active tab when you click "에디터 열기" |
| `host_permissions` (API) | Allows the extension to communicate with the ABSnap backend |
| `host_permissions` (CDN) | Allows the extension to load the `ab.js` embed snippet from the CDN |

The extension **does not** inject scripts into pages automatically or in the background. The content script (visual editor) is only injected when you explicitly click "에디터 열기", and only into the tab that is currently active.

---

## Data Deletion

To delete your account and all associated data:
1. Open the extension → Settings → Log out
2. Email us at dongseok0@gmail.com requesting account deletion

All server-side data (account, sites, tests, events) will be deleted within 30 days of request.

---

## Changes to This Policy

If we make material changes, we will update the "Last updated" date above and notify users via the Chrome extension update notes.

---

## Contact

Questions? Email dongseok0@gmail.com.
