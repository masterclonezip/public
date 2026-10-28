# Universal Master Repository — Multi-Agent & White-Label Cloning Blueprint

> **Purpose**: Concise, authoritative engineering guide for developers and AI coding agents operating or cloning this **Universal White-Label App Directory & Transparency Engine**.  
> **Zero-Brand Guarantee**: This repository contains **zero previous brand names**, **zero pre-populated apps/news/reviews**, **zero hardcoded domains**, and **zero hardcoded credentials**. Every identity element (Site Name, Logo, Favicon, Categories, SEO Meta Titles, Content, and Links) is 100% controlled by the Administrator via Environment Variables and the Admin Dashboard.

---

## 1. Multi-Agent Operating Rules (Read First)

Any AI agent or engineer modifying or deploying this repository **MUST** preserve these 6 core architectural invariants:

1. **Blank-By-Default Identity (`""`) & Verbatim SEO Titles**:
   - Default `site_title` in `src/lib/staticData.json` and `src/lib/lightFallback.ts` is `""`.
   - `formatPageTitle()` in `src/lib/seoUtils.ts` publishes Admin-authored titles verbatim and never auto-appends `" - Brand"` or `" | Brand"` to subpages (`/app/:slug`, `/news/:slug`, etc.).
   - `<meta name="application-name">` and `<meta property="og:site_name">` are restricted strictly to the Homepage (`/`) so search engines never rewrite subpage titles.
2. **100% Admin-Controlled Branding & Content**:
   - Website Logo (`logo_url`), Favicon (`favicon_url`), Categories (`categories`), Banners (`banners`), Apps, News, Videos, FAQs, and Legal Pages are managed in the Admin Dashboard and synced to `staticData.json`.
   - Never hardcode brand names, category lists, or placeholder marketing copy into React components or SSR renderers.
3. **Dual-Firebase Database Isolation (Never Merge)**:
   - **Database A (Master Catalog — Admin Only)**: Stores `apps_chunk_*`, `settings`, `news`, `videos`, `faqs`, `developers`, `quick_links`, and `sec_vault`. The public website (`Dex`) never queries Database A directly; it reads pre-compiled `staticData.json`.
   - **Database B (Community Engine — Admin & Public)**: Stores live user `reviews`, atomic `app_stats`, helpful votes, and moderation `reports`.
4. **Zero-App & Multi-Environment Boot Safety**:
   - Fresh clones start with `0` apps, `0` news, and `0` reviews in `src/lib/staticData.json` and `src/lib/communityCatalogStats.json`.
   - SSR (`src/seoHelper.ts`), static pre-rendering (`scripts/prerender.ts`), and client state (`DataContextPublic.tsx`) boot cleanly with `0` items and immediately reflect even a single newly added item.
5. **`/moreinfo` 7-Gate Mobile Security Gateway**:
   - External download URLs are AES-256 encrypted inside `src/lib/secureVault.ts` and stripped from public JSON bundles.
   - Main app button must strictly say **"Download"**; `/moreinfo/:slug` must strictly use neutral vocabulary (**"Proceed"**, **"Verification Portal"**, **"Connecting..."**). See `MORE_INFO_SECURITY_ARCHITECTURE.md`.
6. **Dual-Repository Split-Sync (`.github/workflows/split-sync.yml`)**:
   - Automatically strips all Admin code/routes when syncing to the **Public Repository** (`GITHUB_PUBLIC_REPO`) and strips public marketing assets when syncing to the **Admin Repository** (`GITHUB_ADMIN_REPO`).

---

## 2. White-Label Brand & Content Audit Status

