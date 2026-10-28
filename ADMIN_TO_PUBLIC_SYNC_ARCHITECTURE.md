# 🔄 Platform Admin-to-Public Code & Data Synchronization Architecture

> **Master Architecture Document**: This document outlines the end-to-end synchronization pipeline, file segregation boundaries, automated split-sync engine (`.github/workflows/split-sync.yml`), and data propagation flow connecting the **Unified Source of Truth (AI Studio Monorepo)**, the **Admin Control Repository (`masterworld`)**, and the **Public Website Repository (`Dex`)**.
>
> **Last Updated:** September 2026

---

## 📑 Table of Contents

1. [Architectural Overview: The 3-Node Ecosystem](#1-architectural-overview-the-3-node-ecosystem)
2. [The Unified Monorepo Source of Truth](#2-the-unified-monorepo-source-of-truth)
3. [The Automated Split-Sync Workflow Engine](#3-the-automated-split-sync-workflow-engine)
4. [File Segregation & Repository Isolation Matrix](#4-file-segregation--repository-isolation-matrix)
5. [Data Propagation Flow: Admin Edit to Live Public Site](#5-data-propagation-flow-admin-edit-to-live-public-site)
6. [Public Site Build & Entry Point Transformation](#6-public-site-build--entry-point-transformation)
7. [Community Reviews & Ratings Real-Time Sync (Decoupled Layer)](#7-community-reviews--ratings-real-time-sync-decoupled-layer)
8. [Developer & AI Golden Rules for Code Synchronization](#8-developer--ai-golden-rules-for-code-synchronization)

---

## 1. Architectural Overview: The 3-Node Ecosystem

Platform operates as a decoupled 3-node ecosystem designed for maximum security, zero cross-pollution, and 100% public uptime:

```
                               ┌────────────────────────────────────────────────────────┐
                               │           UNIFIED AI STUDIO SOURCE MONOREPO            │
                               │  (Contains Full Admin + Public + Server + Sync Logic)  │
                               └───────────────────────────┬────────────────────────────┘
                                                           │
                                                           │ (git push to main)
                                                           ▼
                               ┌────────────────────────────────────────────────────────┐
                               │       GITHUB ACTIONS SPLIT-SYNC ENGINE                 │
                               │           (.github/workflows/split-sync.yml)           │
                               └─────────────┬────────────────────────────┬─────────────┘
                                             │                            │
                      ┌──────────────────────┴──────┐      ┌──────────────┴─────────────────────┐
                      ▼ (Stripped Public Assets)    ▼      ▼ (Stripped Admin & Server Secrets)  ▼
       ┌──────────────────────────────────────────────┐   ┌──────────────────────────────────────────────┐
       │         NODE A: ADMIN CONTROL REPO           │   │         NODE B: PUBLIC WEBSITE REPO          │
       │                (`masterworld`)               │   │                   (`Dex`)                    │
       ├──────────────────────────────────────────────┤   ├──────────────────────────────────────────────┤
       │ • Admin Dashboard (`AdminDashboard.tsx`)     │   │ • Public App Store (`www.example.com`)      │
       │ • TOTP 2FA & Secure Link Vault Node          │   │ • Fast Static SPA (`staticData.json`)        │
       │ • Master Catalog Firebase (`store_data`)     │   │ • Community Reviews (`community-firebase-project`)    │
       │ • AI Review Studio Generation Engine         │   │ • Zero Admin Code / Zero Server Secrets      │
       │ • Vercel Admin Deployment                    │   │ • Vercel Public CDN Deployment               │
       └──────────────────────────────────────────────┘   └──────────────────────────────────────────────┘
```

---

## 2. The Unified Monorepo Source of Truth

The AI Studio Monorepo is the **sole canonical location where developers and AI agents write code**. 

### Why We Use a Split Architecture:
1. **Absolute Public Security**: The public repository (`Dex`) must contain zero admin authentication routes, zero AES encryption keys, zero database credentials, and zero internal administration scripts.
2. **Lean Admin Performance**: The admin dashboard (`masterworld`) does not need hundreds of public marketing templates, hero carousels, or static asset images.
3. **Dual Deployment Isolation**: A build or configuration change in the admin control panel cannot break the public production website.

---

## 3. The Automated Split-Sync Workflow Engine

Whenever code is committed to `main`, `.github/workflows/split-sync.yml` triggers automated split-sync jobs:

```
[Push to `main` branch]
   │
   ├─► 1. Checkout Full Monorepo
   ├─► 2. Setup Node.js 20 & Install Dependencies
   │
   ├─► 3. SYNC TO DEX (PUBLIC SITE):
   │     • Clone `your-github-org/Dex`
   │     • Mirror files using rsync (excluding git/temporary artifacts)
   │     • Build clean public API: `node scripts/build-api.js -> api/index.js`
   │     • Delete all `ADMIN_ONLY_FILES` (Admin tabs, server routes, vault keys)
   │     • Swap `src/AppPublic.tsx` -> `src/App.tsx`
   │     • Set `__ADMIN_ENABLED__: false` in `vite.config.ts`
   │     • Commit & push to `your-github-org/Dex`
   │
   └─► 4. SYNC TO MASTERWORLD (ADMIN SITE):
         • Check commit message for "Admin Release" tag:
           - IF "Admin Release": SKIP masterworld to prevent circular sync loop!
           - ELSE:
             • Clone `your-github-org/masterworld`
             • Mirror files using rsync
             • Delete all `PUBLIC_ONLY_FILES` (Home, AppDetails, legal pages)
             • Purge non-admin pages (`src/pages/*` except `Admin*.tsx`)
             • Swap `src/AppAdmin.tsx` -> `src/App.tsx`
             • Commit & push to `your-github-org/masterworld`
```

---

## 4. File Segregation & Repository Isolation Matrix

To maintain clean repository boundaries, files are categorized into explicit allow/deny lists:

### A. Admin-Only Files (Stripped from Public `Dex` Repo)
```
src/components/admin/              # All Admin Dashboard tabs, modals & editors
src/pages/AdminDashboard.tsx       # Primary Admin Management view
src/pages/AdminLogin.tsx           # Admin 2FA / TOTP login portal
src/server/                        # All Express API routers, vault routes, & auth middleware
src/lib/totp.ts                    # Time-based One-Time Password generator
src/lib/secureVault.ts             # AES download link encryption/decryption keys
src/lib/secureStorage.ts           # Encrypted local storage driver
scripts/                           # Database migration and admin audit scripts
server.ts                          # Express server entry point
firestore.rules / firebase.json    # Master Catalog Firestore security rules
```

### B. Public-Only Files (Stripped from Admin `masterworld` Repo)
```
src/pages/Home.tsx                 # Public catalog homepage
src/pages/AppDetails.tsx           # Public app specifications & reviews view
src/pages/NewsPage.tsx             # Public news portal
src/pages/VideosPage.tsx           # Public media gallery
src/pages/LegalPage.tsx            # Terms, Privacy, Disclaimer pages
src/components/public/             # Public navigation, header, footer, app cards
src/components/playstore/          # Play Store design system UI components
public/                            # Static images, icons, and webmanifest assets
```

---

## 5. Data Propagation Flow: Admin Edit to Live Public Site

When an administrator updates app information (e.g., adding a new app, changing download links, or modifying descriptions), data propagates through a 4-step sync pipeline:

```
[1. ADMIN EDITS APP IN DASHBOARD]
   │
   ├─► Saves changes via Admin API (`/api/v1/admin/apps`)
   └─► Updates Cloud Firestore (`ai-studio-catalog-store-...` / `store_data`)
   │
   ▼
[2. HIGH-AVAILABILITY SNAPSHOT GENERATION]
   │
   ├─► Admin triggers "Publish Release" / "Sync to Public"
   └─► Generates updated `/src/lib/staticData.json` snapshot containing all app metadata
   │
   ▼
[3. GIT COMMIT WITH 'ADMIN RELEASE' TAG]
   │
   ├─► Commit created: `git commit -m "Admin Release: Updated catalog metadata"`
   └─► Pushed to Monorepo `main` branch
   │
   ▼
[4. DUAL-REPO SPLIT-SYNC WORKFLOW]
   │
   ├─► Workflow detects "Admin Release" commit message
   ├─► Automatically skips `masterworld` (preventing redundant admin rebuilds)
   ├─► Updates `your-github-org/Dex` with new `staticData.json`
   │
   ▼
[5. LIVE VERCEL DEPLOYMENT (DEX)]
   │
   └─► Vercel deploys `www.example.com` in under 30 seconds with 100% uptime
```

---

## 6. Public Site Build & Entry Point Transformation

During the split-sync pipeline, the repository structure is automatically transformed for public production:

1. **Root Router Replacement**:
   - `src/AppPublic.tsx` is renamed to `src/App.tsx`.
   - `src/AppAdmin.tsx` is completely removed.
2. **Build Flags**:
   - `vite.config.ts` is patched: `__ADMIN_ENABLED__: false`.
3. **Public API Bundling**:
   - `scripts/build-api.js` compiles clean standalone serverless handlers into `api/index.js`.
4. **Static Prerendering**:
   - `scripts/prerender.ts` generates static SEO routes for top catalog entries.

---

## 7. Community Reviews & Ratings Real-Time Sync (Decoupled Layer)

The Community Review System operates on a **completely independent live data channel** that requires **zero git commits or repository redeployments**:

```
[Public User Submits Review on AppDetails.tsx]
   │
   ├─► 1. Validated via Cloudflare Turnstile token
   ├─► 2. Written directly to `community-firebase-project` Firestore (`reviews` collection)
   ├─► 3. $O(1)$ Delta Math updates pre-calculated chunk document (`app_reviews_<id>_0`)
   │
   ▼
[Instant 0ms Feedback]
   │
   ├─► Public SWR cache updates star ratings and review list immediately
   └─► Admin Moderation Console reflects new review in real-time
```

---

## 8. Aggregate Rating Synchronization & Google Search Raw HTML Pre-Rendering

### A. How Google Search Displays 5-Star Rich Snippets
When Googlebot indexes an app URL (e.g. `/app/sample-app`), it parses the pre-rendered Raw HTML `<head>` containing Schema.org JSON-LD:

```json
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "Sample App",
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": 4.7,
    "reviewCount": 98,
    "ratingCount": 98,
    "bestRating": 5,
    "worstRating": 1
  }
}
```

### B. Lightweight Stats Extraction (Zero Full-Collection Reads)
To prevent quota exhaustion while serving Googlebot and syncing the platform:
1. **Never Scan All Reviews**:
   - The server HTML injector (`seoHelper.ts`) and build prerenderer (`scripts/prerender.ts`) **MUST NEVER** loop through individual review documents.
   - They fetch ONLY the lightweight aggregate `stats` JSON object from memory or the chunk document (`app_reviews_<appId>_0`).
2. **Present Rating Synchronization During Sync**:
   - During code synchronization or an "Admin Release", the current live rating values (`averageRating`, `totalReviews`) are seamlessly bound into `staticData.json` and the pre-rendered HTML payload.
   - Search crawlers always receive the true, live rating matching the community database.
3. **Admin Dynamic Total Count Viewer**:
   - The Admin dashboard displays real-time total reviews and star distributions across apps instantly in $O(1)$ time by querying the cached aggregate stats, strictly avoiding full collection reads.

---

## 9. Developer & AI Golden Rules for Code Synchronization

> [!CRITICAL]
> **RULE 1: ALWAYS UPDATE `.github/workflows/split-sync.yml` WHEN ADDING FILES**
> Whenever you create a new file:
> - If it is an Admin component, backend route, or secret script $\to$ add it to `ADMIN_ONLY_FILES`.
> - If it is a Public marketing page, public layout, or public widget $\to$ add it to `PUBLIC_ONLY_FILES`.
>
> **RULE 2: NEVER IMPORT ADMIN MODULES INTO PUBLIC COMPONENTS**
> Public components (`src/components/public/*`, `src/pages/Home.tsx`, `src/pages/AppDetails.tsx`) must NEVER import from `src/components/admin/*`, `src/lib/secureVault.ts`, or `src/lib/totp.ts`. Doing so breaks the public build when admin files are stripped.
>
> **RULE 3: MAINTAIN THE "ADMIN RELEASE" COMMIT CONVENTION**
> Always include `"Admin Release"` in the commit message when pushing catalog/static data updates. This activates the workflow's circular-loop shield and avoids duplicate rebuilds on the admin repo.
>
> **RULE 4: NEVER PULL FULL REVIEWS FOR SEO PRE-RENDERING**
> Pre-rendering engines (`seoHelper.ts`, `prerender.ts`) must strictly read the aggregate `stats` JSON object and never query full review arrays for Google Rich Snippets.
>
> **RULE 5: NEVER STORE SECRETS IN PUBLIC REPOSITORY**
> Public website repo (`Dex`) must strictly read from `staticData.json` and client-side `community-firebase-project` REST tokens. Never place admin service accounts or AES master keys in public-accessible files.
>
> **RULE 6: UPDATE THIS MD FILE ON ANY SYNC MODIFICATION**
> If you modify split-sync rules, file routing paths, or synchronization scripts, you MUST immediately update this document to preserve architectural continuity.
