# Universal Master Repository — Architecture & Cloning Blueprint

> **Document Purpose**: Complete architectural guide and step-by-step deployment workflow for the **Universal White-Label App Directory & Transparency Master Engine**.  
> **Core Principle**: This repository is a **100% brand-agnostic, content-free core engine**. It contains zero pre-populated content, zero hardcoded domains, zero hardcoded Firebase credentials, and defaults to a blank identity (`""`) until configured via Environment Variables and the Admin Portal.

---

## 1. Core Architectural Pillars

When this master repository is cloned to launch a new website, it operates with four foundational guarantees:

1. **Blank Default Identity (`""`)**:
   - When `settings.site_title` in the database and `VITE_SITE_NAME` in the environment are empty, the application renders with a blank name (`""`).
   - All SEO meta title and schema builders dynamically omit `" | "` or `" - "` separators when the site name is blank, preventing malformed `<title>` tags.
2. **100% Environment-Variable Driven Configuration**:
   - Every external integration—Primary Domain, Dual Firebase Databases (Database A: Master Catalog + Database B: Community Reviews), Admin Authentication & TOTP 2FA, AES-256 Link Vault, `/moreinfo` 7-Gate Anti-Bot Security Gateway, Cloudflare Turnstile, Upstash Redis, Cloudinary Media Optimization, and GitHub Split-Sync—is controlled strictly via environment variables.
3. **Zero-Crash Empty Catalog & Offline Boot**:
   - A newly cloned instance starting with **0 apps**, **0 news articles**, **0 videos**, **0 FAQs**, **0 reviews**, or **unconfigured Firebase environment variables** boots cleanly, serves valid SSR HTML and empty XML sitemaps, and allows immediate configuration inside the Admin Portal without runtime crashes or minimum-app-count rejections.
4. **Dual-Database Isolation (Catalog vs. Community)**:
   - **Database A (Primary Master Catalog Firebase)**: Stores apps (`apps_chunk_*`), global settings (`settings`), news (`news`), videos (`videos`), quick links (`quick_links`), FAQs (`faqs`), developer profiles (`developers`), and encrypted link vault (`sec_vault`).
   - **Database B (Community Reviews & Reports Firebase)**: Stores user reviews (`reviews`), per-app rating distributions (`app_stats`), helpful votes, and moderation flags (`reports`). Keeping user-generated traffic in a dedicated Firebase project protects the primary catalog from read/write quota exhaustion.

---

## 2. Complete Environment Variable Reference (`.env.example`)

Every variable below specifies:
- **Where to Add**: **Admin (`masterworld`)**, **Public (`Dex`)**, or **BOTH**
- **Security Type**:
  - **Public / Plaintext (Unsecure)**: Safe to expose to the browser bundle (`VITE_*`) or non-sensitive configuration.
  - **Private / Secret (Secure)**: Server/Edge-only secret. Mark as **Secret / Encrypted** in Cloudflare Pages, Vercel, or your server environment. Never prefix with `VITE_` (except `VITE_VAULT_SECRET_KEY` when using client-side fallback sealing in Admin).

### 2.1 Site Identity, Domain & Automatic Multi-Size Logo
| Variable | Where to Add | Security Type | Description |
| :--- | :--- | :--- | :--- |
| `PUBLIC_DOMAIN` | **BOTH** | Public / Plaintext | Server-side canonical origin URL (e.g., `https://www.example.com`). |
| `VITE_PUBLIC_DOMAIN` | **BOTH** | Public / Plaintext | Client-side canonical origin URL (e.g., `https://www.example.com`). |
| `ALLOWED_HOSTNAMES` | **Public** (& Admin) | Public / Plaintext | Comma-separated allowed hostnames for `/moreinfo` Gateway & CORS validation. |
| `VITE_SITE_NAME` | **BOTH** | Public / Plaintext | Optional fallback site name before Admin Dashboard settings are saved (`""` default). |
| `VITE_SITE_LOGO_URL` / `SITE_LOGO_URL` | **BOTH** | Public / Plaintext | Optional fallback Website Logo URL (Admin Panel `logo_url` overrides this when set). Automatically generates all required sizes (`16x16` to `512x512`, `120px`, `1200x630`). |
| `VITE_SITE_FAVICON_URL` / `SITE_FAVICON_URL` | **BOTH** | Public / Plaintext | Optional fallback Favicon / Search Icon URL (defaults to Logo URL if omitted). |
| `VITE_SUPPORT_EMAIL` | **BOTH** | Public / Plaintext | Optional fallback support email address. |
| `VITE_ADMIN_PATH` | **Admin ONLY** | Public / Plaintext | Custom URL path prefix for the Admin Portal (defaults to `masterworld`). |

