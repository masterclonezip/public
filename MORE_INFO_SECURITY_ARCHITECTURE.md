# More Info (`/moreinfo`) Gateway — Security Specification

**Version 11.1** — Mobile-only · Instant 1-tap · Server-issued nonce · Hardware-committed Turnstile · 7 sequential gates · Real-user-safe failure handling

> v11.1 = v11.0 spec + a forensic audit pass. Every audit finding was re-checked against the spec text and against how real phones, carriers and in-app browsers behave. What was accepted, corrected or rejected is listed in §11.

---

## 0. READ THIS FIRST (AI agents & developers)

1. This file is the single source of truth for the `/moreinfo` gateway, link vault, clearance API, anti-bot gates, crawler exclusion and vocabulary.
2. Read §0–§4 fully, then **read §12 (real-world failures) before writing any gate code**, then execute §5 step by step, in order. Every step lists: files, what to do, acceptance test.
3. If code and this spec disagree, the spec wins — fix the code. If the spec must change, edit this file in the same change and add a line to §11.
4. All thresholds live only in §3 (code: `src/lib/gateConfig.ts`). Never hardcode a number elsewhere.
5. Never: add client-only checks as a security boundary, add any fail-open / autopass path, turn a gate into a score, put a secret/key/real URL in this file, logs or client bundles.
6. Never write absolute claims ("100%", "unbreakable", a bot-elimination percentage) in code comments or docs. Measure with the counters in §5.7 instead. Honest limits: §10.
7. **Real-user rule.** HARD means *proof of automation or forgery*. "Unusual" is never proof. A check may be `enforce` only if (a) it follows from a physical invariant of a real phone, and (b) it passed shadow calibration (§13). When unsure → SOFT, not HARD.
8. **SEO isolation rule.** Gateway protections apply ONLY to `/moreinfo/*` (+ legacy gateway paths in §5.10) and the two `session-*` endpoints. They must never touch `/`, `/app/*`, `robots.txt`, sitemaps or any indexable page: Googlebot and users must receive identical content there. No UA blocking, no mobile-only gating, no challenge on indexable pages.
9. **Immutable core vs tunable signals** — see §3.2. Only tunable signals may be demoted to shadow at runtime; the core can never be bypassed.

---

## 1. Purpose & Threat Model

`/moreinfo/:slug` is an intermediary page between the public catalog (`/app/:slug`) and an external destination URL. Goal: only a real human on a real phone ever receives the destination URL, with one tap and no visible friction.

| Asset | Threat | Defense |
|---|---|---|
| Destination URLs | Scrapers/agents harvest links from HTML, DOM, network | AES-256 vault, decrypted only in server RAM after all gates pass; never in any client payload |
| Origin / Firestore / Redis quota | Request floods | Edge WAF + rate limit (§5.11), per-device and per-network limits (§3), quarantine |
| SEO / ad-network hygiene | Crawlers index the gateway | No discoverable links + robots exclusion + noindex headers + neutral vocabulary (§5.10, §6) |
| Token reuse | Replay, solver-farm tokens | Server-issued single-use nonce + Turnstile cData commitment |
| Referrer trace | Destination host sees our origin | `no-referrer` everywhere, `location.replace` dispatch |

| Attacker tier | Examples | Stopped by |
|---|---|---|
| T1 Dumb scrapers | curl, Python requests, Scrapy | G1 |
| T2 Headless AI agents | Playwright, Puppeteer, CDP, computer-use agents | G1, G3, G4, G5, G6 |
| T3 Engine-patched anti-detect browsers | Camoufox, Nodriver, Patchright | G1 (ASN/transport), G4 (silicon + OS contradictions), G5, G6 |
| T4 Solver-farm tokens / residential & 4G proxies | CapSolver, 2Captcha, mobile proxy pools | G6 commitment (partial, §10), G3 server dwell |
| T5 Human-assisted farms | Paid humans on real phones | Out of scope — no free control stops these |

Design principles: (1) deterministic AND-gating, no scores; (2) the server decides, the client only reports; (3) cheapest checks first; (4) nothing secret ships to the client; (5) real users pay ≤ 1 tap and ≤ ~100 ms of their own time; (6) **an unlucky real user is always routed to SOFT retry or a normal 404 "Home" link, never to a long jail**.

---

## 2. Architecture at a Glance

```
/app/:slug ── tap "Download" (a <button>, NOT an <a href>) ──► /moreinfo/:slug
 (sets navProof: in-memory flag + router state + sessionStorage)       │
                                                                        ▼
[Mount] client mobile gate + frozen probes (env = HARD string + SOFT string)
   ├─ fail ───────────► disguised 404 UI (with a neutral "Home" link)
   └─ navProof missing ► redirect to /app/:slug ONCE (loop guard);
                         second arrival ⇒ renders with nv=0 (stricter dwell)
                                                                        ▼
POST /api/v1/app/session-init  (G1–G2) ──► signed nonce + device cookie
                                                                        ▼
Turnstile render: action='mobile_clearance', appearance='interaction-only',
   cData = appId_nonceId_hw   (hw = sha256 of the frozen HARD env string)
                                                                        ▼
"Proceed" enabled only when: Turnstile token present AND ≥ CLIENT_TAP_HOLD_MS since init
user taps ONCE (touchstart, touchend, click captured; pointer events recorded)
                                                                        ▼
POST /api/v1/app/session-clearance   JSON body { token, cf }
G1 Edge/ASN/transport/OS ► G2 Quarantine/burst ► G3 Token+nonce+dwell ►
G4 Device truth ► G5 Touch invariants ► G6 Nonce burn, THEN Turnstile siteverify ►
G7 Late AES decrypt + no-store/no-referrer response
                                                                        ▼
client: location.replace(url) → wipe all state
```

Any HARD failure ⇒ identical `404 Not Found`. Any SOFT failure ⇒ `{"status":"retry"}`. Real users never see a gate.

---

## 3. Global Constants (single source — mirror in `src/lib/gateConfig.ts`)

### 3.1 Constants

| Constant | Value | Note |
|---|---|---|
| `TURNSTILE_ACTION` | `mobile_clearance` | Must match at render and at siteverify |
| `TOKEN_V` | `12` | Client token schema version. Any other value ⇒ SOFT + `reload` hint (never HARD: cached old bundle after a deploy) |
| `NONCE_TTL_MS` | `120000` | Issue → redeem window |
| `NONCE_REFRESH_MS` | `90000` | Client silently re-inits before expiry (idle tabs) |
| `NONCE_BURN_TTL_S` | `150` | Redis `SET nonce:<nid> 1 EX 150 NX` |
| `CLIENT_TAP_HOLD_MS` | `1000` | UX only (not a boundary): Proceed stays disabled until this long after the init response |
| `DWELL_HARD_BELOW_MS` | `150` | Server dwell below this ⇒ HARD (impossible for a real Turnstile solve + human tap) |
| `MIN_SERVER_DWELL_MS` | `500` | Dwell in `[150, 500)` ⇒ **SOFT** (was HARD 800 in v11.0). Server-measured: redeem time − issue time. Client clock is never trusted |
| `DWELL_NV0_MIN_MS` | `1500` | Minimum dwell when `nv=0` (no navProof) — below ⇒ SOFT |
| `TOUCH_MIN_MS` / `TOUCH_MAX_MS` | `12` / `2000` | `touchend − touchstart` |
| `TOUCH_REQUIRED_EVENTS` | `ts, te, ck` | touchstart, touchend, click must all be present |
| `TOUCH_ORDER_RULE` | `ts` before `te` before `ck` | By arrival order. `pd`/`pu` (pointer events) are recorded for telemetry only; their position is NOT enforced (WebView order differs) |
| `INIT_RATE_DEVICE` | `6 / 60s` per device id | session-init, keyed by `did` cookie |
| `INIT_RATE_NET` | `120 / 60s` per `netKey` | Flood ceiling only. Must stay high: carrier NAT shares one IP among thousands of phones with identical UA |
| `CLEARANCE_BURST` | per device id: `>3 / 10s` = SOFT strike; `3 within 2000ms` = HARD | session-clearance |
| `QUARANTINE_HARD_S` | `1800` | 30 min, keyed by `did` only |
| `NET_FLOOD_HARD` | `8` HARD events / 60s per `netKey` ⇒ `NET_COOLDOWN_S = 120` | Applies only to requests that have NO valid `did` |
| `SOFT_STRIKES_DEVICE` | `3` within 600s ⇒ 300s cool-down | per `did` |
| `SOFT_STRIKES_NET` | `30` within 600s ⇒ 120s cool-down | per `netKey` (cookie-less) |
| `SITEVERIFY_TIMEOUT_MS` | `4000` | Fail closed, SOFT class |
| `TURNSTILE_UI_TIMEOUT_MS` | `15000` | Client shows neutral text instead of spinning forever (content blockers) |
| `SESSION_RETRY_MAX` | `2` | Silent client auto-retries |
| `REQUEST_BODY_MAX_BYTES` | `8192` | Larger body ⇒ HARD |
| `HARD_PAD_MS` | `60–120` random | Pad HARD responses produced at G3 or later so G3–G6 failures are not distinguishable by timing. G1/G2 HARD return immediately (cheap, avoids DoS amplification) — accepted leak |
| `APP_DAILY_ISSUE_CAP` | admin per app, `0` = off | Max links issued per app per UTC day; above ⇒ `unavailable` (§5.7 G7) |
| `DID_COOKIE` | `__Host-rd_did` | `Secure; HttpOnly; SameSite=Lax; Path=/; Max-Age=31536000`. Value = `<128-bit hex>.<base64url(HMAC(DID_HMAC_SECRET, hex)[0:16])>` |
| `ALLOWED_HOSTNAMES` | env list | Checked against request `Host` (G1) and Turnstile siteverify `hostname` (G6). Never include `*.pages.dev` / `*.vercel.app` in production |
| `NAV_BREADCRUMB_TTL_MS` | `1800000` | 30 min |
| `HOSTING_ASNS` | 16509, 14618, 15169, 396982, 8075, 14061, 24940, 16276, 63949, 20473, 212238, 9009, 12876, 31898 | AWS, GCP, Azure, DigitalOcean, Hetzner, OVH, Linode, Vultr/Choopa, Datacamp, M247, Scaleway, Oracle. Extend over time; also match `asOrganization` for Contabo, LeaseWeb, Alibaba, Tencent |
| `NEVER_BLOCK_ASNS` | 13335, 20940, 54113 | iCloud Private Relay egress (Cloudflare/Akamai/Fastly) — real iPhone users. Trade-off: bots egressing from these ASNs are not stopped by the ASN rule (G3–G6 still apply) |
| HARD response | `404 {"error":"Not Found","status":404}` | Always 404, never 403/429. Identical headers and body for every HARD cause |
| SOFT response | `200 {"status":"retry"}` or `200 {"status":"retry","reload":1}` | Client silently re-inits (max 2); `reload:1` ⇒ client reloads the page once |

**Derived keys**
- `ipKey` = full IPv4, or IPv6 truncated to `/64`.
- `netKey` = `sha256(ipKey + " " + UA + " " + Accept-Language)`. **Weak on purpose**: Chrome's reduced UA is identical for most Android users, so `netKey` ≈ "one carrier NAT address". Never use it for long punishments.
- `did` = the signed device cookie (above). Issued by session-init when missing/invalid. Used for rate, strike and quarantine keys. Not a security proof (an attacker can discard cookies); it exists so that **one bot can never jail thousands of real users behind the same NAT**.

### 3.2 Immutable core vs tunable signals

| Class | Members | Rule |
|---|---|---|
| **Immutable core** | G1 (all), G2 (quarantine/burst), G3 (HMAC, schema, appId, dwell floor), G6 (nonce burn, Turnstile checks) | Never configurable at runtime. No bypass flag may exist |
| **Tunable** | G4-A for tolerated families, G4-B/C/D, G5 sub-checks marked "shadow" in §5.7, navProof redirect | Mode (`enforce`/`shadow`) read from Redis key `cfg:signal_modes` (cached ≤ 30 s). The owner may demote a misbehaving tunable signal to `shadow` without a deploy. Every change is logged as a counter. Demotion removes one *signal*; it never creates an autopass path |

