# Platform SEO Architecture & Route Map

This document serves as the comprehensive source of truth for Platform's Search Engine Optimization (SEO) strategy, metadata injection, sitemap generation, and routing architecture.

---

## 1. Core SEO Engine

Platform uses a hybrid approach to guarantee 100% SEO indexability while maintaining the performance of a React Single Page Application (SPA).

*   **Server-Side Meta Injection (`src/seoHelper.ts`)**: Intercepts requests to dynamic routes (like `/app/:slug`) and injects server-rendered HTML, `<title>`, `<meta>`, OpenGraph tags, and JSON-LD schema directly into the raw HTML response before it hits the browser.
*   **Static Prerendering (`scripts/prerender.ts`)**: During `npm run build`, the system crawls all known routes and prerenders static HTML files into the `dist/` folder, ensuring blazing-fast loads and perfect Googlebot crawlability.
*   **Dynamic XML Generation (`src/server/routes/seoRoutes.ts`)**: Dynamically generates `sitemap.xml`, `rss.xml`, and `opensearch.xml` on the fly by reading from Firestore or the `public_backup.json` fallback.

---

## 2. Platform Route Map (Sitemap Structure)

The following routes are explicitly mapped and indexed by Googlebot via `sitemap.xml`.

### Static Core Routes
*   `/` — Primary Homepage / App Catalog
*   `/news` — News & Updates Portal
*   `/developers` — Developer Directory
*   `/about` — About Us & Transparency
*   `/contact` — Contact Form
*   `/privacy` — Privacy Policy
*   `/terms` — Terms and Conditions
*   `/disclaimer` — Legal Disclaimer
*   `/ethics` — Review Ethics & Guidelines
*   `/notice` — Legal Notices
*   `/responsibility` — Responsible Gaming Policy
*   `/report-removal` — DMCA & App Removal Requests

### Dynamic Routes
*   `/app/:slug` — Individual App Details Page (e.g., `/app/callbreak`, `/app/spin-crush`). Injects app-specific descriptions, ratings, schema, and optimized icon URLs.
*   `/news/:slug` — Individual News Articles (e.g., `/news/callbreak-live-on-Platform`). Injects article schemas and publication dates.

---

## 3. Metadata & Open Graph (Social Sharing)

When a route is requested, `seoHelper.ts` dynamically generates the following tags based on the URL context:

*   **Primary SEO**: `<title>`, `<meta name="description">`, `<link rel="canonical">`
*   **Open Graph (Facebook/Discord/LinkedIn)**: `og:title`, `og:description`, `og:image`, `og:url`, `og:type`
*   **Twitter Cards**: `twitter:card` (summary_large_image), `twitter:title`, `twitter:description`, `twitter:image`
*   **JSON-LD Schema Markup**:
    *   `SoftwareApplication` schema for App pages (includes aggregate ratings, operating system, category).
    *   `NewsArticle` schema for News pages (includes headline, date published, and featured image).
    *   `WebSite` schema for the Homepage (includes Sitelinks Search Box configuration).

---

## 4. Advanced Indexing Features

### Sitemap (`/sitemap.xml`)
Generated dynamically by `seoRoutes.ts`. It iterates over all static routes, all published apps, and all news articles. It prioritizes the homepage (`1.0`) and active app pages (`0.9`), appending `<image:image>` tags to ensure logos and banners are indexed in Google Images.

### RSS Feed (`/rss.xml`)
Provides an automated syndication feed of the latest apps and news articles added to the platform, enabling feed readers and automated social posters to instantly detect new content.

### OpenSearch (`/opensearch.xml`)
Configures the browser to allow users to search Platform directly from their URL/address bar (e.g., typing "Platform" then hitting "Tab").

### Robots Configuration (`/robots.txt`)
Dynamically served based on platform settings, explicitly pointing crawlers to the `sitemap.xml` endpoint and disallowing administrative/vault paths.

### App Manifest (`/site.webmanifest` / `/manifest.json`)
Provides PWA (Progressive Web App) installation instructions, defining theme colors, background colors, and the array of optimized maskable icons.

---

## 5. Image SEO & Performance (`src/seo/utils.ts`)

To maintain a 100% Google PageSpeed score, Platform strictly prohibits loading raw, unoptimized images.
*   **Cloudinary Automatic Optimization**: All image URLs from the database are intercepted and wrapped with Cloudinary transformation parameters: `f_auto,q_auto,w_<width>`.
*   This ensures WebP/AVIF delivery, reducing massive hero images and icons down to a few kilobytes, drastically improving LCP (Largest Contentful Paint) for SEO rankings.
*   **Client-Side Initialization Data (`__INITIAL_DATA__`)**: To prevent the HTML document from becoming bloated, `seoHelper.ts` actively trims large HTML fields (like `description_html`) from non-target items in list views, keeping the initial DOM payload under 100KB.
