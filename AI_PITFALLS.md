# ⚠️ AI Agent Pitfalls & Common Mistakes (READ BEFORE MODIFYING)

This document is specifically written for **AI Agents, LLMs, and automated coding assistants**. 
Platform has a hybrid architecture (Express + React SPA + Vercel Serverless + Dual Repo Split-Sync). Automated agents consistently make the same mistakes when modifying this codebase.

---

## 🛑 Trap 1: The Vercel Serverless API Illusion
* **The Mistake:** AI agents see `server.ts` and assume Platform runs as a standard long-running server in production, or attempt to manually edit `api/index.js` or `public-api/index.js`.
* **The Reality:** During `npm run build`, `scripts/build-api.js` compiles `server.ts` into `api/index.js`. Vercel routes `/api/*` requests through this serverless bundle.
* **The Rule:** NEVER edit `api/index.js` manually. Make all backend changes in `src/server/routes/` or `server.ts`.

---

## 🛑 Trap 2: Firebase Project ID vs. Database ID Mix-up
* **The Mistake:** Agents treat `(default)` as the Google Cloud Project ID.
* **The Reality:** 
  * Project ID = `primary-firebase-project`
  * Database ID = `(default)`
* **The Rule:** If you pass the Database ID into the Project ID field of the Firestore REST API, Google returns `403 Permission Denied`. `src/server/firebase.ts` handles this mapping.

---

## 🛑 Trap 3: The Three Fallback JSON Files
* `src/lib/staticData.json`: **SANITIZED UI FALLBACK.** Client-facing. Contains zero sensitive download links.
* `src/lib/public_backup.json`: **ENCRYPTED VAULT FALLBACK.** Server-side only. Contains `encrypted_link` data for high-availability decryption when Firestore is unreachable.
* `src/server/secure_vault.json`: **LOCAL ADMIN ONLY.** Ignored on Vercel.
* **The Rule:** NEVER put decrypted/raw download links in `staticData.json`. When resolving download links on the server, fallback to `public_backup.json`.

---

## 🛑 Trap 4: HTML Payload Bloat (Destroying Core Web Vitals)
* **The Mistake:** Modifying `src/seoHelper.ts` to include full `description_html` for all 200+ apps in `window.__INITIAL_DATA__`.
* **The Reality:** Generates a 2.5 MB HTML document, crashing mobile browsers and destroying Google PageSpeed scores.
* **The Rule:** Always keep the stripping logic: `delete app.description_html` for all apps except the one matching `targetSlug`.

---

## 🛑 Trap 5: Dual-Repo Split-Sync Security Leaks
* **The Mistake:** Creating an admin component or backend route and forgetting to update `.github/workflows/split-sync.yml`.
* **The Reality:** Every push to `main` runs split-sync. Admin files not listed in `ADMIN_ONLY_FILES` will be synced to the public website repository.
* **The Rule:** Whenever creating an admin-only file, add its path to `ADMIN_ONLY_FILES` in `split-sync.yml`.

---

## 🛑 Trap 6: Speculation Rules & Aggressive Prefetching
* **The Mistake:** Adding `<script type="speculationrules">` or prefetching download gateway routes.
* **The Reality:** Triggers synthetic bot requests that lack valid security tokens, flooding logs with false 403 errors and alerting Pingdom.
* **The Rule:** Do NOT add speculation rules.

---

## 🛑 Trap 7: "Download APK" Vocabulary Trigger
* **The Mistake:** Changing UI buttons to "Download APK".
* **The Reality:** Triggers automated security/reputation crawlers.
* **The Rule:** Use "Download" on the main app page, and "Proceed" or "Verification Portal" on the `/moreinfo` page.

---

## 🛑 Trap 8: URL Routing & Canonical Mismatches
* **The Mistake:** Using database `id` instead of `slug` in React Router links, or adding trailing slashes.
* **The Reality:** Breaks SEO canonical mapping and forces duplicate content penalties.
* **The Rule:** Always use `/app/:slug` (e.g. `<Link to="/app/callbreak">`) with no trailing slash.
