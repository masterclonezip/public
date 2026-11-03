# ⚡ Cloudflare Free Tier Master Optimization Guide: 100% Performance, Edge Caching & 301 SEO Architecture

> **Master Clone Source of Truth**: This architectural guide details how to extract **maximum enterprise-grade performance** from **Cloudflare's Free Tier** (zero paid add-ons required). 
> 
> Following this guide achieves:
> - **100% Google PageSpeed / Core Web Vitals** scores.
> - **Sub-second TTFB (Time to First Byte)**: 5ms – 25ms global edge delivery.
> - **Permanent 301 Redirects (`www.` to clean non-www)** with zero server latency.
> - **99%+ Edge Cache Hit Ratio** via Tiered Cache and Stale-While-Revalidate (SWR).
> - **Zero-cost link protection & bot filtering** with Cloudflare Turnstile.
> - **Universal Domain-Agnostic Design**: Works with ANY domain without modifying server code.

---

## 📑 Table of Contents
1. [Core Architectural Philosophy](#1-core-architectural-philosophy)
2. [DNS & Edge Proxy Setup](#2-dns--edge-proxy-setup)
3. [Edge 301 Redirect Rule: WWW to Non-WWW](#3-edge-301-redirect-rule-www-to-non-www)
4. [SSL / TLS Encryption & Protocol Hardening](#4-ssl--tls-encryption--protocol-hardening)
5. [Free Tier Cache Rules Architecture (10 Rules Available)](#5-free-tier-cache-rules-architecture)
6. [Speed & Network Performance Optimization Suite](#6-speed--network-performance-optimization-suite)
7. [Security, Bot Defense & Turnstile Integration](#7-security-bot-defense--turnstile-integration)
8. [Developer Implementation & Edge Code Sync](#8-developer-implementation--edge-code-sync)
9. [Edge Cache Purge & Maintenance Protocol](#9-edge-cache-purge--maintenance-protocol)

---

## 1. Core Architectural Philosophy

In this master clone transparency platform:
1. **The Origin Stays Protected & Lightweight**: Static assets and public prerendered HTML (`/app/*`, `/news/*`, `/`, XML sitemaps) are served directly from Cloudflare’s 330+ global edge data centers. Origin servers (Express or Firebase) receive near-zero traffic for public catalog browsing.
2. **Domain-Agnostic Dynamic Expressions**: No domain names are hardcoded. If you rebrand or clone the repository to a new domain, dynamic Cloudflare expressions strip `www.` and preserve request paths automatically.
3. **Strict Separation of Public Cache vs. Clearance Gateway**: Public catalog pages are cached aggressively with SWR, while the `/moreinfo` clearance gateway and `/admin` portal strictly bypass all edge caching (`no-store, private`).

---

## 2. DNS & Edge Proxy Setup

To allow Cloudflare to run edge rules, cache content, and perform 301 redirects, traffic **MUST** pass through the Cloudflare Edge Proxy (Orange Cloud).

### Step-by-Step DNS Records
In your Cloudflare Dashboard, go to **DNS** > **Records**:

| Type | Name | Target / IPv4 Address | Proxy Status | TTL | Purpose |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **CNAME** | `@` (root) | `your-project.pages.dev` (or server IP/CNAME) | **Proxied (Orange Cloud)** | Auto | Primary non-www public website |
| **CNAME** | `www` | `@` (or `your-project.pages.dev`) | **Proxied (Orange Cloud)** | Auto | Intercepts `www.` traffic for 301 redirect |

> ⚠️ **CRITICAL**: If the `www` or `@` record is set to **DNS Only (Grey Cloud)**, Cloudflare bypasses its edge nodes, breaking 301 redirects, edge caching, and Turnstile anti-bot verification. Both **MUST** be **Proxied (Orange Cloud)**.

---

## 3. Edge 301 Redirect Rule: WWW to Non-WWW

Cloudflare provides **10 Free Single Redirect Rules** under **Rules** > **Redirect Rules**. This executes at the Cloudflare edge POP nearest to the visitor within **3–8 milliseconds**, long before any request reaches the origin.

### Why Non-WWW as Primary?
- Eliminates duplicate content penalties in Google Search Console.
- Canonicalizes all backlink equity to a single URL format.
- Matches Google Play Store & modern web design standards.

### How to Create the Dynamic 301 Redirect Rule

1. Open your Cloudflare Dashboard and select your domain.
2. Navigate to **Rules** > **Redirect Rules** (under the Rules dropdown).
3. Click **Create rule**.
4. Configure the rule with the following parameters:

```yaml
Rule Name: "Redirect WWW to Non-WWW (301 Permanent)"
When incoming requests match...: Custom filter expression
Expression: starts_with(http.host, "www.")
URL redirect:
  Type: Dynamic
  Expression: concat("https://", substring(http.host, 4), http.request.uri.path)
  Status code: 301 (Moved Permanently)
  Preserve query string: Checked (Yes)
```

5. Click **Deploy**.

#### How this Dynamic Expression Operates:
- `starts_with(http.host, "www.")`: Detects any request beginning with `www.`.
- `substring(http.host, 4)`: Dynamically cuts off the first 4 characters (`w-w-w-.`), leaving the bare domain intact.
- `concat("https://", ...)`: Automatically forces HTTPS and appends the exact request path (`http.request.uri.path`) and query string (`?ref=...`).
- **Result**: `https://www.example.com/app/my-game?tab=reviews` ➔ `https://example.com/app/my-game?tab=reviews` in a single 301 hop with 0ms server compute!

---

## 4. SSL / TLS Encryption & Protocol Hardening

Navigate to **SSL/TLS** in the left sidebar:

### A. SSL/TLS Encryption Mode
- Set mode to **Full (strict)**.
- **Why**: Ensures end-to-end cryptographic encryption between the browser, Cloudflare edge, and the origin server, preventing Man-in-the-Middle (MitM) attacks.

### B. Edge Certificates Settings
Navigate to **SSL/TLS** > **Edge Certificates**:

| Setting | Status | Reason & Impact |
| :--- | :--- | :--- |
| **Always Use HTTPS** | **ON** | Automatically issues a 308/301 redirect for any insecure `http://` request. |
| **Automatic HTTPS Rewrites** | **ON** | Silently rewrites mixed content (`http://` image assets) to `https://`. |
| **Minimum TLS Version** | **TLS 1.2** | Deprecates vulnerable TLS 1.0 and 1.1, required for modern Google SEO ranking. |
| **Opportunistic Encryption** | **ON** | Enables HTTP/2 authenticated encryption benefits even for unencrypted resources. |
| **TLS 1.3** | **ON** | Provides fastest 1-RTT cryptographic handshake. |

---

## 5. Free Tier Cache Rules Architecture

Cloudflare includes **10 Free Cache Rules** under **Caching** > **Cache Rules**. By combining Cloudflare Cache Rules with the repository's `public/_headers` file, you get CDN edge caching comparable to multi-thousand-dollar enterprise setups.

### Rule 1: Bypass Cache for Admin, Clearance Gateway & APIs (CRITICAL)
Prevents caching of sensitive admin routes, Turnstile anti-bot clearance sessions, and dynamic user reviews.

1. Go to **Caching** > **Cache Rules** > Click **Create rule**.
2. **Rule name**: `Bypass Cache for Sensitive & Security Routes`
3. **When incoming requests match...**: Select **Custom filter expression** and paste:
   ```text
   (http.request.uri.path wildcard "/admin*") or 
   (http.request.uri.path wildcard "/masterworld*") or 
   (http.request.uri.path wildcard "/moreinfo*") or 
   (http.request.uri.path wildcard "/api*") or
   (http.request.uri.path wildcard "/safety*")
   ```
4. **Cache eligibility**: Select **Bypass cache**.
5. Click **Deploy**.

---

### Rule 2: Edge Cache Public Pages & Sitemaps with SWR
Caches prerendered public app pages, news articles, categories, and XML sitemaps directly in Cloudflare edge memory.

1. Click **Create rule**.
2. **Rule name**: `Edge Cache Public Pages and Sitemaps`
3. **When incoming requests match...**: Select **Custom filter expression** and paste:
   ```text
   (http.request.uri.path eq "/") or 
   (http.request.uri.path wildcard "/app/*") or 
   (http.request.uri.path wildcard "/news*") or 
   (http.request.uri.path wildcard "/videos*") or 
   (http.request.uri.path wildcard "/category*") or 
   (http.request.uri.path wildcard "/categories*") or 
   (http.request.uri.path wildcard "/developers*") or 
   (http.request.uri.path wildcard "*.xml") or 
   (http.request.uri.path eq "/robots.txt") or 
   (http.request.uri.path eq "/llms.txt")
   ```
4. **Cache eligibility**: Select **Eligible for cache**.
5. **Edge TTL**: Choose **Respect origin header** *(The repository's `public/_headers` automatically delivers `s-maxage=3600, stale-while-revalidate=86400`)*.
6. **Browser TTL**: Choose **Respect origin header** *(delivers `max-age=60` so visitors always get fresh updates)*.
7. **Serve stale content while updating (Stale-While-Revalidate)**: Toggle **ON**.
8. Click **Deploy**.

---

### Rule 3: Immutable Static Assets Cache (Vite Bundles & Images)
1. Click **Create rule**.
2. **Rule name**: `Cache Immutable Assets and Images`
3. **When incoming requests match...**: Select **Custom filter expression** and paste:
   ```text
   (http.request.uri.path wildcard "/assets/*") or 
   (http.request.uri.path wildcard "*.js") or 
   (http.request.uri.path wildcard "*.css") or 
   (http.request.uri.path wildcard "*.png") or 
   (http.request.uri.path wildcard "*.webp") or 
   (http.request.uri.path wildcard "*.svg") or 
   (http.request.uri.path wildcard "*.ico")
   ```
4. **Cache eligibility**: Select **Eligible for cache**.
5. **Edge TTL**: Set to **Override origin** > `1 month` (or `1 year`).
6. **Browser TTL**: Set to **Override origin** > `1 month`.
7. Click **Deploy**.

---

## 6. Speed & Network Performance Optimization Suite

Navigate to **Speed** > **Optimization** (and **Caching** > **Configuration**):

| Feature | Recommended Setting | Rationale & Performance Impact |
| :--- | :--- | :--- |
| **Brotli** | **ON** | Delivers 15% to 20% better compression than Gzip for HTML, CSS, and JS bundles. |
| **Early Hints (103)** | **ON** | Allows Cloudflare to send 103 Early Hints headers to the browser, preloading CSS/JS before the server finishes compiling the response. |
| **HTTP/3 (with QUIC)** | **ON** | Enables UDP-based HTTP/3 with faster connection setup and zero head-of-line blocking on cellular/mobile 4G and 5G networks. |
| **0-RTT Connection Resumption** | **ON** | Eliminates round-trip handshakes for returning users, delivering 0ms connection latency. |
| **Tiered Cache** | **Smart Tiered Cache (ON)** | *(Under Caching > Tiered Cache)* Routes regional edge misses to a central Cloudflare parent POP rather than your origin, boosting hit ratio to 99%. |
| **Crawler Hints** | **ON** | *(Under Caching > Configuration)* Automatically pushes real-time **IndexNow** pings to search engines (Bing, Yandex, Seznam) when catalog pages change. |
| **Always Online** | **ON** | If your origin host experiences transient maintenance or network drops, Cloudflare serves the cached snapshot from the Internet Archive. |
| ⚠️ **Rocket Loader** | **STRICTLY OFF** | **DO NOT ENABLE.** Rocket Loader delays script execution asynchronously. This breaks React 18 hydration, Turnstile verification button rendering, and React Router navigation. |
| **Auto Minify** | **OFF** | Vite already optimizes, tree-shakes, and minifies your production bundles. Enabling Cloudflare auto-minify adds redundant CPU processing without benefit. |

---

## 7. Security, Bot Defense, Disguised 404 & Turnstile Integration

Navigate to **Security** and **Turnstile** in the Cloudflare sidebar:

### A. Turnstile Anti-Bot Verification & Environment Variable Rules (CRITICAL)
The platform uses Cloudflare Turnstile to protect the isolated `/moreinfo/:slug` verification portal while guaranteeing a 100% domain-agnostic Master Clone architecture.

1. **Create Widget in Cloudflare Dashboard**:
   - Go to **Turnstile** in the main Cloudflare sidebar -> Click **Add widget**.
   - **Widget name**: Any descriptive name (e.g., `Mobile Verification Portal`).
   - **Hostname Management (VERY IMPORTANT)**:
     - Add **ONLY the bare domain** (e.g., `example.com`).
     - **NEVER** include `https://`, `http://`, or paths like `/moreinfo` in the hostname list.
     - Optional: Add `pages.dev` if you also test on `*.pages.dev` preview URLs.
   - **Widget Mode**: **Managed** (recommended).
   - **Pre-clearance**: **OFF** (leave toggled off).
2. **Copy Keys Using "Click to copy" (Never Type Manually)**:
   - **Site Key (`24 characters`, starts with `0x4...`)**: Used by the frontend widget.
   - **Secret Key (`35 characters`, starts with `0x4...`)**: Used by the backend `siteverify` validator.
   - ⚠️ **Warning**: Never use screenshot OCR or manual typing for keys (characters like `1` vs `l` or `0` vs `O` will corrupt the key and trigger `"Invalid sitekey"`). Always tap **"Click to copy"** in Cloudflare Dashboard.
3. **Add Environment Variables in Cloudflare Pages**:
   Go to **Workers & Pages** -> **[Your Project]** -> **Settings** -> **Variables and Secrets** and add for **BOTH Production and Preview**:

   | Variable Name | Value Format | Type in Cloudflare Pages | Purpose |
   | :--- | :--- | :--- | :--- |
   | `VITE_TURNSTILE_SITE_KEY` | `0x4...` (**24 chars**) | **Plaintext** *(Required at build & runtime)* | Primary public Turnstile Site Key |
   | `TURNSTILE_SITE_KEY` | `0x4...` (**24 chars**) | **Plaintext** | Instant Edge runtime Site Key alias |
   | `TURNSTILE_SECRET_KEY` | `0x4...` (**35 chars**) | **Secret / Encrypted** (or Plaintext) | Server-side `siteverify` Secret Key |

4. **How the Two-Step Turnstile Handshake Works (`Client Widget -> Server /siteverify`)**:
   - **Step 1 — Client-Side Challenge (`useTurnstileVerification.ts` + `ClearanceButton.tsx`)**:
     - When a visitor opens `/moreinfo/:slug` on a real mobile phone, the frontend calls `POST /api/v1/app/session-init` to receive a signed single-use nonce and the live runtime `siteKey` (`siteKeys[]`).
     - The frontend sanitizes any accidental quotes, invisible whitespace, or `KEY=` prefixes and renders the authentic Cloudflare Turnstile widget (`window.turnstile.render`) with `action: 'mobile_clearance'` and `cData: "${appId}_${nonceId}_${hw}"` (binding the challenge token directly to the device's ARM/iOS hardware fingerprint).
     - When the visitor passes the challenge, Cloudflare issues a temporary clearance token (`cfToken`) and enables the **PROCEED** button.
     - If an environment variable has a stale key, `softReinit()` immediately removes the error box (`removeWidget()`) and rotates to the next valid candidate `0x4...` Site Key without looping on a broken key.
   - **Step 2 — Mandatory Server-Side Validation (`gateCore.ts` Gate G6 -> `challenges.cloudflare.com/turnstile/v0/siteverify`)**:
     - When the user taps **PROCEED**, the frontend sends `{ token, cf }` to `POST /api/v1/app/session-clearance`.
     - After passing Gates G1–G5 and atomically burning the single-use nonce in Redis (`SET nonce:<nid> 1 EX 150 NX`), Gate G6 **always executes a server-to-server `POST https://challenges.cloudflare.com/turnstile/v0/siteverify`** using your private `TURNSTILE_SECRET_KEY` and `response: cf`.
     - Gate G6 strictly verifies `svData.success === true`, `svData.action === 'mobile_clearance'`, hostname match, and `svData.cdata === "${appId}_${nid}_${hw}"` before Gate G7 decrypts the destination URL in RAM. Because every clearance call hits Cloudflare's `/siteverify` API with no client-side bypass, Cloudflare Turnstile Analytics records 100% of your server-side validations and clears the *"Siteverify isn't being called"* warning.

### B. Bot Detection & Clean Disguised 404 Architecture (`/moreinfo/:slug`)
The `/moreinfo/:slug` verification portal is strictly isolated for **genuine mobile phone users only** (e.g., Android & iOS phones on Reliance Jio, Airtel, Vi, BSNL, and regional broadband Wi-Fi). All bots, web crawlers, desktop computers, mobile browsers in **"Desktop site" mode**, and cloud/datacenter servers receive a **clean, indistinguishable `404 — Page Not Found`** response with zero hint of how or why the 404 was triggered:

1. **Layer 1 — Cloudflare WAF Custom Rule (Edge 404 Block Before Functions Run)**:
   - Navigate to **Security** > **WAF** > **Custom rules** > **Create rule**:
   - **Rule Name**: `Strict Mobile-Only 404 Gate for MoreInfo & Session APIs`
   - **Expression**:
     ```text
     (starts_with(http.request.uri.path, "/moreinfo") or starts_with(http.request.uri.path, "/api/v1/app/session-")) and (not (http.user_agent contains "Android" or http.user_agent contains "iPhone" or http.user_agent contains "iPad" or http.user_agent contains "iPod") or http.user_agent contains "Windows" or http.user_agent contains "Macintosh" or http.user_agent contains "X11" or http.user_agent contains "CrOS" or http.user_agent contains "bot" or http.user_agent contains "spider" or http.user_agent contains "crawl" or http.user_agent contains "HeadlessChrome" or http.user_agent contains "Playwright" or http.user_agent contains "Puppeteer")
     ```
   - **Action**: **Block** -> **Custom response**:
     - **Response code**: `404`
     - **Content-Type**: `application/json` (or `text/plain`)
     - **Response body**: `{"error":"Not Found","status":404}`
2. **Layer 2 — Cloudflare Edge Middleware (`functions/_middleware.js`)**:
   - Automatically intercepts `/moreinfo/*` at the edge and returns an instant HTTP `404 Not Found` (`X-Robots-Tag: noindex, nofollow, noarchive, nosnippet`, `Cache-Control: no-store`) for any crawler, headless agent, `Sec-CH-UA-Mobile: ?0`, or desktop OS token (`Windows`, `Macintosh`, `X11`, `Linux x86_64`, `CrOS`).
3. **Layer 3 — Synchronous Client Hardware & Desktop-Mode Probe (`deviceProbe.ts` & `GatewayPage.tsx`)**:
   - On initial render (0ms, before the verification card mounts) and on window resize (if a user toggles **"Desktop site"** in mobile Chrome/Safari), `inspectClientMobileGate()` checks for desktop UA tokens, `navigator.userAgentData.mobile === false`, desktop viewport scaling (`window.innerWidth >= 768` on a mobile screen), non-touch hardware, WebDriver/CDP automation (`wb=1`, `hl=1`), and desktop/software GPUs (`SwiftShader`, `llvmpipe`, `RTX`, `GeForce`, desktop `Intel`/`Radeon`). Any match renders the clean `404 — Page Not Found` page.
4. **Layer 4 — Server 7-Gate Cryptographic Pipeline (`gateCore.ts`)**:
   - Enforces Gate G1 (Mobile UA, Client Hints, Cloud/Datacenter ASN `HOSTING_ASNS` 404 block with `NEVER_BLOCK_ASNS` protection for Indian mobile carriers), Gate G2 (Per-device cookie burst & quarantine), Gate G3 (HMAC nonce + `>= 1000ms` human dwell), Gate G4 (ARM/iOS & Mobile GPU silicon truth), Gate G5 (Physical capacitive touch `ts -> te -> ck` biomechanics), Gate G6 (Single-use atomic nonce burn + Turnstile verification), and Gate G7 (In-memory AES-256 link decryption). Every hard failure returns an identical padded HTTP `404` JSON response.

### C. Additional Cloudflare Security Settings
- **Bots** > **Bot Fight Mode**: **ON** *(Cloudflare automatically exempts verified search engine crawlers like Googlebot on public `/app/*` and `/news/*` pages while `/moreinfo/*` remains 100% unindexed and blocked)*.
- **Security** > **Settings** > **Security Level**: `Medium` (or `Essentially Off` for friction-free public catalog browsing).
- **Security** > **Settings** > **Browser Integrity Check**: **ON**.

---

## 8. Developer Implementation & Edge Code Sync

The codebase includes two built-in edge optimization files that seamlessly coordinate with your Cloudflare settings:

### 1. `public/_headers` (Direct Cloudflare Pages Integration)
Cloudflare Pages reads `public/_headers` at build time to enforce exact cache boundaries:
- `/assets/*`: `Cache-Control: public, max-age=31536000, immutable`
- `/app/*`, `/news*`, `/videos*`, `/category/*`: `s-maxage=3600, stale-while-revalidate=86400`
- `*.xml`, `/robots.txt`: `s-maxage=60, must-revalidate`
- `/moreinfo/*`, `/admin/*`: `no-store, no-cache, must-revalidate, private, max-age=0`

### 2. `functions/_middleware.js` (Edge Middleware Fallback)
If requests reach the Cloudflare Pages server directly without passing through the dashboard redirect rule, `functions/_middleware.js` acts as an edge safety net:
```javascript
export async function onRequest(context) {
  const url = new URL(context.request.url);
  const rawHost = url.hostname.toLowerCase();

  // Strict 301 Redirect from www. to non-www
  if (rawHost.startsWith('www.')) {
    url.hostname = rawHost.replace(/^www\./i, '');
    url.protocol = 'https:';
    return new Response(null, {
      status: 301,
      headers: {
        Location: url.toString(),
        'Cache-Control': 'public, max-age=31536000'
      }
    });
  }
  return await context.next();
}
```

---

## 9. Edge Cache Purge & Maintenance Protocol

### When to Purge Cache:
1. After editing global settings, apps, news, or banners in the Admin Dashboard.
2. After triggering a GitHub Split-Sync update.

### How to Purge:
- **Instant Full Purge**: In Cloudflare Dashboard, go to **Caching** > **Configuration** > **Purge Cache** > **Purge Everything** *(refreshes all global edge POPs within 2 seconds)*.
- **Granular Custom Purge**: To refresh only sitemaps or specific app pages without invalidating asset caches, select **Custom Purge** and enter:
  ```text
  https://example.com/sitemap.xml
  https://example.com/sitemap-apps.xml
  https://example.com/
  ```

---

## 📋 Quick Setup Checklist for Developers

- [ ] Add both `@` and `www` CNAME records set to **Proxied (Orange Cloud)**.
- [ ] Create Single Redirect Rule for `starts_with(http.host, "www.")` ➔ 301 to `non-www`.
- [ ] Set SSL/TLS mode to **Full (strict)** and enable **Always Use HTTPS**.
- [ ] Enable **Minimum TLS 1.2** and **Automatic HTTPS Rewrites**.
- [ ] Add Cache Rule 1: **Bypass Cache** for `/admin*`, `/masterworld*`, `/moreinfo*`, `/gateway*`, `/api*`.
- [ ] Add Cache Rule 2: **Eligible for Cache** with **Stale-While-Revalidate (SWR)** for `/`, `/app/*`, `*.xml`.
- [ ] Turn ON: **Brotli**, **Early Hints**, **HTTP/3**, **0-RTT**, **Smart Tiered Cache**, **Crawler Hints**.
- [ ] Ensure **Rocket Loader** is **OFF**.
- [ ] Create Cloudflare Turnstile widget and set `VITE_TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY` in `.env`.