### 2.2 Database A — Primary Master Catalog Firebase (**ADMIN SERVER ONLY**)
*(The Public Website (`Dex`) uses `staticData.json` and NEVER connects to Database A)*
| Variable | Where to Add | Security Type | Description |
| :--- | :--- | :--- | :--- |
| `VITE_FIREBASE_API_KEY` | **Admin ONLY** | Public / Plaintext | Firebase Web API Key for the Primary Catalog project. |
| `VITE_FIREBASE_AUTH_DOMAIN` | **Admin ONLY** | Public / Plaintext | Firebase Auth domain (`<project-id>.firebaseapp.com`). |
| `VITE_FIREBASE_PROJECT_ID` | **Admin ONLY** | Public / Plaintext | Firebase Project ID for the Primary Catalog project. |
| `VITE_FIREBASE_STORAGE_BUCKET` | **Admin ONLY** | Public / Plaintext | Firebase Storage bucket (`<project-id>.appspot.com`). |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | **Admin ONLY** | Public / Plaintext | Firebase Cloud Messaging Sender ID. |
| `VITE_FIREBASE_APP_ID` | **Admin ONLY** | Public / Plaintext | Firebase Web App ID. |
| `VITE_FIREBASE_DATABASE_ID` | **Admin ONLY** | Public / Plaintext | Named Firestore database ID (or `(default)`). |
| `FIREBASE_SERVICE_ACCOUNT_KEY` | **Admin ONLY** | **Private / Secret** | Optional JSON string of the Firebase Admin Service Account for server-side writes. |

### 2.3 Database B — Community Reviews & Moderation Firebase (**BOTH: ADMIN & PUBLIC**)
| Variable | Where to Add | Security Type | Description |
| :--- | :--- | :--- | :--- |
| `VITE_COMMUNITY_FIREBASE_API_KEY` | **BOTH** | Public / Plaintext | Firebase Web API Key for the Community Reviews project. |
| `VITE_COMMUNITY_FIREBASE_AUTH_DOMAIN` | **BOTH** | Public / Plaintext | Firebase Auth domain for the Community project. |
| `VITE_COMMUNITY_FIREBASE_PROJECT_ID` | **BOTH** | Public / Plaintext | Firebase Project ID for the Community project. |
| `VITE_COMMUNITY_FIREBASE_STORAGE_BUCKET` | **BOTH** | Public / Plaintext | Firebase Storage bucket for the Community project. |
| `VITE_COMMUNITY_FIREBASE_MESSAGING_SENDER_ID` | **BOTH** | Public / Plaintext | Messaging Sender ID for the Community project. |
| `VITE_COMMUNITY_FIREBASE_APP_ID` | **BOTH** | Public / Plaintext | Firebase App ID for the Community project. |
| `VITE_COMMUNITY_FIREBASE_DATABASE_ID` | **BOTH** | Public / Plaintext | Named Firestore database ID for Community (or `(default)`). |
| `COMMUNITY_FIREBASE_SERVICE_ACCOUNT_KEY` | **BOTH** | **Private / Secret** | Optional JSON string of the Community Firebase Admin Service Account. |

