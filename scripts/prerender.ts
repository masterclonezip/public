// prerender.ts
process.env.NODE_ENV = 'production';
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { injectSeoTags, fetchStoreData, cleanRootContainer } from '../src/seoHelper';
import { generateAllSitemaps } from '../src/lib/sitemapGenerator';
import { formatPageTitle } from '../src/lib/seoUtils';

function sanitizePublicApp(app: any): any {
  if (!app || typeof app !== 'object') return app;
  const copy = { ...app };
  const hasSecureLink = Boolean(
    copy.has_secure_link ||
    copy.more_information_url ||
    copy.download_url ||
    copy.encrypted_link ||
    copy.encrypted_download_url ||
    (copy.url && !String(copy.url).includes('com.example'))
  );
  copy.has_secure_link = hasSecureLink;
  delete copy.more_information_url;
  delete copy.download_url;
  delete copy.encrypted_link;
  delete copy.encrypted_download_url;
  if (copy.url && String(copy.url).includes('com.example')) {
    copy.url = '';
  }
  if (typeof copy.slug === 'string') {
    copy.slug = copy.slug.trim().replace(/^\/+|\/+$/g, '');
  }
  const rawSeoTitle = String(copy.seo_title || copy.meta_title || '').trim();
  if (rawSeoTitle) {
    const cleanTitle = formatPageTitle(rawSeoTitle, '');
    copy.seo_title = cleanTitle;
    copy.meta_title = cleanTitle;
  }
  return copy;
}

function sanitizePublicNews(newsItem: any): any {
  if (!newsItem || typeof newsItem !== 'object') return newsItem;
  const copy = { ...newsItem };
  if (typeof copy.slug === 'string') {
    copy.slug = copy.slug.trim().replace(/^\/+|\/+$/g, '');
  }
  if (typeof copy.title === 'string' && copy.title.trim()) {
    copy.title = formatPageTitle(copy.title.trim(), '');
  }
  const rawSeoTitle = String(copy.seo_title || copy.meta_title || '').trim();
  if (rawSeoTitle) {
    const cleanTitle = formatPageTitle(rawSeoTitle, '');
    copy.seo_title = cleanTitle;
    copy.meta_title = cleanTitle;
  }
  return copy;
}

async function syncStaticDataAndSitemaps() {
  const host = (process.env.PUBLIC_DOMAIN || process.env.VITE_PUBLIC_DOMAIN || 'http://localhost:3000').replace(/\/+$/, '');
  const publicPath = path.resolve(process.cwd(), 'public');
  const staticJsonPath = path.join(process.cwd(), 'src/lib/staticData.json');

  let data = await fetchStoreData() || { apps: [], news: [], blogs: [], videos: [], settings: {} };
  if (!data.apps || data.apps.length === 0) {
    try {
      if (fs.existsSync(staticJsonPath)) {
        const rawStatic = JSON.parse(fs.readFileSync(staticJsonPath, 'utf8'));
        data = {
          apps: rawStatic.apps || rawStatic.mockApps || [],
          news: rawStatic.news || rawStatic.mockNews || [],
          videos: rawStatic.videos || rawStatic.mockVideos || [],
          settings: rawStatic.settings || rawStatic.mockSettings || {}
        };
      }
    } catch (e) {
      console.warn('Fallback staticData load error:', e);
    }
  }

  const publicApps = (data.apps || [])
    .filter((a: any) => a && a.sync_to_public !== false)
    .map((a: any) => sanitizePublicApp(a));
  const publicNews = (data.news || [])
    .filter((n: any) => n && n.sync_to_public !== false)
    .map((n: any) => sanitizePublicNews(n));

  const publicSettings = { ...(data.settings || {}) };
  delete publicSettings.turnstile_secret_key;

  if (publicApps.length > 0) {
    const publicPayload = {
      apps: publicApps,
      settings: publicSettings,
      news: publicNews,
      videos: data.videos || [],
      reviews: data.reviews || []
    };
    try {
      fs.writeFileSync(staticJsonPath, JSON.stringify(publicPayload), 'utf8');
      console.log(`Synced live Firestore data into src/lib/staticData.json (${publicApps.length} apps, ${publicNews.length} news items).`);
    } catch (e) {
      console.warn('Failed writing staticData.json:', e);
    }
  }

  if (fs.existsSync(publicPath)) {
    const sitemaps = generateAllSitemaps({ ...data, apps: publicApps, news: publicNews }, host);
    for (const [filename, xmlContent] of Object.entries(sitemaps)) {
      const xmlStr = xmlContent as string;
      const gzBuffer = zlib.gzipSync(Buffer.from(xmlStr, 'utf-8'), { level: 9 });
      try {
        fs.writeFileSync(path.join(publicPath, filename), xmlStr, 'utf-8');
        fs.writeFileSync(path.join(publicPath, `${filename}.gz`), gzBuffer);
      } catch (e) {}
    }
  }

  return { ...data, apps: publicApps, news: publicNews };
}