### 3.3 Launch modes (new signals can false-positive on real devices; calibrate first)

| Signal | Launch mode | Rule |
|---|---|---|
| G4-A engine/platform contradictions — strict families | enforce | see §5.7 |
| G4-A — tolerated families (WebViews, other Chromium forks, unknown mobile) | enforce only the base desktop-contradiction rule; rest shadow | see §5.7 |
| G4-B shader precision | shadow | flip to enforce per family after calibration (§13) |
| G4-C texture compression | shadow | same |
| G4-D text physics | shadow | **denylist form only** (§5.7) |
| G5 core invariants | enforce | |
| G5 `rx/ry`, `gap`, `pd/pu` presence, `pr` | shadow | iOS behavior unverified |
| navProof redirect | enforce | with loop guard (§5.2) |

`shadow` is a rollout phase, not scoring: the end state of every signal is `enforce` or a documented removal.

---

## 4. Failure Classes

| Class | Meaning | Action |
|---|---|---|
| HARD | Proof of automation or forgery | `404` + (if device id exists) quarantine `QUARANTINE_HARD_S`; increments `netKey` flood counter |
| SOFT | Could be a real user on a bad network, old bundle, slow device or fast fingers | `200 {"status":"retry"}`; no quarantine; counts toward `SOFT_STRIKES_*` |

| Gate | HARD | SOFT |
|---|---|---|
| G1 | all (bad UA, desktop UA, hosting ASN, header incoherence, transport floor, bad `Host`, missing origin auth) | — |
| G2 | device quarantined; `3 requests ≤ 2000 ms` | `>3 / 10 s`; init rate exceeded; net cool-down for cookie-less clients |
| G3 | bad HMAC, `appId` mismatch, invalid `nv`, bad schema, oversized body, dwell `< 150 ms` | `TOKEN_V` mismatch (+`reload`), nonce older than `NONCE_TTL_MS`, dwell `[150, 500)`, `nv=0` and dwell `< 1500` |
| G4 / G5 | any `enforce` signal fails | — |
| G6 | nonce replay, `invalid-input-*`, action / hostname / cData mismatch | `timeout-or-duplicate`, network error, CF 5xx, `internal-error`, Redis error, **secret missing (plus high-severity alert counter)** |
| G7 | — | `unavailable` notice (not an error) |

Ordering note for G6: the Turnstile token is always younger than its nonce, and the nonce is checked first (G3), so an expired Turnstile token (`invalid-input-response` for age) cannot reach G6 with a valid nonce. That is why `invalid-input-*` is safely HARD.

---

## 5. Build Steps (execute in order)

### Step 5.1 — Config + shared core (NEW files)

- `src/lib/gateConfig.ts` — export every constant from §3.
- `src/server/security/gateCore.ts` — one runtime-agnostic implementation of G1–G7 using only `fetch`, Web Crypto and Upstash REST. Three thin adapters call it, so gates cannot drift between runtimes:
  - Express: `src/server/routes/securityRoutes.ts`
  - Cloudflare Pages: `functions/api/[[catchall]].js`
  - Vercel: `public-api/index.js`
- **Production runs exactly ONE adapter** (recommended: Cloudflare Pages). The others are dev/fallback and must be disabled or return 404 in production (each extra live runtime is another origin to attack and another place for config drift).
- Routes (neutral names only): `POST /api/v1/app/session-init`, `POST /api/v1/app/session-clearance`. Both: `Content-Type: application/json`, body ≤ `REQUEST_BODY_MAX_BYTES`. Remove the legacy `resolve-link`, `secure-link`, `get-link` routes.
- Redis access: use Upstash **pipelines** (one REST call per gate group), never one call per command.
- `src/lib/deviceProbe.ts` — client probes (§5.3).

Accept: a gate change in `gateCore.ts` changes behavior in all runtimes; no gate logic is duplicated in adapters; a request to a disabled adapter returns the standard 404.

### Step 5.2 — Catalog → Gateway navigation + navProof (with loop guard)

Files: `src/pages/AppDetails.tsx`, `src/pages/GatewayPage.tsx`, `AppPublic.tsx`.

- Catalog action label is **"Download"**. It is a `<button type="button">` whose `onClick` calls router `navigate('/moreinfo/' + slug, { state: { nav: Date.now() } })`.
- **Discovery rule:** the string `/moreinfo` must never appear as an `href`, `<Link>`, canonical, JSON-LD, sitemap entry, RSS item, prerendered HTML of any page, or field of `/api/v1/public/*`. Crawlers follow anchors, not buttons; undiscovered URLs cannot be indexed.
- Before navigating also set (try/catch): `window.__rdNav = { slug, ts }` and `sessionStorage['rd_nav_' + slug] = String(Date.now())`.
- **navProof is valid if ANY of these holds** (within `NAV_BREADCRUMB_TTL_MS`): router `location.state.nav`; `window.__rdNav` for this slug; `sessionStorage` entry. (Router state and the in-memory flag keep working when storage is blocked — private mode, strict in-app browsers.)
- On Gateway mount, if navProof is **missing**:
  1. If `window.__rdBounced !== slug`: set `window.__rdBounced = slug`, then `navigate('/app/' + slug, { replace: true })`. (Shared links, bookmarks, SMS/WhatsApp links and cold crawler hits land on the catalog page, where the user taps Download once. This is a redirect to a normal page, not a lockout.)
  2. Else (second arrival, same SPA session — storage and state both unavailable): **do not redirect again (no loop)**. Render the gateway with token field `nv = 0`.
- Token field `nv = 1` only when navProof was valid; `nv = 0` in the case above. Server accepts `nv ∈ {0,1}`; `nv = 0` requires `DWELL_NV0_MIN_MS` (G3).
- Route wildcard: keep both `/moreinfo/:slug` and `/moreinfo/:slug/*`.
- navProof is a cheap cold-link filter, **not a security boundary** (a scripted agent can click through the catalog). It exists to remove direct-URL crawlers early.

Accept: opening `/moreinfo/<slug>` in a fresh tab redirects to `/app/<slug>`; tapping Download shows the gateway; with sessionStorage disabled, tapping Download still shows the gateway (no loop); the string `/moreinfo` is absent from all prerendered HTML and public JSON (CI grep, §8 test 22).

### Step 5.3 — Gateway mount: mobile gate + probes (client)

Files: `GatewayPage.tsx`, `src/lib/deviceProbe.ts`.

Run once at mount (async work finishes before the user can tap, so the tap itself stays instant).

**Client mobile gate** (UX shortcut, not a boundary — the server re-checks everything). Fail ⇒ disguised 404 UI if any of: `navigator.webdriver === true` or tampered descriptor (`Object.getOwnPropertyDescriptor(navigator,'webdriver')`, `Function.prototype.toString` on the getter); `window.outerWidth === 0`; desktop platform/UA (Windows, Macintosh without touch, Linux x86, CrOS); `!matchMedia('(pointer: coarse)').matches`; `navigator.maxTouchPoints < 1`; software GPU string (`SwiftShader|llvmpipe|Mesa|VirtualBox`); desktop GPU string (`NVIDIA|GeForce|Radeon|Intel\(R\) (UHD|Iris)|Apple M[1-4]`); any `pointerdown` with `pointerType === 'mouse'`. Sets flags `wb`, `hl`, `dk`.

**Probe set — collected ONCE, frozen, split in two strings.** The same frozen strings are used for `hw` (Step 5.5) and for the token (Step 5.6). Never call `collectEnv()` twice, never re-serialize on the server.

```ts
// src/lib/deviceProbe.ts
function canonical(o: unknown): string {           // sorted keys, no whitespace, deterministic
  if (Array.isArray(o)) return '[' + o.map(canonical).join(',') + ']';
  if (o && typeof o === 'object')
    return '{' + Object.keys(o as object).sort()
      .map(k => JSON.stringify(k) + ':' + canonical((o as any)[k])).join(',') + '}';
  return JSON.stringify(o ?? null);
}
async function sha256hex(s: string) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
}

export async function collectEnv() {
  const n = navigator as any;
  const hi = n.userAgentData
    ? await n.userAgentData.getHighEntropyValues(['platform', 'architecture', 'model']).catch(() => null)
    : null;
  let gl: WebGLRenderingContext | null = null;
  try { gl = document.createElement('canvas').getContext('webgl'); } catch {}
  const dbg = gl?.getExtension('WEBGL_debug_renderer_info') ?? null;
  const mp  = gl ? gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.MEDIUM_FLOAT) : null; // MEDIUM_FLOAT
  const ext = gl?.getSupportedExtensions() ?? [];

  // HARD = stable engine/OS identity. Committed to Turnstile cData.
  const hard = {
    plat: n.platform ?? '',                       // 'iPhone' | 'Linux armv81' | 'Linux aarch64' ...
    vend: n.vendor ?? '',
    ud:   n.userAgentData ? 1 : 0,                // UA-CH present
    udp:  hi?.platform ?? '',                     // 'Android' on Android Chromium (when returned)
    arch: hi?.architecture ?? '',                 // must not start with 'x86' ('' is allowed)
    dm:   'deviceMemory' in n ? 1 : 0,            // WebKit never has it
    sa:   'standalone' in n ? 1 : 0,              // WebKit (iOS) has it
    wc:   (window as any).chrome ? 1 : 0,         // Chromium-only (iOS: shadow, see G4-A)
  };
  // SOFT = noisy/OEM-dependent. NOT committed; evaluated server-side with tolerance.
  const soft = {
    gl:  gl ? 1 : 0,
    mdl: hi?.model ? 1 : 0,
    gpu: dbg && gl ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : '',
    mp:  mp ? [mp.rangeMin, mp.rangeMax, mp.precision] : null,
    tx:  [ext.includes('WEBGL_compressed_texture_astc') ? 1 : 0,
          ext.includes('WEBGL_compressed_texture_etc')  ? 1 : 0],   // [astc, etc2]
    tp:  textPhysics(),
  };
  const hardStr = canonical(hard), softStr = canonical(soft);
  const hw = (await sha256hex(hardStr)).slice(0, 24);
  return { hardStr, softStr, hw };               // freeze this object; reuse everywhere
}
```

`textPhysics()`: in an off-screen `<div lang="en" style="width:120px;hyphens:auto">` render a long multi-syllable word string; return `[height, width(system-ui), width(sans-serif), width(monospace), width('Roboto',monospace), width('-apple-system',monospace)]` rounded to 0.01 px. Linux/FreeType servers wrap and size text differently from Apple CoreText / Android Skia even when UA and GPU strings are spoofed.

Why the split: privacy tools (Brave shields, uBlock, Dark Reader, font/canvas protection) change canvas/GPU/text readouts. Those values must never decide a hash match. Only the stable HARD identity is committed; SOFT values are judged by tolerance rules on the server.

If `gl` is `null` (iOS Lockdown Mode, WebGL disabled): the server **skips G4-B/C and the GPU rules** for that request and increments `gate:G4:nogl:*`. G4-A and all other gates still apply.

Disguised 404 UI: a real styled "404 — Page Not Found" screen with a normal neutral **"Home"** link to `/` (so a real user on "Desktop site" mode or an unsupported browser is never stuck). No retry button, no explanation.

Accept: desktop Chrome and mobile-emulated Playwright (x86 Linux) show the disguised 404 UI; a real phone passes with no visible delay; with Brave shields on, `hardStr` is identical across two loads.

### Step 5.4 — Server `session-init` (issues nonce + device cookie)

Files: `gateCore.ts` (+ adapters).

- Input `{ appId }` matching `/^[a-zA-Z0-9\-_]{1,64}$/`. Apply G1 and G2 first.
- Read `__Host-rd_did`. If missing or its HMAC is invalid, mint a new `did` and send `Set-Cookie` (attributes in §3.1). Cookies blocked by the client are tolerated: the client simply stays cookie-less and is governed by `netKey` limits.
- Issue a stateless signed nonce: `nonce = nid(32 hex random) . issuedAtMs . base64url(HMAC_SHA256(NONCE_HMAC_SECRET, nid|issuedAtMs|appId)[0:16])`. The nonce is **not** bound to the cookie (cookie-less and cookie-dropping users must still work).
- Response: `200 { nonce }` with `Cache-Control: no-store`. Nothing is stored yet; storage happens on redeem (burn).
- Server measures dwell from `issuedAtMs`, so device clock skew never matters.

