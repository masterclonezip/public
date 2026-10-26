# 360° More Information (`/moreinfo`) Security Gateway & Zero-Bot Edge Architecture Plan

This plan establishes a production-hardened, zero-leakage security architecture for the `/moreinfo` verification gateway—eliminating every discrepancy between the `MORE_INFO_SECURITY_ARCHITECTURE.md` specification and the live code running across Admin (`masterworld`), Public (`Dex`), Cloudflare Pages Edge (`functions/api/[[catchall]].js`), and Express (`server.ts`).

---

## User Review & Critical Decisions

> [!IMPORTANT]
> **Root-Cause Audit: Why Previous Code Scored Lower & Failed on the Live Public Website**
> Our deep inspection of the repository uncovered **5 critical architectural gaps** between the design specification (`MORE_INFO_SECURITY_ARCHITECTURE.md`) and the actual implementation:
> 1. **Client Bundle Vault Exposure & Bypass (`useClearanceDispatch.ts`)**: The client hook directly imported `ENCRYPTED_LINKS` and `safeDecrypt` from `src/lib/secureVault.ts`. This bundled all 230 encrypted links and AES keys into the public browser JavaScript and allowed the browser to locally decrypt links whenever the server returned `challenge_required` or `404`—bypassing server bot protection.
> 2. **Cloudflare Edge Decryption Failure (`functions/api/[[catchall]].js` & `split-sync.yml`)**: On the real public site (`www.rummydex.com`), Cloudflare Pages executes `functions/api/[[catchall]].js`, which had `const KNOWN_VAULT_KEYS = []` (empty) and `.github/workflows/split-sync.yml` deleted `src/lib/secureVault.ts` during repo split-sync. When raw links were stripped from `staticData.json`, Edge decryption failed whenever `env.AES_SECRET` was unset or differed.
> 3. **Missing 7-Wall Defense & CARE Engine on Cloudflare Edge (`functions/api/[[catchall]].js`)**: While Express (`securityRoutes.ts`) used the Central Adaptive Risk Engine (CARE), the Cloudflare Edge router lacked hardware/WebGL telemetry verification (`wb`, `hl`, `tr`, `cb`), dwell-time inspection, 3-click/10s burst detection, 30-minute IP quarantine, Upstash Redis REST integration, and disguised `404` ghosting.
> 4. **SEO & Schema Pollution on `/moreinfo/*` (`GatewayPage.tsx`, `schemaBuilder.ts`, `metaBuilder.ts`)**: Even though `/moreinfo` must have zero SEO footprint, `GatewayPage.tsx` injected `SoftwareApplication` Schema.org JSON-LD and canonical tags, while `schemaBuilder.ts` injected `WebSite` and `FAQPage` schemas on gateway routes.
> 5. **Disconnected Phantom 404 Trap (`GatewayPage.tsx`)**: When a bot or rapid burst was detected on the client, `GatewayPage.tsx` did not switch into the disguised **404 — Page Not Found** dead-end screen.

- **Confirmed Decision 1 — 100% Server & Edge RAM Decryption (Zero Client Vault Bundle)**: Remove `secureVault` imports and `resolveClientRamDestination` from `useClearanceDispatch.ts` so encrypted links and AES keys are **never** bundled into public browser JS. Decryption occurs exclusively inside Server/Edge RAM after passing all 7 security walls.
- **Confirmed Decision 2 — Full 7-Wall & CARE Parity at Cloudflare Edge + Upstash Redis REST**: Upgrade `functions/api/[[catchall]].js` and `securityRoutes.ts` to run the identical 7-Wall Sequential Defense, Central Adaptive Risk Engine (CARE), and Upstash Redis REST atomic nonce burn & 30-minute IP quarantine jail.
- **Confirmed Decision 3 — Total SEO, Schema & Crawler Airgap for `/moreinfo/*`**: Strip all JSON-LD schemas, canonical links, and OpenGraph tags from `/moreinfo/*`, enforce multi-bot `noindex, nofollow, noarchive, nosnippet`, block AI scraping agents in `robots.txt`, and activate the instant Phantom 404 trap on bot detection.

