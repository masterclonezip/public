# 🔐 Master Environment Variables Architectural Guide: Public & Admin Systems

> **Platform Source of Truth**: This document provides the complete, authoritative, and exhaustive guide for configuring all environment variables across the **Public Website (Dex / `www.example.com`)** and the **Admin Management Portal (Masterworld / Admin site)**.
>
> Every variable is documented with:
> 1. **Exact Feature / Work Purpose**: What subsystem uses it and why.
> 2. **How to Add It**: Hosting platform instructions (Cloudflare Pages, Vercel, Docker, Node.js server).
> 3. **Where to Get It**: Step-by-step console navigation and generation commands.
> 4. **System Portion**: Frontend client bundle, server-side REST API, edge worker, or crypto engine.
> 5. **Security Classification**: **Non-Secret / Public** (safe for client JavaScript bundle) vs. **Private / Secret** (must NEVER be exposed to the browser).

---

## 🏗️ Architectural Foundations: The Dual-System Boundary

The platform operates on a **strict dual-system architecture** split across two isolated environments:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       DUAL-SYSTEM ENVIRONMENT MODEL                         │
├─────────────────────────────────────────┬───────────────────────────────────┤
│    PART 1: PUBLIC WEBSITE (Dex)         │    PART 2: ADMIN WEBSITE (Master) │
│    - Fast, read-heavy, 100% uptime      │    - High-privilege management    │
│    - Reads pre-rendered staticData.json │    - Reads & writes Database A    │
│    - Reads/writes Database B (Reviews)  │    - Moderates Database B         │
│    - /moreinfo AES Decryption Gateway   │    - AES Link Vault Sealing       │
│    - Zero admin code or credentials     │    - Google AI Studio (Gemini)    │
│    - Safe for public web crawlers       │    - Cloudinary Media & Git Sync  │
└─────────────────────────────────────────┴───────────────────────────────────┘
```

### Prefix Convention: `VITE_` vs. Non-`VITE_`
- **`VITE_*` Variables**: Bundled directly into the frontend client JavaScript by the Vite bundler at build time. Anyone inspecting browser dev tools can read these values. **Never put private passwords, secret tokens, or private signing keys into `VITE_` variables.**
- **Plain Server Variables (No `VITE_`)**: Evaluated only inside Node.js (`process.env`) or Cloudflare Pages Functions (`context.env`). They are completely invisible to the client browser.

---

# 🌐 PART 1: PUBLIC WEBSITE (Dex / `www.example.com`)

The Public Website is deployed to your public domain (e.g., `https://www.example.com` or Cloudflare Pages `dex-app.pages.dev`). It requires **only** public site identity, Database B (Community Reviews client SDK), the `/moreinfo` AES decryption key, and anti-bot verification.

---

### 1.1 Site Identity, Domain & Canonical SEO

| Variable | Security Level | System Portion | Required? |
| :--- | :--- | :--- | :--- |
| `PUBLIC_DOMAIN` | **Non-Secret / Public** | Node Server / SSR / Sitemap / RSS | **REQUIRED** |
| `VITE_PUBLIC_DOMAIN` | **Non-Secret / Public** | Frontend Client / Meta Tags / Share | **REQUIRED** |
| `ALLOWED_HOSTNAMES` | **Non-Secret / Public** | `/moreinfo` Gateway & SSR Origin Guard | **REQUIRED** |
| `VITE_SITE_NAME` | **Non-Secret / Public** | Title Formatter & Fallback Header | Optional (Admin settings override) |
| `VITE_SITE_LOGO_URL` | **Non-Secret / Public** | Header Logo & Meta Icons | Optional (Admin settings override) |
| `VITE_SITE_FAVICON_URL` | **Non-Secret / Public** | Favicon & Web App Manifest | Optional (Admin settings override) |
| `VITE_SUPPORT_EMAIL` | **Non-Secret / Public** | Contact & Legal Pages | Optional (Admin settings override) |

#### 1. `PUBLIC_DOMAIN` & `VITE_PUBLIC_DOMAIN`
- **For What Work**: Sets the canonical base URL for the entire website. Used by `src/seoHelper.ts` to pre-render OpenGraph tags (`og:url`), generate absolute XML sitemaps (`/sitemap.xml`), build RSS feeds (`/rss.xml`), and enforce canonical URLs.
- **Where to Get It**: Your actual production domain, e.g., `https://www.example.com`.
- **How to Add It**:
  - **Cloudflare Pages**: Project Settings ➔ **Environment variables** ➔ Add variable: `PUBLIC_DOMAIN` = `https://www.example.com` and `VITE_PUBLIC_DOMAIN` = `https://www.example.com` (Plain text).
  - **Node.js / Docker**: Place in `.env`.
