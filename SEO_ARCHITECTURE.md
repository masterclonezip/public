# Platform SEO Master Architecture & Route Specification

> **Platform**: [Platform (https://example.com)](https://example.com)  
> **Source of Truth Document**: Comprehensive SEO Engine, Metadata Injection, Sitemap Generation, Dual-Repo Split-Sync Preservation, and Core Web Vitals Architecture.

---

## 1. Executive Summary & Core Philosophy

Platform employs a **Server-Side Pre-Rendering and Dynamic Metadata Injection Engine** designed to achieve:
1. **100% Indexability for All Search Engines** (Googlebot, Bingbot, Applebot, DuckDuckBot, Baiduspider, Yandex, etc.).
2. **Rich Visual Social Cards** across all platforms (WhatsApp, X/Twitter, Facebook, Telegram, Discord, LinkedIn, Slack, iMessage).
3. **100% Core Web Vitals / PageSpeed Scores** via automated Cloudinary asset transformation, DOM payload trimming, and responsive responsive layouts.
4. **Zero-Breakage Split-Sync Resilience**: The entire SEO subsystem is architected to operate flawlessly whether running in the full full-stack development environment, the Masterworld Admin repo, or the public Dex static repository.
5. **Admin Single Source of Truth**: All page titles, descriptions, H1 headings, FAQ accordions, and app dossiers are maintained by the Administrator in the database. The SEO system acts as the high-speed architectural delivery pipe for this data.

---

## 2. Server-Side HTML Pre-Rendering Engine (`src/seoHelper.ts`)

### 2.1 Bot Detection & Semantic SSR Markup
When an incoming HTTP request hits `server.ts`, the server inspects the `User-Agent` header using `isBotUserAgent()` in `src/seo/utils.ts`.

- **For Search Engine Bots & Social Scrapers**:
  - The server generates complete semantic HTML markup (header, breadcrumbs, H1/H2 headings, app specifications, verified reviews, developer dossiers, and footers).
  - This markup is injected directly into `<div id="root">` of the raw HTML response.
  - Search engine crawlers receive a 100% fully rendered HTML document with zero reliance on JavaScript execution.
- **For Human Browser Users**:
  - The server injects the pre-rendered body inside `<noscript>` tags.
  - This guarantees instant SPA React hydration without visual markup flashing or layout shifting.

### 2.2 `window.__INITIAL_DATA__` Payload Trimming
To prevent multi-megabyte DOM payloads on index and category pages containing 230+ applications:
- `seoHelper.ts` selectively trims heavy HTML bodies (`description_html`, `features_html`, `custom_admin_box_html`, etc.) for non-target applications on listing pages.
- Full HTML descriptions are only retained for the specific active target application (e.g., `/app/:slug`).
- This keeps the initial HTML response under **~95 KB** instead of 2.5+ MB, drastically improving TTFB (Time to First Byte) and LCP (Largest Contentful Paint).

---

## 3. Canonical URL & Route Taxonomy

### 3.1 Strict Canonical URL Standard
Every page strictly declares its canonical URL in:
1. `<link rel="canonical" href="...">` in the HTML `<head>`.
2. `<meta property="og:url" content="...">`.
3. `<loc>...</loc>` inside `sitemap.xml`.

**Strict Rules**:
- **Domain**: Strictly `https://example.com` (enforces HTTPS and WWW subdomain).
- **No Trailing Slash**: `https://example.com/app/rummy-master` (NEVER `.../rummy-master/`).
- **No Query Parameters**: Query strings (e.g. `?ref=share`, `?utm_source=...`) are stripped from canonicals.
- **Kebab-Case Slugs**: All dynamic routes use semantic kebab-case slugs (e.g., `/app/teen-patti-gold`), NEVER internal database IDs (e.g. `/app/doc_92817x` ❌).

### 3.2 Complete Route Inventory

| Route | Content Type | SEO Purpose & Key Metadata |
| :--- | :--- | :--- |
| `/` | Catalog Home | Primary platform landing, sitelinks search box schema, top featured apps. |
| `/app/:slug` | App Dossier | `SoftwareApplication` schema, aggregate star rating, review items, download specs. |
| `/news` | News Hub | Industry updates, announcements, updates directory. |
| `/news/:slug` | News Article | `NewsArticle` schema, publication & modification dates, author profile. |
| `/videos` | Video Gallery | Gameplay tutorials and reviews video collection. |
| `/videos/:slug` | Single Video | `VideoObject` schema, thumbnail, video duration, and description. |
| `/developers` | Dev Directory | Verified game studios and publisher profiles. |
| `/developers/:slug`| Dev Portfolio | Studio overview, portfolio of published titles. |
| `/categories` | Category Index| Browsable directory of all game/app classifications. |
| `/category/:slug` | Category Page | Curated listings for specific categories (e.g. Rummy, Teen Patti, Slots). |
| `/new` | New Additions | Latest added applications to the catalog. |
| `/about` | Transparency | Company mission, verification standards, E-E-A-T background. |
| `/contact` | Contact Form | Direct inquiry and developer support channels. |
| `/privacy` | Privacy Policy | Full GDPR, CCPA, and DPDP compliance documentation. |
| `/terms` | Terms of Service| User and developer terms of platform usage. |
| `/disclaimer` | Legal Disclaimer| Fair use, third-party trademark, and transparency notices. |
| `/ethics` | Review Ethics | Review impartiality, ranking methodology, and non-discrimination. |
| `/notice` | Important Notice| Regulatory and consumer guidance advisories. |
| `/responsibility` | Responsible Play| Player safety, deposit limit guidelines, and de-addiction resources. |
| `/report-removal` | DMCA / Takedown | Intellectual property rights protection & instant takedown portal. |

---

## 4. Rich Schema.org Structured Data (JSON-LD)

All structured data is generated dynamically on the server and hydrated on the client via `src/components/Meta.tsx`:

### 4.1 `SoftwareApplication` / `WebApplication` (App Detail Pages)
```json
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "Rummy Master",
  "operatingSystem": "Android",
  "applicationCategory": "GameApplication",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "INR"
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.8",
    "bestRating": "5",
    "worstRating": "1",
    "ratingCount": "1250",
    "reviewCount": "1250"
  },
  "review": [
    {
      "@type": "Review",
      "author": { "@type": "Person", "name": "Rahul Verma" },
      "datePublished": "2026-08-15T10:30:00Z",
      "reviewBody": "Smooth gameplay and instant withdrawals.",
      "reviewRating": {
        "@type": "Rating",
        "ratingValue": "5",
        "bestRating": "5",
        "worstRating": "1"
      }
    }
  ]
}
```

### 4.2 `BreadcrumbList` (SERP Breadcrumbs)
```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://example.com" },
    { "@type": "ListItem", "position": 2, "name": "Games", "item": "https://example.com/categories" },
    { "@type": "ListItem", "position": 3, "name": "Rummy Master", "item": "https://example.com/app/rummy-master" }
  ]
}
```

### 4.3 `FAQPage` (Rich Accordion Snippets)
Automatically injected on home and app detail pages from the admin database:
```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "Is Rummy Master free to download?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes, Rummy Master is 100% free to download on Android devices via Platform."
      }
    }
  ]
}
```

---

## 5. Dynamic XML Sitemaps, RSS & Search Engine Protocols (`src/server/routes/seoRoutes.ts`)

### 5.1 `/sitemap.xml`
- **Dynamic URL Aggregation**: Iterates across all static trust pages, all active apps, all published news articles, video guides, and developer profiles.
- **Image Extensions (`<image:image>`)**: Attaches high-resolution app icons and article hero banners to ensure rich Google Images indexing.
- **W3C Datetime Compliance**: Outputs W3C standard dates (`YYYY-MM-DDTHH:mm:ss+00:00`) without raw millisecond strings, ensuring 100% validation in Google Search Console.
- **Priority Hierarchy**:
  - `1.0`: Homepage (`/`)
  - `0.9`: Individual App Details (`/app/:slug`)
  - `0.8`: Categories & News Hub (`/categories`, `/news`)
  - `0.7`: Individual News Articles (`/news/:slug`)
  - `0.6`: Trust & Legal Pages (`/about`, `/privacy`, etc.)

### 5.2 `/rss.xml` & `/feed.xml`
- Automated XML syndication feed delivering the latest news and newly listed applications.
- Enables news aggregators, feed readers, and automated social distribution tools to index new content within seconds of publication.

### 5.3 `/robots.txt`
- **Allowed**: Complete public catalog (`/`, `/app/*`, `/news/*`, `/videos/*`, `/developers/*`, `/categories/*`, `/api/v1/public/*`).
- **Disallowed**: Internal API routes (`/api/`), admin control panels (`/admin/`, `/masterworld/`), authentication endpoints (`/login/`), and link clearance gateways (`/moreinfo/`, `/gateway/`, `/dl/`, `/out/`, `/s/`).
- **Sitemap Linkage**: Points directly to `https://example.com/sitemap.xml`.

### 5.4 Progressive Web App (`/site.webmanifest` / `/manifest.json`)
- Defines application name, branding colors, theme colors (`#dc2626`), and maskable Cloudinary-optimized icons (192x192 and 512x512).

---

## 6. Image Optimization & Core Web Vitals (100% PageSpeed)

To guarantee instantaneous loading on 4G/5G mobile devices and achieve a 100% Lighthouse/PageSpeed rating:

1. **Cloudinary Automatic Transformation**:
   - All image URLs are processed through `optimizeImageUrl(url, width)` in `src/seo/utils.ts`.
   - Injects `/upload/f_auto,q_auto,w_<width>/`, converting heavy PNG/JPEG files into lightweight WebP/AVIF formats.
   - Reduces average icon payload from **~370 KB to ~6 KB** (an 85%+ reduction).
2. **Explicit Dimension Attributes**:
   - All server-rendered and client-rendered images include explicit `width` and `height` attributes to prevent Cumulative Layout Shift (CLS).
3. **Fetch Priority Optimization**:
   - Above-the-fold hero images use `loading="eager"` and `fetchpriority="high"`.
   - Below-the-fold icons and screenshots use `loading="lazy"` and `decoding="async"`.
4. **No Speculation Rules**:
   - `<script type="speculationrules">` is strictly avoided to prevent false `4xx/aborted` network warnings from synthetic monitoring bots (Lighthouse, Pingdom).

---

## 7. Dual-Repo Split-Sync Preservation Rules

The Platform monorepo automatically synchronizes to two external repositories:
1. **Public Site (`Dex`)**: Public user-facing website (`www.example.com`).
2. **Admin Site (`Masterworld`)**: Admin control console.

### How SEO Remains 100% Protected During Sync
1. **Zero Admin Dependency in Public SEO**:
   - `src/seoHelper.ts`, `src/seo/`, `src/lib/seoUtils.ts`, and `src/components/Meta.tsx` are strictly decoupled from admin-only modules.
   - Public SEO relies on `src/lib/staticData.json` and Firestore public endpoints, ensuring the public site builds and pre-renders cleanly in isolation.
2. **High-Availability Multi-Tier Fallback**:
   - If Cloud Firestore is temporarily offline or rate-limited:
     1. In-Memory Cache (0ms latency).
     2. `src/lib/public_backup.json` (Server-side synced dataset).
     3. `src/lib/staticData.json` (Bundled static fallback dataset).
     4. Firestore REST API direct query.
   - The platform **never returns a 500 error or blank page** to search engine crawlers.

---

## 8. Developer & AI Agent SEO Rules

1. **Never Invent or Edit Content**: AI agents must never inject hardcoded text, placeholder descriptions, or invented SEO titles into the codebase. All content originates from the Admin Dashboard database.
2. **Always Use Semantic `<Link>` Components**: For internal SPA navigation, use `import { Link } from 'react-router-dom'`. Never use raw `<a>` tags for internal pages, as they force unnecessary full-page refreshes.
3. **Preserve the Kebab-Case Slug Convention**: Always use `/app/:slug` and `/news/:slug`. Never link using database IDs.
4. **Wrap All Images with Optimization Helpers**: Always use `getOptimizedImageUrl(url, width)` when rendering dynamic images.
5. **Keep Canonical URLs Clean**: Never append trailing slashes or query parameters to canonical URL tags.