| Subsystem | Audited Files | Status |
| :--- | :--- | :--- |
| **Static Catalog & Fallbacks** | `src/lib/staticData.json`, `src/lib/staticData.ts`, `src/lib/lightFallback.ts`, `src/lib/defaultLegalContent.ts` | **100% Clean** (`0` apps, `0` news, `0` videos, `""` site_title, `[]` categories) |
| **Community & AI Studio Data** | `src/lib/communityCatalogStats.json`, `src/lib/communityStaticReviews.json`, `src/lib/communityReviewsData.ts`, `src/lib/aiStudioBrain.json` | **100% Clean** (`0` reviews, empty objects/arrays) |
| **Public Static Assets** | `public/logo.png`, `public/favicon.png`, `public/site.webmanifest`, `public/ai-catalog.json`, `public/llms.txt`, `public/opensearch.xml` | **100% Neutral** (Generic neutral placeholders; overridden by Admin `logo_url` / `favicon_url`) |
| **SEO & Category Fallbacks** | `src/lib/seoUtils.ts`, `src/seo/utils.ts`, `src/seo/renderers/*`, `src/seo/initialDataOptimizer.ts`, `src/pages/Home.tsx`, `src/pages/NewsDetailPage.tsx`, `src/components/FallbackRouteMatcher.tsx` | **100% Brand-Agnostic** (Dynamic brand resolution, generic `"All Apps"` / `"Games"` fallbacks) |
| **Storage, Crypto & CSS Classes** | `src/main.tsx`, `src/contexts/DataContextPublic.tsx`, `src/hooks/useAdminApps.ts`, `src/lib/secureStorage.ts`, `src/lib/security/*`, `src/index.css` | **100% Neutralized** (`platform_*` storage keys, `platform-vault-salt-v1`, `.rs-portal-*` classes) |

---

## 3. Environment Variable Dictionary (`.env.example`)

Every variable below specifies where it is required (**Admin**, **Public**, or **BOTH**) and whether it should be configured as **Plaintext** or **Secret / Encrypted** in your hosting provider (Cloudflare Pages, Vercel, Docker, or Node server).

### 3.1 Direct Admin Login & Session Security (**ADMIN SERVER ONLY**)
| Variable | Where to Add | Security Type | Description |
| :--- | :--- | :--- | :--- |
| `ADMIN_EMAIL` / `VITE_ADMIN_EMAIL` | **Admin ONLY** | **Private / Secret** (or Plaintext for `VITE_`) | Administrator login email address for direct email + password authentication. |
| `ADMIN_PASSWORD` / `ADMIN_PASSWORD_HASH` | **Admin ONLY** | **Private / Secret** | Administrator login password (plaintext or SHA-256 hex hash). |
| `ADMIN_TOTP_SECRET` | **Admin ONLY** | **Private / Secret** | Optional Base32 TOTP secret for 2FA authenticator verification. |
| `ADMIN_JWT_SECRET` / `ADMIN_SESSION_SECRET` | **Admin ONLY** | **Private / Secret** | Secret key for signing Admin session tokens. |
| `VITE_ADMIN_PATH` | **Admin ONLY** | Public / Plaintext | Custom URL path prefix for the Admin Portal (defaults to `masterworld`). |

### 3.2 Site Identity, Domain & Automatic Multi-Size Logo (**BOTH: ADMIN & PUBLIC**)
| Variable | Where to Add | Security Type | Description |
| :--- | :--- | :--- | :--- |
| `PUBLIC_DOMAIN` | **BOTH** | Public / Plaintext | Server-side canonical origin URL (e.g., `https://www.example.com`). |
| `VITE_PUBLIC_DOMAIN` | **BOTH** | Public / Plaintext | Client-side canonical origin URL (e.g., `https://www.example.com`). |
| `ALLOWED_HOSTNAMES` | **Public** (& Admin) | Public / Plaintext | Comma-separated allowed hostnames for `/moreinfo` Gateway & CORS validation. |
| `VITE_SITE_NAME` | **BOTH** | Public / Plaintext | Optional fallback site name before Admin Dashboard settings are saved (`""` default). |
| `VITE_SITE_LOGO_URL` / `SITE_LOGO_URL` | **BOTH** | Public / Plaintext | Optional fallback Logo URL (Admin Panel `logo_url` overrides this when set). |
| `VITE_SITE_FAVICON_URL` / `SITE_FAVICON_URL` | **BOTH** | Public / Plaintext | Optional fallback Favicon URL (defaults to Logo URL if omitted). |
| `VITE_SUPPORT_EMAIL` | **BOTH** | Public / Plaintext | Optional fallback support email address. |