- **Portion**: `PUBLIC_DOMAIN` is used in server routes (`seoRoutes.ts`); `VITE_PUBLIC_DOMAIN` is used in React (`useSEO.ts`).

#### 2. `ALLOWED_HOSTNAMES`
- **For What Work**: Prevents Host-Header poisoning and loopback attacks on the `/moreinfo` Clearance Gateway.
- **Where to Get It**: Comma-separated list of hostnames your site serves, e.g.: `example.com,www.example.com`.
- **How to Add It**: Plain text in hosting dashboard or `.env`.

---

### 1.2 Database B: Community Reviews & Reports (Firebase)

The Public Website **NEVER** connects to Database A (Master Catalog). It connects **ONLY** to **Database B (Community Firebase)** so users can read reviews, write reviews, upvote helpfulness, and submit abuse reports.

> **Why are Firebase Web Keys marked Non-Secret?**  
> Google Firebase Web API keys (`AIzaSy...`) are public identifiers designed to be bundled in frontend applications. They identify your project, while **Firestore Security Rules** (`firestore.rules`) enforce permissions and protect data.

| Variable | Security Level | System Portion | Required? |
| :--- | :--- | :--- | :--- |
| `VITE_COMMUNITY_FIREBASE_PROJECT_ID` | **Non-Secret / Public** | React Client (`communityFirebase.ts`) | **REQUIRED** |
| `VITE_COMMUNITY_FIREBASE_API_KEY` | **Non-Secret / Public** | React Client (`communityFirebase.ts`) | **REQUIRED** |
| `VITE_COMMUNITY_FIREBASE_AUTH_DOMAIN` | **Non-Secret / Public** | React Client (`communityFirebase.ts`) | **REQUIRED** |
| `VITE_COMMUNITY_FIREBASE_STORAGE_BUCKET` | **Non-Secret / Public** | React Client (`communityFirebase.ts`) | Optional |
| `VITE_COMMUNITY_FIREBASE_MESSAGING_SENDER_ID` | **Non-Secret / Public** | React Client (`communityFirebase.ts`) | Optional |
| `VITE_COMMUNITY_FIREBASE_APP_ID` | **Non-Secret / Public** | React Client (`communityFirebase.ts`) | **REQUIRED** |
| `VITE_COMMUNITY_FIREBASE_DATABASE_ID` | **Non-Secret / Public** | React Client (`communityFirebase.ts`) | Optional (`(default)`) |
| `COMMUNITY_FIREBASE_SERVICE_ACCOUNT_KEY` | **PRIVATE / SECRET** | Server REST API (`communityRoutes.ts`) | Optional (For server-side writes) |

