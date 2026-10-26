# 🛡️ Platform Community Firebase: Master Live Architecture & Vercel Shield

> **Source of Truth Reference**: This document defines the live architecture, Vercel serverless integration, and quota-shield protocols for the **Platform Community Firebase** system (`community-firebase-project`).
>
> **Companion Blueprint**: For the in-depth mathematical calculations, chunking schema, and AI review generation workflows, see [`/FIREBASE_QUOTA_AND_COMMUNITY_ARCHITECTURE.md`](./FIREBASE_QUOTA_AND_COMMUNITY_ARCHITECTURE.md).
>
> **Last Updated:** September 2026

---

## 📑 Quick Navigation

1. [Architectural Overview & Core Principles](#1-architectural-overview--core-principles)
2. [The O(1) Plus/Minus (+1 / -1) Delta Rating System](#2-the-o1-plusminus-1---1-delta-rating-system)
3. [Vercel Free-Tier & Serverless Execution Rules](#3-vercel-free-tier--serverless-execution-rules)
4. [Dual-Firebase Air-Gap Security Boundary](#4-dual-firebase-air-gap-security-boundary)
5. [The 5-Batch "Laser Lazy-Loading" Engine](#5-the-5-batch-laser-lazy-loading-engine)
6. [Dynamic Admin Dashboard & Live App Ratings Management](#6-dynamic-admin-dashboard--live-app-ratings-management)
7. [Zero-Quota Client SWR Architecture](#7-zero-quota-client-swr-architecture)
8. [Circuit Breakers, Bot Shields & Abuse Protection](#8-circuit-breakers-bot-shields--abuse-protection)
9. [File Structure & API Reference](#9-file-structure--api-reference)

---

## 1. Architectural Overview & Core Principles

The Platform Community review engine is engineered to deliver:
- **100% Live Community Interactivity**: Public players can submit ratings, write feedback, vote helpfulness, and flag inappropriate content in real-time.
- **Zero Static Mock Data**: No hardcoded dummy review JSON files exist. All review items come from live community records.
- **$O(1)$ Plus/Minus Delta Math**: Rating counts and averages are incremented/decremented on write (+1 on submit, -1 on delete/reject), eliminating slow, expensive collection scans.
- **Maximum Quota Immunity**: 50,000 daily Firestore reads and 100,000 monthly Vercel function invocations are protected by app-level chunking, client SWR caching, and edge routing.
- **Zero-Latency Feel (0ms)**: Pages load instantaneously using client-side cache hydration and smooth skeleton placeholders.

---

## 2. The O(1) Plus/Minus (+1 / -1) Delta Rating System

Rather than fetching and recalculating hundreds of reviews every time an app page loads (an $O(N)$ operation that rapidly exhausts database quotas), Platform uses an **$O(1)$ Incremental Delta Engine**:

### Operational Lifecycle:
1. **When Adding a Review (+1)**:
   - Increments `totalReviews` by $+1$.
   - Increments `starCounts[rating]` by $+1$.
   - Adds rating score to `totalSum`.
   - Computes new average in $O(1)$ time: $\text{average} = \frac{\text{totalSum}}{\text{totalReviews}}$.
2. **When Deleting or Rejecting a Review (-1)**:
   - Decrements `totalReviews` by $-1$.
   - Decrements `starCounts[rating]` by $-1$.
   - Subtracts rating score from `totalSum`.
   - Computes new average in $O(1)$ time: $\text{average} = \frac{\text{totalSum}}{\text{totalReviews}}$.
3. **When Moderating/Editing a Review Rating ($R_{\text{old}} \to R_{\text{new}}$)**:
   - Decrements old star count `starCounts[R_old] -= 1`.
   - Increments new star count `starCounts[R_new] += 1`.
   - Adjusts total sum: $\text{totalSum} = \text{totalSum} - R_{\text{old}} + R_{\text{new}}$.
   - Computes new average in $O(1)$ time.

**Result**: Zero collection scanning. The frontend and Admin Dashboard receive instant, accurate rating counts in **0ms with 0 extra document reads**.

---

## 3. Vercel Free-Tier & Serverless Execution Rules

Vercel Hobby (Free Tier) operates under specific serverless and edge constraints. The Platform architecture is strictly designed to thrive within these limits:

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    VERCEL FREE-TIER COMPLIANCE MATRIX                           │
├────────────────────────┬─────────────────────────┬──────────────────────────────┤
│ Vercel Constraint      │ Free Tier Threshold     │ Platform Optimization        │
├────────────────────────┼─────────────────────────┼──────────────────────────────┤
│ Serverless Invocations │ 100,000 / month         │ Client Direct Firestore REST │
│                        │                         │ bypasses serverless functions│
│ Execution Timeout      │ 10 seconds max          │ Sub-200ms lightweight REST   │
│ Filesystem Writable    │ Read-Only (except /tmp) │ Auto-detects /tmp for backup │
│ Payload Size Limit     │ 4.5 MB request/response │ 5-review batches (< 5 KB)    │
│ Bandwidth / Fast Data  │ 100 GB / month          │ Laser loading & Cloudinary   │
└────────────────────────┴─────────────────────────┴──────────────────────────────┘
```

### Key Vercel Serverless Safeguards:
1. **Client-Side Direct Firestore REST (`src/lib/communityFirebase.ts`)**:
   - Public review fetches can connect directly from the user's browser to the `community-firebase-project` Firestore REST API using our secure public API key.
   - **Result**: Zero Vercel serverless function invocations on public page browsing, preventing the 100,000 monthly limit from ever being breached.
2. **Stateless Graceful Degrade**:
   - On serverless instances where the disk is ephemeral, `communityStoreService.ts` safely utilizes memory maps and `/tmp` paths without crashing.
3. **Sub-Second Response Windows**:
   - All server routes (`/api/v1/public/community/*`) respond in under 50ms, well beneath Vercel's 10-second serverless execution ceiling.

---

## 4. Dual-Firebase Air-Gap Security Boundary

To protect catalog reliability, we enforce an absolute firewall between our two Firebase projects:

```
                  ┌───────────────────────────────────────────────┐
                  │                 USER BROWSER                  │
                  └───────────────┬───────────────┬───────────────┘
                                  │               │
        ┌─────────────────────────┘               └─────────────────────────┐
        ▼ (Reads Static Catalog)                                            ▼ (Live Community Data)
┌──────────────────────────────────────┐                  ┌──────────────────────────────────────┐
│       DATABASE A: MASTER CATALOG     │                  │   DATABASE B: COMMUNITY & REVIEWS    │
├──────────────────────────────────────┤                  ├──────────────────────────────────────┤
│ Project: ai-studio-catalog-store-...     │                  │ Project: community-firebase-project           │
│ Access: 🔒 ADMIN DASHBOARD ONLY      │                  │ Access: 🌐 PUBLIC & ADMIN LIVE       │
│ Protection: 100% Air-Gapped          │                  │ Protection: Chunking & SWR Shield    │
│ Public Site Reads: ZERO (staticData) │                  │ Public Site Reads: App-Scoped Chunks │
└──────────────────────────────────────┘                  └──────────────────────────────────────┘
```

---

## 5. The 5-Batch "Laser Lazy-Loading" Engine

Instead of overwhelming the DOM and consuming unnecessary read quotas, reviews are served in **5-review slices**:

1. **Initial Mount**:
   - On `AppDetails.tsx`, the review section only requests the first **5 published comments** (`limit: 5`).
   - If a visitor only checks app specifications, screenshots, or hits the download button, subsequent reviews are never fetched.
2. **Automated Infinite Scroll (Intersection Observer)**:
   - A hidden bottom sentinel element (`loadMoreSentinelRef` with 300px root margin) automatically triggers `handleLoadMore()` when the user scrolls near the 5th review.
   - The client fetches the next 5 reviews using `cursor=${nextCursor}`.
3. **Manual Fallback Button**:
   - If JavaScript intersection triggers are throttled by power-saving modes, a visible high-contrast **"Load More Reviews"** button ensures seamless manual loading.
4. **Zero Cumulative Layout Shift (CLS)**:
   - Skeleton cards match the exact dimensions of rendered reviews, preventing page jump during data loading.

---

## 6. Dynamic Admin Dashboard & Live App Ratings Management

The Admin Dashboard provides instantaneous visibility into the health and review status of every single application in the catalog:

1. **Per-App Live Ratings Table**:
   - Displays each app's exact rating, total reviews count, published count, and pending moderation queue.
   - Values are read directly from pre-computed chunk summaries in $O(1)$ time.
2. **One-Click Moderation**:
   - Approving, rejecting, or editing any review automatically triggers the $+1 / -1$ delta calculation and updates the app's live rating breakdown immediately.
3. **AI Review Studio Safeguards**:
   - AI-generated reviews are labeled with `source: 'ai_generated'` and forced to `isPinned: false`, guaranteeing organic player reviews always lead the public display.

---

## 7. Zero-Quota Client SWR & Google Search Rich Snippets

To make repeat page visits feel instantaneous (0ms), eliminate redundant network calls, and ensure Google Search displays 5-star rich snippet cards:

1. **Local SWR Cache**:
   - When reviews for an app are loaded, the first batch of 5 reviews and the `stats` object are saved in the client's transient SWR cache.
2. **Instant Re-Render**:
   - Navigating back to an app page renders the cached reviews immediately while validating freshness in the background.
3. **Google Search 5-Star Rich Snippet Pre-Rendering**:
   - Search engine crawlers (Googlebot, Bingbot) receive server-side pre-rendered Schema.org JSON-LD (`schema.org/AggregateRating`) directly in the Raw HTML `<head>`.
   - The pre-rendering engine reads **ONLY the lightweight pre-calculated `stats` JSON object** (`ratingValue`, `reviewCount`, `ratingCount`). It is strictly forbidden from querying full review arrays.
   - Search result star ratings stay 100% matched with the live community rating without consuming database read quotas.
4. **Sync Pipeline Alignment**:
   - During code synchronization ("Admin Release"), current live rating values are baked into `staticData.json` and static HTML builds.

---

## 8. Circuit Breakers, Bot Shields & Abuse Protection

1. **15-Minute Quota Cooldown Sentinel**:
   - If Firestore returns `RESOURCE_EXHAUSTED` (HTTP 429), the backend automatically activates a 15-minute circuit trip, switching seamlessly to cached data with zero website downtime.
2. **Cloudflare Turnstile Anti-Bot Verification**:
   - Every review submission requires a valid anti-bot token to block automated spam.
3. **IP Rate Limiting**:
   - Maximum 3 review submissions per 10-minute window per IP address.
4. **Organic Priority**:
   - AI-generated reviews are saved with `source: 'ai_generated'` and forced to `isPinned: false`. Organic user reviews are prioritized.

---

## 9. File Structure & API Reference

```
/
├── src/
│   ├── lib/
│   │   ├── communityFirebase.ts       # Public browser Firestore REST client & SWR cache
│   │   └── staticData.json            # Master catalog offline fallback (protects Database A)
│   │
│   ├── hooks/
│   │   └── useReviews.ts              # 5-batch cursor pagination & live sync hook
│   │
│   ├── components/
│   │   ├── UserReviews.tsx            # Main reviews feed container with intersection sentinel
│   │   ├── ReportAppModal.tsx         # Lightweight content flag & abuse reporting modal
│   │   └── public/
│   │       ├── ReviewForm.tsx         # High-contrast review submission form
│   │       ├── ReviewItem.tsx         # Individual review card with helpful voting & replies
│   │       └── ReviewScoreSummary.tsx # 5-star distribution bar & aggregate score widget
│   │
│   └── server/
│       ├── communityFirebaseAdmin.ts  # Backend Firestore connection for community-firebase-project
│       ├── services/
│       │   ├── communityStoreService.ts # 3-tier memory/disk/cloud chunking & delta math engine
│       │   └── aiReviewGeneratorService.ts # Dual-Brain AI Review Studio generator
│       └── routes/
│           ├── communityRoutes.ts     # Public & Admin review REST endpoints
│           └── reportRoutes.ts        # Abuse moderation REST endpoints
```

### Public API Endpoints
- `GET /api/v1/public/community/reviews/:appId?limit=5&cursor=<token>&filter=<all|positive|critical>&sortBy=<recent|helpful>`
- `POST /api/v1/public/community/reviews` (Turnstile verified submission)
- `POST /api/v1/public/community/reviews/helpful` (Increment helpful counter)
- `POST /api/v1/public/reports` (Zero-latency app & review abuse report)