async function prerender() {
  if (process.argv.includes('--sync-only')) {
    console.log('Running pre-build Firestore staticData & sitemap sync...');
    await syncStaticDataAndSitemaps();
    return;
  }

  console.log('Static Prerendering started...');
  const distPath = path.resolve(process.cwd(), 'dist');
  const indexHtmlPath = path.join(distPath, 'index.html');
  
  if (!fs.existsSync(indexHtmlPath)) {
    console.warn('dist/index.html not found, skipping prerender.');
    return;
  }
  
  try {
    const HOST = (process.env.PUBLIC_DOMAIN || process.env.VITE_PUBLIC_DOMAIN || 'http://localhost:3000').replace(/\/+$/, '');
    let originalTemplate = cleanRootContainer(fs.readFileSync(indexHtmlPath, 'utf-8'));

    // Inline compiled Vite CSS directly into <head> to eliminate render-blocking CSS network round-trips and prevent FOUC (A1, A2, A10)
    originalTemplate = originalTemplate.replace(
      /<link\s+rel=["']stylesheet["'][^>]*href=["']\/?assets\/([^"']+\.css)["'][^>]*\/?>/gi,
      (fullMatch, cssFileName) => {
        try {
          const cssFilePath = path.join(distPath, 'assets', cssFileName);
          if (fs.existsSync(cssFilePath)) {
            const cssContent = fs.readFileSync(cssFilePath, 'utf-8');
            return `<style id="vite-inline-css">${cssContent}</style>`;
          }
        } catch (_) {}
        return fullMatch;
      }
    );

    // Persist pristine clean SPA template files with empty <div id="root"></div>
    fs.writeFileSync(path.join(distPath, 'template.html'), originalTemplate, 'utf-8');
    fs.writeFileSync(path.join(distPath, 'index.spa.html'), originalTemplate, 'utf-8');

    const data = await syncStaticDataAndSitemaps();
    
    // Helper to generate both directory index.html and direct .html file for any route
    const generateRoute = async (routePath: string) => {
      console.log(`Prerendering route: ${routePath}`);
      // Prerender static HTML with clean #root for instantaneous React mount and rich noscript semantic crawler fallback
      const seoRes = await injectSeoTags(originalTemplate, routePath, HOST, '');
      const template = typeof seoRes === 'string' ? seoRes : seoRes.html;
      
      const cleanRoute = (routePath.startsWith('/') ? routePath.substring(1) : routePath).trim().replace(/\/+$/, '');
      const targetDir = path.join(distPath, cleanRoute);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      // 1. Directory index.html (for directory URLs & trailing slashes: /app/example/index.html)
      fs.writeFileSync(path.join(targetDir, 'index.html'), template, 'utf-8');

      // 2. Direct clean .html file (for clean URLs on Vercel Edge CDN: /app/example.html)
      const directHtmlPath = path.join(distPath, `${cleanRoute}.html`);
      const directHtmlDir = path.dirname(directHtmlPath);
      if (!fs.existsSync(directHtmlDir)) {
        fs.mkdirSync(directHtmlDir, { recursive: true });
      }
      fs.writeFileSync(directHtmlPath, template, 'utf-8');
    };

    // 1. Generate Home Route
    const homeRes = await injectSeoTags(originalTemplate, '/', HOST, '');
    let homeTemplate = typeof homeRes === 'string' ? homeRes : homeRes.html;
    fs.writeFileSync(indexHtmlPath, homeTemplate, 'utf-8');

    // 2. Generate Application Routes & Per-App Review Slices (Only for public synced apps; /moreinfo gateway routes are excluded from static pre-rendering)
    const appsToPrerender = (data.apps || []).filter((a: any) => a && a.slug && a.sync_to_public !== false);
    
    // Generate per-app static review JSON slices
    let staticReviewsMap: Record<string, any> = {};
    const staticRevsPath = path.join(process.cwd(), 'src/lib/communityStaticReviews.json');
    if (fs.existsSync(staticRevsPath)) {
      try {
        staticReviewsMap = JSON.parse(fs.readFileSync(staticRevsPath, 'utf8'));
      } catch (_) {}
    }

    const publicDataReviewsDir = path.join(process.cwd(), 'public/data/reviews');
    const distDataReviewsDir = path.join(distPath, 'data/reviews');
    if (!fs.existsSync(publicDataReviewsDir)) fs.mkdirSync(publicDataReviewsDir, { recursive: true });
    if (!fs.existsSync(distDataReviewsDir)) fs.mkdirSync(distDataReviewsDir, { recursive: true });

    appsToPrerender.forEach((app: any) => {
      const cleanSlug = String(app.slug).trim().toLowerCase();
      const cleanId = String(app.id || '').trim().toLowerCase();
      const appRevs = staticReviewsMap[cleanSlug] || staticReviewsMap[cleanId] || [];
      const jsonContent = JSON.stringify(appRevs);
      try {
        fs.writeFileSync(path.join(publicDataReviewsDir, `${cleanSlug}.json`), jsonContent, 'utf8');
        fs.writeFileSync(path.join(distDataReviewsDir, `${cleanSlug}.json`), jsonContent, 'utf8');
      } catch (_) {}
    });

    const BATCH_SIZE = 25;
    for (let i = 0; i < appsToPrerender.length; i += BATCH_SIZE) {
      const batch = appsToPrerender.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map((app: any) => {
          const cleanSlug = String(app.slug).trim();
          return generateRoute(`/app/${cleanSlug}`);
        })
      );
    }

    // 3. Generate Category Routes & Catalogs
    await generateRoute('/categories');
    await generateRoute('/new-apps');

    const uniqueCategories = new Set<string>();
    (data.apps || []).forEach((app: any) => {
      const catField = app.category || app.category_name;
      if (typeof catField === 'string' && catField.trim()) {
        catField.split(',').forEach((c: string) => {
          const trimmed = c.trim();
          if (trimmed) uniqueCategories.add(trimmed);
        });
      }
    });

    for (const cat of uniqueCategories) {
      const catSlug = cat.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      if (catSlug) {
        await generateRoute(`/category/${catSlug}`);
      }
    }

    // 4. Generate News Routes (Only for public synced news)
    for (const newsItem of data.news || []) {
      const cleanNewsSlug = String(newsItem.slug || newsItem.id || '').trim();
      if (cleanNewsSlug && newsItem.sync_to_public !== false) {
        await generateRoute(`/news/${cleanNewsSlug}`);
      }
    }

    // 5. Generate Video Routes
    for (const videoItem of data.videos || []) {
      const cleanVideoSlug = String(videoItem.slug || '').trim();
      if (cleanVideoSlug) {
        await generateRoute(`/videos/${cleanVideoSlug}`);
      }
    }

    // 6. Generate Core Static Pages
    await generateRoute('/news');
    await generateRoute('/videos');
    await generateRoute('/about');
    await generateRoute('/developers');
    await generateRoute('/developer');
    await generateRoute('/contact');
    await generateRoute('/privacy');
    await generateRoute('/report-removal');
    await generateRoute('/terms');
    await generateRoute('/responsibility');
    await generateRoute('/notice');
    await generateRoute('/ethics');
    await generateRoute('/disclaimer');
    await generateRoute('/faq');
    await generateRoute('/faqs');
    await generateRoute('/safety');
    await generateRoute('/safety-status');

    // 6. Generate Master Sitemap Index (sitemap.xml), Sub-Sitemaps, and GZip (.xml.gz) companions
    const host = (process.env.PUBLIC_DOMAIN || process.env.VITE_PUBLIC_DOMAIN || 'http://localhost:3000').replace(/\/+$/, '');

    // Remove unwanted duplicate/legacy sitemap files if present in dist
    const unwantedFiles = [
      'sitemap_index.xml', 'sitemap-index.xml', 'sitemapindex.xml',
      'sitemap_apps.xml', 'sitemap-app.xml', 'sitemap_app.xml',
      'sitemap-categories.xml', 'sitemap_categories.xml', 'sitemap-category.xml', 'sitemap_category.xml',
      'sitemap_static.xml', 'sitemap-pages.xml', 'sitemap_pages.xml',
      'sitemap_news.xml', 'sitemap-posts.xml', 'sitemap_posts.xml',
      'sitemap_videos.xml', 'sitemap-video.xml', 'sitemap_video.xml',
      'sitemap_developers.xml', 'sitemap-blogs.xml', 'sitemap_blogs.xml'
    ];
    for (const u of unwantedFiles) {
      const uPath = path.join(distPath, u);
      if (fs.existsSync(uPath)) {
        try { fs.unlinkSync(uPath); } catch (e) {}
      }
      const gzPath = path.join(distPath, `${u}.gz`);
      if (fs.existsSync(gzPath)) {
        try { fs.unlinkSync(gzPath); } catch (e) {}
      }
      const brPath = path.join(distPath, `${u}.br`);
      if (fs.existsSync(brPath)) {
        try { fs.unlinkSync(brPath); } catch (e) {}
      }
    }

    const publicPath = path.resolve(process.cwd(), 'public');
    const sitemaps = generateAllSitemaps(data, host);

    for (const [filename, xmlContent] of Object.entries(sitemaps)) {
      const xmlStr = xmlContent as string;
      const gzBuffer = zlib.gzipSync(Buffer.from(xmlStr, 'utf-8'), { level: 9 });

      fs.writeFileSync(path.join(distPath, filename), xmlStr, 'utf-8');
      fs.writeFileSync(path.join(distPath, `${filename}.gz`), gzBuffer);

      if (fs.existsSync(publicPath)) {
        try {
          fs.writeFileSync(path.join(publicPath, filename), xmlStr, 'utf-8');
          fs.writeFileSync(path.join(publicPath, `${filename}.gz`), gzBuffer);
        } catch (e) {}
      }
    }

    // 3. Copy authoritative public/robots.txt (with per-UA Disallow rules) to dist/robots.txt
    const publicRobotsPath = path.join(publicPath, 'robots.txt');
    if (fs.existsSync(publicRobotsPath)) {
      fs.copyFileSync(publicRobotsPath, path.join(distPath, 'robots.txt'));
    }
    console.log('Generated sitemaps and copied robots.txt to dist');

    // 4. Ensure Cloudflare Pages SPA redirects and headers exist in dist
    const redirectsSrc = path.join(publicPath, '_redirects');
    const headersSrc = path.join(publicPath, '_headers');
    if (fs.existsSync(redirectsSrc)) {
      fs.copyFileSync(redirectsSrc, path.join(distPath, '_redirects'));
    } else {
      fs.writeFileSync(path.join(distPath, '_redirects'), '/*    /index.html   200\n', 'utf-8');
    }
    if (fs.existsSync(headersSrc)) {
      fs.copyFileSync(headersSrc, path.join(distPath, '_headers'));
    }

    console.log('Successfully injected static HTML, metadata, and Cloudflare routing into dist.');
  } catch (err) {
    console.error('Error during prerender:', err);
  }
}

prerender().then(() => {
  process.exit(0);
}).catch((err) => {
  console.error('Prerender error:', err);
  process.exit(0);
});
