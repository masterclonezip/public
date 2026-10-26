# Project Architecture & Developer Guide: Platform Transparency System

This repository serves as the **Source of Truth** for **Platform** ([https://example.com](https://example.com)), an all-in-one transparency platform, app store catalog, news portal, and review hub for Rummy, Teen Patti, Yono, and casual card/arcade applications.

---

## 1. Core System Architecture

- **Platform Architecture**: Full-Stack Single Page Application (SPA) powered by Express.js (`server.ts`) and React 18 with Vite and TypeScript.
- **Server Environment**: Runs an Express backend on port `3000` (0.0.0.0) that handles API requests, Turnstile anti-bot checks, dynamic SEO meta tag pre-rendering, XML sitemaps, RSS feeds, and static file serving.
- **Database & Storage**:
  - **Primary**: Cloud Firestore project (`(default)`, Database ID `(default)`).
  - **Collections**: `store_data` (documents: `apps_chunk_0`, `apps_chunk_1`, `settings`, `news`, `videos`, `quick_links`, `faqs`, `developers`, `secure_links`).
  - **Static High-Availability Fallback**: `/src/lib/staticData.json` guarantees 100% website uptime if Firestore is offline or rate-limited.
- **Build & Execution Scripts**:
  - **Dev Server**: `npm run dev` (`tsx server.ts` running on port 3000)
  - **Production Build**: `npm run build` (`vite build && esbuild server.ts --bundle --platform=node --format=cjs --packages=external --sourcemap --outfile=dist/server.cjs`)
  - **Production Start**: `npm run start` (`node dist/server.cjs`)

---

## 2. Dual-Repo Automated Split-Sync System (`.github/workflows/split-sync.yml`)

This monorepo automatically splits and synchronizes changes to two isolated external GitHub repositories on every push to `main`:

1. **Dex Repository (Public Site)**: Public website repo (`www.example.com`). All admin components, backend authentication routes, vault keys, and internal scripts are **automatically removed** during sync to guarantee security.
2. **Masterworld Repository (Admin Control)**: Admin control repo. All user-facing public pages (`Home.tsx`, `AppDetails.tsx`), public UI components, and static assets in `/public/` are **automatically removed** during sync to keep the admin interface clean and isolated.

### Sync Rules for Adding Files
When creating new components or pages, maintain repo isolation:
- **Admin-Only Files**: Add path to `ADMIN_ONLY_FILES` in `.github/workflows/split-sync.yml`.
- **Public-Only Files**: Add path to `PUBLIC_ONLY_FILES` in `.github/workflows/split-sync.yml`.

---

## 3. Complete Directory & File Architecture

```
/
├── server.ts                             # Main Express server entrypoint (API routes, static serving, rate limiting)
├── index.html                            # Primary HTML template with SEO placeholder tags
├── package.json                          # Dependencies & scripts (dev, build, start, lint)
├── vite.config.ts                        # Vite bundler configuration
├── firebase-applet-config.json           # Firebase Project & Database credentials
├── .github/workflows/split-sync.yml      # Dual-repo automated split & sync pipeline
│
├── public/                               # Static Public Assets
│   ├── favicon.ico / logo.png            # Branding & favicons
│   ├── site.webmanifest                  # Web App Manifest
│   ├── robots.txt / opensearch.xml       # Search Engine Indexing configs
│
├── src/
│   ├── main.tsx                          # React DOM client entrypoint
│   ├── App.tsx                           # Master App router (Public + Dynamic Admin Lazy Route)
│   ├── AppPublic.tsx                     # Main Public Layout router (Header, Pages, Footer, Navigation)
│   ├── seoHelper.ts                      # Server-side HTML injection, OpenGraph meta tags, INITIAL_DATA payload trimmer
│   ├── types.ts                          # Global TypeScript interfaces & types
│
│   ├── seo/                              # SEO Helper Utilities
│   │   ├── utils.ts                      # URL formatters, OpenGraph image resolvers, Cloudinary optimizer
│   │   └── renderers/                    # Modular server-side HTML renderers
│   │       ├── common.ts                 # Shared escaping and HTML sanitizer
│   │       ├── homeRenderer.ts           # SSR catalog homepage renderer
│   │       ├── appDetailsRenderer.ts     # SSR app details renderer
│   │       ├── newsRenderer.ts           # SSR news index & article renderer
│   │       ├── videoRenderer.ts          # SSR video list renderer
│   │       ├── staticPageRenderer.ts     # SSR legal & info page renderer
│   │       └── gatewayRenderer.ts        # SSR clearance/gateway page renderer
│
│   ├── server/                           # Backend Server Modules & API Routers
│   │   ├── firebase.ts                   # Server-side Firebase Admin REST SDK initializer
│   │   ├── security.ts                   # Cloudflare Turnstile anti-bot verification & link nonces
│   │   ├── middleware/adminAuth.ts       # Admin JWT & Audit Logging middleware
│   │   ├── vault/                        # Vault & Storage Backend Subsystems
│   │   │   ├── vaultCrypto.ts            # AES encryption, decryption & secret key resolution
│   │   │   └── vaultStorage.ts           # Firestore REST/Admin SDK chunked storage & backup helpers
│   │   ├── services/
│   │   │   └── communityStoreService.ts  # Multi-tier Firestore reviews & reports storage service
│   │   └── routes/
│   │       ├── adminAuthRoutes.ts        # Admin login, 2FA/TOTP verification, logout, session management
│   │       ├── adminVaultRoutes.ts       # Master admin router (Vault sealing, direct links, status diagnostics)
│   │       ├── adminCatalogRoutes.ts     # Admin catalog & settings CRUD API (Apps, settings, news, videos)
│   │       ├── adminDbRepairRoutes.ts    # Firestore maintenance, chunk repair, sanitization & DB recovery
│   │       ├── communityRoutes.ts        # Community reviews API (CRUD, helpful voting, moderation, replies)
│   │       ├── reportRoutes.ts           # Ultra-lightweight flag/report submission & admin pipeline
│   │       ├── githubSyncRoutes.ts       # Split-sync webhooks and manual triggers
│   │       ├── publicApiRoutes.ts        # Public APIs (Download link decryption, feedback)
│   │       └── seoRoutes.ts              # Dynamic sitemap.xml, rss.xml, robots.txt, opensearch.xml generators
│
│   ├── contexts/                         # React State Management
│   │   └── DataContextPublic.tsx         # Public context (apps catalog, settings, news, search, filters)
│
│   ├── pages/                            # Page Components
│   │   ├── Home.tsx                      # Primary catalog homepage (Featured banners, categories, search)
│   │   ├── AppDetails.tsx                # App details view (Deep-link auto-sync, safety alerts, specs, reviews)
│   │   ├── NewsPage.tsx                  # Latest industry news & announcements
│   │   ├── VideosPage.tsx                # Media & gameplay video gallery
│   │   ├── DevelopersPage.tsx            # Developer profile directory
│   │   ├── Contact.tsx / AboutPage.tsx   # Contact forms & transparency details
│   │   ├── LegalPage.tsx                 # Dynamic legal & terms pages
│   │   ├── AdminDashboard.tsx            # Admin Control Panel (Admin only)
│   │   └── AdminLogin.tsx                # Admin Authentication Portal (Admin only)
│   │
│   ├── components/
│   │   ├── public/                       # Modular Public UI Components
│   │   │   ├── appDetails/               # AppDetails page subcomponents & schema builders
│   │   │   ├── home/                     # Home page category grids & search results
│   │   │   ├── news/                     # News listing cards & pagination
│   │   │   ├── newsDetails/              # News article header, author box, comments & app link box
│   │   │   ├── PublicHeader.tsx          # Main top navigation header with live search & categories
│   │   │   ├── PublicFooter.tsx          # Site footer with dynamic SEO links & copyright
│   │   │   ├── PublicBottomNav.tsx       # Floating mobile bottom navigation bar
│   │   │   ├── PublicBackToTop.tsx       # Scroll-to-top floating control
│   │   │   ├── AppHeader.tsx             # App details hero header (Icon, developer, download button)
│   │   │   ├── AppSpecsBar.tsx           # Quick metric bar (Rating, Size, Version, Category)
│   │   │   ├── AppSafetyBoxes.tsx        # Security, warning, and idea callout notices
│   │   │   ├── AppAboutSection.tsx       # Sanitized HTML app description & feature lists
│   │   │   ├── AppScreenshots.tsx        # Interactive screenshot gallery modal
│   │   │   ├── ReviewScoreSummary.tsx    # Rating breakdown & star distribution widget
│   │   │   ├── ReviewItem.tsx            # Individual review card with voting & reporting
│   │   │   ├── ReviewForm.tsx            # User star rating & review submission form
│   │   │   ├── YouTubePlayer.tsx         # Embedded YouTube video player component
│   │   │   └── NewAdditions.tsx          # Newly added apps ticker component
│   │   │
│   │   ├── playstore/                    # Google Play Store Design System Components
│   │   │   ├── AppListItems.tsx          # Responsive app list cards with Cloudinary auto-optimization
│   │   │   ├── FeaturedBanner.tsx        # Featured top app hero banner
│   │   │   ├── PlayStoreCategoryRow.tsx  # Horizontal scrolling category app row
│   │   │   └── PlayStoreUI.tsx           # Full Play Store styled catalog view
│   │   │
│   │   └── admin/                        # Admin Dashboard UI Components (Admin only)
│   │       ├── AdminSidebar.tsx          # Dashboard navigation sidebar
│   │       ├── AdminTabContent.tsx       # Module tab content manager
│   │       ├── AdminAppsTab.tsx          # Catalog management view
│   │       ├── AdminNewsTab.tsx          # News management view
│   │       ├── AdminVideosTab.tsx        # Video management view
│   │       ├── AdminReviewsTab.tsx       # Full app reviews moderation console (CRUD, status, replies, pin, votes)
│   │       ├── AdminReportsTab.tsx       # User reports & content flags center (app flags, review flags, notes)
│   │       ├── AdminQuickLinksTab.tsx    # Quick links editor
│   │       ├── AdminWebsiteFaqsTab.tsx   # FAQ manager
│   │       ├── AdminDevelopersTab.tsx    # Developer profiles manager
│   │       ├── AdminSettingsTab.tsx      # Global settings editor
│   │       ├── AppInspector.tsx          # Read-only configuration inspector
│   │       ├── AppForm.tsx               # App editor with modular form sections
│   │       └── apps/sections/            # Modular App Form Sections (General, SEO, Content, Alerts)
│   │
│   ├── hooks/                            # Custom React Hooks
│   │   ├── useAdminAuth.ts               # Admin session & 2FA state manager
│   │   ├── useAdminApps.ts               # Admin catalog & vault sync hook
│   │   ├── useAdminSettings.ts           # Admin global settings CRUD hook
│   │   ├── useAppFilters.ts              # Catalog search, filter, and sorting logic
│   │   ├── useAppForm.ts                 # App editor state manager
│   │   ├── useReviews.ts                 # User reviews fetcher and submitter
│   │   ├── useGitHubSync.ts              # Split-sync trigger hook
│   │   └── useSEO.ts                     # Client-side dynamic title & meta tag manager
│   │
│   └── lib/                              # Core Utility Libraries & Data Backups
│       ├── staticData.json               # Full high-availability fallback dataset
│       ├── utilsPublic.ts / utils.ts     # Styling helpers (cn, safeVibrate)
│       ├── secureVault.ts                # AES Link Encryption / Decryption engine
│       ├── secureStorage.ts              # Encrypted local storage wrapper
│       ├── totp.ts                       # 2FA Time-based One-Time Password generator & validator
│       └── lazyWithRetry.ts              # Network fault-tolerant dynamic import wrapper
```

---

## 4. Key Performance & Optimization Rules

To maintain maximum Google Search Console indexing, 100% PageSpeed Scores, and instantaneous mobile loading, **ALWAYS** follow these performance rules:

1. **Cloudinary Automatic Image Optimization**:
   - Never render raw Cloudinary URLs directly without optimization.
   - Always wrap Cloudinary URLs in `getOptimizedImageUrl(url, width)` (defined in `src/seo/utils.ts`).
   - This automatically injects `/upload/f_auto,q_auto,w_<width>/`, reducing average icon size from **~370 KB to ~6 KB** (an 85%+ payload reduction).

2. **Server HTML Pre-Rendering Payload Control**:
   - `src/seoHelper.ts` pre-renders initial page HTML for Googlebot and populates `window.__INITIAL_DATA__`.
   - **Critical**: Never dump large HTML strings (`description_html`, `features_html`, etc.) for all 230+ apps into `window.__INITIAL_DATA__` on index pages. `seoHelper.ts` strips `description_html` for non-target app items on list pages, keeping the initial HTML payload under **~100 KB**.
   - If a user navigates directly to a deep app link (`/app/:slug`), `AppDetails.tsx` automatically detects missing details and fetches full item details smoothly in the background.

3. **No Speculation Rules Script**:
   - Do **NOT** insert `<script type="speculationrules">` into `index.html`. Synthetic testing tools (Pingdom, Lighthouse, Googlebot headless renderers) cancel background prefetch requests, triggering false `4xx / aborted` network error reports.

4. **Lazy Loading & Code Splitting**:
   - Use `lazyWithRetry()` for admin views and heavy page modules to keep the core user-facing JavaScript bundle lightweight.

---

## 5. Security & Link Protection Engine

- All app download links are encrypted inside the **Secure Link Vault**.
- Public clients request secure download links via `/api/v1/public/secure-link` using Turnstile anti-bot nonces to prevent scraper bots from hijacking download links.
- Admin routes require TOTP 2FA verification (`totp.ts`) and JWT bearer tokens (`adminAuthRoutes.ts`). Audit logs are written to Firestore for all administrative actions.

---

## 6. How to Extend & Maintain the Application

- **Adding a New App**: Manage via the Admin Dashboard or update `src/lib/staticData.json`.
- **Modifying Backend API Routes**: Add new express endpoints under `/src/server/routes/` and mount them in `server.ts`.
- **Verifying Builds**: Run `npm run build` and `npm run lint` before committing to ensure TypeScript compilation succeeds without errors.

---

## 7. More Information (`/moreinfo`) Gateway & Link Security Protocol

> [!IMPORTANT]
> **MANDATORY INSTRUCTION:** Every time you work on the More Information page, clearance buttons, link encryption, or anti-bot resolution, you **MUST** consult and update `/MORE_INFO_SECURITY_ARCHITECTURE.md`.

- **Source of Truth File**: `/MORE_INFO_SECURITY_ARCHITECTURE.md`
- **Page Locations**: `/moreinfo/:slug` and `/moreinfo/:id` rendered by `src/pages/GatewayPage.tsx`.
- **Frontend Clearance**: Handled by `src/components/ClearanceButton.tsx` (displays "Proceed" and fast resolution).
- **Backend API**: `POST/GET /api/v1/public/secure-link` in `src/server/routes/securityRoutes.ts` with bad-UA filters, rate limiting, and zero-referrer anonymous bounce pages.
- **Strict Neutral Vocabulary**:
  - App page main action button must strictly say **"Download"** (NEVER "Download APK").
  - More Info page must strictly use neutral terms: **"Proceed"**, **"Click Here to Proceed"**, **"Verification Portal"**, **"Connecting..."**. No sensitive trigger words.
- **Update Requirement**: Any future change to more info routes or security logic MUST immediately be documented in `/MORE_INFO_SECURITY_ARCHITECTURE.md`.
- **AI Crawler & Headless Agent Threat Model**: See Section 10 of `/MORE_INFO_SECURITY_ARCHITECTURE.md` for the 5-layer defense matrix against automated AI browser agents (Playwright, Puppeteer, Claude/OpenAI browser tools).

---

## 8. Community Reviews & Ratings Architecture

- **Public Review Components**:
  - `src/components/public/ReviewItem.tsx`: Individual review presentation card supporting pinned badges, star rendering, user helpful voting, flag triggers, and official developer/admin replies. *(Note: Unwanted "Verified Player" badge removed for clean presentation)*.
  - `src/components/public/ReviewForm.tsx`: High-contrast, theme-adaptive review submission form with explicit input text colors for dark and light modes.
  - `src/components/public/ReviewScoreSummary.tsx`: Google Play-styled star rating distribution and aggregate breakdown.
  - `src/hooks/useReviews.ts`: React hook managing cursor-based pagination, local optimism, helpful voting, and flag reporting.

- **Backend & Storage Engine (`src/server/services/communityStoreService.ts` & `src/server/routes/communityRoutes.ts`)**:
  - **Multi-tier Sync Engine**: Real-time memory cache + local JSON persistence fallback + background Firestore sync.
  - **Endpoints**:
    - `POST /api/v1/public/community/reviews`: Submit review with Turnstile bot filtering.
    - `POST /api/v1/public/community/reviews/helpful`: Increment helpful vote count with permanent Firestore persistence.
    - `POST /api/v1/public/community/reviews/report`: Flag review directly into the moderation queue.
    - `GET /api/v1/public/community/reviews/:appId`: Cursor-paginated public reviews feed.
    - `GET /api/v1/public/community/stats/:appId`: App aggregate ratings and star distribution.
    - `GET /api/v1/admin/community/reviews`: Admin review query with filters (`status`, `rating`, `search`, `appId`, `isPinned`, `sortBy`).
    - `POST /api/v1/admin/community/reviews`: Admin manual verified review creation.
    - `PUT /api/v1/admin/community/reviews/:id`: Admin full review edit (text, rating, status, pin, official reply, votes).
    - `PATCH /api/v1/admin/community/reviews/:id/status` & `.../pin`: Quick status toggle & pinning.
    - `DELETE /api/v1/admin/community/reviews/:id`: Admin review deletion.
    - `POST /api/v1/admin/community/reviews/bulk`: Bulk publish, pending, reject, pin, or delete operations.
    - `GET /api/v1/admin/community/app-counts`: Live instant per-app review counts & global stats.
    - `GET /api/v1/admin/community/export-stats`: Live export of atomic ratings & star distributions for GitHub split-sync.

  - **Atomic Reviews Engine & Zero-Quota Workflow**:
    - **Admin Dashboard Pre-Warming**: `AdminDashboard.tsx` immediately calls `fetchAdminAppReviewCounts()` on initial admin entry, warming Firestore `community-firebase-project` in-memory caches before the Reviews tab is opened.
    - **Upside Atomic Distribution Board**: Before any app is clicked in `AdminReviewsTab.tsx` (`selectedAppId === 'all'`), the upside displays the **Atomic Reviews Catalog Distribution Board**, giving the Admin an instant overview of review counts, star ratings, and pending items for every catalog application.
    - **Strict 5-Review Public Slice**: The public app details view strictly fetches at most 5 reviews (`limit=5`), preventing Firebase read quota burn.
    - **Automated Split-Sync Aggregator Export**: During GitHub Split-Sync, `useGitHubSync.ts` queries `/api/v1/admin/community/export-stats`, generating an up-to-date `src/lib/communityCatalogStats.json` containing exact counts, averages, and 5-star distributions for all apps. This file is committed atomically into GitHub and powers Googlebot SEO Schema and public UI with 0ms response time and 0 Firestore reads.

---

## 9. Ultra-Lightweight User Reporting & Flagging System

- **Public Component**: `src/components/ReportAppModal.tsx`
  - Zero-latency modal allowing users to flag safety concerns, copyright/DMCA issues, broken links, or review abuse.
  - Submits minimal lightweight payloads without loading previous reports, guaranteeing instantaneous client performance.

- **Backend & Moderation Pipeline (`src/server/routes/reportRoutes.ts`)**:
  - **Endpoints**:
    - `POST /api/v1/public/reports`: Public report submission writing directly to `communityStoreService.ts` and Firestore.
    - `GET /api/v1/admin/reports`: Admin report query filtered by status (`pending`, `in_review`, `resolved`, `dismissed`), type (`app_flag`, `review_flag`), search keyword, or target app ID.
    - `PATCH/PUT /api/v1/admin/reports/:id`: Status update and moderator investigation notes.
    - `DELETE /api/v1/admin/reports/:id`: Permanent report dismissal/deletion.
    - `POST /api/v1/admin/reports/bulk`: Batch resolution, dismissal, or deletion of reports.

---

## 10. Split-Sync Repo Routing Reference (`.github/workflows/split-sync.yml`)

Ensure any newly created files strictly follow repo-isolation boundaries:

| Repository | Included Modules | Excluded Modules |
| :--- | :--- | :--- |
| **Dex (Public Site)** | `src/pages/` (Public pages), `src/components/public/`, `src/components/playstore/`, `src/components/ReportAppModal.tsx`, `src/components/ClearanceButton.tsx`, `src/hooks/useReviews.ts`, `src/contexts/DataContextPublic.tsx`, `/public/` static assets | All `src/components/admin/`, `src/pages/Admin*`, `src/server/middleware/adminAuth.ts`, `src/server/routes/admin*`, `src/lib/secureVault.ts`, `src/lib/totp.ts` |
| **Masterworld (Admin Site)** | `src/components/admin/`, `src/pages/AdminDashboard.tsx`, `src/pages/AdminLogin.tsx`, `src/server/`, `src/lib/`, backend services & moderation tools | Public marketing/home pages (`Home.tsx`, `AppDetails.tsx`), public promotional UI components |

---

## 11. Strict Content & SEO Rules (AI FORBIDDEN FROM WRITING CONTENT)

> [!CRITICAL]
> **MANDATORY INSTRUCTION:** The AI agent is **STRICTLY FORBIDDEN** from writing, generating, or editing any website content, app descriptions, meta descriptions, SEO titles, or marketing copy.

- **Admin is the Single Source of Truth:** ALL content (titles, meta descriptions, H1 tags, app details, faqs, etc.) MUST be written manually by the Admin via the Admin Dashboard and stored in the database.
- **No Placeholder Content:** The AI must never invent or inject placeholder SEO text (e.g., "Platform - Download Rummy Apps...") into the code. 
- **SEO Strategy:** The AI's role in SEO is purely structural and architectural. The AI handles server-side HTML injection (`seoHelper.ts`), `sitemap.xml` index architecture, and canonical/OG tag logic, ensuring the platform cleanly serves the *Admin's database content* to web crawlers (like Googlebot and Ahrefs). The AI must NEVER alter the actual words being served.



---

## 12. CRITICAL ARCHITECTURE RULE: Dual Firebase Databases (NEVER MIX UP)

> [!CRITICAL]
> **MANDATORY INSTRUCTION: WE USE TWO COMPLETELY SEPARATE FIREBASE PROJECTS. AI MUST NEVER MIX UP OR MERGE THEM.**
>
> 1. **Primary Master Catalog Firebase (ADMIN ONLY)**:
>    - **Project ID**: `(default)`
>    - **Database ID**: `(default)`
>    - **Collections**: `store_data` (documents: `apps_chunk_0`, `apps_chunk_1`, `settings`, `news`, `videos`, `quick_links`, `faqs`, `developers`, `secure_links`).
>    - **Access Rule**: **ADMIN DASHBOARD ONLY**. The Public Website (`Dex`) is **STRICTLY FORBIDDEN** from querying or connecting to this database (to prevent read quota exhaustion). Public site uses hard-coded static JSON (`staticData.json`).
>
> 2. **Community Reviews & Reports Firebase (`community-firebase-project` - PUBLIC & ADMIN)**:
>    - **Project ID**: `community-firebase-project`
>    - **Database ID**: `(default)`
>    - **Web API Key**: `YOUR_FIREBASE_API_KEY`
>    - **Web App ID**: `YOUR_FIREBASE_APP_ID`
>    - **Auth Domain**: `community-firebase-project.firebaseapp.com`
>    - **Storage Bucket**: `community-firebase-project.firebasestorage.app`
>    - **Messaging Sender ID**: `YOUR_MESSAGING_SENDER_ID`
>    - **Measurement ID**: `YOUR_MEASUREMENT_ID`
>    - **Collections**: `reviews`, `reports`, `community_store`.
>    - **Access Rule**: **ALWAYS LIVE ON BOTH PUBLIC AND ADMIN**. Both the public site and admin console connect to this separate Firebase project to submit, vote, moderate, and display user reviews, ratings, and content flags in real-time.
>    - **Zero Downtime Engine**: Backed by a 3-tier sync system (In-memory fast cache + local backup JSON + live Firestore cloud sync) ensuring 100% uptime with 0ms latency.
>
> **ANY AI THAT MIXES UP THESE TWO DATABASES OR REMOVES ISOLATION WILL BREAK THE ENTIRE SYSTEM ARCHITECTURE.**

---

## 13. Dual-Brain AI Review Studio Architecture & Workflow

The **Admin AI Review Studio** (`src/components/admin/AdminAIReviewStudioTab.tsx`) uses two distinct AI generation brains, each powered by specific models and operational pipelines, backed by a human-in-the-loop staging workspace and a high-volume Firestore storage engine.

### 1. The Two Reviewers & Their AI Models

#### Reviewer 1: Brain 1 — Deep Admin Dossier Engine
- **Primary AI Model**: `gemini-2.5-pro` (Gemini's flagship deep comprehension and reasoning model with a 1,000,000+ token context window).
- **Fallback Models**: Gracefully cascades to `gemini-3.8-flash` and `gemini-2.5-flash` if rate limits or transient errors occur.
- **Service & Implementation**: `src/server/services/aiReviewGeneratorService.ts` (`generateAIReviewsForApp`, `mode: 'local'`).
- **Data Fed to AI**: The AI receives the **complete internal Admin database dossier** for the selected app:
  - App name, package ID, version, file size, developer name, and benchmark rating.
  - Complete raw HTML description (`description_html`) and feature breakdown (`features_html`).
  - Custom Admin notices (`custom_admin_box_html` & `custom_admin_box_heading`).
  - Yellow highlight callout box (`yellow_box_msg`).
  - Red critical warning/safety box (`red_box_msg`).
  - Idea/tips box (`idea_box_msg`).
  - All Frequently Asked Questions (`faqs` Q&A pairs).
  - Release notes & what's new history (`release_notes`).
- **Comprehension & Anti-Repetition Mandate**: Brain 1 analyzes this full content to extract real game mechanics (Points, Deals, Pool, 10/13/21 card modes, table timers, card sorting, discard piles, battery optimization, network stability). It roleplays authentic Indian player personas with varying comment lengths (from 2-word slang like *"Mast app"* up to 3 sentences of detailed feedback), natural Hinglish expressions, and distinct feature focus so that no two reviews ever sound identical.

#### Reviewer 2: Brain 2 — Live Internet Web Researcher
- **Primary AI Model**: `gemini-2.5-flash` equipped with **Google Search Grounding** (`tools: [{ googleSearch: {} }]`).
- **Fallback Model**: `gemini-3.8-flash`.
- **API Key Routing**: Uses `GEMINI_RESEARCH_API_KEY` (or falls back to `GEMINI_API_KEY`).
- **Service & Implementation**: `src/server/services/aiReviewGeneratorService.ts` (`generateAIReviewsForApp`, `mode: 'research'`).
- **Workflow & Live Grounding**:
  1. Executes real-time Google Search queries targeting Google Play Store user reviews, Reddit card game discussions, and community forums for the app.
  2. Synthesizes authentic player feedback, complaints, bug reports, and praise reflecting actual live internet sentiment.
  3. Returns telemetry metadata including exact search queries executed (`webSearchQueries`) and live cited source URLs (`groundingChunks`) visible directly in the admin dashboard.

---

### 2. Staging & Manual Review Workflow (Human-in-the-Loop)

**Reviews are NEVER auto-saved blindly to the live database.** The workflow strictly follows these steps:

1. **Generation Step**: Admin selects an app, picks the Reviewer Brain (Dossier vs. Live Web), configures count (1–50) and target score, and clicks **Generate**.
2. **Staging Display**: Reviews are returned to the client and rendered in the **Staged Reviews Workspace** placed directly below the generation controls. The UI automatically scrolls smoothly to this section.
3. **Inspection & Editing**:
   - Each review card displays the generated user name, star rating, text, and timestamp.
   - Admin can edit the star rating or review text directly inside the card before saving.
4. **Action Controls**:
   - **Save Review (Single)**: Publishes that specific individual review to the database and removes it from staging.
   - **Discard (Trash)**: Removes that individual review from staging without saving.
   - **Publish All Staged**: Publishes all currently staged reviews in one batch to the database.
   - **Discard All**: Clears the staging workspace completely.

---

### 3. High-Capacity Firestore Storage Engine (10,000+ Reviews)

The backend (`src/server/services/communityStoreService.ts` and `src/server/firebase.ts`) is architected to safely store and serve tens of thousands of reviews without hitting Firestore constraints:

- **Bypassing Document Size Limits (1MB)**: A single Firestore document cannot exceed 1MB (~600 reviews). The system writes chunked documents (`community_reviews_chunk_0`, `community_reviews_chunk_1`, etc.) containing 250 reviews each (~120KB per chunk) along with a metadata manifest (`community_store_meta`).
- **Bypassing 1,000-Document Pagination Limits**: The REST reader (`readFirestoreRestCollection`) and Admin SDK readers automatically follow `nextPageToken` in a loop across up to 20 pages (20,000 records), ensuring that reviews beyond 1,000 are never truncated or lost.
- **Dedicated Community Database**: All community review and report operations route to the isolated `community-firebase-project` Firestore project (database ID `(default)`), completely isolating community review read/write quotas from the main app catalog.
- **Hard Safety & Sanitization**: Every review passes through `sanitizeReviewText()` on both save and retrieval, strictly purging financial/gambling keywords (cash, withdraw, deposit, bet, rupees, ₹) and transforming them into safe, playstore-compliant skill gaming terminology.


---

## 14. EXCLUSIVE LIVE PUBLIC FIREBASE RULE: Community Reviews & App Flags

> [!CRITICAL]
> **MANDATORY INSTRUCTION:** The **ONLY** Firebase database fully functional and actively connected to the Public Main Website is the **Community Firebase** (used strictly for Reviews, Comments, and App Flags).

- **100% Live Functionality:** The Community Firebase is working live on the public website. When people post reviews, comments, or report flags, they can see the comments directly and instantly.
- **NO GitHub Push Required for Reviews:** Unlike the main app catalog, you **DO NOT** need to use the GitHub Sync or push code from the Admin website to the Public website to show new comments. Reviews and flags are live-fetched in real-time. 
- **Environment Variables:** The Community Firebase uses its own dedicated ENV variables to securely connect the public website to the reviews database without exposing the main catalog database.
- **The Single Exception:** This is the ONLY exception to Rule 12. The main app database (`store_data`) remains static and requires a GitHub push for the public site, but the Community database is entirely LIVE and auto-updating.