---

## 1. Overview & End-to-End System Workflow

- **What It Does**: Protects all external application download destinations behind an isolated, zero-index verification portal (`/moreinfo/:slug`) that verifies human presence via Cloudflare Turnstile + physical hardware/kinetic telemetry before decrypting destination links in Server/Edge RAM.
- **Admin-to-Public Lifecycle**:
  1. **Admin Link Entry (`Masterworld`)**: Admin enters or updates a target URL in the App Form. The URL is AES-256 encrypted and stored in Firestore (`apps_chunk_*` & `sec_vault`) and local server backup (`public_backup.json`).
  2. **Canonical Split-Sync Compilation**: When Admin triggers GitHub Sync, `useGitHubSync.ts` compiles:
     - `src/lib/staticData.json` & `src/lib/staticData.ts`: Public catalog metadata with **all raw and encrypted download URLs stripped** (`has_secure_link: true` boolean only).
     - `src/lib/secureVault.ts`: Self-contained server/edge module containing `ENCRYPTED_LINKS` and multi-key AES decryption helpers—consumed **only** by the backend Express server and Cloudflare Edge Function (`functions/api/[[catchall]].js`), never imported by client React code.
  3. **Public Gateway Verification (`Dex`)**: Visitor clicks **"Download"** on `/app/:slug` $\rightarrow$ navigates to `/moreinfo/:slug` $\rightarrow$ completes Cloudflare Turnstile + human pointer/touch verification $\rightarrow$ clicks **"Proceed"** $\rightarrow$ Edge/Server verifies all 7 walls, burns the single-use nonce in Upstash Redis/RAM, decrypts the target URL in RAM, and dispatches zero-referrer navigation.

---

## 2. User Experience, Neutral Vocabulary & Phantom 404 Disguise

- **Strict Neutral Vocabulary**:
  - Public App Details button strictly says **"Download"** (never "Download APK").
  - Gateway portal (`/moreinfo/:slug`) strictly uses neutral terminology: **"Verification Portal"**, **"Proceed"**, **"VERIFYING SECURITY..."**, **"CONNECTING TO SERVER..."**, **"RESOLVING LINK..."**.
- **Legitimate Human Flow (<100ms Resolution)**:
  - Borderless Cloudflare Turnstile widget loads cleanly via preloaded `<head>` script with `size: 'normal'` / responsive container and automatic retry.
  - Real humans on mobile or desktop pass seamlessly and navigate directly via zero-referrer top-level assignment (`window.location.assign`) with a 20-second ephemeral memory wipe and automatic tab-switch/back-button reset (`visibilitychange` & `pageshow`).
- **Autonomous AI Agent & Scraper Flow (Phantom 404 Dead-End)**:
  - Any headless browser (`navigator.webdriver`, CDP artifacts, `SwiftShader`/`llvmpipe` virtualized WebGL renderer, zero screen dimensions), synthetic `.click()` (`e.isTrusted === false` or `(0,0)` coordinates), sub-human dwell time ($< 250\text{ms}$), or rapid burst ($\ge 3$ clicks in $10\text{s}$ or micro-burst $\le 2000\text{ms}$) immediately triggers `isBotBlocked = true` in `GatewayPage.tsx` and returns HTTP `404 Not Found` from the server/edge—locking the offending IP in the 30-Minute Quarantine Jail.

---

## 3. Key Architectural Decisions & Security Hardening

- **Decision 1: Eliminate Client-Side Vault Decryption (`useClearanceDispatch.ts`)**
  - *Chosen Approach*: Remove `import { safeDecrypt, ENCRYPTED_LINKS } from '../lib/secureVault'` and `resolveClientRamDestination()` from `useClearanceDispatch.ts`.
  - *Why*: If `ENCRYPTED_LINKS` and decryption keys are shipped to the browser, any attacker or AI agent can extract all 230 URLs from DevTools or trigger client fallback when the server requests a challenge. Keeping `secureVault.ts` strictly on the server/edge guarantees 0% client bundle leakage.