### 2.4 Admin Authentication, AES Vault & `/moreinfo` Security Gateway
| Variable | Where to Add | Security Type | Description |
| :--- | :--- | :--- | :--- |
| `ADMIN_PASSWORD_HASH` / `ADMIN_PASSWORD` | **Admin ONLY** | **Private / Secret** | Admin login password or SHA-256 hash. |
| `ADMIN_TOTP_SECRET` | **Admin ONLY** | **Private / Secret** | Base32 TOTP secret for 2FA authenticator verification. |
| `ADMIN_JWT_SECRET` / `ADMIN_SESSION_SECRET` | **Admin ONLY** | **Private / Secret** | Secret key for signing Admin session tokens. |
| `AES_KEY` / `VAULT_SECRET_KEY` | **BOTH (Must Match)** | **Private / Secret** | 256-bit secret key for AES-256 link vault encryption (Admin) and decryption (Public). |
| `VITE_VAULT_SECRET_KEY` | **Admin ONLY** | **Private / Secret** | Fallback key used only inside Admin browser when sealing vault on static hosts. Never add to Public repo. |
| `NONCE_HMAC_SECRET` / `GATE_SIGNING_SECRET` | **Public** (& Admin) | **Private / Secret** | HMAC-SHA256 secret for signing `/moreinfo` session nonces. |
| `DID_HMAC_SECRET` | **Public** (& Admin) | **Private / Secret** | HMAC-SHA256 secret for signing `__Host-rd_did` device cookies. |
| `IP_HASH_SALT` | **Public** (& Admin) | **Private / Secret** | Secret salt for privacy-preserving IP rate-limit hashing. |
| `VITE_TURNSTILE_SITE_KEY` | **BOTH** | Public / Plaintext | Cloudflare Turnstile widget site key for `/moreinfo` and review forms. |
| `TURNSTILE_SECRET_KEY` | **BOTH** | **Private / Secret** | Cloudflare Turnstile server-side secret key for `siteverify`. |
| `UPSTASH_REDIS_REST_URL` | **Public** (& Admin) | **Private / Secret** | Upstash Redis REST endpoint for atomic nonce burn & rate limiting. |
| `UPSTASH_REDIS_REST_TOKEN` | **Public** (& Admin) | **Private / Secret** | Upstash Redis REST bearer token. |

### 2.5 Cloudinary Media & GitHub Split-Sync (**ADMIN SERVER ONLY**)
| Variable | Where to Add | Security Type | Description |
| :--- | :--- | :--- | :--- |
| `CLOUDINARY_CLOUD_NAME` / `VITE_CLOUDINARY_CLOUD_NAME` | **Admin ONLY** | Public / Plaintext | Cloudinary Cloud Name for Admin image uploads. |
| `CLOUDINARY_API_KEY` | **Admin ONLY** | **Private / Secret** | Cloudinary API Key for signed server uploads. |
| `CLOUDINARY_API_SECRET` | **Admin ONLY** | **Private / Secret** | Cloudinary API Secret for signed server uploads. |
| `CLOUDINARY_UPLOAD_FOLDER` | **Admin ONLY** | Public / Plaintext | Target folder in Cloudinary for uploaded assets (`uploads`). |
| `VITE_CLOUDINARY_UPLOAD_PRESET` | **Admin ONLY** | Public / Plaintext | Unsigned upload preset fallback for client-side uploads (`uploads`). |
| `GITHUB_TOKEN` / `GITHUB_PAT` | **Admin ONLY** | **Private / Secret** | GitHub Personal Access Token for automated Split-Sync commits. |
| `GITHUB_OWNER` / `VITE_GITHUB_OWNER` | **Admin ONLY** | Public / Plaintext | GitHub organization or username for Split-Sync target repositories. |
| `GITHUB_PUBLIC_REPO` / `VITE_GITHUB_PUBLIC_REPO` | **Admin ONLY** | Public / Plaintext | Target public website repository name (e.g., `Dex`). |
| `GITHUB_ADMIN_REPO` / `VITE_GITHUB_ADMIN_REPO` | **Admin ONLY** | Public / Plaintext | Target isolated admin repository name (e.g., `masterworld`). |

---

## 3. Core Subsystem Workflows

### 3.1 Server-Side Rendering (SSR) & Dynamic SEO (`src/seoHelper.ts`)
- Incoming requests to `/`, `/app/:slug`, `/news`, `/news/:slug`, `/videos`, `/developers`, `/faqs`, and legal pages are pre-rendered on the server with full semantic HTML, OpenGraph tags, canonical URLs, and JSON-LD structured data.
- `window.__INITIAL_DATA__` is injected into the HTML response with stripped non-target HTML fields (`initialDataOptimizer.ts`) so index pages stay lightweight while hydrating instantaneously on the client.
- Dynamic XML feeds (`/sitemap.xml`, `/sitemap-index.xml`, `/sitemap-pages.xml`, `/sitemap-apps.xml`, `/sitemap-news.xml`, `/rss.xml`, `/robots.txt`, `/opensearch.xml`, `/llms.txt`, `/ai-catalog.json`) are generated dynamically from the active domain and live catalog data.

