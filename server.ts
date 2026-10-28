import express from 'express';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import fs from 'fs';

import { injectSeoTags, fetchStoreData, resolveAppSlug, cleanRootContainer } from './src/seoHelper';
import { adminAuthRouter } from './src/server/routes/adminAuthRoutes';
import { communityRouter } from './src/server/routes/communityRoutes';
import { reportRouter } from './src/server/routes/reportRoutes';
import { githubSyncRouter } from './src/server/routes/githubSyncRoutes';
import { seoRouter } from './src/server/routes/seoRoutes';
import { adminVaultRouter } from './src/server/routes/adminVaultRoutes';
import { publicApiRouter } from './src/server/routes/publicApiRoutes';
import { securityRouter } from './src/server/routes/securityRoutes';
import uploadRouter from './src/server/routes/uploadRoutes';

async function startServer() {
  const app = express();
  const PORT = process.env.NODE_ENV === 'production' && process.env.PORT ? Number(process.env.PORT) : 3000;

  app.set('trust proxy', 1);

  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://challenges.cloudflare.com", "https://res.cloudinary.com", "https://static.cloudflareinsights.com"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
        imgSrc: ["'self'", "data:", "blob:", "https://res.cloudinary.com", "https://i.ytimg.com", "https://img.youtube.com", "https://*.googleusercontent.com", "https://challenges.cloudflare.com"],
        mediaSrc: ["'self'", "blob:", "https://res.cloudinary.com"],
        frameSrc: ["'self'", "https://challenges.cloudflare.com", "https://www.youtube-nocookie.com", "https://www.youtube.com"],
        connectSrc: ["'self'", "https://api.github.com", "https://res.cloudinary.com", "https://api.cloudinary.com", "https://challenges.cloudflare.com", "https://firestore.googleapis.com", "https://*.firebaseio.com", "https://identitytoolkit.googleapis.com", "https://cloudflareinsights.com", "https://generativelanguage.googleapis.com"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        frameAncestors: ["'self'", "https://aistudio.google.com", "https://*.google.com", "https://*.run.app"]
      }
    },
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false,
    crossOriginResourcePolicy: false,
    hsts: { maxAge: 63072000, includeSubDomains: true, preload: true },
    frameguard: false,
    xssFilter: true,
    noSniff: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
  }));
  app.use((req, res, next) => {
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    next();
  });

  app.use(compression({
    threshold: 256,
    level: 9,
    memLevel: 9,
    filter: (req, res) => {
      if (req.headers['x-no-compression']) {
        return false;
      }
      return compression.filter(req, res);
    }
  }));
  app.use(cookieParser());
  const configuredDomain = (process.env.PUBLIC_DOMAIN || process.env.VITE_PUBLIC_DOMAIN || '').trim().replace(/\/+$/, '');
  let allowedOrigins: boolean | string[] = true;
  if (process.env.NODE_ENV === 'production' && configuredDomain) {
    try {
      const parsed = new URL(configuredDomain.startsWith('http') ? configuredDomain : `https://${configuredDomain}`);
      const bareHost = parsed.hostname.replace(/^www\./, '');
      allowedOrigins = [
        `https://${bareHost}`,
        `https://www.${bareHost}`,
        `https://admin.${bareHost}`,
      ];
    } catch {
      allowedOrigins = true;
    }
  }
  app.use(cors({
    origin: allowedOrigins,
    credentials: true,
  }));

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // AES_SECRET verification for secure link flow
  if (!process.env.AES_SECRET && process.env.NODE_ENV === "production") {
    console.warn("[SECURITY] AES_SECRET environment variable is not set. Using secure internal fallback secret.");
  }

  // Request logger
  app.use((req, res, next) => {
    if (req.originalUrl.startsWith('/api/')) {
      
    }
    next();
  });

  // Admin routes anti-caching middleware
  app.use('/api/v1/admin', (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    next();
  });

  // 301 Redirect non-www -> www when PUBLIC_DOMAIN uses www.
  app.use((req, res, next) => {
    const host = (req.headers['x-forwarded-host'] as string || req.get('host') || '').split(',')[0].trim();
    if (configuredDomain && host) {
      try {
        const parsed = new URL(configuredDomain.startsWith('http') ? configuredDomain : `https://${configuredDomain}`);
        if (parsed.hostname.startsWith('www.')) {
          const bareHost = parsed.hostname.replace(/^www\./, '');
          if (host === bareHost) {
            return res.redirect(301, `${parsed.protocol}//${parsed.hostname}${req.originalUrl}`);
          }
        }
      } catch {
        // ignore invalid URL
      }
    }
    next();
  });

  // Cloudflare Email Protection 301 redirect (eliminates crawler 404 broken links when emails are obfuscated)
  app.get(['/cdn-cgi/l/email-protection', '/cdn-cgi/l/email-protection/*'], (req, res) => {
    res.redirect(301, '/contact');
  });

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Ultra-lightweight keep-warm ping endpoint (0 database hits, keeps serverless microVM hot 24/7)
  app.get("/api/ping", (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.json({ status: "pong", region: "bom1", timestamp: new Date().toISOString() });
  });

  // Agentic Browsing & ARD (Agent Resource Discovery) endpoints
  const serveAiCatalog = (req: express.Request, res: express.Response) => {
    const catalogPath = path.join(process.cwd(), 'public', 'ai-catalog.json');
    if (fs.existsSync(catalogPath)) {
      res.setHeader('Content-Type', 'application/ai-catalog+json; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      return res.sendFile(catalogPath);
    }
    res.status(404).json({ error: 'ai-catalog not found' });
  };
  app.get('/ai-catalog.json', serveAiCatalog);
  app.get('/.well-known/ai-catalog.json', serveAiCatalog);

  // Mount API & SEO Routes
  app.use(seoRouter);
  app.use(adminAuthRouter);
  app.use(communityRouter);
  app.use(reportRouter);
  app.use(githubSyncRouter);
  app.use(adminVaultRouter);
  app.use(securityRouter);
  app.use(publicApiRouter);
  app.use(uploadRouter);

  // Roadblocks
  ["/api/v1/user", "/api/v1/auth", "/api/v1/config"].forEach(pathway => {
    app.all(pathway, (req, res) => {
      res.status(404).send("Not Found");
    });
  });

  // Vite middleware for development or Static Assets for production
  let viteDevServer: any = null;
  if (process.env.NODE_ENV !== "production") {
    try {
      const { createServer: createViteServer } = await import("vite");
      viteDevServer = await createViteServer({
        server: {
          middlewareMode: true,
          hmr: false,
          watch: {
            ignored: [
              '**/.data/**',
              '**/aiStudioBrain.json',
              '**/staticData.json',
              '**/staticData.ts',
              '**/communityStaticReviews.json',
              '**/communityCatalogStats.json',
              '**/secureVault.ts',
              '**/public/sitemap*.xml*',
              '**/public/site.webmanifest',
              '**/*.log',
              '**/server_requests.log'
            ]
          }
        },
        appType: "custom",
      });
      app.use(viteDevServer.middlewares);
    } catch (e) {
      console.error("Failed to initialize Vite middleware:", e);
    }
  }

  const getDistPath = (): string => {
    const pathsToTry = [
      path.join(process.cwd(), 'dist'),
      path.resolve(__dirname, 'dist'),
      path.resolve(__dirname, '..', 'dist'),
      __dirname
    ];
    for (const p of pathsToTry) {
      if (fs.existsSync(path.join(p, 'index.html'))) {
        return p;
      }
    }
    return path.join(process.cwd(), 'dist');
  };
  const distPath = getDistPath();

  if (process.env.NODE_ENV === "production") {
    // 1. Direct streaming of pre-compressed Brotli & Gzip assets for maximum Pingdom & Lighthouse scores
    app.get(/^\/assets\/(.+)$/, (req, res, next) => {
      const assetFile = req.params[0];
      const filePath = path.join(distPath, 'assets', assetFile);
      const acceptEncoding = (req.headers['accept-encoding'] as string || '').toLowerCase();
      const farFuture = new Date(Date.now() + 31536000000).toUTCString();

      const ext = path.extname(assetFile).toLowerCase();
      let mimeType = 'application/octet-stream';
      if (ext === '.js') mimeType = 'application/javascript; charset=utf-8';
      else if (ext === '.css') mimeType = 'text/css; charset=utf-8';
      else if (ext === '.json') mimeType = 'application/json; charset=utf-8';
      else if (ext === '.svg') mimeType = 'image/svg+xml';
      else if (ext === '.png') mimeType = 'image/png';
      else if (ext === '.webp') mimeType = 'image/webp';
      else if (ext === '.ico') mimeType = 'image/x-icon';

      if (acceptEncoding.includes('br') && fs.existsSync(`${filePath}.br`)) {
        res.set({
          'Content-Type': mimeType,
          'Content-Encoding': 'br',
          'Vary': 'Accept-Encoding',
          'Cache-Control': 'public, max-age=31536000, immutable',
          'Expires': farFuture
        });
        return fs.createReadStream(`${filePath}.br`).pipe(res);
      }

      if (acceptEncoding.includes('gzip') && fs.existsSync(`${filePath}.gz`)) {
        res.set({
          'Content-Type': mimeType,
          'Content-Encoding': 'gzip',
          'Vary': 'Accept-Encoding',
          'Cache-Control': 'public, max-age=31536000, immutable',
          'Expires': farFuture
        });
        return fs.createReadStream(`${filePath}.gz`).pipe(res);
      }

      next();
    });

    app.use('/assets', express.static(path.join(distPath, 'assets'), {
      maxAge: '1y',
      immutable: true,
      fallthrough: true,
      setHeaders: (res) => {
        const farFuture = new Date(Date.now() + 31536000000).toUTCString();
        res.setHeader('Expires', farFuture);
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        res.setHeader('Vary', 'Accept-Encoding');
      }
    }));

    app.use(express.static(distPath, {
      maxAge: '1y',
      etag: true,
      lastModified: true,
      index: false,
      redirect: false,
      setHeaders: (res, filePath) => {
        const farFuture = new Date(Date.now() + 31536000000).toUTCString();
        res.setHeader('Expires', farFuture);
        res.setHeader('Vary', 'Accept-Encoding');
        if (filePath.endsWith('.html')) {
          const normPath = filePath.replace(/\\/g, '/').toLowerCase();
          const isNoIndexStatic =
            normPath.includes('/moreinfo/') ||
            normPath.includes('/gateway/') ||
            normPath.includes('/download/') ||
            normPath.includes('/info/') ||
            normPath.includes('/moredetail/') ||
            normPath.includes('/admin/') ||
            normPath.includes('/safety');
          if (isNoIndexStatic) {
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private, max-age=0');
            res.setHeader('CDN-Cache-Control', 'no-store, private');
            res.setHeader('Cloudflare-CDN-Cache-Control', 'no-store, private');
          } else {
            res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400');
          }
          res.setHeader(
            'X-Robots-Tag',
            isNoIndexStatic
              ? 'noindex, nofollow, noarchive, nosnippet'
              : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'
          );
        } else {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
      }
    }));
  }

  let cachedIndexHtml: string | null = null;

  app.get('*', async (req, res, next) => {
    if (req.originalUrl.match(/\.(php|env|yml|yaml|ini|conf|log|sql|tar|gz|zip|bak|git|rsa)$/i) || req.originalUrl.includes('/etc/') || req.originalUrl.includes('/proc/') || req.originalUrl.includes('../') || req.originalUrl.includes('/.aws/')) {
      return res.status(404).type('text/plain').send('Not found');
    }

    // Pass non-HTML requests in dev mode to next/vite middleware
    const reqPath = req.path || req.originalUrl.split('?')[0];
    if (process.env.NODE_ENV !== "production" && (
      req.originalUrl.includes('/@') || 
      req.originalUrl.includes('/node_modules/') || 
      reqPath.startsWith('/src/') ||
      reqPath.match(/\.(js|ts|tsx|jsx|css|json|png|jpg|jpeg|gif|svg|ico|webp|woff|woff2|ttf|eot|map)$/i)
    )) {
      return next();
    }

    // In production, if an API request or static asset request reaches this catch-all, return a proper 404 instead of 50KB+ HTML
    if (req.originalUrl.startsWith('/api/')) {
      return res.status(404).json({ error: 'API endpoint not found' });
    }

    if (req.originalUrl.startsWith('/assets/') || reqPath.match(/\.(js|css|json|png|jpg|jpeg|gif|svg|ico|webp|woff|woff2|ttf|eot|map|webmanifest|txt|xml)$/i)) {
      return res.status(404).type('text/plain').send('File not found');
    }

    const rawPath = req.originalUrl.split('?')[0];
    const pathLower = rawPath.toLowerCase();

    // 1. Bot & Crawler Shield: Block web crawlers, spiders, and scrapers from accessing sensitive gateway / moreinfo paths
    const isGatewayPath = pathLower.startsWith('/moreinfo/') ||
      pathLower.startsWith('/info/') ||
      pathLower.startsWith('/gateway/') ||
      pathLower.startsWith('/download/') ||
      pathLower.startsWith('/moredetail/') ||
      pathLower.startsWith('/s/') ||
      pathLower.startsWith('/dl/') ||
      pathLower.startsWith('/out/');

    const userAgent = req.headers['user-agent'] || '';
    const isBotCrawler = /googlebot|bingbot|slurp|duckduckbot|baiduspider|yandexbot|sogou|exabot|facebot|facebookexternalhit|ia_archiver|semrushbot|ahrefsbot|mj12bot|dotbot|bytespider|applebot|gptbot|chatgpt-user|claudebot|perplexitybot|ccbot|petalbot|criteobot|\bbot\b|crawler|spider|scraper|headlesschrome/i.test(userAgent);

    if (isGatewayPath && isBotCrawler) {
      return res.status(403).set({
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Robots-Tag': 'noindex, nofollow, noarchive, nosnippet, noimageindex, notranslate',
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0'
      }).send('Access Forbidden for automated crawlers.');
    }

    // 2. Canonicalize trailing slashes (e.g. /app/sample-app/ -> /app/sample-app) except root
    if (rawPath.length > 1 && rawPath.endsWith('/')) {
      const query = req.originalUrl.includes('?') ? '?' + req.originalUrl.split('?')[1] : '';
      return res.redirect(301, rawPath.replace(/\/+$/, '') + query);
    }

    // 2.1 Permanent 301 Redirect old blog paths to home
    if (pathLower === '/blogs' || pathLower === '/blog' || pathLower.startsWith('/blogs/') || pathLower.startsWith('/blog/')) {
      res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet');
      return res.redirect(301, '/');
    }

    // 2.2 Canonical 301 Redirect /developer to /developers
    if (pathLower === '/developer' || pathLower === '/developer/') {
      const query = req.originalUrl.includes('?') ? '?' + req.originalUrl.split('?')[1] : '';
      return res.redirect(301, '/developers' + query);
    }
    if (pathLower.startsWith('/developer/')) {
      const rest = rawPath.substring('/developer/'.length);
      const query = req.originalUrl.includes('?') ? '?' + req.originalUrl.split('?')[1] : '';
      return res.redirect(301, '/developers/' + rest + query);
    }

    // 2.3 Canonical 301 Redirect /faqs to /faq and legacy app prefixes (/apps/, /game/, /apk/) to /app/
    if (pathLower === '/faqs' || pathLower === '/faqs/') {
      const query = req.originalUrl.includes('?') ? '?' + req.originalUrl.split('?')[1] : '';
      return res.redirect(301, '/faq' + query);
    }
    if (pathLower.startsWith('/apps/') || pathLower.startsWith('/game/') || pathLower.startsWith('/apk/')) {
      const rest = rawPath.replace(/^\/(apps|game|apk)\//i, '').replace(/^\/+|\/+$/g, '');
      const query = req.originalUrl.includes('?') ? '?' + req.originalUrl.split('?')[1] : '';
      if (rest) {
        return res.redirect(301, `/app/${rest}${query}`);
      }
    }

    // 2.4 Canonical 301 Redirect for fuzzy/alias /app/:slug URLs (e.g. /app/instagram-apk -> /app/instagram)
    if (pathLower.startsWith('/app/')) {
      const requestedAppSlug = rawPath.substring('/app/'.length).replace(/^\/+|\/+$/g, '');
      if (requestedAppSlug && !requestedAppSlug.includes('/')) {
        try {
          const storeData = await fetchStoreData();
          const resolvedApp = resolveAppSlug(requestedAppSlug, storeData.apps || []);
          const canonicalSlug = resolvedApp ? String(resolvedApp.slug || resolvedApp.id || '').trim().replace(/^\/+|\/+$/g, '') : '';
          if (canonicalSlug && canonicalSlug.toLowerCase() !== requestedAppSlug.toLowerCase()) {
            const query = req.originalUrl.includes('?') ? '?' + req.originalUrl.split('?')[1] : '';
            return res.redirect(301, `/app/${canonicalSlug}${query}`);
          }
        } catch (_) {}
      }
    }

    // 3. Handle root-level single slugs (e.g. /sample-app -> 301 to canonical /app/sample-app)
    const cleanSegment = rawPath.replace(/^\/+|\/+$/g, '').toLowerCase();
    const knownTopLevelRoutes = new Set([
      '',
      'new-apps',
      'news',
      'videos',
      'developers',
      'developer',
      'about',
      'contact',
      'privacy',
      'terms',
      'disclaimer',
      'notice',
      'ethics',
      'responsibility',
      'report-removal',
      'faq',
      'faqs',
      'safety',
      'safety-status',
      'moreinfo',
      'info',
      'gateway',
      'download',
      'moredetail',
      's',
      'dl',
      'out',
      'category',
      'categories',
      'sitemap.xml',
      'sitemap_index.xml',
      'sitemap-index.xml',
      'sitemapindex.xml',
      'sitemap-apps.xml',
      'sitemap_apps.xml',
      'sitemap-app.xml',
      'sitemap_app.xml',
      'sitemap-categories.xml',
      'sitemap_categories.xml',
      'sitemap-category.xml',
      'sitemap_category.xml',
      'sitemap-static.xml',
      'sitemap_static.xml',
      'sitemap-pages.xml',
      'sitemap_pages.xml',
      'sitemap-news.xml',
      'sitemap_news.xml',
      'sitemap-posts.xml',
      'sitemap_posts.xml',
      'sitemap-videos.xml',
      'sitemap_videos.xml',
      'sitemap-developers.xml',
      'sitemap_developers.xml',
      'robots.txt',
      'rss.xml',
      'opensearch.xml',
      'site.webmanifest',
      'favicon.ico',
      'wp-admin',
      'dashboard',
      'panel',
      'login',
      'masterworld'
    ]);

    if (
      cleanSegment &&
      !cleanSegment.includes('/') &&
      !knownTopLevelRoutes.has(cleanSegment) &&
      !pathLower.startsWith('/app/') &&
      !pathLower.startsWith('/category/') &&
      !pathLower.startsWith('/categories/') &&
      !pathLower.startsWith('/s/') &&
      !pathLower.startsWith('/news/') &&
      !pathLower.startsWith('/videos/') &&
      !pathLower.startsWith('/admin')
    ) {
      try {
        const storeData = await fetchStoreData();
        const resolvedApp = resolveAppSlug(cleanSegment, storeData.apps || []);
        if (resolvedApp && (resolvedApp.slug || resolvedApp.id)) {
          return res.redirect(301, `/app/${resolvedApp.slug || resolvedApp.id}`);
        }

        const newsItem = (storeData.news || []).find((n: any) => n.slug?.toLowerCase() === cleanSegment);
        if (newsItem && newsItem.slug) {
          return res.redirect(301, `/news/${newsItem.slug}`);
        }

        const videoItem = (storeData.videos || []).find((v: any) => v.slug?.toLowerCase() === cleanSegment);
        if (videoItem && videoItem.slug) {
          return res.redirect(301, `/videos/${videoItem.slug}`);
        }
      } catch (err) {
        console.warn('[SERVER REDIRECT] Error resolving slug:', err);
      }
    }

    // 1. Dedicated handling for Admin SPA routes: deliver clean SPA HTML with zero public website SSR
    const envAdminPath = (process.env.ADMIN_PATH || process.env.VITE_ADMIN_PATH || 'admin').toLowerCase().trim();
    const isAdminRoute = pathLower.startsWith('/admin') ||
      pathLower.startsWith('/masterworld') ||
      pathLower.startsWith('/' + envAdminPath) ||
      pathLower === '/login' ||
      pathLower.startsWith('/login/');

    if (isAdminRoute) {
      let adminTemplate = '';
      const spaTemplatePath = path.join(distPath, 'template.html');
      const indexSpaPath = path.join(distPath, 'index.spa.html');

      if (process.env.NODE_ENV !== "production") {
        adminTemplate = fs.readFileSync(path.join(process.cwd(), 'index.html'), 'utf-8');
      } else if (fs.existsSync(spaTemplatePath)) {
        adminTemplate = fs.readFileSync(spaTemplatePath, 'utf-8');
      } else if (fs.existsSync(indexSpaPath)) {
        adminTemplate = fs.readFileSync(indexSpaPath, 'utf-8');
      } else if (fs.existsSync(path.join(distPath, 'index.html'))) {
        adminTemplate = cleanRootContainer(fs.readFileSync(path.join(distPath, 'index.html'), 'utf-8'));
      } else {
        adminTemplate = fs.readFileSync(path.join(process.cwd(), 'index.html'), 'utf-8');
      }

      if (viteDevServer) {
        try {
          adminTemplate = await viteDevServer.transformIndexHtml(req.originalUrl, adminTemplate);
        } catch (_) {}
      }

      adminTemplate = cleanRootContainer(adminTemplate);
      const siteName = (process.env.VITE_SITE_NAME || '').trim();
      const adminTitle = siteName ? `Admin Portal - ${siteName}` : 'Admin Portal';
      adminTemplate = adminTemplate
        .replace(/<title>[\s\S]*?<\/title>/gi, `<title>${adminTitle}</title>`)
        .replace(/<meta\s+[^>]*name=["']robots["'][^>]*\/?>/gi, '')
        .replace('</head>', '<meta name="robots" content="noindex, nofollow" />\n</head>');

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
      return res.send(adminTemplate);
    }

    // 2. Resolve clean base template for dynamic SSR injection (never pass pre-rendered content as template)
    let template = '';
    const spaTemplatePath = path.join(distPath, 'template.html');
    const indexSpaPath = path.join(distPath, 'index.spa.html');

    if (process.env.NODE_ENV !== "production") {
      template = fs.readFileSync(path.join(process.cwd(), 'index.html'), 'utf-8');
    } else if (fs.existsSync(spaTemplatePath)) {
      template = fs.readFileSync(spaTemplatePath, 'utf-8');
    } else if (fs.existsSync(indexSpaPath)) {
      template = fs.readFileSync(indexSpaPath, 'utf-8');
    } else if (fs.existsSync(path.join(distPath, 'index.html'))) {
      template = cleanRootContainer(fs.readFileSync(path.join(distPath, 'index.html'), 'utf-8'));
    } else {
      template = fs.readFileSync(path.join(process.cwd(), 'index.html'), 'utf-8');
    }

    // Guarantee <div id="root"></div> is 100% empty
    template = cleanRootContainer(template);

    try {

      if (viteDevServer) {
        try {
          template = await viteDevServer.transformIndexHtml(req.originalUrl, template);
          // Inject a bulletproof fallback for React Refresh to prevent blank screen crashes
          // if the /@react-refresh virtual module fails to load due to middleware ordering.
          if (!template.includes('__vite_plugin_react_preamble_installed__') && !template.includes('@react-refresh')) {
            const fallbackScript = `<script type="module">
              try {
                const RefreshRuntime = (await import('/@react-refresh')).default;
                RefreshRuntime.injectIntoGlobalHook(window);
                window.$RefreshReg$ = () => {};
                window.$RefreshSig$ = () => (type) => type;
                window.__vite_plugin_react_preamble_installed__ = true;
              } catch (e) {
                window.$RefreshReg$ = window.$RefreshReg$ || function() {};
                window.$RefreshSig$ = window.$RefreshSig$ || function() { return function(type) { return type; }; };
                window.__vite_plugin_react_preamble_installed__ = true;
              }
            </script>`;
            if (template.includes('<head>')) {
              template = template.replace('<head>', '<head>' + fallbackScript);
            } else {
              template = fallbackScript + template;
            }
          }
        } catch (e) {
          console.warn("Vite transformIndexHtml failed:", e);
        }
      }

      const protocol = req.headers["x-forwarded-proto"] || req.protocol || "https";
      let defaultHost = "localhost:3000";
      if (configuredDomain) {
        try {
          defaultHost = new URL(configuredDomain.startsWith('http') ? configuredDomain : `https://${configuredDomain}`).host;
        } catch {
          defaultHost = configuredDomain.replace(/^https?:\/\//, '');
        }
      }
      let hostHeader = req.headers["x-forwarded-host"] || req.get("host") || defaultHost;
      let cleanHost = String(hostHeader).split(',')[0].trim();
      const hostUrl = `${String(protocol).split(',')[0].trim()}://${cleanHost}`;
      const userAgent = req.headers['user-agent'] || '';

      const seoResult = await injectSeoTags(template, req.originalUrl, hostUrl, userAgent);
      const isNotFound = typeof seoResult === 'object' && seoResult ? seoResult.isNotFound : false;
      const canonicalUrl = typeof seoResult === 'object' && seoResult ? seoResult.canonicalUrl : undefined;

      // Real 404 response for missing slugs to eliminate Googlebot Soft 404 violations
      // Exclude /moreinfo, /gateway routes so client SPA can hydrate and auto-sync newly added apps
      const reqPath = (req.originalUrl || '').split('?')[0].split('#')[0];
      const isGatewayRoute = reqPath.startsWith('/moreinfo') || reqPath.startsWith('/gateway') || reqPath.startsWith('/info/');

      if (isNotFound && !isGatewayRoute) {
        const notFoundHtml = `<!doctype html>
<html lang="en-IN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>404 - Page Not Found</title>
    <meta name="robots" content="noindex, nofollow, noarchive, nosnippet" />
    <meta name="description" content="The requested page could not be found." />
    <style>
      body{margin:0;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#090d16;color:#f8fafc;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:24px;box-sizing:border-box}
      .card{max-width:480px;width:100%;text-align:center;padding:40px 24px;border-radius:24px;background:#111726;border:1px solid rgba(255,255,255,0.08);box-shadow:0 20px 40px rgba(0,0,0,0.4)}
      h1{margin:0 0 12px;font-size:3.5rem;font-weight:900;background:linear-gradient(135deg,#38bdf8,#818cf8);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
      p{margin:0 0 24px;color:#94a3b8;font-size:1rem;line-height:1.6}
      a{display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;border-radius:12px;text-decoration:none;font-weight:700;font-size:0.95rem;transition:background 0.2s}
      a:hover{background:#1d4ed8}
    </style>
  </head>
  <body>
    <div class="card">
      <h1>404</h1>
      <p>The application or article you requested does not exist or may have been moved.</p>
      <a href="/">Return to Home</a>
    </div>
  </body>
</html>`;
        return res.status(404).set({
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0',
          'X-Robots-Tag': 'noindex, nofollow, noarchive, nosnippet'
        }).send(notFoundHtml);
      }

      const html = typeof seoResult === 'string' ? seoResult : (seoResult.html || template);
      const statusCode = 200;

      let cacheControl = 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400';
      const reqUrlLower = req.originalUrl.toLowerCase().split('?')[0].replace(/\/+$/, '') || '/';

      if (process.env.NODE_ENV === "production") {
        if (reqUrlLower === '/' || reqUrlLower === '' || reqUrlLower === '/new-apps' || reqUrlLower.startsWith('/category/') || reqUrlLower.startsWith('/categories')) {
          cacheControl = 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400';
        } else if (reqUrlLower.startsWith('/app/')) {
          cacheControl = 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400';
        } else if (reqUrlLower.startsWith('/news') || reqUrlLower.startsWith('/videos')) {
          cacheControl = 'public, max-age=600, s-maxage=7200, stale-while-revalidate=86400';
        } else if (['/about', '/contact', '/privacy', '/terms', '/ethics', '/disclaimer', '/notice', '/responsibility', '/developers', '/report-removal'].includes(reqUrlLower)) {
          cacheControl = 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800';
        }
      }
      const isDisallowedRoute = isNotFound ||
        reqUrlLower.startsWith('/s/') ||
        reqUrlLower.startsWith('/dl/') ||
        reqUrlLower.startsWith('/out/') ||
        reqUrlLower.startsWith('/download/') ||
        reqUrlLower.startsWith('/gateway/') ||
        reqUrlLower.startsWith('/gateway') ||
        reqUrlLower.startsWith('/info/') ||
        reqUrlLower.startsWith('/moreinfo/') ||
        reqUrlLower.startsWith('/moreinfo') ||
        reqUrlLower.startsWith('/moredetail/') ||
        reqUrlLower.startsWith('/admin') ||
        reqUrlLower.startsWith('/login') ||
        reqUrlLower.startsWith('/masterworld') ||
        reqUrlLower === '/safety' ||
        reqUrlLower === '/safety-status';

      if (isDisallowedRoute) {
        cacheControl = 'no-store, no-cache, must-revalidate, private, max-age=0';
      }

      const isIndexable = !isDisallowedRoute;

      const robotsHeader = isIndexable
        ? 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'
        : 'noindex, nofollow, noarchive, nosnippet';

      const edgeCacheDirective = isDisallowedRoute
        ? 'no-store, private'
        : 'public, max-age=86400, stale-while-revalidate=604800';

      const responseHeaders: Record<string, string> = {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': cacheControl,
        'CDN-Cache-Control': edgeCacheDirective,
        'Cloudflare-CDN-Cache-Control': edgeCacheDirective,
        'X-Robots-Tag': robotsHeader,
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': isDisallowedRoute ? 'no-referrer' : 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
        'Vary': 'Accept-Encoding, User-Agent',
      };

      const links: string[] = [];
      if (canonicalUrl && !isDisallowedRoute) {
        links.push(`<${canonicalUrl}>; rel="canonical"`);
      }
      if (links.length > 0) {
        responseHeaders['Link'] = links.join(', ');
      }
      if (isNotFound || isDisallowedRoute) {
        responseHeaders['Pragma'] = 'no-cache';
        responseHeaders['Expires'] = '0';
      } else {
        responseHeaders['Expires'] = new Date(Date.now() + 3600000).toUTCString();
      }

      res.status(statusCode).set(responseHeaders).send(html);
    } catch (e) {
      console.error("SEO fallback error in catch-all, serving file as-is:", e);
      res.status(200).set({
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Robots-Tag': 'index, follow'
      }).sendFile(path.join(process.cwd(), 'index.html'));
    }
  });

  // Global Express Error Handler
  app.use((err: any, req: any, res: any, next: any) => {
    
if (err.status !== 404 && err.statusCode !== 404) {
  console.error(`[EXPRESS GLOBAL ERROR] ${req.method} ${req.originalUrl}:`, err);
}
    try {
      const logFile = path.join(process.cwd(), 'server_requests.log');
      fs.appendFile(logFile, `[${new Date().toISOString()}] ERROR in ${req.method} ${req.originalUrl}: ${err.message || err}\n`, 'utf8', () => {});
    } catch (e) {}

    if (res.headersSent) {
      return next(err);
    }

    if (req.originalUrl.startsWith('/api/')) {
      return res.status(500).json({ error: "Internal server error" });
    }

    res.status(500).send("<h1>500 Internal Server Error</h1><p>An unexpected error occurred.</p>");
  });

  const server = app.listen(PORT as number, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    fetchStoreData()
      .then(() => {
        console.log("Local store cache warmed up successfully from backup files.");
      })
      .catch(e => {
        console.warn("Local store cache warming failed:", e);
      });
  });

  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`[SERVER ERROR] Port ${PORT} is already in use. A dev server process may already be running on 0.0.0.0:${PORT}.`);
    } else {
      console.error('[SERVER ERROR]', err);
    }
  });
}

process.on('uncaughtException', (err) => {
  console.error('[SERVER UNCAUGHT EXCEPTION]:', err);
});

process.on('unhandledRejection', (reason) => {
  console.warn('[SERVER UNHANDLED REJECTION]:', reason);
});

startServer();