- **Decision 2: Unified Multi-Key Edge Vault & Split-Sync Retention (`functions/api/[[catchall]].js` & `split-sync.yml`)**
  - *Chosen Approach*: Populate `KNOWN_VAULT_KEYS` in `functions/api/[[catchall]].js` with unified vault keys, prioritize `ENCRYPTED_LINKS` vault resolution at the Cloudflare Edge, and keep `src/lib/secureVault.ts` in the `Dex` repository during split-sync so Cloudflare Pages Functions always compile with the latest sealed vault.
  - *Why*: Ensures 100% link resolution reliability on `www.rummydex.com` without exposing links in `staticData.json` or client JS bundles.
- **Decision 3: 7-Wall Sequential Pipeline + Upstash Redis REST at Edge & Express**
  - *Chosen Approach*: Synchronize the full Central Adaptive Risk Engine (CARE) and 7-Wall verification pipeline across both `src/server/routes/securityRoutes.ts` (Express) and `functions/api/[[catchall]].js` (Cloudflare Edge), including native REST calls to Upstash Redis (`UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`) for atomic `SET NX` nonce burning and cross-instance IP quarantine.
  - *Why*: Prevents distributed token replay and multi-threaded bot bursts across serverless edge isolates while maintaining sub-50ms execution for real humans.
- **Decision 4: Total SEO & Crawler Exclusion on `/moreinfo/*`**
  - *Chosen Approach*: Remove all JSON-LD schema generation and canonical/OG tags on `/moreinfo/*` in both SSR (`seoHelper.ts`, `metaBuilder.ts`, `schemaBuilder.ts`) and CSR (`GatewayPage.tsx`), exclude `/moreinfo/*` from `scripts/prerender.ts`, and expand `robots.txt` to block all search and AI crawlers (`GPTBot`, `ClaudeBot`, `PerplexityBot`, `Google-Extended`, `CCBot`).
  - *Why*: Guarantees `/moreinfo/*` is completely invisible to search engines, ad policy scanners, and AI indexers.

---

## 4. Technical Architecture & 360° Defense Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                        1. ADMIN PORTAL (MASTERWORLD) & VAULT COMPILER                       │
│                                                                                             │
│  [ Admin App Editor ] ──(Save)──► [ AES-256 Vault Sealing ] ──► Firestore + public_backup   │
│                                              │                                              │
│                                    (GitHub Split-Sync)                                      │
│                       ┌──────────────────────┴──────────────────────┐                       │
│                       ▼                                             ▼                       │
│        [ Public Catalog JSON ]                        [ Server/Edge Sealed Vault ]          │
│   (staticData.json / staticData.ts)                      (src/lib/secureVault.ts)           │
│   • ZERO raw or encrypted URLs                     • Encrypted AES-256 payload blob         │
│   • Only `has_secure_link: true`                   • NEVER imported by client React code    │
│   • Clean H2-H4 & UTC metadata                     • Used ONLY by Express & Edge Function   │
└───────────────────────┬─────────────────────────────────────────────┬───────────────────────┘
                        │                                             │
                        ▼                                             │
┌───────────────────────────────────────────────────────┐             │
│       2. PUBLIC GATEWAY CLIENT (/moreinfo/:slug)      │             │
│                                                       │             │
│  • Zero SEO / Zero JSON-LD / Strict noindex headers   │             │
│  • Deep Hardware & Environment Inspection:            │             │
│    - WebDriver / CDP / Stealth descriptor check (wb)  │             │
│    - WebGL GPU Renderer trap (SwiftShader/llvmpipe)   │             │
│    - Trusted OS Pointer Event & Trajectory Jitter     │             │
│    - 3-Click / 10s & <=2000ms Micro-Burst Trap (cb)   │             │
│    - Cloudflare Turnstile Challenge Token (cf)        │             │
│  • Bot Detected? ──► Instant Phantom 404 UI Dead-End  │             │
└───────────────────────┬───────────────────────────────┘             │
                        │                                             │
                        │ POST /api/v1/app/session-clearance          │
                        │ (x-cf-token + x-clearance-token)            │
                        ▼                                             ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│             3. 7-WALL EDGE & SERVER FIREWALL (Cloudflare Edge + Express Backend)            │