#### How to Get Database B Credentials:
1. Navigate to the **[Firebase Console](https://console.firebase.google.com/)**.
2. Select or create your dedicated **Community Reviews Firebase Project** (e.g., `my-community-db`).
3. Click the **Gear icon (Project Settings)** in the left sidebar.
4. Under the **General** tab, scroll down to **Your apps** and click the **Web icon (`</>`)**.
5. Register the app (e.g., "Public Reviews Client").
6. Copy the `firebaseConfig` properties:
   - `projectId` ➔ `VITE_COMMUNITY_FIREBASE_PROJECT_ID`
   - `apiKey` ➔ `VITE_COMMUNITY_FIREBASE_API_KEY`
   - `authDomain` ➔ `VITE_COMMUNITY_FIREBASE_AUTH_DOMAIN`
   - `storageBucket` ➔ `VITE_COMMUNITY_FIREBASE_STORAGE_BUCKET`
   - `messagingSenderId` ➔ `VITE_COMMUNITY_FIREBASE_MESSAGING_SENDER_ID`
   - `appId` ➔ `VITE_COMMUNITY_FIREBASE_APP_ID`
7. Ensure Cloud Firestore is enabled in **Build ➔ Firestore Database**. Set mode to `(default)`.

---

### 1.3 AES Link Vault, `/moreinfo` Gateway & Anti-Bot Protection

The public website serves the clearance gateway `/moreinfo/:slug`. App download links are stored in an encrypted vault; the public server decrypts them in RAM only when a real human passes anti-bot verification.

| Variable | Security Level | System Portion | Required? |
| :--- | :--- | :--- | :--- |
| `AES_KEY` (or `VAULT_SECRET_KEY`) | **PRIVATE / SECRET** | Edge & Server RAM (`crypto.ts`, `linkService.ts`) | **REQUIRED** |
| `VITE_TURNSTILE_SITE_KEY` | **Non-Secret / Public** | Public Clearance Button (`ClearanceButton.tsx`) | **REQUIRED** |
| `TURNSTILE_SECRET_KEY` | **PRIVATE / SECRET** | Server Anti-Bot Verifier (`gateCore.ts`) | **REQUIRED** |
| `NONCE_HMAC_SECRET` | **PRIVATE / SECRET** | Session Token Signer (`gateCore.ts`) | Recommended |
| `GATE_SIGNING_SECRET` | **PRIVATE / SECRET** | Fallback Session Signer (`gateCore.ts`) | Recommended |
| `DID_HMAC_SECRET` | **PRIVATE / SECRET** | Device Cookie Signer (`__Host-rd_did`) | Recommended |
| `IP_HASH_SALT` | **PRIVATE / SECRET** | Privacy-Preserving Rate Limiting | Recommended |
| `UPSTASH_REDIS_REST_URL` | **PRIVATE / SECRET** | Serverless Nonce Burn & Rate Limiting | Recommended |
| `UPSTASH_REDIS_REST_TOKEN` | **PRIVATE / SECRET** | Serverless Redis Bearer Auth | Recommended |

#### 1. `AES_KEY` / `VAULT_SECRET_KEY` (CRITICAL)
- **For What Work**: 256-bit AES cryptographic key used to decrypt external download links in memory on `/api/v1/public/secure-link`. **This key MUST be identical between Admin and Public sites.**
- **Where to Get It**: Generate using Linux / Mac terminal:
  ```bash
  openssl rand -hex 32
  ```
  *(Generates a pristine 64-character hex string representing 256 bits of cryptographic entropy).*
- **How to Add It**: Store as **Secret / Encrypted** variable in Cloudflare Pages or server environment. Never prefix with `VITE_` on the public site!

#### 2. `VITE_TURNSTILE_SITE_KEY` & `TURNSTILE_SECRET_KEY`
- **For What Work**: Cloudflare Turnstile CAPTCHA protection. Prevents automated AI scrapers and botnets from draining download links or spamming fake reviews.
- **Where to Get It**:
  1. Open the **[Cloudflare Dashboard](https://dash.cloudflare.com/)**.
  2. Select **Turnstile** from the left navigation menu.
  3. Click **Add Site**. Enter your site name and domain (`example.com`).
  4. Select Widget Mode: **Managed** or **Non-interactive**.
  5. Copy the generated **Site Key** (`0x4AAAAAA...`) ➔ `VITE_TURNSTILE_SITE_KEY`.
  6. Copy the generated **Secret Key** (`0x4AAAAAA...`) ➔ `TURNSTILE_SECRET_KEY`.
- **How to Add It**:
  - `VITE_TURNSTILE_SITE_KEY`: Set as Plain text.
  - `TURNSTILE_SECRET_KEY`: Set as **Secret / Encrypted**.

#### 3. `UPSTASH_REDIS_REST_URL` & `UPSTASH_REDIS_REST_TOKEN` (Optional but Recommended)
- **For What Work**: Provides atomic, distributed token burning across Cloudflare edge nodes to prevent replay attacks on `/moreinfo`. If omitted, an in-memory sliding window is used.
- **Where to Get It**:
  1. Go to **[Upstash Console](https://console.upstash.com/)**.
  2. Create a free Redis database (Region: closest to your traffic).
  3. Under **REST API**, copy `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`.
- **How to Add It**: Add as **Secret / Encrypted** variables.

---

### 1.4 Copy-Paste `.env` Template for Public Website

```bash
# ==============================================================================
# PUBLIC WEBSITE ENVIRONMENT CONFIGURATION (.env)
# ==============================================================================

# 1. Site Identity & Canonical Domain
PUBLIC_DOMAIN="https://www.example.com"
VITE_PUBLIC_DOMAIN="https://www.example.com"
ALLOWED_HOSTNAMES="example.com,www.example.com"
VITE_SITE_NAME="My App Directory"
VITE_SUPPORT_EMAIL="support@example.com"

# 2. Database B: Community Reviews & Reports (Firebase Web Client)
VITE_COMMUNITY_FIREBASE_PROJECT_ID="my-community-db"
VITE_COMMUNITY_FIREBASE_API_KEY="AIzaSyA1234567890abcdef"
VITE_COMMUNITY_FIREBASE_AUTH_DOMAIN="my-community-db.firebaseapp.com"
VITE_COMMUNITY_FIREBASE_STORAGE_BUCKET="my-community-db.appspot.com"
VITE_COMMUNITY_FIREBASE_MESSAGING_SENDER_ID="123456789012"
VITE_COMMUNITY_FIREBASE_APP_ID="1:123456789012:web:abcdef"
VITE_COMMUNITY_FIREBASE_DATABASE_ID="(default)"

# 3. Cryptographic Link Vault & Anti-Bot Clearance Gateway
AES_KEY="generate_64_char_hex_key_using_openssl_rand_hex_32"
VITE_TURNSTILE_SITE_KEY="0x4AAAAAAACopyFromCloudflareTurnstileSiteKey"
TURNSTILE_SECRET_KEY="0x4AAAAAAACopyFromCloudflareTurnstileSecretKey"
NONCE_HMAC_SECRET="generate_random_secret_string_32_bytes"
DID_HMAC_SECRET="generate_random_secret_string_32_bytes"
IP_HASH_SALT="generate_random_secret_string_32_bytes"

# Optional: Upstash Distributed Redis (For multi-region edge rate limiting)
# UPSTASH_REDIS_REST_URL="https://your-upstash-instance.upstash.io"
# UPSTASH_REDIS_REST_TOKEN="your_upstash_bearer_token"
```

---

# 🛡️ PART 2: ADMIN WEBSITE (Masterworld / Admin Portal)

The Admin Website is deployed to your private control domain or isolated Cloudflare Pages project (e.g., `admin.example.com` or `masterworld-portal.pages.dev`). It possesses full catalog editing, Google AI Studio integration, Cloudinary image upload, and GitHub split-sync capabilities.

---

### 2.1 Admin Authentication, Session & 2FA Security

| Variable | Security Level | System Portion | Required? |
| :--- | :--- | :--- | :--- |
| `ADMIN_EMAIL` | **PRIVATE / SECRET** | Auth Verifier (`adminAuthRoutes.ts`, `adminAuthService.ts`) | **REQUIRED** |
| `VITE_ADMIN_EMAIL` | **Non-Secret / Public** | Login Pre-fill Hint (`AdminLogin.tsx`) | Optional |
| `ADMIN_PASSWORD` | **PRIVATE / SECRET** | Password Auth (`adminAuthRoutes.ts`) | **REQUIRED** |
| `ADMIN_PASSWORD_HASH` | **PRIVATE / SECRET** | SHA-256 Hashed Password Alternative | Optional (If using hash) |
| `ADMIN_JWT_SECRET` | **PRIVATE / SECRET** | JWT Session Signer (`adminAuthRoutes.ts`) | **REQUIRED** |
| `ADMIN_SESSION_SECRET` | **PRIVATE / SECRET** | Fallback Session Signer | Optional |
| `ADMIN_TOTP_SECRET` | **PRIVATE / SECRET** | 2FA Google Authenticator (`totp.ts`) | Optional (If 2FA enabled) |
| `VITE_ADMIN_PATH` | **Non-Secret / Public** | Admin URL Router (default: `masterworld`) | **REQUIRED** |

#### 1. `ADMIN_EMAIL` & `ADMIN_PASSWORD`
- **For What Work**: Enables direct email + password login into the Admin Control Dashboard without needing external OAuth.
- **Where to Get It**: You choose your own administrator email and a strong, complex password.
- **How to Add It**: Store as **Secret / Encrypted** variables in your admin hosting platform.
- **Login URL**: `https://your-admin-domain.com/<VITE_ADMIN_PATH>/login` (default: `/masterworld/login`).

#### 2. `ADMIN_JWT_SECRET`
- **For What Work**: Signs and verifies the 24-hour cryptographic JSON Web Token (JWT) issued upon successful administrator login.
- **Where to Get It**: Generate via terminal:
  ```bash
  openssl rand -hex 32
  ```
- **How to Add It**: Store as **Secret / Encrypted**.

#### 3. `ADMIN_TOTP_SECRET` (Optional Two-Factor Authentication)
- **For What Work**: Enforces RFC 6238 Time-based One-Time Password (2FA) verification via Google Authenticator, Aegis, or 1Password during login.
- **Where to Get It**: Generate a 16 or 32 character Base32 string (e.g., `JBSWY3DPEHPK3PXP`).
- **How to Add It**: Store as **Secret / Encrypted**.

---

### 2.2 Database A: Primary Master Catalog Firebase (Admin Only)

Database A contains your master catalog data: applications (`apps_chunk_0`, `apps_chunk_1`), categories, banners, industry news, videos, FAQs, and developer profiles.

> **CRITICAL ARCHITECTURE RULE**: The Public Website **NEVER** touches Database A. Only the Admin site communicates with Database A.

| Variable | Security Level | System Portion | Required? |
| :--- | :--- | :--- | :--- |
| `VITE_FIREBASE_PROJECT_ID` | **Non-Secret / Public** | Admin Client (`src/lib/firebase.ts`) | **REQUIRED** |
| `VITE_FIREBASE_API_KEY` | **Non-Secret / Public** | Admin Client (`src/lib/firebase.ts`) | **REQUIRED** |
| `VITE_FIREBASE_AUTH_DOMAIN` | **Non-Secret / Public** | Admin Client (`src/lib/firebase.ts`) | **REQUIRED** |
| `VITE_FIREBASE_STORAGE_BUCKET` | **Non-Secret / Public** | Admin Client (`src/lib/firebase.ts`) | Optional |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | **Non-Secret / Public** | Admin Client (`src/lib/firebase.ts`) | Optional |
| `VITE_FIREBASE_APP_ID` | **Non-Secret / Public** | Admin Client (`src/lib/firebase.ts`) | **REQUIRED** |
| `VITE_FIREBASE_DATABASE_ID` | **Non-Secret / Public** | Firestore Named DB (default: `(default)`) | Optional |
| `FIREBASE_SERVICE_ACCOUNT_KEY` | **PRIVATE / SECRET** | Firebase Admin SDK Server-Side Writes | **REQUIRED** for Server |

#### How to Get Database A Credentials & Service Account:
1. Open the **[Firebase Console](https://console.firebase.google.com/)**.
2. Select your **Primary Master Catalog Project** (e.g., `my-master-catalog`).
3. Click the **Gear icon (Project Settings)** ➔ **General** ➔ Under **Your apps**, copy the Web app credentials:
   - `projectId` ➔ `VITE_FIREBASE_PROJECT_ID`
   - `apiKey` ➔ `VITE_FIREBASE_API_KEY`
   - `authDomain` ➔ `VITE_FIREBASE_AUTH_DOMAIN`
   - `appId` ➔ `VITE_FIREBASE_APP_ID`
4. Under **Project Settings**, switch to the **Service accounts** tab.
5. Click **Generate new private key**. Download the JSON file.
6. Open the JSON file, minify it into a single line string, and assign it to:
   - `FIREBASE_SERVICE_ACCOUNT_KEY` = `{"type":"service_account","project_id":"...","private_key":"..."}`
7. Store `FIREBASE_SERVICE_ACCOUNT_KEY` as a **Secret / Encrypted** variable.

---

### 2.3 Database B: Community Reviews & Moderation (Admin Access)

The Admin Portal connects to Database B to display live community metrics, moderate reviews (Publish / Pending / Reject), reply as an official developer, and manage abuse reports.

- Add the exact same `VITE_COMMUNITY_FIREBASE_*` variables used in the Public Site (see Section 1.2).
- (Optional) Add `COMMUNITY_FIREBASE_SERVICE_ACCOUNT_KEY` if you want the Admin backend to execute bulk moderation operations via Firebase Admin SDK.

---

### 2.4 Google AI Studio Gemini API Key (AI Review Studio & Studio Brain)

The Admin Dashboard includes the **AI Review Studio**, allowing administrators to generate human-like reviews, run interactive sentiment tests, and simulate authentic Play Store commentary.

| Variable | Security Level | System Portion | Required? |
| :--- | :--- | :--- | :--- |
| `GEMINI_API_KEY` | **PRIVATE / SECRET** | Server Backend / Edge Proxy (`communityRoutes.ts`, `geminiEngine.ts`) | **REQUIRED** |

#### How to Get Your Gemini API Key:
1. Visit **[Google AI Studio](https://aistudio.google.com/app/apikey)**.
2. Sign in with your Google account.
3. Click **Create API Key** (choose a Google Cloud project or create a free one).
4. Copy the generated key (`AIzaSy...`).
5. Add as **Secret / Encrypted**: `GEMINI_API_KEY` = `your_gemini_api_key`.

> **Built-in Resilience**: The system features a 7-model automatic failover chain (`gemini-2.5-flash`, `gemini-3-flash-preview`, `gemini-2.5-flash-lite`, `gemini-3.1-flash-lite-preview`, `gemini-flash-latest`, `gemini-2.5-pro`). If Google experiences high demand (HTTP 503), the engine automatically switches models in milliseconds with zero downtime. You can also override or rotate the key live in the Admin UI without restarting the server!

---

### 2.5 Cloudinary Image CDN & Asset Management

The Admin Dashboard uploads app icons, promotional banners, screenshots, and news featured images directly to Cloudinary, ensuring automatic WebP conversion and responsive scaling.

| Variable | Security Level | System Portion | Required? |
| :--- | :--- | :--- | :--- |
| `CLOUDINARY_CLOUD_NAME` | **Non-Secret / Public** | Server Upload Route (`uploadRoutes.ts`) | **REQUIRED** |
| `VITE_CLOUDINARY_CLOUD_NAME` | **Non-Secret / Public** | Client Image Uploader (`ImageUpload.tsx`) | **REQUIRED** |
| `CLOUDINARY_API_KEY` | **PRIVATE / SECRET** | Server Signed Uploads (`uploadRoutes.ts`) | **REQUIRED** |
| `CLOUDINARY_API_SECRET` | **PRIVATE / SECRET** | Server Signed Uploads (`uploadRoutes.ts`) | **REQUIRED** |
| `VITE_CLOUDINARY_UPLOAD_PRESET` | **Non-Secret / Public** | Direct Browser Upload Preset (default: `uploads`) | **REQUIRED** |
| `CLOUDINARY_UPLOAD_FOLDER` | **Non-Secret / Public** | Media Library Folder (default: `app_uploads`) | Optional |

#### How to Get Cloudinary Credentials:
1. Sign up or log in at **[Cloudinary Console](https://cloudinary.com/console)**.
2. On your **Dashboard**, find the **Product Environment Credentials**:
   - **Cloud Name** ➔ `CLOUDINARY_CLOUD_NAME` & `VITE_CLOUDINARY_CLOUD_NAME`
   - **API Key** ➔ `CLOUDINARY_API_KEY`
   - **API Secret** ➔ `CLOUDINARY_API_SECRET`
3. Click **Settings (Gear Icon)** ➔ **Upload**.
4. Scroll to **Upload presets** and click **Add upload preset**.
5. Set **Signing Mode** to **Unsigned** (or Signed). Name it `uploads`.
6. Set `VITE_CLOUDINARY_UPLOAD_PRESET` = `uploads`.

---

### 2.6 AES Link Vault Sealing (Admin Side)

| Variable | Security Level | System Portion | Required? |
| :--- | :--- | :--- | :--- |
| `AES_KEY` (or `VAULT_SECRET_KEY`) | **PRIVATE / SECRET** | Vault Sealing Engine (`adminVaultRoutes.ts`) | **REQUIRED** |
| `VITE_VAULT_SECRET_KEY` | **PRIVATE / SECRET** | Browser Fallback Vault Sealer | Optional |

- **Critical Requirement**: Must match the `AES_KEY` configured on the Public Website.
- When an admin saves apps in the dashboard, the backend uses `AES_KEY` to encrypt the external links into `src/lib/secureVault.ts`.

---

### 2.7 GitHub Dual-Repo Split-Sync Automation

The Admin Dashboard includes a **One-Click Split-Sync** button. When clicked, the backend commits updated catalog snapshots (`staticData.json`), encrypted link vaults, and SEO metadata directly to your GitHub repositories.

| Variable | Security Level | System Portion | Required? |
| :--- | :--- | :--- | :--- |
| `GITHUB_TOKEN` (or `GITHUB_PAT`) | **PRIVATE / SECRET** | Split-Sync Git Service (`githubSyncRoutes.ts`) | **REQUIRED** |
| `GITHUB_OWNER` / `VITE_GITHUB_OWNER` | **Non-Secret / Public** | Target GitHub Username or Org | **REQUIRED** |
| `GITHUB_PUBLIC_REPO` | **Non-Secret / Public** | Public Repository Name (e.g., `dex-site`) | **REQUIRED** |
| `GITHUB_ADMIN_REPO` | **Non-Secret / Public** | Admin Repository Name (e.g., `admin-portal`) | **REQUIRED** |
| `GITHUB_BRANCH` | **Non-Secret / Public** | Git Branch (default: `main`) | Optional |

#### How to Generate Your GitHub Personal Access Token (PAT):
1. In GitHub, click your profile avatar ➔ **Settings**.
2. Scroll down the left sidebar to **Developer settings** ➔ **Personal access tokens** ➔ **Tokens (classic)** (or Fine-grained).
3. Click **Generate new token (classic)**.
4. Name the token: `Platform Split-Sync Automation`.
5. Select scopes:
   - `repo` (Full control of private repositories).
   - `workflow` (Update GitHub Action workflows).
6. Click **Generate token** and copy the `ghp_...` string immediately.
7. Add as **Secret / Encrypted**: `GITHUB_TOKEN` = `ghp_yourGeneratedToken`.

---

### 2.8 Copy-Paste `.env` Template for Admin Website

```bash
# ==============================================================================
# ADMIN MANAGEMENT WEBSITE ENVIRONMENT CONFIGURATION (.env)
# ==============================================================================

# 1. Admin Authentication & Session Security (CRITICAL)
ADMIN_EMAIL="admin@example.com"
VITE_ADMIN_EMAIL="admin@example.com"
ADMIN_PASSWORD="ChooseAStrongAdminPassword123!"
ADMIN_JWT_SECRET="generate_64_char_hex_key_using_openssl_rand_hex_32"
VITE_ADMIN_PATH="masterworld"
# ADMIN_TOTP_SECRET="JBSWY3DPEHPK3PXP" # Optional 2FA secret

# 2. Site Identity & URLs
PUBLIC_DOMAIN="https://admin.example.com"
VITE_PUBLIC_DOMAIN="https://admin.example.com"
VITE_SITE_NAME="My App Directory — Admin Console"

# 3. Database A: Master Catalog Firebase (ADMIN EXCLUSIVE)
VITE_FIREBASE_PROJECT_ID="my-master-catalog"
VITE_FIREBASE_API_KEY="AIzaSyMasterCatalogApiKey123"
VITE_FIREBASE_AUTH_DOMAIN="my-master-catalog.firebaseapp.com"
VITE_FIREBASE_STORAGE_BUCKET="my-master-catalog.appspot.com"
VITE_FIREBASE_MESSAGING_SENDER_ID="987654321098"
VITE_FIREBASE_APP_ID="1:987654321098:web:abcdef123"
VITE_FIREBASE_DATABASE_ID="(default)"
# Firebase Admin SDK Service Account (JSON string on a single line)
FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"my-master-catalog","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"firebase-adminsdk@my-master-catalog.iam.gserviceaccount.com"}'

# 4. Database B: Community Reviews & Moderation (Firebase)
VITE_COMMUNITY_FIREBASE_PROJECT_ID="my-community-db"
VITE_COMMUNITY_FIREBASE_API_KEY="AIzaSyA1234567890abcdef"
VITE_COMMUNITY_FIREBASE_AUTH_DOMAIN="my-community-db.firebaseapp.com"
VITE_COMMUNITY_FIREBASE_STORAGE_BUCKET="my-community-db.appspot.com"
VITE_COMMUNITY_FIREBASE_MESSAGING_SENDER_ID="123456789012"
VITE_COMMUNITY_FIREBASE_APP_ID="1:123456789012:web:abcdef"
VITE_COMMUNITY_FIREBASE_DATABASE_ID="(default)"

# 5. Google AI Studio (Gemini Engine) for AI Review Studio
GEMINI_API_KEY="AIzaSyYourGeminiApiKeyFromGoogleAiStudio"

# 6. Cloudinary Image CDN (Media Uploads)
CLOUDINARY_CLOUD_NAME="my-cloudinary-cloud"
VITE_CLOUDINARY_CLOUD_NAME="my-cloudinary-cloud"
CLOUDINARY_API_KEY="123456789012345"
CLOUDINARY_API_SECRET="your_cloudinary_api_secret_key"
VITE_CLOUDINARY_UPLOAD_PRESET="uploads"
CLOUDINARY_UPLOAD_FOLDER="app_uploads"

# 7. AES Link Vault Sealing (MUST match Public Website AES_KEY)
AES_KEY="generate_64_char_hex_key_using_openssl_rand_hex_32"

# 8. GitHub Dual-Repo Split-Sync Automation
GITHUB_TOKEN="ghp_YourGitHubPersonalAccessTokenHere"
GITHUB_OWNER="your-github-username-or-org"
VITE_GITHUB_OWNER="your-github-username-or-org"
GITHUB_PUBLIC_REPO="my-public-repo"
VITE_GITHUB_PUBLIC_REPO="my-public-repo"
GITHUB_ADMIN_REPO="my-admin-repo"
VITE_GITHUB_ADMIN_REPO="my-admin-repo"
GITHUB_BRANCH="main"
```

---

# 📊 Master Comparison Matrix

| Environment Variable | Where to Add | Security Level | Source / Dashboard | Primary Work / Feature |
| :--- | :--- | :--- | :--- | :--- |
| `PUBLIC_DOMAIN` | Public & Admin | **Non-Secret** | Domain Registrar / DNS | Canonical URLs, XML Sitemap, RSS |
| `VITE_PUBLIC_DOMAIN` | Public & Admin | **Non-Secret** | Domain Registrar / DNS | Client OpenGraph & Canonical Link |
| `ADMIN_EMAIL` | **Admin ONLY** | **SECRET** | User Choice | Direct Admin Email Login |
| `ADMIN_PASSWORD` | **Admin ONLY** | **SECRET** | User Choice | Direct Admin Password Login |
| `ADMIN_JWT_SECRET` | **Admin ONLY** | **SECRET** | `openssl rand -hex 32` | 24-Hour Admin Session Tokens |
| `ADMIN_TOTP_SECRET` | **Admin ONLY** | **SECRET** | Authenticator App | Optional 2-Factor Authentication |
| `VITE_ADMIN_PATH` | **Admin ONLY** | **Non-Secret** | User Choice (`masterworld`) | Custom Admin Route Segment |
| `VITE_FIREBASE_*` | **Admin ONLY** | **Non-Secret** | Firebase Console (Database A) | Master Catalog Web Client SDK |
| `FIREBASE_SERVICE_ACCOUNT_KEY` | **Admin ONLY** | **SECRET** | Firebase Console (Database A) | Server-Side Master Catalog Writes |
| `VITE_COMMUNITY_FIREBASE_*` | Public & Admin | **Non-Secret** | Firebase Console (Database B) | Community Reviews Web Client SDK |
| `COMMUNITY_FIREBASE_SERVICE_ACCOUNT` | Public & Admin | **SECRET** | Firebase Console (Database B) | Server-Side Review Moderation |
| `AES_KEY` | Public & Admin | **SECRET** | `openssl rand -hex 32` | Encrypt (Admin) & Decrypt (Public) |
| `VITE_TURNSTILE_SITE_KEY` | Public & Admin | **Non-Secret** | Cloudflare Turnstile | Anti-Bot CAPTCHA Frontend Widget |
| `TURNSTILE_SECRET_KEY` | Public & Admin | **SECRET** | Cloudflare Turnstile | Server-Side Anti-Bot Verification |
| `UPSTASH_REDIS_REST_URL` | Public & Admin | **SECRET** | Upstash Console | Edge Rate Limiting & Nonce Burning |
| `GEMINI_API_KEY` | **Admin ONLY** | **SECRET** | Google AI Studio | AI Review Studio & Sentiment Analysis |
| `CLOUDINARY_*` | **Admin ONLY** | **Mixed** (Key=Secret) | Cloudinary Dashboard | Image CDN Uploads & Transformations |
| `GITHUB_TOKEN` | **Admin ONLY** | **SECRET** | GitHub Developer Settings | Automated Split-Sync Repository Commits |

---

## 🚀 Deployment Instructions by Platform

### Option A: Cloudflare Pages (Recommended for Zero-Cost Scale)
1. In Cloudflare Dashboard, go to **Compute (Workers) ➔ Pages**.
2. Select your project ➔ **Settings ➔ Environment variables**.
3. For **Production** and **Preview**:
   - Add Plaintext variables as **Plain text**.
   - Add Private variables (`ADMIN_PASSWORD`, `ADMIN_JWT_SECRET`, `AES_KEY`, `FIREBASE_SERVICE_ACCOUNT_KEY`, `GEMINI_API_KEY`, `TURNSTILE_SECRET_KEY`, `GITHUB_TOKEN`) and click **Encrypt**.
4. Set Build Settings:
   - **Framework preset**: `None`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
5. Click **Save and Deploy**.

### Option B: Docker / Node.js Server (Port 3000)
1. Clone the repository on your server.
2. Create `.env` file in the project root:
   ```bash
   cp .env.example .env
   nano .env
   ```
3. Paste the relevant configuration (Public template for public instance; Admin template for admin instance).
4. Run:
   ```bash
   npm install
   npm run build
   npm run start
   ```
