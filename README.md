# Universal App Directory & Transparency Platform — Master Engine

A full-stack, white-label Single Page Application (SPA) and Server-Side Rendered (SSR) SEO engine powered by **Express.js**, **React 19**, **Vite**, **TypeScript**, and **Dual Cloud Firestore**.

This repository serves as a **100% content-free, brand-agnostic Master Template**. All site branding, catalog items, legal copy, domains, Firebase databases, encryption keys, and deployment targets are configured entirely via **Environment Variables** (`.env`) and the **Admin Control Panel**.

---

## Key Capabilities

- **Blank-By-Default White-Label Identity**: Starts with an empty catalog (`0` apps, `0` news, `0` reviews) and a blank site title (`""`) until configured by the administrator.
- **Server-Side SEO & Pre-Rendering (`src/seoHelper.ts`)**: Dynamic OpenGraph tags, canonical URLs, JSON-LD schemas, XML sitemaps (`/sitemap.xml`), and RSS feeds (`/rss.xml`) generated automatically from database settings.
- **Dual-Firebase Architecture**:
  - **Database A (Primary Catalog)**: Stores apps, global settings, news, videos, FAQs, developer profiles, and the encrypted link vault.
  - **Database B (Community Engine)**: Isolated Firebase project for user reviews, star rating aggregations, helpful votes, and content moderation flags.
- **`/moreinfo` 7-Gate Security Gateway**: Hardware-committed Cloudflare Turnstile verification, server-issued HMAC nonces, Upstash Redis replay protection, and late server-RAM AES-256 link decryption.
- **Automated Dual-Repo Split-Sync**: One-click and CI/CD synchronization that splits and deploys the isolated **Public Site Repository** and **Admin Control Repository**.

---

## Quick Start

1. **Install Dependencies**:
   ```bash
   npm install
   ```
2. **Configure Environment Variables**:
   ```bash
   cp .env.example .env
   ```
   Populate `.env` with your domain, Firebase credentials, Vault keys, Turnstile keys, Upstash Redis, Cloudinary, and GitHub Sync variables. See [`MASTER_WHITE_LABEL_BLUEPRINT.md`](./MASTER_WHITE_LABEL_BLUEPRINT.md) for the complete variable reference.
3. **Run Development Server**:
   ```bash
   npm run dev
   ```
   Runs on `http://localhost:3000`.
4. **Build for Production**:
   ```bash
   npm run build
   npm run start
   ```

---

## Architecture Documentation

- [`MASTER_WHITE_LABEL_BLUEPRINT.md`](./MASTER_WHITE_LABEL_BLUEPRINT.md) — Complete Master Repository engineering specification, environment variable dictionary, and cloning guide.
- [`MORE_INFO_SECURITY_ARCHITECTURE.md`](./MORE_INFO_SECURITY_ARCHITECTURE.md) — `/moreinfo` 7-Gate security specification and link vault protocol.
- [`AGENTS.md`](./AGENTS.md) — Developer architecture & repository structure guide.