│                                                                                             │
│  WALL 1: Edge UA & Header Filter ────────► Blocks 45+ scraper/AI UAs ──────► 404 Ghosting   │
│  WALL 2: Upstash Redis + RAM Quarantine ─► 3-click/10s & 30m IP Jail ──────► 404 Ghosting   │
│  WALL 3: Token & AppID Affinity Check ───► Freshness (<45s) & ID match ────► 404 Ghosting   │
│  WALL 4: Turnstile Siteverify + Track B ─► Cryptographic CF validation ────► Challenge/404  │
│  WALL 5: CARE Hardware & Kinetic Engine ─► Scores wb, hl, tr, cb, el, var ─► 404 if >=80    │
│  WALL 6: Atomic Burn-on-Read Nonce ──────► Upstash Redis SET NX (90s TTL) ─► 404 on Replay  │
│  WALL 7: In-Memory AES Vault Decryption ─► Decrypts ENCRYPTED_LINKS in RAM ► Emits URL      │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Component & State Mapping
1. **Client Hardware & Kinetic Collector (`useClearanceDispatch.ts` & `useTurnstileVerification.ts`)**:
   - Inspects WebGL renderer (`UNMASKED_RENDERER_WEBGL`), `navigator.webdriver` prototype descriptors, `window.cdc_*` / `__playwright` / `__puppeteer` globals, screen geometry, pointer coordinate variance, human dwell time (`el`), and rolling click timestamps (`clickTimestampsRef`).
   - If $\ge 3$ clicks occur within $10\text{s}$ or $\le 2000\text{ms}$ micro-burst, sets `cb = 1`, dispatches quarantine signal, and triggers `onError()` $\rightarrow$ `GatewayPage` immediately renders the **404 Not Found** view.
2. **Gateway Portal View (`GatewayPage.tsx` & `ClearanceButton.tsx`)**:
   - Renders clean, neutral verification UI (`"Verification Portal"`, `"PROCEED"`).
   - Removes all `SoftwareApplication` Schema.org JSON-LD and canonical URLs.
   - Implements `isBotBlocked` state: when triggered by `ClearanceButton`, unmounts the verification widget and renders the standard 404 page.
3. **Edge & Server Security Routers (`functions/api/[[catchall]].js`, `src/server/routes/securityRoutes.ts`, `src/server/security/adaptiveRiskEngine.ts`)**:
   - Executes the 7-Wall pipeline and CARE scoring matrix with full parity between Cloudflare Pages Edge and Express.
   - Integrates Upstash Redis REST API (`SET NX` for nonces, `INCR`/`EXPIRE` for IP burst/quarantine) with sub-millisecond local Map fallback.
   - Resolves app destination strictly in server/edge RAM from `ENCRYPTED_LINKS` (with unified `KNOWN_VAULT_KEYS`), `public_backup.json`, or `staticData.json` fallback.
4. **SEO & Split-Sync Hygiene (`seoHelper.ts`, `metaBuilder.ts`, `schemaBuilder.ts`, `prerender.ts`, `robots.txt`, `split-sync.yml`, `githubSyncRoutes.ts`)**:
   - `schemaBuilder.ts` returns `''` for `gateway` and `404` page types.
   - `metaBuilder.ts` emits comprehensive bot exclusion tags and omits canonical/OG/Twitter tags on `gateway` pages.
   - `prerender.ts` never generates static HTML files for `/moreinfo/*`.
   - `split-sync.yml` retains `src/lib/secureVault.ts` for Edge Functions while `githubSyncRoutes.ts` includes all updated security and gateway files in the Admin-to-Public sync list.
5. **Documentation Synchronization (`MORE_INFO_SECURITY_ARCHITECTURE.md`)**:
   - Updates the authoritative security specification to Version 9.0 reflecting the 100% Server/Edge-only vault resolution, WebGL/descriptor hardware traps, Upstash Redis Edge REST pipeline, and total SEO airgap.