### 3.3 Database A — Primary Master Catalog Firebase (**ADMIN SERVER ONLY**)
| Variable | Where to Add | Security Type | Description |
| :--- | :--- | :--- | :--- |
| `VITE_FIREBASE_PROJECT_ID` | **Admin ONLY** | Public / Plaintext | Firebase Project ID for the Primary Catalog project. |
| `VITE_FIREBASE_API_KEY` | **Admin ONLY** | Public / Plaintext | Firebase Web API Key for the Primary Catalog project. |
| `VITE_FIREBASE_AUTH_DOMAIN` | **Admin ONLY** | Public / Plaintext | Firebase Auth domain (`<project-id>.firebaseapp.com`). |
| `VITE_FIREBASE_STORAGE_BUCKET` | **Admin ONLY** | Public / Plaintext | Firebase Storage bucket (`<project-id>.appspot.com`). |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | **Admin ONLY** | Public / Plaintext | Firebase Cloud Messaging Sender ID. |
| `VITE_FIREBASE_APP_ID` | **Admin ONLY** | Public / Plaintext | Firebase Web App ID. |
| `VITE_FIREBASE_DATABASE_ID` | **Admin ONLY** | Public / Plaintext | Named Firestore database ID (or `(default)`). |
| `FIREBASE_SERVICE_ACCOUNT_KEY` | **Admin ONLY** | **Private / Secret** | Optional JSON string of the Firebase Admin Service Account for server-side writes. |

### 3.4 Database B — Community Reviews & Moderation Firebase (**BOTH: ADMIN & PUBLIC**)
| Variable | Where to Add | Security Type | Description |
| :--- | :--- | :--- | :--- |
| `VITE_COMMUNITY_FIREBASE_PROJECT_ID` | **BOTH** | Public / Plaintext | Firebase Project ID for the Community Reviews project. |
| `VITE_COMMUNITY_FIREBASE_API_KEY` | **BOTH** | Public / Plaintext | Firebase Web API Key for the Community project. |
| `VITE_COMMUNITY_FIREBASE_AUTH_DOMAIN` | **BOTH** | Public / Plaintext | Firebase Auth domain for the Community project. |
| `VITE_COMMUNITY_FIREBASE_STORAGE_BUCKET` | **BOTH** | Public / Plaintext | Firebase Storage bucket for the Community project. |
| `VITE_COMMUNITY_FIREBASE_MESSAGING_SENDER_ID` | **BOTH** | Public / Plaintext | Messaging Sender ID for the Community project. |
| `VITE_COMMUNITY_FIREBASE_APP_ID` | **BOTH** | Public / Plaintext | Firebase App ID for the Community project. |
| `VITE_COMMUNITY_FIREBASE_DATABASE_ID` | **BOTH** | Public / Plaintext | Named Firestore database ID for Community (or `(default)`). |
| `COMMUNITY_FIREBASE_SERVICE_ACCOUNT_KEY` | **BOTH** | **Private / Secret** | Optional JSON string of the Community Firebase Admin Service Account. |