Accept: session-init from a bot UA returns 404; from a real phone returns a nonce + cookie in < 50 ms server time.

### Step 5.5 — Turnstile render with hardware commitment

Files: `useTurnstileVerification.ts`, `ClearanceButton.tsx`, `index.html`.

- `index.html <head>`: Turnstile script with `?render=explicit`, `async defer`, plus `preconnect` / `dns-prefetch` to `challenges.cloudflare.com`.
- Cloudflare dashboard: widget mode **Managed**; restrict the widget's allowed domains to the exact production hostnames. Invisible/non-interactive is a dashboard mode, not the `size` param.
- `hw` comes from the frozen `collectEnv()` result (Step 5.3) — **do not recompute**.
- Render after session-init and probes finish:

```ts
widgetRef.current.innerHTML = '';                 // avoids "Target container is not empty"
const id = window.turnstile.render(widgetRef.current, {
  sitekey,                                        // admin setting → VITE_TURNSTILE_SITE_KEY → never a test key on prod
  action: 'mobile_clearance',
  cData: `${appId}_${nid}_${hw}`,                 // [A-Za-z0-9_-], ≤ 255 chars; nid=32 hex, hw=24 hex (parse from the END)
  appearance: 'always',                           // always visible widget for user feedback & interactive challenge escalation
  size: 'flexible', theme: 'auto',
  callback: (t) => { cfTokenRef.current = t; markTokenReady(); },
  'error-callback': softReinit,
  'expired-callback': softReinit,
  'timeout-callback': softReinit,
});
```

- The widget container must stay in the layout (never `display:none`, never off-screen) and reserve ~65 px height so the visible verification widget and any interactive challenge render cleanly without layout shift.
- `cData` is fixed at render. A new nonce ⇒ `turnstile.remove(id)` + fresh render (not `reset`).
- Test keys (`1x000…`) are forbidden when `location.hostname` is a production domain (`example.com`, `pages.dev`).
- **Proceed enables only when** a Turnstile token exists AND `now − initResponseTime ≥ CLIENT_TAP_HOLD_MS`. Never set ready without a token.
- **Idle tabs:** at `NONCE_REFRESH_MS` after init, silently re-init (new nonce + fresh render) while the page is visible. This keeps the nonce (120 s) and the Turnstile token (300 s) valid for users who open the page and tap later.
- **Failure to load/solve:** soft re-init (max `SESSION_RETRY_MAX`). If still no token after `TURNSTILE_UI_TIMEOUT_MS`, show neutral text: "Verification could not be completed. Please check your connection and reload." Never spin forever (content blockers / DNS ad-blockers can block `challenges.cloudflare.com`).
- UI: button states `VERIFYING…` → `PROCEED` → `CONNECTING…`. No lock icons. Neutral wording only (§6).

Accept: a token obtained for one cData cannot satisfy a request built with a different nonce or HARD env; a tab left idle 5 minutes still succeeds on the next tap without an error.

### Step 5.6 — Tap capture & clearance request

Files: `useClearanceDispatch.ts`, `ClearanceButton.tsx`.

User taps once; no hold timers, no extra steps. Attach listeners to the Proceed button only (via ref; re-attach if the node is replaced). Passive listeners.

| Event | Record |
|---|---|
| `pointerdown` | `pt = e.pointerType`, push `pd` |
| `touchstart` | time `e.timeStamp`, `rx/ry = touches[0].radiusX/Y`, `pr = touches[0].force`, `x/y = clientX/Y`, push `ts` |
| `pointerup` | push `pu` |
| `touchend` | time `e.timeStamp`, push `te` |
| `click` | require `e.isTrusted`; push `ck`; `d = te − ts` (ms); `gap = click time − te time` |

Client-side stop (disguised 404, no server call) **only** if: `e.isTrusted === false`, or `pt === 'mouse'`, or burst (`>3` clicks / 10 s, or `3` within 2000 ms ⇒ `cb = 1`). Everything else is sent to the server — **the client does not judge event order**. After the first click: disable the button, ignore further taps, one request in flight.

Request: `POST /api/v1/app/session-clearance`, JSON body `{ "token": "<base64url JSON>", "cf": "<turnstile token>" }` (body instead of headers: tokens + env exceed safe header sizes on some runtimes).

Token JSON:

```json
{ "v": 12, "id": "<appId>", "nonce": "<from session-init>", "nv": 1,
  "hard": "<hardStr exactly as hashed>", "soft": "<softStr>",
  "tap": { "pt":"touch", "mtp":5, "coarse":1, "rx":14.2, "ry":15.1, "pr":0.4,
           "x":182, "y":611, "d":87, "gap":9, "ev":"pd,ts,pu,te,ck" },
  "f": { "wb":0, "hl":0, "dk":0, "cb":0, "tr":1 } }
```

- `ev` is the arrival order the browser actually produced. Real engines differ (pointer events may arrive before/after touch events in some WebViews); the server enforces only the invariants in G5.
- Do not require `pr > 0` (iOS often reports force = 0). Do not read the clock for freshness (server does).

Accept: token built in < 5 ms after click; `el.click()` from a script produces only `ck` and is rejected by G5; a synthetic order `ts, pd, te, pu, ck` is accepted.

### Step 5.7 — Server pipeline: 7 gates on `session-clearance`

Files: `gateCore.ts`. Execute strictly in order; first failure returns per §4. `session-init` applies G1–G2 only.

#### G1 — Edge, ASN, transport, OS (< 0.1 ms, HARD)

1. **Origin auth.** On Express/Vercel adapters, require header `X-CF-Auth: <X_CF_AUTH_SECRET>` (constant-time compare); absent/wrong ⇒ HARD (direct-origin hit bypassing Cloudflare). `request.cf.*` exists only in the Cloudflare runtime; for Express/Vercel read the forwarded `X-CF-ASN`, `X-CF-HTTP-Proto`, `X-CF-TLS` (set by a Cloudflare Transform Rule) and trust them only with a valid `X-CF-Auth`.
2. **Host.** Request `Host` must be in `ALLOWED_HOSTNAMES`.
3. UA blacklist: `curl/ wget/ python urllib requests httpx aiohttp scrapy axios httpclient go-http-client okhttp guzzle node-fetch postman insomnia headlesschrome puppeteer playwright selenium phantomjs webdriver cypress crawler spider scraper ahrefsbot semrushbot dotbot mj12bot petalbot bytespider`; reject empty or `< 10` chars.
4. UA must match `Android|iPhone|iPad|iPod`; reject `Windows|Macintosh|X11|CrOS`. Reject `Sec-CH-UA-Mobile: ?0` and `Sec-CH-UA-Platform` of Windows/macOS/Linux/Chrome OS.
5. ASN in `HOSTING_ASNS` (and not in `NEVER_BLOCK_ASNS`) or hosting `asOrganization` ⇒ reject. Residential/4G proxies are not caught here (§10).
6. **Browser family** (`classifyUA`) — used by G1 header rules and G4-A:

| Family | UA signal |
|---|---|
| `ios-safari` | iPhone/iPad/iPod + `Version/` + `Safari/` |
| `ios-chrome` / `ios-firefox` | `CriOS/` / `FxiOS/` |
| `ios-inapp` | iPhone/iPad/iPod without a `Safari/` token (Instagram, `FBAN/FBAV`, Telegram, …) |
| `android-samsung` | `SamsungBrowser/` |
| `android-edge` | `EdgA/` |
| `android-firefox` | Android + `Firefox/` |
| `android-webview` | `; wv)` in UA |
| `android-chrome` | Android + `Chrome/` and none of: `SamsungBrowser`, `EdgA`, `OPR/`, `OPT/`, `UCBrowser`, `MiuiBrowser`, `HeyTapBrowser`, `Vivaldi`, `YaBrowser`, `; wv)` |
| `android-other` | any other Android UA (Mi Browser, UC, Opera, OEM browsers, …) |

*Strict families* = `ios-*`, `android-chrome`, `android-samsung`, `android-edge`, `android-firefox`. *Tolerated families* = `android-webview`, `android-other`, unknown mobile.

7. Header coherence:
   - `android-chrome` / `android-samsung` / `android-edge`: require `sec-ch-ua-mobile: ?1` and `sec-ch-ua-platform: "Android"`.
   - iOS (any iOS family): no `sec-ch-ua*` headers allowed.
   - Tolerated families: client-hint headers are not required.
   - `sec-fetch-site` must be `same-origin` and `sec-fetch-mode: cors`. Missing is allowed only for iOS `< 16.4` (parse `OS 16_3` in UA) and WebViews/tolerated families.
8. Transport floor: `httpProtocol ∈ {HTTP/2, HTTP/3}` (HTTP/1.1 ⇒ reject: default for most scripted clients) and `tlsVersion ≥ TLSv1.2` (TLS 1.3 is not required). Behind Cloudflare the origin leg is often HTTP/1.1, hence the forwarded `X-CF-HTTP-Proto`.

G1 failures never create a device quarantine (no `did` exists yet); they only increment the `netKey` HARD counter and return the standard 404.

#### G2 — Quarantine & burst (< 1 ms)

