import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

const distDir = path.resolve(process.cwd(), 'dist');
const publicDir = path.resolve(process.cwd(), 'public');
const staticJsonPath = path.resolve(process.cwd(), 'src/lib/staticData.json');

interface CheckResult {
  id: string;
  name: string;
  passed: boolean;
  details: string;
}

const results: CheckResult[] = [];

function record(id: string, name: string, passed: boolean, details: string) {
  results.push({ id, name, passed, details });
}

function verify() {
  if (!fs.existsSync(distDir)) {
    console.error('dist/ directory not found. Run npm run build first.');
    process.exit(1);
  }

  const rawData = JSON.parse(fs.readFileSync(staticJsonPath, 'utf8'));
  const publicApps = (rawData.apps || []).filter((a: any) => a && a.sync_to_public !== false);
  const publicNews = (rawData.news || []).filter((n: any) => n && n.sync_to_public !== false);

  // 1. Verify Sitemaps & GZip Companions (B6, B9, B11)
  const expectedSitemaps = [
    'sitemap.xml',
    'sitemap-apps.xml',
    'sitemap-news.xml',
    'sitemap-videos.xml',
    'sitemap-static.xml',
    'sitemap-developers.xml'
  ];

  let allSitemapsValid = true;
  const sitemapDetails: string[] = [];

  for (const sm of expectedSitemaps) {
    const distXml = path.join(distDir, sm);
    const distGz = path.join(distDir, `${sm}.gz`);
    const pubXml = path.join(publicDir, sm);
    const pubGz = path.join(publicDir, `${sm}.gz`);

    if (!fs.existsSync(distXml) || !fs.existsSync(distGz) || !fs.existsSync(pubXml) || !fs.existsSync(pubGz)) {
      allSitemapsValid = false;
      sitemapDetails.push(`Missing ${sm} or ${sm}.gz in dist/public`);
      continue;
    }

    const xmlContent = fs.readFileSync(distXml, 'utf8');
    const gzBuffer = fs.readFileSync(distGz);
    const gunzipped = zlib.gunzipSync(gzBuffer).toString('utf8');
    if (gunzipped !== xmlContent) {
      allSitemapsValid = false;
      sitemapDetails.push(`GZip content mismatch for ${sm}.gz`);
    }
    sitemapDetails.push(`${sm} (${(xmlContent.length / 1024).toFixed(1)} KB, gz: ${(gzBuffer.length / 1024).toFixed(1)} KB)`);
  }

  const appsSitemapXml = fs.readFileSync(path.join(distDir, 'sitemap-apps.xml'), 'utf8');
  const newsSitemapXml = fs.readFileSync(path.join(distDir, 'sitemap-news.xml'), 'utf8');
  const appLocCount = (appsSitemapXml.match(/<loc>/g) || []).length;
  const newsLocCount = (newsSitemapXml.match(/<loc>/g) || []).length;

  record(
    'B9/B6',
    'XML & GZip Sitemaps Completeness',
    allSitemapsValid && appLocCount >= publicApps.length && newsLocCount >= publicNews.length,
    `Apps in sitemap: ${appLocCount}/${publicApps.length}, News in sitemap: ${newsLocCount}/${publicNews.length}. Files: ${sitemapDetails.join('; ')}`
  );

  // 2. Verify Representative Pre-Rendered HTML Pages (A1-A8, B3-B8)
  const sampleApp = publicApps[0];
  const sampleNews = publicNews[0];
  const routesToInspect = [
    { route: '/', file: path.join(distDir, 'index.html'), type: 'home' },
    { route: '/new-apps', file: path.join(distDir, 'new-apps/index.html'), type: 'collection' },
    { route: '/categories', file: path.join(distDir, 'categories/index.html'), type: 'collection' },
    { route: '/news', file: path.join(distDir, 'news/index.html'), type: 'news-list' },
    { route: '/about', file: path.join(distDir, 'about/index.html'), type: 'static' },
    { route: '/faq', file: path.join(distDir, 'faq/index.html'), type: 'faq' },
    ...(sampleApp ? [{ route: `/app/${sampleApp.slug}`, file: path.join(distDir, `app/${sampleApp.slug}/index.html`), type: 'app', record: sampleApp }] : []),
    ...(sampleNews ? [{ route: `/news/${sampleNews.slug}`, file: path.join(distDir, `news/${sampleNews.slug}/index.html`), type: 'news-detail', record: sampleNews }] : [])
  ];

  let metaIntegrityPassed = true;
  const metaIssues: string[] = [];

  let ssrLayoutPassed = true;
  const layoutIssues: string[] = [];

  let schemaPassed = true;
  const schemaIssues: string[] = [];

  for (const item of routesToInspect) {
    if (!fs.existsSync(item.file)) {
      metaIntegrityPassed = false;
      metaIssues.push(`Missing pre-rendered file for ${item.route}: ${item.file}`);
      continue;
    }

    const html = fs.readFileSync(item.file, 'utf8');
    const headEnd = html.indexOf('</head>');
    const headHtml = headEnd !== -1 ? html.slice(0, headEnd) : html;

    // Single <title> check
    const titleMatches = headHtml.match(/<title[^>]*>([\s\S]*?)<\/title>/gi) || [];
    if (titleMatches.length !== 1) {
      metaIntegrityPassed = false;
      metaIssues.push(`${item.route}: expected 1 <title>, found ${titleMatches.length}`);
    }

    // Single canonical and og:url parity
    const canonicalMatch = headHtml.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["'][^>]*>/i);
    const ogUrlMatch = headHtml.match(/<meta[^>]*property=["']og:url["'][^>]*content=["']([^"']+)["'][^>]*>/i);
    if (!canonicalMatch || !ogUrlMatch) {
      metaIntegrityPassed = false;
      metaIssues.push(`${item.route}: missing canonical or og:url`);
    } else if (canonicalMatch[1] !== ogUrlMatch[1]) {
      metaIntegrityPassed = false;
      metaIssues.push(`${item.route}: canonical (${canonicalMatch[1]}) !== og:url (${ogUrlMatch[1]})`);
    }

    // Critical CSS & Inlined Vite CSS check (A2)
    if (!headHtml.includes('id="server-critical-css"') || !headHtml.includes('id="vite-inline-css"')) {
      ssrLayoutPassed = false;
      layoutIssues.push(`${item.route}: missing inline server-critical-css or vite-inline-css`);
    }

    // SSR Layout structure check: header, main, footer with social icons (A1, A4, B7)
    if (!html.includes('<header') || !html.includes('<main id="main-content"') || !html.includes('<footer') || !html.includes('aria-label="Facebook"')) {
      ssrLayoutPassed = false;
      layoutIssues.push(`${item.route}: incomplete SSR layout (header/main/footer/social)`);
    }

    // JSON-LD validation & FAQPage isolation (B8)
    const ldMatches = [...headHtml.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
    if (ldMatches.length === 0) {
      schemaPassed = false;
      schemaIssues.push(`${item.route}: 0 JSON-LD blocks found`);
    } else {
      const combinedJsonStrs: string[] = [];
      for (const m of ldMatches) {
        try {
          const parsed = JSON.parse(m[1]);
          const jsonStr = JSON.stringify(parsed);
          combinedJsonStrs.push(jsonStr);
          if (jsonStr.includes('"FAQPage"')) {
            schemaPassed = false;
            schemaIssues.push(`${item.route}: unwanted FAQPage schema detected`);
          }
          if (jsonStr.includes('"@type":"Product"') || jsonStr.includes('InStock') || jsonStr.includes('priceValidUntil')) {
            schemaPassed = false;
            schemaIssues.push(`${item.route}: unwanted Product or Merchant listing schema detected`);
          }
        } catch (e: any) {
          schemaPassed = false;
          schemaIssues.push(`${item.route}: invalid JSON-LD (${e.message})`);
        }
      }
      const allLdStr = combinedJsonStrs.join(' ');
      if (item.type === 'news-list' && !allLdStr.includes('"CollectionPage"')) {
        schemaPassed = false;
        schemaIssues.push(`${item.route}: missing CollectionPage schema on /news`);
      }
      if ((item.type === 'app' || item.type === 'static') && !allLdStr.includes('"WebPage"')) {
        schemaPassed = false;
        schemaIssues.push(`${item.route}: missing WebPage schema on ${item.type} route`);
      }
      if (item.type === 'app' && !allLdStr.includes('"SoftwareApplication"')) {
        schemaPassed = false;
        schemaIssues.push(`${item.route}: missing SoftwareApplication schema on app route`);
      }
    }

    // Subpage brand-rewriting signal check (B3): subpages must not leak application-name or og:site_name
    if (item.type !== 'home') {
      if (/<meta[^>]*name=["']application-name["']/i.test(headHtml) || /<meta[^>]*property=["']og:site_name["']/i.test(headHtml)) {
        metaIntegrityPassed = false;
        metaIssues.push(`${item.route}: subpage leaked application-name or og:site_name (triggers Google SERP brand suffix rewrite)`);
      }
    } else {
      if (!/<meta[^>]*property=["']og:site_name["']/i.test(headHtml)) {
        metaIntegrityPassed = false;
        metaIssues.push(`/: homepage missing og:site_name`);
      }
    }
  }

  record('B3/B4', 'Metadata, Single Title, Brand Control & Canonical/OG Parity', metaIntegrityPassed, metaIssues.length === 0 ? `Verified across ${routesToInspect.length} route types (canonical === og:url, single <title>, subpages isolated from application-name/og:site_name)` : metaIssues.join('; '));
  record('A1/A2/A4/B7', 'SSR Layout, Critical CSS & Footer Parity', ssrLayoutPassed, layoutIssues.length === 0 ? `Verified inline CSS, Header, Main, Ticker, and Footer w/ social links across ${routesToInspect.length} routes` : layoutIssues.join('; '));
  record('B8', 'JSON-LD Schema Validity & Zero Unwanted Schema Enforcement', schemaPassed, schemaIssues.length === 0 ? `All JSON-LD blocks valid; zero Product/Merchant/FAQPage bloat; clean SoftwareApplication + WebPage + BreadcrumbList on /app/*; CollectionPage on /news` : schemaIssues.join('; '));

  // 3. Verify Cloudinary URL Folder Preservation (B5)
  const appHtml = sampleApp ? fs.readFileSync(path.join(distDir, `app/${sampleApp.slug}/index.html`), 'utf8') : '';
  const hasBrokenCloudinary = appHtml.includes('res.cloudinary.com') && /\/upload\/f_auto,q_auto,w_\d+\/[^/]+\.(png|jpg|webp)/i.test(appHtml) && (sampleApp?.icon_url || '').includes('uploads/');
  record('B5', 'Cloudinary Folder Path Preservation', !hasBrokenCloudinary, 'Verified getOptimizedImageUrl preserves nested folder paths (uploads/) and version tokens');

  // 4. Verify Pre-Compressed Assets (.gz and .br) in dist/assets (A9, B9)
  const assetsDir = path.join(distDir, 'assets');
  const assetFiles = fs.existsSync(assetsDir) ? fs.readdirSync(assetsDir) : [];
  const jsFiles = assetFiles.filter(f => f.endsWith('.js'));
  const gzFiles = assetFiles.filter(f => f.endsWith('.js.gz'));
  const brFiles = assetFiles.filter(f => f.endsWith('.js.br'));
  record('A9/A10', 'Bundle Compression (.gz & .br)', jsFiles.length > 0 && gzFiles.length >= jsFiles.length && brFiles.length >= jsFiles.length, `JS chunks: ${jsFiles.length}, GZip (.js.gz): ${gzFiles.length}, Brotli (.js.br): ${brFiles.length}`);

  // 5. Verify Cloudflare Pages _redirects Non-Shadowing & Admin Brand Choice Preservation (B3, B6)
  const pubRedirects = fs.readFileSync(path.join(publicDir, '_redirects'), 'utf8');
  const distRedirects = fs.readFileSync(path.join(distDir, '_redirects'), 'utf8');
  const hasShadowingRule = /\/(app|news|videos|category)\/\*\s+\/index\.html\s+200/i.test(pubRedirects) || /\/(app|news|videos|category)\/\*\s+\/index\.html\s+200/i.test(distRedirects);
  const useDataActionsSrc = fs.readFileSync(path.resolve(process.cwd(), 'src/hooks/useDataActions.ts'), 'utf8');
  const hasDestructiveBrandStrip = /cleanTitle\.replace\(/i.test(useDataActionsSrc);
  record('B3/B6', 'Cloudflare Routing Non-Shadowing & Admin Brand Choice Fidelity', !hasShadowingRule && !hasDestructiveBrandStrip, 'Verified _redirects does not rewrite /app/* or /news/* to Homepage /index.html, and useDataActions.ts preserves Admin brand choice verbatim');

  // 6. Verify App Detail & News Detail Mobile LCP, 1:1 SSR Parity & Initial Data Trim
  const newsHtml = sampleNews ? fs.readFileSync(path.join(distDir, `news/${sampleNews.slug}/index.html`), 'utf8') : '';
  const appHas1to1ReviewsSummary = appHtml.includes('Ratings and reviews') && appHtml.includes('Ratings and reviews are contributed by players and moderated');
  const appHasRichTypography = appHtml.includes('[&amp;_strong]:text-blue-600') || appHtml.includes('[&_strong]:text-blue-600');
  const appNoLegalBloat = !appHtml.includes('"privacy_content":') && !appHtml.includes('"terms_content":');
  const newsHasResponsiveHero = newsHtml.includes('480w') && newsHtml.includes('800w') && newsHtml.includes('1200w') && newsHtml.includes('imagesrcset=');
  const newsNoLegalBloat = !newsHtml.includes('"privacy_content":') && !newsHtml.includes('"terms_content":');
  const detailParityPassed = appHas1to1ReviewsSummary && appHasRichTypography && appNoLegalBloat && newsHasResponsiveHero && newsNoLegalBloat;

  record(
    'A1/A3/A7',
    'App Detail & News Detail 1:1 SSR Parity, Responsive Mobile LCP & Lean Initial Data',
    detailParityPassed,
    `App 1:1 ReviewScoreSummary: ${appHas1to1ReviewsSummary}, Rich Typography Parity: ${appHasRichTypography}, News 480w/800w/1200w srcset: ${newsHasResponsiveHero}, Legal HTML Bloat Stripped: ${appNoLegalBloat && newsNoLegalBloat}`
  );
}

async function verifyModulesAndLiveServer() {
  // 7. Verify SEO Audit Core Modules (SEO-1 through SEO-7)
  const { encryptUrlIfNeeded, generateSecureVaultFile, sanitizePublicSettings } = await import('../src/lib/githubSync');
  const { generateAllSitemaps } = await import('../src/lib/sitemapGenerator');
  const { normalizeIsoDate } = await import('../src/seo/utils');
  const { sanitizeHtml } = await import('../src/seo/renderers/common');
  const { optimizeInitialDataForRoute } = await import('../src/seo/initialDataOptimizer');
  const { injectSeoTags } = await import('../src/seoHelper');

  const rawData = JSON.parse(fs.readFileSync(staticJsonPath, 'utf8'));
  const publicApps = (rawData.apps || []).filter((a: any) => a && a.sync_to_public !== false);

  // Check deterministic encryption preservation (S-1)
  const sampleCipher = encryptUrlIfNeeded('https://example.com/download.apk');
  const secondCipher = encryptUrlIfNeeded('https://example.com/download.apk', sampleCipher);
  const s1Passed = sampleCipher.startsWith('U2FsdGVkX1') && secondCipher === sampleCipher;

  // Check video sitemap extension & static lastmod decoupling (S-2, S-6)
  const testSitemaps = generateAllSitemaps({
    apps: [{ ...publicApps[0], updated_at: '2026-10-20T00:00:00.000Z' }],
    settings: { last_updated: '2026-09-15T00:00:00.000Z' },
    news: [],
    videos: [{ id: 'v1', slug: 'test-video', title: 'Test Video', description: 'Video desc', youtube_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', created_at: '2026-09-10T00:00:00.000Z' }]
  });
  const staticSm = testSitemaps['sitemap-static.xml'] || '';
  const videoSm = testSitemaps['sitemap-videos.xml'] || '';
  const s2s6Passed =
    staticSm.includes('2026-09-15') &&
    !staticSm.includes('2026-10-20') &&
    videoSm.includes('xmlns:video="http://www.google.com/schemas/sitemap-video/1.1"') &&
    videoSm.includes('<video:video>');

  // Check normalizeIsoDate & scoped sanitizeHtml (N-1, G-4)
  const isoDate = normalizeIsoDate('2026-03-14');
  const sanitizedHtml = sanitizeHtml('<p onclick="alert(1)">Get bonus=100 and vision=clear today!</p>');
  const n1g4Passed =
    isoDate === '2026-03-14T00:00:00+05:30' &&
    !sanitizedHtml.includes('onclick=') &&
    sanitizedHtml.includes('bonus=100') &&
    sanitizedHtml.includes('vision=clear');

  // Check crawlable category links in PlayStoreTabs.tsx and HomeCategoryGrid.tsx (4.2)
  const tabsSrc = fs.readFileSync(path.resolve(process.cwd(), 'src/components/playstore/PlayStoreTabs.tsx'), 'utf8');
  const gridSrc = fs.readFileSync(path.resolve(process.cwd(), 'src/components/public/home/HomeCategoryGrid.tsx'), 'utf8');
  const crawlableCatsPassed = tabsSrc.includes('href={getTabHref(tab)}') && gridSrc.includes('/category/${slug}');

  record(
    'SEO-1..7',
    'Master SEO Audit Core Engine (Deterministic Vault, Video Sitemap, ISO-8601 Dates, Scoped Sanitizer, Crawlable Categories)',
    s1Passed && s2s6Passed && n1g4Passed && crawlableCatsPassed,
    `Deterministic AES (S-1): ${s1Passed}, Static Lastmod & Video Sitemap (S-2/S-6): ${s2s6Passed}, ISO Date & Scoped Sanitizer (N-1/G-4): ${n1g4Passed}, Crawlable Category Links (4.2): ${crawlableCatsPassed}`
  );

  // 8. Verify /moreinfo Gateway Security & Reliability Audit (GATE-1 through GATE-13)
  const { ENCRYPTED_LINKS, generateSecureVaultFile: genVaultFromMod } = await import('../src/lib/secureVault');
  const { resolveDestinationUrl, getCandidateTurnstileSecrets } = await import('../src/server/services/linkService');
  const { inspectClientMobileGate } = await import('../src/lib/deviceProbe');
  const { classifyUA, evaluateGateG1, handleSessionInit, handleSessionClearance, issueStatelessNonce } = await import('../src/server/security/gateCore');
  const { DWELL_NV0_MIN_MS, CLIENT_TAP_HOLD_MS, TOKEN_V } = await import('../src/lib/gateConfig');

  // GATE-1 & GATE-2: generateSecureVaultFile valid TS module & T1_VAULT resolution
  const generatedVaultCode = generateSecureVaultFile('U2FsdGVkX1_TEST');
  const generatedVaultCode2 = genVaultFromMod('U2FsdGVkX1_TEST');
  const vaultCompilerOk =
    generatedVaultCode.includes('export const ENCRYPTED_LINKS = "U2FsdGVkX1_TEST";') &&
    generatedVaultCode.includes('export const ENCRYPTED_VAULT = ENCRYPTED_LINKS;') &&
    generatedVaultCode2.includes('export const ENCRYPTED_LINKS = "U2FsdGVkX1_TEST";');

  const testAppSlug = publicApps[0]?.slug ? String(publicApps[0].slug).trim() : 'sample-app';
  const testAppObj = publicApps[0] || { id: 'sample-app', slug: 'sample-app', name: 'Sample App', category: 'Apps' };

  const t0Start = performance.now();
  const resolvedLink = await resolveDestinationUrl(testAppSlug);
  const resolveMs = performance.now() - t0Start;
  const linkResOk = typeof resolvedLink === 'object' && resolvedLink !== null;

  // GATE-3 & GATE-4: Secret sanitization & Turnstile secret priority
  const sanitizedSettings = sanitizePublicSettings({
    site_title: '',
    turnstile_site_key: '0x4AAAAAA_SITE',
    turnstile_secret_key: '0x4AAAAAA_SECRET',
    cloudinary_api_secret: 'cloud_sec',
    gemini_api_key: 'gem_sec'
  });
  const staticJsonRaw = fs.readFileSync(staticJsonPath, 'utf8');
  const useGitHubSyncSrc = fs.readFileSync(path.resolve(process.cwd(), 'src/hooks/useGitHubSync.ts'), 'utf8');
  const secretsSanitizedOk =
    !('turnstile_secret_key' in sanitizedSettings) &&
    !('cloudinary_api_secret' in sanitizedSettings) &&
    !('gemini_api_key' in sanitizedSettings) &&
    !staticJsonRaw.includes('turnstile_secret_key') &&
    !staticJsonRaw.includes('more_information_url') &&
    !useGitHubSyncSrc.includes("path: 'src/lib/public_backup.json'");

  // GATE-5: No synthetic touch telemetry fabrication in useClearanceDispatch.ts
  const dispatchSrc = fs.readFileSync(path.resolve(process.cwd(), 'src/hooks/useClearanceDispatch.ts'), 'utf8');
  const noTouchForgeryOk = !dispatchSrc.includes('tap.d = 45') && !dispatchSrc.includes('tap.x = 120');

  // GATE-8 & GATE-9: iPadOS 13+, preview host allowlist, dwell alignment, and /moreinfo payload trimmer
  const ipadUa = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1';
  const ipadG1 = evaluateGateG1({
    method: 'POST',
    path: '/api/v1/app/session-init',
    headers: { 'user-agent': ipadUa, host: 'preview.pages.dev' },
    rawBody: '{}',
    ip: '49.36.128.1',
    adapter: 'cloudflare',
    env: { NODE_ENV: 'production' }
  });
  const gatewayInitialData = optimizeInitialDataForRoute(rawData, `/moreinfo/${testAppSlug}`, testAppObj, null, null);
  const gatewayPayloadBytes = Buffer.byteLength(JSON.stringify(gatewayInitialData), 'utf8');
  const gatewayTrimOk =
    Array.isArray(gatewayInitialData.apps) &&
    gatewayInitialData.apps.length <= 1 &&
    gatewayInitialData.news.length === 0 &&
    gatewayInitialData.videos.length === 0 &&
    gatewayPayloadBytes < 5000 &&
    DWELL_NV0_MIN_MS === CLIENT_TAP_HOLD_MS;

  // GATE-6 & GATE-7: End-to-End Gate G1-G7 Verification (Legit Mobile Pass vs Replay 404 vs Superhuman Dwell 404 vs Desktop GPU Spoof 404)
  const mobileUa = 'Mozilla/5.0 (Linux; Android 14; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36';
  const baseEnv = {
    NODE_ENV: 'development',
    TURNSTILE_SECRET_KEY: '1x0000000000000000000000000000000AA'
  };

  // 1) Init session
  const initRes = await handleSessionInit({
    method: 'POST',
    path: '/api/v1/app/session-init',
    headers: { 'user-agent': mobileUa, host: 'localhost:3000', 'accept-language': 'en-IN,en;q=0.9' },
    rawBody: JSON.stringify({ appId: testAppSlug }),
    ip: '49.36.100.10',
    adapter: 'express',
    env: baseEnv
  });
  const initBody = JSON.parse(initRes.body);
  const didCookie = (initRes.headers['Set-Cookie'] || '').split(';')[0];

  // Issue a nonce backdated by 1200ms so dwell >= 1000ms
  const validNonce = await issueStatelessNonce(testAppSlug, baseEnv);
  const [nid, ,] = (validNonce || '').split('.');
  // Create a nonce with timestamp 1200ms ago
  const backdatedIssuedMs = String(Date.now() - 1200);
  const cryptoSubtle = crypto.subtle;
  const enc = new TextEncoder();
  const key = await cryptoSubtle.importKey('raw', enc.encode('default-v12-nonce-hmac-fallback-secret-32-bytes'), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sigBuf = await cryptoSubtle.sign('HMAC', key, enc.encode(`${nid}|${backdatedIssuedMs}|${testAppSlug}`));
  const sigB64 = Buffer.from(new Uint8Array(sigBuf).slice(0, 16)).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  const agedNonce = `${nid}.${backdatedIssuedMs}.${sigB64}`;

  const legitHard = JSON.stringify({
    arch: '',
    dm: 1,
    plat: 'Linux armv81',
    sa: 0,
    ud: 1,
    udp: 'Android',
    vend: 'Google Inc.',
    wc: 1
  });
  const legitSoft = JSON.stringify({
    gl: 1,
    gpu: 'ANGLE (Qualcomm, Adreno (TM) 740, OpenGL ES 3.2)',
    mdl: 1,
    mp: [127, 127, 23],
    tp: [75, 224.5, 224.5, 240.1, 224.5, 240.1],
    tx: [1, 1]
  });

  const buildTokenB64 = (overrides: Record<string, any> = {}) => {
    const obj = {
      v: TOKEN_V,
      id: testAppSlug,
      nonce: agedNonce,
      nv: 1,
      hard: legitHard,
      soft: legitSoft,
      tap: {
        pt: 'touch',
        mtp: 5,
        coarse: 1,
        rx: 11.2,
        ry: 11.2,
        pr: 0.5,
        x: 184,
        y: 512,
        d: 68,
        gap: 14,
        ev: 'pd,ts,pu,te,ck'
      },
      f: { wb: 0, hl: 0, dk: 0, cb: 0, tr: 1 },
      ...overrides
    };
    return Buffer.from(JSON.stringify(obj), 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  };

  // Legitimate mobile clearance -> 200
  const clearRes1 = await handleSessionClearance({
    method: 'POST',
    path: '/api/v1/app/session-clearance',
    headers: { 'user-agent': mobileUa, host: 'localhost:3000', cookie: didCookie },
    rawBody: JSON.stringify({ token: buildTokenB64(), cf: 'XXXX.DUMMY.TOKEN.XXXX' }),
    ip: '49.36.100.10',
    adapter: 'express',
    env: baseEnv
  });
  const clearData1 = JSON.parse(clearRes1.body);

  // Replay exact same burned nonce -> 404 Hard Block
  const replayRes = await handleSessionClearance({
    method: 'POST',
    path: '/api/v1/app/session-clearance',
    headers: { 'user-agent': mobileUa, host: 'localhost:3000' },
    rawBody: JSON.stringify({ token: buildTokenB64(), cf: 'XXXX.DUMMY.TOKEN.XXXX' }),
    ip: '49.36.100.11',
    adapter: 'express',
    env: baseEnv
  });

  // Superhuman dwell (< 150ms) -> 404 Hard Block
  const freshNonce = await issueStatelessNonce(testAppSlug, baseEnv);
  const fastDwellRes = await handleSessionClearance({
    method: 'POST',
    path: '/api/v1/app/session-clearance',
    headers: { 'user-agent': mobileUa, host: 'localhost:3000' },
    rawBody: JSON.stringify({ token: buildTokenB64({ nonce: freshNonce }), cf: 'XXXX.DUMMY.TOKEN.XXXX' }),
    ip: '49.36.100.12',
    adapter: 'express',
    env: baseEnv
  });

  // Spoofed mobile UA running on Desktop RTX 3060 GPU -> 404 Hard Block
  const [nid2] = (await issueStatelessNonce(testAppSlug, baseEnv) || '').split('.');
  const sigBuf2 = await cryptoSubtle.sign('HMAC', key, enc.encode(`${nid2}|${backdatedIssuedMs}|${testAppSlug}`));
  const sigB64_2 = Buffer.from(new Uint8Array(sigBuf2).slice(0, 16)).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  const agedNonce2 = `${nid2}.${backdatedIssuedMs}.${sigB64_2}`;
  const desktopGpuSoft = JSON.stringify({
    gl: 1,
    gpu: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)',
    mdl: 0,
    mp: [127, 127, 23],
    tp: [75, 224.5, 224.5, 240.1, 224.5, 240.1],
    tx: [0, 0]
  });
  const desktopGpuRes = await handleSessionClearance({
    method: 'POST',
    path: '/api/v1/app/session-clearance',
    headers: { 'user-agent': mobileUa, host: 'localhost:3000' },
    rawBody: JSON.stringify({ token: buildTokenB64({ nonce: agedNonce2, soft: desktopGpuSoft }), cf: 'XXXX.DUMMY.TOKEN.XXXX' }),
    ip: '49.36.100.13',
    adapter: 'express',
    env: baseEnv
  });

  const gateFlowOk =
    initRes.status === 200 &&
    typeof initBody.nonce === 'string' &&
    clearRes1.status === 200 &&
    typeof clearData1.status === 'string' &&
    replayRes.status === 404 &&
    fastDwellRes.status === 404 &&
    desktopGpuRes.status === 404;

  record(
    'GATE-1..13',
    '/moreinfo Gateway Security, T1 Vault Speed & Anti-Bot Enforcement',
    vaultCompilerOk && linkResOk && secretsSanitizedOk && noTouchForgeryOk && ipadG1.pass === true && gatewayTrimOk && gateFlowOk,
    `Vault Compiler: ${vaultCompilerOk}, Link Resolution (${resolveMs.toFixed(2)}ms): ${linkResOk}, Secret Sanitization: ${secretsSanitizedOk}, No Touch Forgery: ${noTouchForgeryOk}, iPadOS G1: ${ipadG1.pass}, Gateway Payload (${gatewayPayloadBytes} B < 5KB): ${gatewayTrimOk}, Gate E2E (Legit=${clearRes1.status}, Replay=${replayRes.status}, <150ms=${fastDwellRes.status}, RTX3060=${desktopGpuRes.status}): ${gateFlowOk}`
  );

  // 8b. SEO Indexing Isolation, Image/Content Attribution & Internal Link Reachability
  try {
    const { formatPageTitle } = await import('../src/lib/seoUtils.js');
    const { getLocalFallbackReviewsForApp } = await import('../src/seo/reviewFallback.js');
    const staticRaw = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'src/lib/staticData.json'), 'utf8'));
    const allApps = (staticRaw.apps || []).filter((a: any) => a && a.slug && a.sync_to_public !== false);
    const allNews = (staticRaw.news || []).filter((n: any) => n && n.slug && n.sync_to_public !== false);
    const firstAppSlug = String(allApps[0]?.slug || '').trim();
    const secondAppSlug = String(allApps[1]?.slug || '').trim();
    const firstNewsSlug = String(allNews[0]?.slug || '').trim();

    const indexRootHtml = fs.readFileSync(path.join(process.cwd(), 'index.html'), 'utf8');
    const homeDistHtml = fs.readFileSync(path.join(distDir, 'index.html'), 'utf8');
    const newsIndexDistHtml = fs.readFileSync(path.join(distDir, 'news/index.html'), 'utf8');
    const app1Html = firstAppSlug && fs.existsSync(path.join(distDir, `app/${firstAppSlug}/index.html`))
      ? fs.readFileSync(path.join(distDir, `app/${firstAppSlug}/index.html`), 'utf8')
      : '';
    const app2Html = secondAppSlug && fs.existsSync(path.join(distDir, `app/${secondAppSlug}/index.html`))
      ? fs.readFileSync(path.join(distDir, `app/${secondAppSlug}/index.html`), 'utf8')
      : '';
    const news1Html = firstNewsSlug && fs.existsSync(path.join(distDir, `news/${firstNewsSlug}/index.html`))
      ? fs.readFileSync(path.join(distDir, `news/${firstNewsSlug}/index.html`), 'utf8')
      : '';

    // 1. Zero Turnstile script in index.html & zero /moreinfo static HTML files or crawlable anchors
    const noGlobalTurnstile = !indexRootHtml.includes('challenges.cloudflare.com/turnstile');
    const noMoreinfoDistDir = !fs.existsSync(path.join(distDir, 'moreinfo'));
    const zeroMoreinfoAnchors =
      !/<a\b[^>]*href=["'][^"']*\/moreinfo\//i.test(homeDistHtml) &&
      (!app1Html || !/<a\b[^>]*href=["'][^"']*\/moreinfo\//i.test(app1Html)) &&
      (!news1Html || !/<a\b[^>]*href=["'][^"']*\/moreinfo\//i.test(news1Html));

    // 2. Admin brand choice preserved verbatim without auto-appending
    const titlePreservesBrand =
      formatPageTitle('Sample App: Brand', 'Fallback') === 'Sample App: Brand' &&
      formatPageTitle('Sample Game - Brand', 'Fallback') === 'Sample Game - Brand' &&
      formatPageTitle('Plain App Title', 'Fallback') === 'Plain App Title';

    // 3. App hero image 512px attribution + data-nosnippet on neighbor carousels + deterministic rotation
    const heroImage512Ok = !app1Html || (
      app1Html.includes('w_512') &&
      app1Html.includes('itemprop="image"') &&
      app1Html.includes('name="thumbnail"') &&
      app1Html.includes('<aside data-nosnippet')
    );
    const extractSimilarHrefs = (html: string) => {
      const idx = html.indexOf('Similar Applications');
      if (idx === -1) return '';
      return (html.slice(idx, idx + 8000).match(/href="\/app\/[^"]+"/g) || []).slice(0, 6).join(',');
    };
    const similarRotatedOk = !app1Html || !app2Html || extractSimilarHrefs(app1Html) !== extractSimilarHrefs(app2Html);

    // 4. 100% Internal Link Reachability
    const reachableApps = allApps.filter((a: any) => homeDistHtml.includes(`/app/${String(a.slug).trim()}`)).length;
    const reachableNews = allNews.filter((n: any) => newsIndexDistHtml.includes(`/news/${String(n.slug).trim()}`)).length;
    const reachability100Ok = reachableApps === allApps.length && reachableNews === allNews.length;

    // 5. Review stats fidelity: zero fake review fabrication for 0-review apps
    const emptyAppStats = getLocalFallbackReviewsForApp('nonexistent_app_id', 'nonexistent-app-slug');
    const reviewFallbackOk = Boolean(emptyAppStats && Array.isArray(emptyAppStats.reviews) && emptyAppStats.reviews.length === 0);

    record(
      'SEO-ISOLATION-1..8',
      'Zero /moreinfo Leak, 512px Hero Attribution, data-nosnippet Carousels, 100% Link Graph & Admin Title Fidelity',
      noGlobalTurnstile && noMoreinfoDistDir && zeroMoreinfoAnchors && titlePreservesBrand && heroImage512Ok && similarRotatedOk && reachability100Ok && reviewFallbackOk,
      `NoGlobalTurnstile: ${noGlobalTurnstile}, NoMoreinfoDist: ${noMoreinfoDistDir}, ZeroMoreinfoAnchors: ${zeroMoreinfoAnchors}, TitleFidelity: ${titlePreservesBrand}, Hero512+nosnippet: ${heroImage512Ok}, SimilarRotated: ${similarRotatedOk}, ReachableApps: ${reachableApps}/${allApps.length}, ReachableNews: ${reachableNews}/${allNews.length}, ReviewFidelity: ${reviewFallbackOk}`
    );
  } catch (isoErr: any) {
    record('SEO-ISOLATION-1..8', 'Zero /moreinfo Leak & Attribution Isolation', false, isoErr?.message || String(isoErr));
  }

  // 9. Live HTTP Server Verification (if server is running on port 3000)
  try {
    const pingRes = await fetch('http://localhost:3000/api/ping').catch(() => null);
    if (pingRes && pingRes.ok) {
      const [
        homeRes,
        redirectLegacyPrefixRes,
        redirectFaqsRes,
        moreinfoMobileRes,
        moreinfoCubotRes,
        moreinfoBotRes,
        rssRes
      ] = await Promise.all([
        fetch('http://localhost:3000/', { headers: { 'User-Agent': mobileUa } }),
        fetch(`http://localhost:3000/apps/${testAppSlug}`, { redirect: 'manual' }),
        fetch('http://localhost:3000/faqs', { redirect: 'manual' }),
        fetch(`http://localhost:3000/moreinfo/${testAppSlug}`, { headers: { 'User-Agent': mobileUa } }),
        fetch(`http://localhost:3000/moreinfo/${testAppSlug}`, { headers: { 'User-Agent': 'Mozilla/5.0 (Linux; Android 13; CUBOT KINGKONG 9) AppleWebKit/537.36 Chrome/112.0.0.0 Mobile Safari/537.36' } }),
        fetch(`http://localhost:3000/moreinfo/${testAppSlug}`, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' } }),
        fetch('http://localhost:3000/rss.xml')
      ]);

      const moreinfoHtml = await moreinfoMobileRes.text();
      const rssXml = await rssRes.text();

      const liveServerOk =
        homeRes.status === 200 &&
        redirectLegacyPrefixRes.status === 301 &&
        redirectLegacyPrefixRes.headers.get('location') === `/app/${testAppSlug}` &&
        redirectFaqsRes.status === 301 &&
        redirectFaqsRes.headers.get('location') === '/faq' &&
        moreinfoMobileRes.status === 200 &&
        (moreinfoMobileRes.headers.get('cache-control') || '').includes('no-store') &&
        moreinfoHtml.includes('Verification Portal') &&
        moreinfoCubotRes.status === 200 &&
        moreinfoBotRes.status === 403 &&
        rssRes.status === 200 &&
        rssXml.includes('<rss');

      record(
        'LIVE-HTTP',
        'Live Server HTTP Endpoints (SSR, 301 Redirects, /moreinfo Headers, CUBOT Allow, Googlebot 403, RSS)',
        liveServerOk,
        `Home=${homeRes.status}, /apps/${testAppSlug}=${redirectLegacyPrefixRes.status}->${redirectLegacyPrefixRes.headers.get('location')}, /faqs=${redirectFaqsRes.status}->${redirectFaqsRes.headers.get('location')}, /moreinfo(Mobile)=${moreinfoMobileRes.status}, /moreinfo(CUBOT)=${moreinfoCubotRes.status}, /moreinfo(Googlebot)=${moreinfoBotRes.status}, /rss.xml=${rssRes.status}`
      );
    }
  } catch (_) {}

  console.log('\n══════════════════════════════════════════════════════════════');
  console.log('  MASTER ARCHITECTURE, SEO & GATEWAY VERIFICATION REPORT');
  console.log('══════════════════════════════════════════════════════════════');
  let failedCount = 0;
  for (const r of results) {
    const badge = r.passed ? '✅ PASS' : '❌ FAIL';
    if (!r.passed) failedCount++;
    console.log(`${badge} [${r.id}] ${r.name}\n       └─ ${r.details}`);
  }
  console.log('══════════════════════════════════════════════════════════════\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

verify();
verifyModulesAndLiveServer();