### 3.5 AES Link Vault, `/moreinfo` Gateway, Turnstile & Upstash Redis
| Variable | Where to Add | Security Type | Description |
| :--- | :--- | :--- | :--- |
| `AES_KEY` / `VAULT_SECRET_KEY` | **BOTH (Must Match)** | **Private / Secret** | 256-bit secret key for AES-256 link vault encryption (Admin) and decryption (Public). |
| `VITE_VAULT_SECRET_KEY` | **Admin ONLY** | **Private / Secret** | Fallback key used only inside Admin browser when sealing vault on static hosts. |
| `NONCE_HMAC_SECRET` / `GATE_SIGNING_SECRET` | **Public** (& Admin) | **Private / Secret** | HMAC-SHA256 secret for signing `/moreinfo` session nonces. |
| `DID_HMAC_SECRET` | **Public** (& Admin) | **Private / Secret** | HMAC-SHA256 secret for signing `__Host-rd_did` device cookies. |
| `IP_HASH_SALT` | **Public** (& Admin) | **Private / Secret** | Secret salt for privacy-preserving IP rate-limit hashing. |
| `VITE_TURNSTILE_SITE_KEY` | **BOTH** | Public / Plaintext | Cloudflare Turnstile widget site key for `/moreinfo` and review forms. |
| `TURNSTILE_SECRET_KEY` | **BOTH** | **Private / Secret** | Cloudflare Turnstile server-side secret key for `siteverify`. |
| `UPSTASH_REDIS_REST_URL` | **Public** (& Admin) | **Private / Secret** | Upstash Redis REST endpoint for atomic nonce burn & rate limiting. |
| `UPSTASH_REDIS_REST_TOKEN` | **Public** (& Admin) | **Private / Secret** | Upstash Redis REST bearer token. |

### 3.6 Cloudinary Media, AI Studio & GitHub Split-Sync (**ADMIN SERVER ONLY**)
| Variable | Where to Add | Security Type | Description |
| :--- | :--- | :--- | :--- |
| `CLOUDINARY_CLOUD_NAME` / `VITE_CLOUDINARY_CLOUD_NAME` | **Admin ONLY** | Public / Plaintext | Cloudinary Cloud Name for Admin image uploads. |
| `CLOUDINARY_API_KEY` | **Admin ONLY** | **Private / Secret** | Cloudinary API Key for signed server uploads. |
| `CLOUDINARY_API_SECRET` | **Admin ONLY** | **Private / Secret** | Cloudinary API Secret for signed server uploads. |
| `CLOUDINARY_UPLOAD_FOLDER` / `VITE_CLOUDINARY_UPLOAD_PRESET` | **Admin ONLY** | Public / Plaintext | Target upload folder / unsigned preset (`uploads`). |
| `GEMINI_API_KEY` | **Admin ONLY** | **Private / Secret** | Optional server-side Gemini API key fallback for Admin AI Review Studio (can also be set live in the Admin UI). |
| `GITHUB_TOKEN` / `GITHUB_PAT` | **Admin ONLY** | **Private / Secret** | GitHub Personal Access Token for automated Split-Sync commits. |
| `GITHUB_OWNER` / `VITE_GITHUB_OWNER` | **Admin ONLY** | Public / Plaintext | GitHub organization or username for Split-Sync target repositories. |
| `GITHUB_PUBLIC_REPO` / `VITE_GITHUB_PUBLIC_REPO` | **Admin ONLY** | Public / Plaintext | Target public website repository name. |
| `GITHUB_ADMIN_REPO` / `VITE_GITHUB_ADMIN_REPO` | **Admin ONLY** | Public / Plaintext | Target isolated admin repository name. |

---

## 4. Quick-Launch Checklist for New Clones

1. **Install & Configure**:
   ```bash
   npm install
   cp .env.example .env
   ```
2. **Set Required Environment Variables**:
   - Add `PUBLIC_DOMAIN`, `VITE_PUBLIC_DOMAIN`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `AES_KEY`, Database A (`VITE_FIREBASE_*`), and Database B (`VITE_COMMUNITY_FIREBASE_*`).
   - If deploying on **Cloudflare Pages**, set **Framework preset**: `None`, **Build command**: `npm run build`, and **Build output directory**: `dist`.
3. **Verify & Build**:
   ```bash
   npm run lint
   npm run build
   ```
4. **Populate Brand & Catalog in Admin**:
   - Log in at `/<VITE_ADMIN_PATH>/login` (default `/masterworld/login`) using `ADMIN_EMAIL` and `ADMIN_PASSWORD`.
   - Open **Settings** to configure your new **Site Title**, **Logo URL**, **Favicon URL**, **Categories**, and **Legal Pages**.
   - Add your apps, news, videos, and reviews, then trigger **GitHub Sync** to publish the static snapshot and encrypted link vault.