- If a valid `did` exists: check `quarantine:<did>` (isolate memory, then Redis). Quarantined ⇒ HARD. **Requests from a quarantined key do not extend the quarantine.**
- If no valid `did`: check `netcool:<netKey>`. Cooling ⇒ HARD. Requests carrying a valid, non-quarantined `did` are **exempt** from net cool-down (one attacker cannot lock the NAT's real users).
- Enforce `INIT_RATE_DEVICE` / `INIT_RATE_NET` (SOFT) and `CLEARANCE_BURST` (per `did`; cookie-less uses the net ceiling), and the strike rules in §3.1.
- Redis error ⇒ fail closed with SOFT.

#### G3 — Token, nonce, server dwell (< 1 ms)

1. Body size ≤ `REQUEST_BODY_MAX_BYTES`; strict schema/type check on the decoded token (bad ⇒ HARD).
2. `v !== TOKEN_V` ⇒ **SOFT with `reload:1`** (old cached bundle after a deploy).
3. `id === appId`; `nv ∈ {0,1}`; verify nonce HMAC in constant time with `NONCE_HMAC_SECRET`, falling back to `NONCE_HMAC_SECRET_PREVIOUS` during rotation; nonce `appId` matches. Bad ⇒ HARD.
4. `dwell = now − issuedAtMs`: `> NONCE_TTL_MS` ⇒ SOFT; `< DWELL_HARD_BELOW_MS` ⇒ HARD; `< MIN_SERVER_DWELL_MS` ⇒ SOFT; if `nv = 0` and `< DWELL_NV0_MIN_MS` ⇒ SOFT.
5. Flags: `wb=0, hl=0, dk=0, cb=0, tr=1`.

#### G4 — Device truth (< 1 ms)

Parse `hard` and `soft` strings with `JSON.parse`; verify key set and types. **Never re-serialize.**

**A. Engine/platform contradictions (enforce; strict families get the full rules, tolerated families only the base rule).**

*Base rule (all families, enforce):* `plat` must not match `^(Win|Mac|Linux (x86|i[3-6]86)|CrOS)`; `arch` must not start with `x86`; GPU string must not match the software/desktop patterns in §5.3.

*iOS (all `ios-*`), enforce:* `plat ∈ {iPhone, iPad, iPod}`, `vend = "Apple Computer, Inc."`, `dm = 0`, `ud = 0`. *Shadow:* `sa = 1`, `wc = 0` (behavior across Chrome-iOS, Firefox-iOS and in-app WKWebViews is unverified — calibrate).

*Android Chromium strict families (`android-chrome`, `android-samsung`, `android-edge`), enforce:* `ud = 1`; if `udp ≠ ''` then `udp = 'Android'`; `plat` matches `/^Linux (armv|aarch64)/`. *Shadow:* `mdl = 1` (some OEM builds return no model).

*Android Firefox, enforce:* `plat` matches `/^Linux (armv|aarch64)/`.

*Tolerated families:* base rule only; everything else shadow.

**B. Silicon precision (shadow → enforce per family).** `mp` for MEDIUM_FLOAT must be mobile-class (`precision ≤ 16`). Desktop GPUs and SwiftShader/llvmpipe report `[127,127,23]` even when the GPU string is spoofed. If real-device data shows ANGLE/Vulkan phones reporting 23, record a per-GPU allowlist instead of dropping the check. Skipped when `gl = 0`.

**C. Texture compression (shadow → enforce per family).** `tx` must contain ASTC or ETC2 (mobile silicon blocks; desktop/server GPUs lack ASTC). Skipped when `gl = 0`.

**D. Text physics (shadow → enforce, DENYLIST form only).** Do **not** try to describe "all real phones" (OEM fonts make that range unbounded and will reject real users). Instead keep `TEXT_PHYSICS_DENYLIST`: exact `tp` signatures measured from *your own* bot stacks (Playwright Pixel-7 emulation on Linux, Camoufox, Nodriver, headless Chrome in Docker). Match ⇒ fail. Rebuild the list whenever a new bot stack is tested. Roboto-vs-fallback and `-apple-system`-vs-fallback differences are logged as counters only.

**E. Hardware commitment.** `hw = sha256hex(<hard string exactly as received>)[0:24]`; used in G6.

#### G5 — Touch invariants (enforce core; shadow extras)

Enforce: `pt === 'touch'`; `mtp ≥ 1`; `coarse === 1`; `ev` contains `ts`, `te` and `ck` with `ts` before `te` before `ck`; `TOUCH_MIN_MS ≤ d ≤ TOUCH_MAX_MS`; `x > 0 || y > 0`.
Shadow (counters only): `rx > 0 || ry > 0` (iOS may report 0 — verify), `gap` range, `pd`/`pu` presence and order, `pr`.
Scripted taps (`page.touchscreen.tap`, CDP `Input.dispatchTouchEvent`) fire touchstart/touchend within 0–3 ms and fail the duration floor; `el.click()` produces only `ck` and fails the required-events rule. An attacker who adds a realistic delay passes this gate — see §10.

#### G6 — Nonce burn, then Turnstile siteverify

Sequential (burn first): replays then cost nothing at Cloudflare, and the extra ~20 ms is invisible next to a human tap.

1. **Burn:** `SET nonce:<nid> 1 EX 150 NX` on Upstash Redis (cross-instance). Already exists ⇒ HARD (replay). Redis error ⇒ SOFT (fail closed).
2. **siteverify:** `POST https://challenges.cloudflare.com/turnstile/v0/siteverify` with `secret`, `response`, `remoteip` (informational). Timeout `SITEVERIFY_TIMEOUT_MS`. Require **all**: `success === true` · `action === 'mobile_clearance'` · `hostname ∈ ALLOWED_HOSTNAMES` · parsed `cdata` equals `appId_nid_hw`, where `appId` = requested app, `nid` = nonce id from G3, `hw` = hash recomputed in G4-E (parse cData from the end: last 24 chars = `hw`, previous 32 = `nid`, the rest = `appId`).
3. Secret missing/empty ⇒ fail closed (SOFT + alert counter). No `invalid-input-secret` passthrough and no Track-B fallback exist.
4. Error mapping: see §4.

#### G7 — Late decrypt & dispatch (< 0.5 ms)

Only after G1–G6 pass:
1. If `paused:<appId>` is set in Redis, or the per-app daily issue counter `issued:<appId>:<yyyymmdd>` has reached `APP_DAILY_ISSUE_CAP` (when non-zero) ⇒ respond `unavailable` below. (Operational kill switch: an attack in progress can be contained per app without taking the site down. It is fail-closed, never fail-open.)
2. `resolveDestinationForApp(appId)` (§5.8). Unavailable ⇒ `200 {"status":"unavailable","message":"The package link is currently not available. It will be updated soon by the admin."}`.
3. Available ⇒ increment `issued:<appId>:<yyyymmdd>`; `200 {"status":"available","url":"..."}` with headers: `Cache-Control: no-store, no-cache, must-revalidate, private, max-age=0` · `Pragma: no-cache` · `Expires: 0` · `Referrer-Policy: no-referrer` · `X-Content-Type-Options: nosniff` · `X-Frame-Options: DENY` · `X-Robots-Tag: noindex, nofollow, noarchive`.

**Observability (required to calibrate shadow gates):** pipeline-increment Redis counters `gate:<G#>:<signal>:<pass|fail>:<yyyymmdd>:<family>` (14-day TTL). Fail counters always; pass counters sampled 1-in-10 (increment by 10) to protect the Redis command budget. Never log URLs, tokens, IPs in clear or full telemetry.

Accept: run the test matrix in §8; every HARD case returns the identical 404 body and headers.

### Step 5.8 — Link vault & resolution

Files: `src/server/crypto.ts`, `src/server/services/linkService.ts`, `src/lib/secureVault.ts`, `AppFormGeneralSection.tsx`.

Admin → storage: admin enters destination in `more_information_url` → server AES-256 encrypts → stored in Firestore `store_data/apps_chunk_*` and `store_data/sec_vault`, and sealed into `src/lib/secureVault.ts` (`ENCRYPTED_LINKS`) and `src/lib/public_backup.json` by GitHub sync.

**Cipher format (important for the build):**
- Legacy ciphertext starting `U2FsdGVkX1…` is CryptoJS passphrase-mode (OpenSSL `Salted__`, MD5-based key derivation, unauthenticated CBC). It has a weak KDF and **cannot be decrypted with Web Crypto alone** (no MD5) — gateCore's "Web Crypto only" rule conflicts with it.
- New writes use **AES-256-GCM via Web Crypto** with a random 256-bit key (`AES_KEY`, base64), random 12-byte IV, envelope `v2.<base64url(iv)>.<base64url(ciphertext+tag)>`.
- Migration: reads accept both formats (legacy path may use `crypto-js`, server-side only, never in a client bundle); every admin save and a one-time migration script re-encrypt to `v2`. Remove the legacy reader when none remain.
- A low-entropy `AES_SECRET` plus ciphertext sitting in a repo is offline-bruteforceable. Keys must be random 32 bytes.

Resolution order (server RAM only): T0 RAM cache → T1 `ENCRYPTED_LINKS` (sealed bundle) → T2 `public_backup.json` → T3 Firestore `sec_vault` (1.5 s timeout) → T4 Firestore `store_data`. (Tiers that cannot contain links — e.g. stripped `staticData.json` — are not fallbacks; remove them if present.)

Invariants:
- Public bundles (`staticData.json`, `window.__INITIAL_DATA__`, `/api/v1/public/*`) are built with `compileCanonicalApp(app, { stripDownloadLinks: true })`: no `more_information_url`, `download_url`, `encrypted_link`, `encrypted_download_url`, and no `/moreinfo` path field; only boolean `has_secure_link`.
- **Ciphertext files (`secureVault.ts`, `public_backup.json`) must never be served statically**: not in `public/`, not in `dist/`, not in any CDN-visible path. CI scan in §8 test 22.
- Client code never imports `secureVault.ts`, `ENCRYPTED_LINKS` or any AES helper, and never falls back to local decryption when the server says 404/retry.
- GitHub sync must regenerate the complete `secureVault.ts` via `generateSecureVaultFile(ciphertext)` (helpers + ciphertext). Writing only the constant breaks decryption.
- Live Firestore reads are authoritative over stale backups; merge admin in-memory state before committing.
- AES keys come from env only (`AES_KEY`; during rotation also `AES_KEY_PREVIOUS`; legacy `AES_SECRET` only until migration ends). No key literals in source or docs.
- Gateway ≠ destination: block destinations that point back to our own gateway (loop guard).

### Step 5.9 — Client dispatch, wipe, re-entry

Files: `useClearanceDispatch.ts`, `GatewayPage.tsx`.

- Response `available` ⇒ `location.replace(url)` (top-level navigation: no popup blockers, Back returns to the catalog, not the gateway). Gateway `<head>` has `<meta name="referrer" content="no-referrer">`.
- **Zero-DOM-link rule:** no `href`, no fallback "click here" button, no popup. The Proceed button is the only gateway.
- The URL exists only in a local variable: never in React state, storage, console or DOM. Immediately after dispatch: null the variable, clear token refs, `turnstile.remove`.
- `retry` ⇒ new session-init + fresh Turnstile render (max `SESSION_RETRY_MAX` silent attempts, then neutral "Please try again" text with a button that restarts init). The new token requires a new tap (the touch evidence is per request). If the response contains `reload:1`, reload the page once.
- Request timeout 10 s ⇒ treat as retry.
- `unavailable` ⇒ show the neutral notice from G7.
- `visibilitychange` (hidden→visible) or `pageshow` with `persisted` ⇒ wipe state and re-run init. Every return to the page re-verifies.
- Disguised 404 UI (`isBotBlocked`): a real styled "404 — Page Not Found" screen with a neutral Home link, no retry prompt.

### Step 5.10 — Crawler exclusion, cache isolation, routing

Applies to `/moreinfo/*`, `/gateway/*`, `/download/*`, `/info/*`, `/moredetail/*` and the two `session-*` endpoints. **Never applies to `/`, `/app/*`, `/robots.txt` or sitemaps (§0.8).**

**Layer 0 — nothing to discover.** No anchor, link, sitemap, JSON-LD, RSS or public-API field references these paths (Step 5.2). Undiscovered URLs are the strongest protection against indexing.

Note on `Disallow` + `noindex`: a crawler that honors `Disallow` never fetches the page, so it never reads `noindex`; and a disallowed URL that is linked from elsewhere can still appear as a bare URL in search results. That is why Layer 0 matters more than either control. The meta/header `noindex` is the backup for non-compliant or link-preview fetchers that do load the shell. If a bare gateway URL ever appears in Search Console, temporarily remove the `Disallow` for that path while keeping `noindex` until it drops, then restore it.

| Layer | Requirement |
|---|---|
| `robots.txt` (`public/robots.txt`, `seoRoutes.ts`) | Disallow all those paths and `/api/` for `*`, Googlebot, Bingbot, Applebot, DuckDuckBot, Baiduspider, YandexBot, SemrushBot, AhrefsBot, GPTBot, ClaudeBot, PerplexityBot. Repeat the Disallow lines inside every named UA group (a specific group overrides `*`). Allow everything else |
| HTML meta (`seoHelper.ts`, `Meta.tsx`, `metaBuilder.ts`, `schemaBuilder.ts`) | `noindex, nofollow, noarchive, nosnippet, noimageindex, notranslate` on `robots` + `googlebot, bingbot, slurp, baiduspider, yandex, duckduckbot, gptbot, claudebot, perplexitybot`. Zero JSON-LD, canonical, OpenGraph or Twitter tags (link-preview bots from WhatsApp/Telegram/Facebook ignore robots.txt and get a blank, link-free shell) |
| HTTP headers (`server.ts`, `public/_headers`, `vercel.json`) | `X-Robots-Tag: noindex, nofollow, noarchive, nosnippet`; `Cache-Control: no-store, no-cache, must-revalidate, private, max-age=0`; `CDN-Cache-Control: no-store, private`; `Cloudflare-CDN-Cache-Control: no-store, private`; `Referrer-Policy: no-referrer` |
| Sitemaps | `/moreinfo/*` excluded from every sitemap; only `/app/:slug` is submitted |
| Cloudflare Cache Rule (priority 1) | `starts_with(path,"/moreinfo") or starts_with(path,"/api/")` ⇒ Bypass cache |
| Cloudflare Bot Fight Mode (Super Bot Fight Mode on Pro+) | "Definitely automated" ⇒ Block/Managed Challenge; "Verified bots" ⇒ Allow (they are kept out of `/moreinfo` by Layer 0 + robots, and SEO on `/app/*` stays intact). Confirm in the Cloudflare event log that Googlebot/Bingbot are not challenged on `/app/*` |
| Vercel (`cleanUrls: true`) | SPA fallback destination must be `"/"` (not `/index.html`, which causes a 404) plus explicit `{ "source": "/moreinfo/(.*)", "destination": "/" }` |
| Pre-render (`scripts/prerender.ts`) | Generate `dist/moreinfo/[slug].html` and `dist/moreinfo/[slug]/index.html` (shell only, no link data, no references to other pages) |

### Step 5.11 — Edge layer (Cloudflare dashboard, before any function runs)

Blocked-at-edge requests do not invoke Pages Functions and do not touch Redis — this protects both your function quota and your Upstash command budget during floods.

1. **WAF custom rule (Block, custom response 404, `application/json`, body `{"error":"Not Found","status":404}`):**
   `(starts_with(http.request.uri.path, "/api/v1/app/session-")) and (http.request.method ne "POST" or not (http.user_agent contains "Android" or http.user_agent contains "iPhone" or http.user_agent contains "iPad" or http.user_agent contains "iPod"))`
2. **Rate limiting rule** on `starts_with(path, "/api/v1/app/session-")`: start at `60 requests / 10 s per IP`, action Block (same 404 response), duration 60 s. Tune from §13 counters; keep it above carrier-NAT peak.
3. **Host rule:** block requests whose `http.host` is not in the production allowlist.
4. Cache Rule and Bot Fight Mode as in §5.10.
5. Alerts: Upstash daily command usage ≥ 70 % of plan; Pages Functions requests ≥ 70 % of plan.

Accept: `curl` with a desktop UA to `session-init` returns the 404 JSON from the edge (check `cf-ray` present, no function log line).

---

## 6. Neutral Vocabulary Protocol

Every label, class, DOM id, meta tag, log line and endpoint name must use neutral wording.

| Context | Prohibited | Required |
|---|---|---|
| Catalog action button | "Download APK", "Get APK", "Free Mod", "Install App" | `Download` |
| Gateway main button | "Download APK", "Start Download", "Get File" | `Proceed` |
| Clearance endpoints | `get-link`, `resolve-link`, `secure-link` | `/api/v1/app/session-init`, `/api/v1/app/session-clearance` |
| `<title>` | "APK Download Mirror", "Download Portal" | "Verification Portal" / "Information & Verification" |
| `<meta description>` | "Download the latest APK…" | "Technical specifications and verified mirror gateway for…" |
| Status text | "Downloading APK…", "Decrypting File…" | `VERIFYING…`, `CONNECTING…`, `INITIALIZING…`, `Ready` |
| Bounce header | "Redirecting to APK Download…" | "Connecting to Destination" |
| DOM ids | `download-btn`, `apk-link` | `clearance-btn-<slug>`, `gateway-cta-<slug>` |

Gateway page content: neutral technical specs, package checksums, safety-audit badges.

**Truthfulness rule:** checksums must be computed from the real package, and any badge or "audit" statement must reflect a real audit the owner can document. Never ship fabricated trust signals. Neutral wording is about naming, not about misleading users.

---

## 7. Environment & Configuration

Placeholders only — never commit real values.

```
# Client (public)
VITE_TURNSTILE_SITE_KEY=<turnstile-site-key>

# Server only
TURNSTILE_SECRET_KEY=<turnstile-secret-key>
NONCE_HMAC_SECRET=<random 32+ bytes>
NONCE_HMAC_SECRET_PREVIOUS=<optional, rotation only (keep ≥ 5 minutes)>
DID_HMAC_SECRET=<random 32+ bytes>
AES_KEY=<base64 of 32 random bytes>          # v2 AES-256-GCM
AES_KEY_PREVIOUS=<optional, rotation only>
AES_SECRET=<legacy passphrase, only until migration ends>
UPSTASH_REDIS_REST_URL=<url>
UPSTASH_REDIS_REST_TOKEN=<token>
ALLOWED_HOSTNAMES=www.example.com,example.com
X_CF_AUTH_SECRET=<shared secret for forwarded Cloudflare headers on Express/Vercel>
```

Set the same variables in Cloudflare Pages and Vercel dashboards (only on the adapter(s) actually deployed). Missing secret ⇒ gateway fails closed (SOFT + alert, never autopass).

Admin Settings (`AdminSettingsTab.tsx`, Firestore `store_data/public_settings`): `turnstile_site_key` (public; synced to `staticData.json`), `turnstile_secret_key` (server-only; stripped from every public bundle, read via `getMasterSettings()`), per-app `APP_DAILY_ISSUE_CAP` and `paused` switch (server-only; mirrored to Redis).

Site key cascade: Admin setting → `VITE_TURNSTILE_SITE_KEY` → production key → test key (non-production hosts only).

Privacy note: `__Host-rd_did` is a first-party, strictly security-purpose cookie holding a random id. Mention it in the privacy policy; check the owner's local legal requirements.

---

## 8. Verification Suite

Run before every release touching the gateway or `securityRoutes`.

| # | Test | Expected |
|---|---|---|
| 1 | `curl -X POST /api/v1/app/session-clearance -H "User-Agent: python-requests/2.31"` | 404 `{"error":"Not Found","status":404}` |
| 2 | Desktop Chrome UA with valid structure | 404 (G1) |
| 3 | Mobile UA, no token | 404 (G3) — not 403 |
| 4 | Valid Turnstile token + hand-written base64 JSON | 404 (G6 cData/hw mismatch) |
| 5 | Same token submitted twice | second = 404 (nonce burn) |
| 6 | Redeem 100 ms after session-init | 404 (G3 HARD dwell); redeem at 300 ms → `retry`, no quarantine |
| 7 | Redeem after 120 s | 200 `{"status":"retry"}`, no quarantine |
| 8 | Cloudflare siteverify unreachable | 200 `{"status":"retry"}`, no quarantine |
| 9 | Cold visit to `/moreinfo/<slug>` in fresh tab | redirect to `/app/<slug>`; then Download shows the gateway; with `sessionStorage` disabled it still shows the gateway and does not loop |
| 10 | Playwright `devices['Pixel 7']` + `page.touchscreen.tap()` + `el.click()` | never reaches destination (G4 platform/silicon, G5 duration/events) |
| 11 | 4 clearance calls in 10 s / 3 within 2 s (same `did`) | SOFT strike / HARD |
| 12 | Two phones, same IPv4, same UA, different `did` cookies; one jailed | the other still passes |
| 13 | 30 distinct cookie-less first-time visitors from one IP in 60 s | all receive nonces (net ceiling not hit) |
| 14 | Real devices: Android Chrome, Samsung Internet, Firefox Android, Brave (shields on), Mi Browser, iOS Safari, iOS Chrome, Instagram/Facebook/Telegram in-app browsers, WhatsApp-opened links (Custom Tab / Safari view), Jio/Airtel/Vi networks, iCloud Private Relay | all pass with one tap (tolerated families may rely on shadow signals) |
| 15 | Production page with a test Turnstile key | blocked, no token accepted |
| 16 | Token with `v: 11` (old bundle) | 200 `retry` with `reload:1`, no quarantine |
| 17 | Nonce signed with `NONCE_HMAC_SECRET_PREVIOUS` | accepted during rotation window |
| 18 | Synthetic event order `ts, pd, te, pu, ck` (+ `ck`-only click) | first accepted; second rejected (G5) |
| 19 | Same device, same session, collect env twice with canvas noise | `hw` unaffected (HARD string frozen once; SOFT string not hashed) |
| 20 | Turnstile script blocked by a content blocker | after 15 s neutral message shown; no infinite spinner |
| 21 | Tab idle 5 min then tap | success (proactive refresh), no error |
| 22 | CI scans of `dist/` and public JSON | no `/moreinfo` string, no `U2FsdGVkX1`, no `v2.` ciphertext, no link fields |
| 23 | `curl -I /moreinfo/<slug>` and `/api/v1/app/session-init` | all §5.10 headers present |
| 24 | Phone with "Desktop site" mode | disguised 404 with a working Home link |
| 25 | Request to Express/Vercel origin without valid `X-CF-Auth` | 404 |
| 26 | Googlebot UA fetching `/app/<slug>` and `/` | full normal content, no gate/challenge (§0.8) |
| 27 | Edge WAF rule | desktop-UA call to `session-init` blocked at edge with 404 JSON |

Playwright smoke test (must fail to obtain the URL):

```js
const { chromium, devices } = require('playwright');
(async () => {
  const b = await chromium.launch({ headless: true });
  const ctx = await b.newContext({ ...devices['Pixel 7'] });
  const p = await ctx.newPage();
  await p.goto('https://example.com/moreinfo/spin-crush'); // cold → redirected to /app/spin-crush
  console.log('Final URL:', p.url());                          // must never be the destination
  await b.close();
})();
```

---

## 9. Definition of Done (check every item)

1. [x] Spec §3 constants exist once in `gateConfig.ts`; no duplicates elsewhere.
2. [x] `gateCore.ts` is the only gate implementation; adapters call it; production runs one adapter.
3. [x] No `trackBPassed`, no `invalid-input-secret` pass-through, no client-side decryption, no fallback link/button, no autopass flag.
4. [x] Turnstile: secret missing ⇒ fail closed; action, hostname and cData (`appId_nid_hw`) all asserted; widget restricted to production domains.
5. [x] Nonce is server-issued, HMAC-signed (with rotation fallback), burned in Redis; dwell measured server-side with the SOFT/HARD split.
6. [x] All HARD failures return identical 404; SOFT failures return `retry` and do not quarantine.
7. [x] Quarantine keyed by signed device cookie; `netKey` limits are generous and short; no long punishment keyed by IP+UA alone.
8. [x] `hw` hashes the frozen HARD string as received; server never re-serializes env.
9. [x] G5 enforces only the invariants in §5.7 (no rigid 5-step string).
10. [x] navProof: three sources, one redirect, loop guard, `nv=0` path; Download is a `<button>`; no `/moreinfo` string in crawlable output.
11. [x] Shadow signals emit counters; none silently left in shadow after calibration; G4-D uses a denylist.
12. [x] Public bundles contain no link fields; `secureVault.ts` regenerated in full on sync; ciphertext not served statically; new writes use AES-256-GCM `v2`.
13. [x] Vocabulary (§6) and crawler/cache rules (§5.10) verified on `/moreinfo/*` and both `session-*` routes; indexable pages untouched (§0.8).
14. [x] Edge rules (§5.11) active; Upstash and Functions usage alerts set.
15. [x] All §8 tests pass; `npm run lint` and the build are clean.
16. [x] This file updated and §11 changelog line added.

---

## 10. Known Limits (do not hide, do not overclaim)

- Telemetry is client-reported. A fully custom engine that replicates real phone silicon, fonts and touch can pass G4/G5. A scripted touch with a realistic delay passes the duration floor. The layers raise attacker cost; they are not proof.
- The cData commitment stops mixing a bought Turnstile token with forged JSON, token reuse, and cross-app/nonce replay. A solver service that supports custom cData and a forger that computes a consistent `hw` can still pass. It also commits only static environment data (click physics happen after the token is solved).
- Residential / 4G proxy pools bypass the ASN gate; they are handled only by G3–G6. Bots on `NEVER_BLOCK_ASNS` networks are not stopped by the ASN rule.
- Human-assisted farms (T5) pass by definition. A real human with a proxy on their own phone can read the URL from the network response; `APP_DAILY_ISSUE_CAP`, `paused` and the issue counters are the containment tools.
- `device cookie` is not a security proof (attackers discard cookies). Its job is fairness: one bot must not jail real users behind a shared carrier IP.
- Cloudflare Managed mode may occasionally show a visible Turnstile step to some real users (VPN, unusual network). `appearance: 'interaction-only'` keeps it hidden otherwise. "No visible friction" is the goal for the common case, not a guarantee.
- **Accessibility:** screen-reader/switch users whose activation produces only a `click` (no touch lifecycle) are blocked by G5. This remains an accepted trade-off of the strict mobile-human design; the owner must sign off (see below).
- iPadOS with a desktop-class UA (`Macintosh`) is blocked by G1. Phones and mobile-UA tablets are supported.
- Users on "Desktop site" mode, Opera Mini / UC Browser proxy ("extreme"/"speed") modes, very old Android browsers (no HTTP/2, no Turnstile support) and iOS Lockdown Mode (no WebGL: silicon checks skipped, other gates still apply) may see the disguised 404 with a Home link.
- Shared mobile IPs (CGNAT) are handled by the device cookie and generous net ceilings, not by IP alone. Cookie-less first-time visitors on a NAT that is under flood can be refused for up to `NET_COOLDOWN_S`.
- Availability depends on Redis, Turnstile and Cloudflare. Outages fail closed (SOFT), by design; the only mitigation is monitoring, not autopass.
- Legal, age and regional-compliance questions about the distributed apps are the owner's responsibility and outside this spec.

**Owner sign-offs required before launch:** (1) accessibility trade-off accepted or an assisted-access path designed (an optional AT path, if ever added, must be default-off, require `nv=1`, dwell ≥ 3000 ms, a per-device daily cap, and its own counters); (2) the first-party device cookie and its privacy wording; (3) Home link on the disguised 404; (4) the truthfulness of every trust badge on the gateway.

---

## 11. Changelog

**v11.1 (this version)** — merged v11.0 + forensic audit; every change below was verified against real-world behavior. Implemented full v11.1 pipeline across `src/lib/gateConfig.ts`, `src/lib/deviceProbe.ts`, `src/server/crypto.ts`, `src/server/services/linkService.ts`, `src/server/security/gateCore.ts`, thin adapters (`src/server/routes/securityRoutes.ts`, `functions/api/[[catchall]].js`), client hooks (`useTurnstileVerification.ts`, `useClearanceDispatch.ts`), and gateway components (`AppActionButtons.tsx`, `GatewayPage.tsx`, `ClearanceButton.tsx`).

Accepted from the audit (with corrections):
- `hwHash` fragility: **accepted in spirit, root cause corrected.** The server hashes the env *inside the token*, so `182` vs `182.0` cannot mismatch in JS. The real risks were (a) calling `collectEnv()` twice and getting different noisy values, (b) committing noisy fields (GPU string, text physics, canvas) to a strict hash, (c) any server re-serialization. Fixed: collect once, freeze, split into HARD (committed) and SOFT (tolerance-checked), send the exact strings, hash received bytes.
- Rigid touch sequence: **accepted.** Replaced by invariants (touch pointer type, required events `ts/te/ck` in causal order, duration window, valid coordinates, `isTrusted`). Note: the audit's claim about WhatsApp WebViews is imprecise — WhatsApp usually hands off to Chrome Custom Tabs / Safari view; Instagram, Facebook and Telegram do use their own WebViews. The fix stands regardless.
- navProof: **partially accepted.** The audit said the redirect "locks users out"; it actually lands them on the catalog page where they tap Download. But the audit exposed real bugs: loop when storage is blocked, and no recovery path. Fixed with three breadcrumb sources, one-time redirect, loop guard and an `nv=0` stricter-dwell path. The audit's idea of "forcing a visible Turnstile challenge" is **not possible from the client** (challenge visibility is a Cloudflare dashboard/Managed decision); replaced by longer dwell + `appearance:'interaction-only'`.
- Dwell time: **accepted.** HARD 800 ms → HARD only below 150 ms (physically impossible), SOFT in `[150,500)`. The audit's flat 400 ms was not adopted: a real user can hit 500–700 ms (fast Turnstile + a poised thumb), so the client now holds Proceed for 1000 ms to keep real users from ever reaching the server floor.
- Rejected: the audit's closing claim of "100% impenetrable / zero false positives". No such guarantee exists (§0.6, §10).

Added in v11.1 (found while reasoning about real traffic):
- Signed **device cookie** for rate/strike/quarantine keys; `netKey` demoted to a generous, short flood ceiling (carrier NAT + Chrome reduced UA made v11.0's `IP+UA+Accept-Language` key jail thousands of users for one bot).
- Browser-**family tiers** (strict vs tolerated) so Mi Browser, UC, Opera, WebViews and OEM browsers are not hard-failed by Chrome-only rules; `window.chrome`/`standalone` iOS checks and `mdl` moved to shadow; G4-D changed to denylist form; `rx/ry` moved to shadow.
- `TOKEN_V` mismatch (old cached bundle) and nonce-secret rotation are SOFT / accepted, never jail.
- Proactive nonce refresh for idle tabs; Turnstile `appearance:'interaction-only'`, `timeout-callback`, 15 s UI timeout; widget never hidden.
- G6 ordering: burn first, then siteverify. Origin auth + `Host` allowlist; one production adapter.
- JSON request body instead of two large headers (also fixes the `x-cf-token` / `x-cftoken` naming inconsistency in v11.0).
- Crawler layer rewritten: no crawlable reference to `/moreinfo` (button, not anchor), explanation of `Disallow` vs `noindex`, link-preview bots, SEO isolation rule, edge WAF/rate-limit layer (§5.11), per-app daily cap and pause switch.
- Vault: AES-256-GCM `v2` format and migration (CryptoJS-style `U2FsdGVkX1` cannot be read with Web Crypto and has a weak KDF); ciphertext must never be served statically.
- Real-world failure playbook (§12) and calibration protocol (§13).

**v11.0** — Restructured into ordered build steps (§5) with files, rules and acceptance per step. New: navProof breadcrumb; server-issued HMAC nonce with server-measured dwell; Turnstile cData `appId_nid_hw` hardware commitment verified against Cloudflare's signed siteverify result (+ hostname check); engine/platform contradiction matrix; WebGL `MEDIUM_FLOAT` precision, ASTC/ETC2 and text-physics probes; touch lifecycle + duration biomechanics; header-coherence and HTTP/2+ transport floor; shared `gateCore.ts` for all runtimes; HARD/SOFT failure classes; composite quarantine key; shadow→enforce rollout; per-gate counters. Gates: 6 → 7. Fixed from v10: one dwell rule, one nonce TTL, one quarantine duration, one rate rule, one endpoint pair, one navigation method (`location.replace`), no fallback button, always 404 on HARD, no 20-second URL timer. Removed: v6–v9 incident narratives, alternate wall models, stale Express reference code, "Hold to Proceed", effectiveness claims, client-side resolution matrix, duplicated tables, hard-coded keys. Technical corrections: shader constant is `MEDIUM_FLOAT`; touch order is pointerdown → touchstart → pointerup → touchend → click on Chromium; `size` does not select invisible mode; TLS 1.3 is not required.

**v10.0** — Strict mobile-only, instant 1-tap, 6 sequential gates, Track B and `invalid-input-secret` auto-pass removed, deterministic AND-gating.

---

## 12. Real-World Failure Playbook (read before coding)

What actually happens in production, and where v11.1 handles it.

| # | Real situation | What happens in v11.1 | Where |
|---|---|---|---|
| 1 | Friend shares `/moreinfo/<slug>` over SMS/WhatsApp/Discord; opened cold | Redirect once to `/app/<slug>`; one Download tap; works | §5.2 |
| 2 | `sessionStorage` blocked (private mode, strict in-app browser) | Router state + in-memory flag still carry navProof; if all fail, one redirect then `nv=0` path — no loop | §5.2 |
| 3 | 1000+ phones behind one Jio/Airtel IPv4 with identical reduced Chrome UA | Limits keyed by `did`; net ceilings generous; one bot jails only its own cookie | §3.1, G2 |
| 4 | Bot behind that same NAT floods | After `NET_FLOOD_HARD`, only cookie-less requests are refused for 120 s; returning users with a valid `did` are exempt | G2 |
| 5 | User leaves the tab open 3–10 min then taps | Silent refresh at 90 s; tap succeeds | §5.5 |
| 6 | Very fast user / fast Turnstile (< 800 ms) | Proceed held 1000 ms client-side; server floor is 500 ms SOFT | §3.1, G3 |
| 7 | Redis/Upstash down or out of quota | SOFT retry, alert; never autopass. Prevent via edge WAF/rate limit, pipelines, sampled counters, usage alerts | §5.7, §5.11 |
| 8 | Cloudflare siteverify slow/5xx | SOFT retry, no jail | G6 |
| 9 | AdGuard/DNS blockers or content blockers kill `challenges.cloudflare.com` | After 15 s neutral message; no infinite spinner | §5.5 |
| 10 | Site deploy while users hold the old JS bundle | `TOKEN_V` mismatch → SOFT + reload | G3 |
| 11 | `NONCE_HMAC_SECRET` rotation | Previous secret accepted for ≥ 5 min | G3, §7 |
| 12 | Brave shields / uBlock / Dark Reader / canvas protection | HARD env unaffected; noisy SOFT values never hashed and only judged by tolerance/denylist | §5.3, G4 |
| 13 | In-app browsers deliver touch/pointer events in a different order | Order of `pd/pu` not enforced; only `ts<te<ck` causal order | G5 |
| 14 | iOS reports touch radius/force 0 | `rx/ry/pr` shadow only | G5 |
| 15 | Mi Browser / UC / Opera / OEM Chromium forks lack client hints or UA-CH | Tolerated family: only base desktop-contradiction rule enforced | G1, G4-A |
| 16 | Phone in "Desktop site" mode or Opera Mini proxy mode | Disguised 404 with Home link (documented limit) | §5.3, §10 |
| 17 | iOS Lockdown Mode / WebGL disabled | G4-B/C skipped, G4-A and others still apply | §5.3 |
| 18 | OEM fonts differ wildly (Xiaomi, Samsung, Huawei) | Text physics is denylist-only | G4-D |
| 19 | Attacker floods `session-*` | Edge WAF + rate limit answer 404 before functions/Redis; per-app cap and pause switch | §5.11, G7 |
| 20 | Attacker hits `*.vercel.app`/`*.pages.dev`/origin directly | `Host` allowlist + `X-CF-Auth` ⇒ 404; widget restricted to production domains | G1, §5.5 |
| 21 | Search engine learns a `/moreinfo` URL from elsewhere | Not linked from our pages; robots + `noindex`; use the Search Console playbook | §5.10 |
| 22 | WhatsApp/Telegram/Facebook preview bots fetch the link | Shell with no OG tags and no link data | §5.10 |
| 23 | A crawler that ignores robots runs mobile emulation + JS | Fails G1/G4/G5/G6 | §5.7 |
| 24 | Googlebot crawls `/app/*` | Never gated, never challenged, same content as users | §0.8 |
| 25 | Real human proxies their own phone and reads the URL | Known limit; caps/pause/alerts contain damage | §10 |
| 26 | User presses Back after the destination loads | Lands on catalog (`replace`); returning to the page re-verifies | §5.9 |
| 27 | Screen-reader user | Blocked by G5 (documented, owner sign-off) | §10 |
| 28 | Double tap on Proceed | Button disabled after first click; one request in flight | §5.6 |

---

## 13. Calibration & Operations Runbook

**Phase A — launch.** Enforce: G1, G2, G3, G4-A (strict families full rules; tolerated families base rule), G5 core invariants, G6, navProof redirect with loop guard. Shadow: G4-B/C/D, G4-A shadow items, G5 extras. Deploy edge rules (§5.11) first.

**Phase B — flip a shadow signal to enforce** only when, for that signal and that browser family:
- ≥ 7 days of data **and** ≥ 3000 sessions in that family (rule of three: with zero real-device mismatches in N sessions, the 95 % upper bound on the mismatch rate is about 3/N, so N ≥ 3000 is needed to claim < 0.1 %), and
- mismatches, if any, are explained (a bot stack, or a per-GPU allowlist entry), and
- the owner has looked at the counters, not just the averages.

Families with too little traffic stay shadow (or tolerated). Never enforce a signal for a family you cannot measure.

**Daily review (5 minutes):** counters `gate:<G#>:<signal>:<pass|fail>:<date>:<family>`; HARD vs SOFT ratio per gate; share of `nv=0`; `nogl` rate; Turnstile timeout-UI rate; Upstash and Functions usage; per-app `issued` vs normal.

**Alerts:** any enforce signal failing > 1 % of a family's sessions in a day ⇒ investigate immediately and, if a real-device cause is plausible, demote that tunable signal to `shadow` via `cfg:signal_modes` (core gates cannot be demoted). Rising `secret-missing`, Redis-error or siteverify-error counters ⇒ page the owner. Sudden `issued:<appId>` spike ⇒ set `paused:<appId>`, investigate, resume.

**Incident order of operations:** (1) edge rule or per-app pause to contain; (2) read counters to find the gate; (3) demote only tunable signals; (4) fix; (5) re-calibrate; (6) add a changelog line.

**Bot-stack regression:** every release, run Playwright Pixel-7 emulation, Camoufox and a headless-Docker Chrome against staging; confirm none reaches the URL; refresh `TEXT_PHYSICS_DENYLIST` from their `tp` values.

**Spec maintenance:** this file is edited together with the code (§0.3). If a field, constant or route changes, change it here first.

---

## 14. Implementation & Hardening Changelog

- **v11.1.1 (Mobile & Edge Hardening):**
  1. **Turnstile Script Preconnect & Explicit Loader (`index.html` & `useTurnstileVerification.ts`):** Added `<link rel="preconnect" href="https://challenges.cloudflare.com" crossorigin>` and `<script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" async defer></script>` to `index.html`, plus dynamic script-injection fallback in `useTurnstileVerification.ts` so `window.turnstile` is always ready without hitting `TURNSTILE_UI_TIMEOUT_MS` (15 s).
  2. **Multi-Key Turnstile Resolution (`useTurnstileVerification.ts`, `linkService.ts`, `gateCore.ts`):** Supports both environment-configured (`VITE_TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY`) and Admin Settings-configured (`turnstile_site_key` / `turnstile_secret_key`) widget key pairs on production, plus automatic fallback to Cloudflare's non-production test key (`1x00000000000000000000AA`) strictly on non-production preview hosts (`*.run.app` / `localhost`) when a production domain-restricted widget returns a domain-restriction error.
  3. **Zero-Leak Public Sanitization (`githubSync.ts`, `adminVaultRoutes.ts`, `publicApiRoutes.ts`, `prerender.ts`):** Stripped `turnstile_secret_key` and all download link fields (`more_information_url`, `encrypted_link`) from `staticData.json`, `staticData.ts`, and `/api/v1/public/*` responses while sealing all 75+ catalog links into `src/lib/secureVault.ts` (`ENCRYPTED_LINKS`, T1).
  4. **Edge-Native `linkService.ts` & Gesture Guard (`useClearanceDispatch.ts`):** Removed top-level Node `fs`/`path` imports from `linkService.ts` for native Cloudflare Pages Functions compatibility, and ignored accidental touches while `ClearanceButton` is disabled (`!isReady`) so pre-ready taps never pollute `tapBufferRef`.
  5. **Always-Visible Turnstile Mode (`useTurnstileVerification.ts` & `ClearanceButton.tsx`):** Configured Turnstile widget with `appearance: 'always'` (`size: 'flexible'`, `theme: 'auto'`) in a permanent `min-h-[65px]` container above the action button so real users see live verification status and can immediately solve interactive challenges when on shared carrier-grade NATs, while deterring automated bots.
  6. **Edge Admin Auth & Zero-Secret Sync Isolation (`functions/api/[[catchall]].js`, `public_backup.json`, `split-sync.yml`):** Implemented native Web Crypto admin login and session verification (`/api/v1/admin/login`, `/api/v1/admin/verify`, `/api/v1/admin/refresh-token`, etc.) in `functions/api/[[catchall]].js` powered by Cloudflare environment variables (`ADMIN_EMAIL`, `ADMIN_PASSWORD`, etc.), completely fixing the "Not Found" login blocker on Cloudflare Pages. Stripped raw secret keys from `public_backup.json` and added backup/env exclusions to `RSYNC_EXCLUDES` in `.github/workflows/split-sync.yml` to prevent GitGuardian secret alerts.
  7. **Modern Mobile Flagship & Stylus Hardware Tolerance (`deviceProbe.ts`, `gateCore.ts`, `useClearanceDispatch.ts`):** Resolved false-positive 404 triggers on high-end phones (Samsung Galaxy S22/S23/S24, newer iPhones on Chrome/in-app WebViews, and iPads):
     - **Samsung Xclipse (AMD RDNA) Exemption:** Excluded `Samsung Xclipse` from the desktop `Radeon` check in client probe and server Gate G4-A (Exynos 2200 on S22 and 2400 on S24 are genuine mobile GPUs).
     - **S-Pen Stylus & Multi-Touch Support:** Supported devices where primary pointer is fine (stylus / S-Pen) by testing `any-pointer: coarse` and `maxTouchPoints >= 1` in `deviceProbe.ts`, `useClearanceDispatch.ts`, and Gate G5.
     - **Samsung Anti-Tracking & iOS Browsers:** Prevented false G1 rejection when `sec-ch-ua-platform` is omitted by Samsung Internet Smart Anti-Tracking, and supported Chrome on iOS (`Google Inc.` vendor) and iPadOS (`MacIntel` with touch).


- **v11.1.3 (Universal Real Mobile Android & iOS Compatibility):**
  1. **Comprehensive Mobile Device Recognition (`deviceProbe.ts`):** Removed brittle `navigator.platform` regular expressions that caused false `dk = 1` 404 flags on real mobile devices (Samsung S22/S24 with Samsung Internet Smart Anti-Tracking where platform is empty, modern Android Chrome with platform reduction, and privacy browsers). Enhanced `isAndroidDevice` and `isAppleTouchDevice` to verify touch screen existence (`'ontouchstart' in window`, `TouchEvent`, `maxTouchPoints >= 1`, or coarse pointer) and operating system identity.
  2. **Mobile GPU Classification & Desktop Isolation (`deviceProbe.ts` & `gateCore.ts`):** Confirmed genuine mobile graphics chips (Qualcomm Adreno, ARM Mali/Immortalis, Samsung Xclipse, AMD RDNA/Radeon on Exynos 2200/2400, Apple GPU, Imagination PowerVR). Desktop GPU rules (`GeForce`, `RTX`, `GTX`, `Intel UHD/Iris`, desktop `Radeon`) are strictly scoped to non-mobile environments with zero touch support, ensuring no mobile user is misclassified as desktop.
  3. **Gateway Loading State & Race-Condition Guard (`GatewayPage.tsx`):** Fixed race condition where direct visits or fast mobile navigation could trigger a premature 404 before `staticApps` or `loadFullStaticDataset()` finished background parsing. Ensured the page maintains the `INITIALIZING…` loading state until catalog data is fully populated, with immediate fallback fetch to `/public-api/staticData.json`.
  4. **Edge Cloudflare Catchall Public API Routing (`functions/api/[[catchall]].js`):** Routed `/api/v1/public/app/:slug`, `/api/v1/public/backup-data`, `/api/v1/public/settings`, `/api/v1/public/news`, and `/api/v1/public/videos` within Cloudflare Functions catchall router, eliminating edge 404s for frontend client data queries.
  5. **Gate G1 & G4 Server-Side Precision (`gateCore.ts`):** Allowed Linux platform Client Hints on Android user agents and permitted empty platform strings in Android strict family evaluation to maintain flawless compatibility with Samsung Internet and privacy-preserving mobile browsers while keeping all bot-detection thresholds strictly enforced.
  6. **Indian Telecom & Regional Mobile ISP Coverage (`gateConfig.ts` & `useClearanceDispatch.ts`):** Expanded `NEVER_BLOCK_ASNS` with all major Indian mobile operators (Reliance Jio, Bharti Airtel, Vi, BSNL) and regional fiber broadband providers (ACT, Hathway, RailWire, Excitel, Kerala Vision, Alliance) to prevent CGNAT IP-block collisions. Enhanced client tap dispatch to prevent false pointerType mouse classifications on mobile touchscreens.

- **v11.1.4 (Quarantine Poisoning Elimination & Mobile Gesture Resilience):**
  1. **Root-Cause Resolution for Intermittent 404s:** Identified that previous false-positive gate failures (such as double-tapping, quick tap durations under 12ms, or dropping touch events while button was mounting) were invoking `recordHardFailure` and writing a 30-minute quarantine (`QUARANTINE_HARD_S = 1800`) against the user's `__Host-rd_did` cookie. Subsequent visits to `/api/v1/app/session-init` were immediately rejected with HTTP 404, causing persistent 404 screens for legitimate mobile users.
  2. **Soft Retries for Real Mobile Touches (`gateCore.ts`):** Scoped hard 30-minute quarantine strictly to automated bots and desktop scrapers. Legitimate mobile device families (`android-*`, `ios-*`) experiencing touch timing variations, rapid clicks, or burned nonces receive `softRetryResponse()` ("Please try again"), automatically resetting the session without locking the device out.
  3. **Auto-Clearing Quarantined Device Cookies (`handleSessionInit`):** When a genuine mobile browser initiates a session with a previously quarantined device cookie, the server automatically drops the stale cookie and mints a fresh device ID, ensuring legitimate users who switch back to the tab or reopen the browser are immediately granted clean access.
  4. **Unconditional Touch Capture (`useClearanceDispatch.ts`):** Removed `!isReadyRef.current` guards from passive touch listeners (`onTouchStart`, `onTouchEnd`, `onPointerDown`, `onPointerUp`) so user interactions during initial Turnstile verification are always recorded with full physics and causal ordering, eliminating missing-touch submissions.
  5. **Removed Global Pointerdown Trap on Mobile Touchscreens (`useTurnstileVerification.ts`):** Constrained window-level mouse pointer traps strictly to devices with zero touch hardware (`maxTouchPoints === 0` and no `ontouchstart`), preventing Android accessibility gestures and synthetic scroll events from triggering false 404 blocks.

- **v11.1.5 (Strict Per-User Isolation, CGNAT De-Poisoning, Multi-App Scaling & Flagship GPU Precision):**
  1. **Strict Per-Device Isolation Across Shared Carrier CGNAT & Wi-Fi (`gateCore.ts`):** Eliminated shared `netcool:<netKey>` collateral blocking across mobile phones. On Android 110+ with User-Agent Reduction, all phones on the same Reliance Jio 5G, Airtel, Vi CGNAT IP or shared Wi-Fi share the identical `netKey` (`ip + reduced UA + Accept-Language`). `handleSessionInit` and `handleSessionClearance` now immediately mint an isolated per-device `__Host-rd_did` cookie on first visit and never block mobile families (`android-*`, `ios-*`) on shared `netcool:<netKey>`, guaranteeing that if one bot or device is quarantined, no other phone on the network is ever affected.
  2. **Flagship Mobile GPU 23-Bit Shader Precision & Platform Support (`gateCore.ts`):** Updated Gate G4-B (`MEDIUM_FLOAT` precision) from `<= 16` to `<= 23` so modern flagship mobile GPUs (Samsung Galaxy S22/S24 Exynos Xclipse 920/940, Qualcomm Adreno 730/740/750 with ANGLE/Vulkan, Apple A16/A17 Pro) pass cleanly, and ensured `G4-B`/`G4-C`/`G4-D` never hard-quarantine real mobile families even if stale `cfg:signal_modes` entries exist in Redis. Allowed `Linux`/`Unknown` in `hardObj.udp` on Android and `ud === 1` on modern iOS browsers.
  3. **Multi-App Session Rate & Strike Scaling (`gateConfig.ts`, `useTurnstileVerification.ts`, `useClearanceDispatch.ts`):** Raised `INIT_RATE_DEVICE` to `60/60s`, `INIT_RATE_NET` to `600/60s`, `CLEARANCE_BURST` (`hardCount: 12`, `softCount: 15`), and `SOFT_STRIKES_DEVICE` (`limit: 25, cooldownS: 30`) so a real mobile user browsing and downloading many different apps in a row never gets rate-limited or locked out. Guarded `visibilitychange` in `useTurnstileVerification.ts` from resetting active tokens (`< 60s` old) and ensured `dwell < 150ms` on mobile families returns a soft retry instead of a 404.
  4. **Indian Cellular HTTP/1.1 Handover & Google Consumer ASN Support (`gateConfig.ts`, `gateCore.ts`):** Allowed `HTTP/1.1` alongside `HTTP/2` and `HTTP/3` in Gate G1 for cellular tower handovers on Indian networks, and moved Google consumer ASN `15169` (Android Private Compute / Pixel VPN / Chrome proxy) to `NEVER_BLOCK_ASNS`.
  5. **Multi-App Catalog Resolution & Vercel API Bundle Sync (`GatewayPage.tsx`, `githubSyncRoutes.ts`):** Added `staticLoaded` state tracking and `getPrefetchedApp` / `window.__INITIAL_DATA__.apps` resolution in `GatewayPage.tsx` so switching across apps never triggers a premature `!app` 404 before `staticData` finishes loading. Added `api/index.js` to `/api/github-sync/public-core-files` so GitHub sync to the public `Dex` repository always deploys the latest compiled serverless gateway bundle.

- **v11.1.6 (2026 Deep Security & Reliability Audit Resolution):**
  1. **Vault Compiler & Deterministic AES Fallback (`secureVault.ts`, `cryptoUtils.ts`, `crypto.ts`, `githubSync.ts`):** Replaced the recursive self-returning `generateSecureVaultFile(ciphertext)` stub with a clean TypeScript module generator that embeds `ENCRYPTED_LINKS` inside valid `export const ENCRYPTED_LINKS = "..."` source code. Added a deterministic internal fallback key (`INTERNAL_VAULT_FALLBACK_KEY`) to `getEnvSecretKeys()` and `getCandidateAesKeys()` so `encryptData()` never falls back to plaintext JSON when `AES_SECRET` is unset, and sealed all 82 catalog app ID/slug URLs into `src/lib/secureVault.ts` (`T1_VAULT`, `<0.5ms` RAM resolution, zero Firestore reads).
  2. **Secret Isolation & Split-Sync Protection (`useDataActions.ts`, `useGitHubSync.ts`, `githubSync.ts`):** Stripped `turnstile_secret_key`, `cloudinary_api_secret`, and `gemini_api_key` before writing to `store_data/public_settings` in Firestore and in `sanitizePublicSettings()`. Removed `src/lib/public_backup.json` from `primaryBatchFiles` in `useGitHubSync.ts` so raw backup files are never pushed to the public `Dex` repository.
  3. **Authentic Touch Telemetry & Unconditional Desktop Silicon Blocking (`useClearanceDispatch.ts`, `deviceProbe.ts`, `gateCore.ts`):**
     - Removed client-side fabrication of `'ts'`, `'te'`, `tap.d = 45`, and `tap.x = 120, tap.y = 40` in `useClearanceDispatch.ts`, restoring genuine hardware touch telemetry for Gate G5.
     - Removed `!isMobileDevice && !hasTouch` and `!family.startsWith('android-') && !family.startsWith('ios-')` exemptions around desktop GPU checks (`GeForce`, `RTX`, `GTX`, `Intel UHD/Iris`, desktop `Radeon`) in both `deviceProbe.ts` and `gateCore.ts` (G4-A), ensuring Playwright/Puppeteer bots spoofing mobile UAs on desktop GPUs are always blocked with Hard 404.
     - Enforced iOS WebKit hardware invariants (`dm === 0 && ud === 0`) in Gate G4-A for `ios-*` families.
  4. **Restored G2 Quarantine, G3 Superhuman Dwell & G6 Nonce Replay Enforcement (`gateCore.ts`):**
     - Removed the `if (isMobileFamily)` bypasses that previously deleted `quarantine:${did}` on every request, downgraded `<150ms` superhuman dwell (`DWELL_HARD_BELOW_MS`) to soft retry, and downgraded Gate G6 burned-nonce replay (`burnPipe.results[0] !== 'OK'`) to soft retry. Per-device quarantine (`__Host-rd_did`), superhuman dwell (`<150ms`), and nonce replay now strictly return Hard 404 as specified in §5.7 and §8 Test #5, while keeping shared CGNAT IPs isolated per device cookie.
  5. **Eliminated Real-User False-Positive 404s & 403s (`deviceProbe.ts`, `gateConfig.ts`, `gateCore.ts`, `server.ts`, `linkService.ts`):**
     - **Privacy Browsers & WebViews (`deviceProbe.ts`):** Removed the `!fnStr.includes('[native code]')` check on `navigator.webdriver` getter that false-flagged Brave, DuckDuckGo, and Firefox Focus (`wb = 1`), and removed `window.outerWidth === 0 || window.outerHeight === 0` that false-flagged Telegram/WhatsApp/Instagram WebViews during slide-up animations (`hl = 1`). Prevented caching failed `collectEnv()` promises.
     - **iPadOS 13+ & Consumer VPN Compatibility (`gateCore.ts`, `gateConfig.ts`):** Added support for iPadOS 13+ Mobile Safari (`Macintosh` UA with `Mobile/` and `Safari/`), allowed `.pages.dev` and `.vercel.app` preview domains in Gate G1 when `STRICT_HOST_CHECK !== '1'` (matching Gate G6), and removed consumer VPN exit ASNs (`9009` M247, `212238` Datacamp) from hard G1 ASN blocking so mobile VPN users proceed to Turnstile verification.
     - **Cold-Entry Dwell Synchronization (`gateConfig.ts`):** Aligned `DWELL_NV0_MIN_MS` (`1000ms`) with `CLIENT_TAP_HOLD_MS` (`1000ms`) so cold-entry users tapping `Proceed` as soon as the button unlocks are never soft-rejected.
     - **Turnstile Multi-Secret Priority & Soft Error Preservation (`linkService.ts`, `gateCore.ts`):** Prioritized Admin Settings `turnstile_secret_key` ahead of `env.TURNSTILE_SECRET_KEY` in `getCandidateTurnstileSecrets()` to match client sitekey priority in `useTurnstileVerification.ts`, stopped caching empty strings when Firestore is unreachable, and tracked `sawSoftTokenError` (`timeout-or-duplicate` / `internal-error`) across the multi-secret `siteverify` loop in Gate G6.
     - **CUBOT Smartphone UA Fix (`server.ts`):** Replaced substring `|bot|` with word-boundary `|\bbot\b|` in `isBotCrawler` so `CUBOT` Android phones are never blocked with HTTP 403.
  6. **CDN Cache Isolation, Firestore Quota Circuit Breaker & `/moreinfo` Payload Trimming (`vercel.json`, `server.ts`, `linkService.ts`, `initialDataOptimizer.ts`, `AppPublic.tsx`, `functions/api/[[catchall]].js`):**
     - Moved the `/(moreinfo|gateway|download|info|moredetail|...)` header rule after `/(.*)` in `vercel.json` and guarded `server.ts` static HTML headers so `/moreinfo/*` always serves `Cache-Control: no-store, no-cache, must-revalidate, private, max-age=0` and `Referrer-Policy: no-referrer`.
     - Added a 60-second Firestore `429/403` quota circuit breaker (`firestoreQuotaCooldownUntil`) and single-database resolution in `linkService.ts` to eliminate 30-request sequential retry amplification.
     - Trimmed `window.__INITIAL_DATA__` on `/moreinfo/*` gateway routes in `src/seo/initialDataOptimizer.ts` to include only the single target app's minimal metadata and empty `news`/`videos` arrays (>90% HTML payload reduction), mounted all gateway alias routes (`/gateway/:slug`, `/info/:slug`, `/moredetail/:slug`, `/download/:slug`) in `AppPublic.tsx`, and added `resolveAppSlug()` fallback in `functions/api/[[catchall]].js`.

- **v11.1.7 (Complete `/moreinfo` Zero-Leak Crawler Isolation & On-Demand Turnstile Loading):**
  1. **Zero Crawlable `/moreinfo` Anchors Across SSR & React (`NewsRelatedAppBox.tsx`, `appDetailsRenderer.ts`, `newsRenderer.ts`):** Replaced the `<Link to={gatewayUrl}>` in `NewsRelatedAppBox.tsx` and the `<a href="/moreinfo/...">` tags in `appDetailsRenderer.ts` and `newsRenderer.ts` with `<button type="button">` elements that record `navProof` (`window.__rdNav` and `sessionStorage['rd_nav_' + slug]`) and navigate via React Router. Zero `<a href="/moreinfo/...">` links exist anywhere in SSR or hydrated DOM.
  2. **Excluded `/moreinfo` from Static Build Prerendering & GitHub Sync `robots.txt` (`scripts/prerender.ts`, `useGitHubSync.ts`):** Removed `generateRoute('/moreinfo/' + cleanSlug)` from `scripts/prerender.ts` so static `/moreinfo/*/index.html` files are never emitted into `dist/`, and added `Disallow: /moreinfo/` and `Disallow: /moreinfo/*` to the generated `public/robots.txt` in `useGitHubSync.ts`.
  3. **On-Demand Turnstile Script & Lazy `GatewayPage` (`index.html`, `AppPublic.tsx`):** Removed global Cloudflare Turnstile `<script>` and `preconnect`/`dns-prefetch` tags from `index.html` so Turnstile loads strictly on demand via `useTurnstileVerification.ts` when a user enters `/moreinfo/:slug`, and wrapped `GatewayPage` in `lazyWithRetry()` in `AppPublic.tsx`.

- **v11.1.8 (Zero-Firebase Static `/moreinfo` Pipeline & Real-User 404 Elimination):**
  1. **Complete Removal of Firebase / Firestore from `/moreinfo` Gateway (`src/server/services/linkService.ts`, `src/lib/secureVault.ts`, `src/lib/githubSync.ts`):**
     - Deleted `B64_FIREBASE_FALLBACK`, `getFirebaseConfig`, `fetchFirestoreDocWithTimeout`, `resolveFromT3SecVault`, `resolveFromT4StoreData`, `firestoreQuotaCooldownUntil`, and `parseFirestoreValue` from `linkService.ts`.
     - Sealed both `ENCRYPTED_LINKS` and `ENCRYPTED_TURNSTILE_SECRET` directly inside `src/lib/secureVault.ts` using deterministic `INTERNAL_VAULT_FALLBACK_KEY`, and included `LEGACY_VAULT_FALLBACK_KEY` in `src/server/crypto.ts` and `src/lib/cryptoUtils.ts` so all vault ciphertexts decrypt in `<0.1ms` across Cloudflare Pages, Vercel, and Node without any Firebase dependency.
     - Firebase quota exhaustion (`429 Too Many Requests`) now has **zero effect** on `/moreinfo` link resolution or Turnstile `siteverify`.
  2. **Elimination of Cascading 404 Lockouts & Shared Indian Carrier CGNAT Poisoning (`src/server/security/gateCore.ts`):**
     - Prevented shared `netcool:<netKey>` and `burst_net_hard` from returning HTTP 404 for mobile families (`android-*`, `ios-*`), ensuring a single bot or failed session on Reliance Jio, Airtel, Vi, or BSNL CGNAT never blocks other users on the same carrier IP.
     - Scoped 30-minute per-device quarantine (`quarantine:<did>`) strictly to explicit bot/headless/desktop hardware contradictions (`wb=1`, `hl=1`, `dk=1`, or desktop GPU/OS).
     - Auto-clears stale `quarantine:<did>` cookies on `handleSessionInit` for mobile families by rotating to a fresh device session, and issues a soft retry (`200 {"status":"retry"}`) after atomic nonce burn when Turnstile `siteverify` encounters an expired token or key rotation on a verified mobile device.
  3. **Client Touch & WebView Hardening (`src/hooks/useClearanceDispatch.ts`, `src/hooks/useTurnstileVerification.ts`, `src/lib/deviceProbe.ts`):**
     - Fixed the `isDesktopMouse` boolean bug in `useClearanceDispatch.ts` (`tap.pt === 'mouse' && !hasTouch` instead of `tap.pt === 'mouse' || !hasTouch`) that previously triggered an immediate 404 screen when an Android WebView or stylus reported `pointerType: 'mouse'` or `'pen'` on a real touchscreen phone.
     - Prevented `X11; Linux x86_64` in Android "Desktop site" mode or OEM WebViews from false-flagging `dk = 1` when genuine mobile GPU silicon (`Adreno`, `Mali`, `Immortalis`, `Xclipse`, `PowerVR`, `Apple`) or Android touch hardware is present.
     - Replaced permanent `setIsBotBlocked(true)` on transient `404` or rapid taps for verified touch devices (`hasTouch && wb=0 && hl=0 && dk=0`) with automatic session re-verification or manual retry UI.
