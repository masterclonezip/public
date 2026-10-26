# 🤖 AI SEO & ROUTING CHEAT SHEET (INSTANT PARSE)

**PURPOSE:** Read this in 5 seconds to instantly understand Platform routing, canonicals, SEO, and performance rules without making mistakes.

---

## 1. 🔗 CANONICAL URL RULES (The "One True URL")
**Format:** `https://example.com/<path>/<slug>`

* ✅ **ALWAYS:** Use `https://example.com/app/callbreak`
* ❌ **NEVER Trailing Slash:** `https://example.com/app/callbreak/` (Fails canonical match, triggers duplicate content penalty)
* ❌ **NEVER Query Params:** `https://example.com/app/callbreak?ref=search` (Dilutes SEO rank)
* ❌ **NEVER Non-WWW:** `https://example.com/...` (Canonical strictly enforces `www.example.com`)
* **Where to Apply:** `<link rel="canonical" href="...">`, `sitemap.xml`, and `<meta property="og:url">`.

---

## 2. 🗺️ INTERNAL ROUTE TAXONOMY & LINKING

### Frontend Navigation (React Router)
| Purpose | URL Route | Example | Rule |
| :--- | :--- | :--- | :--- |
| **App Detail Page** | `/app/:slug` | `/app/callbreak` | **MUST** use kebab-case `slug`. **NEVER** use database `id` (e.g. `/app/yh9toduxk` ❌). |
| **News Article** | `/news/:slug` | `/news/app-hub-is-live` | **MUST** use news `slug`. |
| **More Info Gateway** | `/moreinfo/:slug` | `/moreinfo/callbreak` | Neutral verification clearance portal before decryption. |
| **Static Legal / Trust** | `/about`, `/contact`, `/privacy`, `/terms`, `/disclaimer`, `/ethics`, `/notice`, `/responsibility`, `/report-removal`, `/developers`, `/news` | `/privacy` | Core trust and E-E-A-T pages. |
| **Admin Area** | `/admin`, `/admin/login` | `/admin` | Protected routes (lazy loaded, stripped in public repo split). |

### Internal Linking Rules for Code
* ✅ **React Components:** `<Link to="/app/callbreak">`
* ✅ **Client API Calls:** `fetch('/api/v1/public/secure-link')` (relative URL only)
* ❌ **NEVER Hardcode Hostnames:** Do not use `fetch('http://localhost:3000/api/...')` or `fetch('https://ais-dev.../api/...')`.
* ❌ **NEVER Use `<a>` For Internal Pages:** Standard anchor tags force full page reload and destroy SPA state. Always use `import { Link } from 'react-router-dom'`.

---

## 3. ⚡ PERFORMANCE & CORE WEB VITALS (100% PageSpeed)

### Rule A: Cloudinary Auto-Optimization
* ✅ **Always Wrap Images:** `getOptimizedImageUrl(app.icon, 96)` (injects `/upload/f_auto,q_auto,w_96/`).
* ❌ **Never Raw Image URLs:** `<img src={app.icon} />` loads uncompressed 2MB images and fails Google LCP.

### Rule B: Server-Side DOM Payload Trimming (`src/seoHelper.ts`)
* ✅ **Strip HTML strings in list responses:** `delete app.description_html` for all apps except the active `targetSlug`.
* ❌ **Never dump 200+ app HTMLs into `window.__INITIAL_DATA__`:** Keeps initial HTML <100 KB instead of 2.5 MB.

---

## 4. 🛡️ BACKEND SECURE LINK RESOLUTION & FALLBACK CHAIN

When resolving an app download link:
1. **In-Memory Cache:** Fast cache lookup (`LINK_CACHE_TTL`).
2. **Firestore Secret Vault:** Decrypts `sec_links_vault_3` using the Master Vault Key.
   * *Critical Note:* Google Cloud Project ID is `primary-firebase-project`. Database ID is `(default)`.
3. **High-Availability Fallback:** Reads `src/lib/public_backup.json` (server-side encrypted fallback).
4. **Public Sanitized Data:** `src/lib/staticData.json` is for UI mock fallback only — it **NEVER** contains raw or secret links.

---

## 5. 🚫 5 ZERO-TOLERANCE MISTAKES FOR AI AGENTS
1. **Do not modify `api/index.js` directly.** Modify `server.ts` or `src/server/routes/*`. The build script compiles `server.ts` into `api/index.js`.
2. **Do not use the word "APK" in UI buttons.** Main button is strictly `"Download"`. Gateway is `"Proceed"` or `"Click Here to Proceed"`.
3. **Do not add `<script type="speculationrules">`.** Triggers bot pre-fetches and creates false 4xx errors.
4. **Do not commit admin files without updating `.github/workflows/split-sync.yml`.**
5. **Do not break the `slug` URL pattern.** Always keep `/app/:slug` clean without trailing slashes.