### 3.2 Dynamic Catalog Sync & Zero-App Safety
- Both the SSR engine (`src/seo/sync.ts`, `src/seoHelper.ts`) and the React data layer (`src/contexts/DataContextPublic.tsx`, `src/contexts/DataContext.tsx`) support catalogs of **any size** (`0` apps, `1` app, or `500+` apps).
- When `src/lib/staticData.json` starts with `0` apps on a fresh clone, adding even a single app in the Admin Portal immediately syncs and renders live without triggering false "incomplete catalog" fallbacks.

### 3.3 `/moreinfo` 7-Gate Mobile Security Gateway (`MORE_INFO_SECURITY_ARCHITECTURE.md`)
- External destination URLs are encrypted with AES-256 inside the Secure Vault and stripped from all public JSON bundles (`stripDownloadLinks: true`).
- Tapping **Download** on `/app/:slug` navigates via router state (`navProof`) to `/moreinfo/:slug`.
- The gateway executes `POST /api/v1/app/session-init` and `POST /api/v1/app/session-clearance` across 7 sequential verification gates (Edge/ASN/UA checks, Quarantine/Burst limits, Nonce HMAC + Server Dwell, Device Hardware Truth, Touch Event Invariants, Atomic Redis Nonce Burn + Cloudflare Turnstile `cData` Hardware Commitment, and Late Server-RAM AES Decryption).

### 3.4 Dual-Repository Split-Sync Pipeline (`.github/workflows/split-sync.yml` & `useGitHubSync.ts`)
- From the Admin Portal (**GitHub Sync** tab) or via GitHub Actions on push to `main`, the master repository can compile and push:
  1. **Public Website Repository (`GITHUB_PUBLIC_REPO`)**: Contains pre-compiled `staticData.json`, `communityCatalogStats.json`, public UI pages, and SSR/Edge functions, with all Admin components and secrets stripped.
  2. **Admin Control Repository (`GITHUB_ADMIN_REPO`)**: Contains the isolated Admin Dashboard and management APIs.

---

## 4. Step-by-Step Guide: Cloning & Launching a New Website

1. **Clone the Master Repository**:
   ```bash
   git clone <master-repo-url> my-new-platform
   cd my-new-platform
   npm install
   ```
2. **Configure `.env`**:
   - Copy `.env.example` to `.env`.
   - Add your `PUBLIC_DOMAIN` / `VITE_PUBLIC_DOMAIN`.
   - Provision two Firebase projects (or two Firestore databases):
     - Set `VITE_FIREBASE_*` for the **Primary Catalog Database**.
     - Set `VITE_COMMUNITY_FIREBASE_*` for the **Community Reviews Database**.
   - Set `AES_KEY` / `VAULT_SECRET_KEY`, `NONCE_HMAC_SECRET`, `DID_HMAC_SECRET`, `ADMIN_PASSWORD_HASH`, and `ADMIN_TOTP_SECRET`.
   - Set `VITE_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`, and `UPSTASH_REDIS_REST_*`.
   - Set `CLOUDINARY_*` and `GITHUB_*` variables.
3. **Start Development or Production Build**:
   ```bash
   npm run dev      # Starts full-stack Express + Vite server on port 3000
   npm run build    # Compiles production client + server bundle
   npm run lint     # Validates TypeScript types across the codebase
   ```
4. **Initialize Site Branding & Content via Admin Portal**:
   - Open `/<VITE_ADMIN_PATH>/login` (defaults to `/masterworld/login`).
   - Navigate to **Settings** and enter your new **Site Title**, **Meta Description**, **Logo URL**, **Favicon URL**, and **Legal / Transparency Pages**.
   - Add your applications, categories, news articles, videos, and FAQs.
   - Trigger **GitHub Sync** to seal encrypted links into the vault and publish the static fallback snapshot.
