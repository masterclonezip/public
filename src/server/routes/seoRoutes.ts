import { Router, Request, Response, NextFunction } from 'express';
import zlib from 'zlib';
import staticData from '../../lib/staticData.json';
import { fetchStoreData } from '../../seoHelper';
import { getAllSiteIconUrls, resolveSiteLogoUrl } from '../../seo/utils';
import {
  generateMasterSitemapXml,
  generateAppsSitemapXml,
  generateNewsSitemapXml,
  generateVideosSitemapXml,
  generateStaticSitemapXml,
  generateDevelopersSitemapXml,
  getLatestItemDate,
  escapeXml,
  normalizeSitemapImageUrl,
  normalizeSitemapHost,
  enforceNonWwwXml
} from '../../lib/sitemapGenerator';

export const seoRouter = Router();

function resolveHost(req: Request): string {
  const configured = (process.env.PUBLIC_DOMAIN || process.env.VITE_PUBLIC_DOMAIN || '').trim().replace(/^["']+|["']+$/g, '');
  if (configured) {
    return normalizeSitemapHost(configured);
  }
  const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'https';
  let host = (req.headers['x-forwarded-host'] as string) || req.get('host') || 'localhost:3000';
  host = host.split(',')[0].trim();
  return normalizeSitemapHost(`${proto.split(',')[0].trim()}://${host}`);
}

async function getLiveData() {
  try {
    const live = await fetchStoreData();
    if (
      live &&
      ((Array.isArray(live.apps) && live.apps.length > 0) ||
        (live.settings && Object.keys(live.settings).length > 0))
    ) {
      return live;
    }
  } catch (e) {}
  return staticData as any;
}

function sendXmlOrGzip(req: Request, res: Response, rawXml: string, maxAgeSeconds: number = 60) {
  const xml = enforceNonWwwXml(rawXml);
  res.setHeader('Cache-Control', `public, max-age=0, s-maxage=${Math.min(maxAgeSeconds, 60)}, must-revalidate`);
  res.setHeader('Vary', 'Accept-Encoding');
  if (req.path.endsWith('.gz')) {
    const gzBuffer = zlib.gzipSync(Buffer.from(xml, 'utf8'), { level: 9 });
    res.setHeader('Content-Type', 'application/gzip');
    res.setHeader('Content-Disposition', `inline; filename="${req.path.replace(/^\//, '')}"`);
    res.send(gzBuffer);
    return;
  }
  res.type('application/xml');
  res.send(xml);
}

// Dynamic Root Brand Icon & Logo Resolution for Browsers, Googlebot Favicon Crawler, and Apple Devices
seoRouter.get(
  [
    '/favicon.ico',
    '/favicon.svg',
    '/favicon.png',
    '/favicon-16x16.png',
    '/favicon-32x32.png',
    '/favicon-48x48.png',
    '/apple-touch-icon.png',
    '/apple-touch-icon-precomposed.png',
    '/android-chrome-192x192.png',
    '/android-chrome-512x512.png',
    '/logo.png'
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const host = resolveHost(req);
      const data = await getLiveData();
      const settings = data?.settings || {};
      const icons = getAllSiteIconUrls(settings, host);
      const hasCustomBrand = Boolean(icons.masterFavicon || icons.masterLogo);
      if (!hasCustomBrand && req.path !== '/favicon.svg') {
        return next();
      }

      const p = req.path.toLowerCase();
      let targetUrl = '';
      if (p === '/favicon-16x16.png') {
        targetUrl = icons.favicon16;
      } else if (p === '/favicon-32x32.png') {
        targetUrl = icons.favicon32;
      } else if (p === '/favicon.ico' || p === '/favicon.svg' || p === '/favicon.png' || p === '/favicon-48x48.png') {
        targetUrl = icons.favicon48 || icons.faviconIco;
      } else if (p === '/apple-touch-icon.png' || p === '/apple-touch-icon-precomposed.png') {
        targetUrl = icons.appleTouch180;
      } else if (p === '/android-chrome-192x192.png') {
        targetUrl = icons.pwa192;
      } else if (p === '/android-chrome-512x512.png') {
        targetUrl = icons.pwa512;
      } else if (p === '/logo.png') {
        targetUrl = icons.masterLogo || icons.searchLogo512;
      }

      // Avoid self-redirect loops when targetUrl points back to the same local static path
      if (targetUrl && targetUrl !== req.path && !targetUrl.endsWith(req.path)) {
        res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
        return res.redirect(302, targetUrl);
      }
      if (p === '/favicon.svg') {
        return res.redirect(302, '/favicon-32x32.png');
      }
    } catch (_) {}
    return next();
  }
);

seoRouter.get('/site.webmanifest', async (req, res) => {
  const host = resolveHost(req);
  const data = await getLiveData();
  const settings = data?.settings || {};
  const siteTitle = String(settings.site_title || process.env.VITE_SITE_NAME || '').trim();
  const icons = getAllSiteIconUrls(settings, host);

  res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
  res.type('application/manifest+json');
  res.json({
    id: '/',
    start_url: '/',
    scope: '/',
    name: siteTitle,
    short_name: siteTitle,
    display: 'standalone',
    orientation: 'portrait',
    lang: 'en-IN',
    icons: [
      {
        src: icons.favicon48 || '/favicon-32x32.png',
        sizes: '48x48',
        type: 'image/png',
        purpose: 'any'
      },
      {
        src: icons.favicon96 || '/apple-touch-icon.png',
        sizes: '96x96',
        type: 'image/png',
        purpose: 'any'
      },
      {
        src: icons.favicon144 || '/apple-touch-icon.png',
        sizes: '144x144',
        type: 'image/png',
        purpose: 'any'
      },
      {
        src: icons.android192 || '/android-chrome-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any maskable'
      },
      {
        src: icons.android512 || '/android-chrome-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable'
      }
    ],
    theme_color: '#2563eb',
    background_color: '#ffffff',
    shortcuts: [
      {
        name: 'News',
        url: '/news'
      }
    ]
  });
});

seoRouter.get('/opensearch.xml', async (req, res) => {
  const host = resolveHost(req);
  const data = await getLiveData();
  const settings = data?.settings || {};
  const siteTitle = String(settings.site_title || process.env.VITE_SITE_NAME || 'Search').trim() || 'Search';
  const icons = getAllSiteIconUrls(settings, host);
  const iconTags = [
    icons.favicon16 ? `  <Image width="16" height="16" type="image/png">${escapeXml(icons.favicon16)}</Image>` : '',
    icons.favicon32 ? `  <Image width="32" height="32" type="image/png">${escapeXml(icons.favicon32)}</Image>` : '',
    icons.favicon48 ? `  <Image width="48" height="48" type="image/png">${escapeXml(icons.favicon48)}</Image>` : '',
    icons.searchLogo512 ? `  <Image width="512" height="512" type="image/png">${escapeXml(icons.searchLogo512)}</Image>` : ''
  ].filter(Boolean).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<OpenSearchDescription xmlns="http://a9.com/-/spec/opensearch/1.1/">
  <ShortName>${siteTitle.replace(/[<>&'"]/g, '')}</ShortName>
  <Description>Search applications</Description>
  <InputEncoding>UTF-8</InputEncoding>
${iconTags}
  <Url type="text/html" template="${host}/?s={searchTerms}"/>
</OpenSearchDescription>`;
  sendXmlOrGzip(req, res, xml, 3600);
});

seoRouter.get('/robots.txt', (req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=60, must-revalidate');
  res.type('text/plain');
  const namedAgents = [
    'Googlebot',
    'Bingbot',
    'Applebot',
    'DuckDuckBot',
    'Baiduspider',
    'YandexBot',
    'SemrushBot',
    'AhrefsBot',
    'GPTBot',
    'ClaudeBot',
    'PerplexityBot',
  ];
  const blockRules = `Allow: /
Allow: /api/v1/public/
Disallow: /api/
Disallow: /admin/
Disallow: /login/
Disallow: /masterworld/
Disallow: /download/
Disallow: /download/*
Disallow: /gateway/
Disallow: /gateway/*
Disallow: /info/
Disallow: /info/*
Disallow: /moreinfo/
Disallow: /moreinfo/*
Disallow: /moredetail/
Disallow: /moredetail/*`;

  const agentBlocks = namedAgents
    .map((ua) => `User-agent: ${ua}\n${blockRules}`)
    .join('\n\n');

  const host = resolveHost(req);
  res.send(`User-agent: *
Allow: /
Allow: /api/v1/public/
Disallow: /api/
Disallow: /admin/
Disallow: /login/
Disallow: /masterworld/
Disallow: /s/
Disallow: /s/*
Disallow: /dl/
Disallow: /dl/*
Disallow: /out/
Disallow: /out/*
Disallow: /download/
Disallow: /download/*
Disallow: /gateway/
Disallow: /gateway/*
Disallow: /info/
Disallow: /info/*
Disallow: /moreinfo/
Disallow: /moreinfo/*
Disallow: /moredetail/
Disallow: /moredetail/*
Disallow: /safety
Disallow: /safety-status

${agentBlocks}

Sitemap: ${host}/sitemap.xml
Sitemap: ${host}/sitemap-news.xml
Sitemap: ${host}/sitemap-apps.xml
Sitemap: ${host}/sitemap-static.xml
Sitemap: ${host}/sitemap-videos.xml
Sitemap: ${host}/sitemap-developers.xml
Sitemap: ${host}/sitemap-categories.xml
`);
});

// Master Sitemap Index
seoRouter.get(['/sitemap.xml', '/sitemap.xml.gz'], async (req, res) => {
  const host = resolveHost(req);
  const data = await getLiveData();
  const xml = generateMasterSitemapXml(data.apps || [], data.news || [], data.videos || [], host, data.settings);
  sendXmlOrGzip(req, res, xml, 3600);
});

// Dedicated News Sitemap (Critical for Google News & Googlebot Crawling)
seoRouter.get(['/sitemap-news.xml', '/sitemap_news.xml', '/sitemap-news.xml.gz', '/sitemap_news.xml.gz'], async (req, res) => {
  const host = resolveHost(req);
  const data = await getLiveData();
  const siteLogo = resolveSiteLogoUrl(data.settings);
  const siteTitle = String(data.settings?.site_title || '').trim();
  const xml = generateNewsSitemapXml(data.news || [], host, siteLogo, siteTitle);
  sendXmlOrGzip(req, res, xml, 3600);
});

// Dedicated Apps Sitemap
seoRouter.get(['/sitemap-apps.xml', '/sitemap_apps.xml', '/sitemap-apps.xml.gz', '/sitemap_apps.xml.gz'], async (req, res) => {
  const host = resolveHost(req);
  const data = await getLiveData();
  const siteLogo = resolveSiteLogoUrl(data.settings);
  const siteTitle = String(data.settings?.site_title || '').trim();
  const xml = generateAppsSitemapXml(data.apps || [], host, siteLogo, siteTitle);
  sendXmlOrGzip(req, res, xml, 3600);
});

// Dedicated Static Pages Sitemap
seoRouter.get(['/sitemap-static.xml', '/sitemap_static.xml', '/sitemap-static.xml.gz', '/sitemap_static.xml.gz'], async (req, res) => {
  const host = resolveHost(req);
  const data = await getLiveData();
  const siteLogo = resolveSiteLogoUrl(data.settings);
  const siteTitle = String(data.settings?.site_title || '').trim();
  const latestAppDate = getLatestItemDate(data.apps || []);
  const latestNewsDate = getLatestItemDate(data.news || []);
  const latestVideoDate = getLatestItemDate(data.videos || []);
  const settingsDate = data.settings?.last_updated || data.settings?.updated_at;
  const xml = generateStaticSitemapXml(
    host,
    {
      latestAppDate,
      latestNewsDate,
      latestVideoDate,
      settingsDate
    },
    siteLogo,
    siteTitle
  );
  sendXmlOrGzip(req, res, xml, 86400);
});

// Dedicated Videos Sitemap
seoRouter.get(['/sitemap-videos.xml', '/sitemap_videos.xml', '/sitemap-videos.xml.gz', '/sitemap_videos.xml.gz'], async (req, res) => {
  const host = resolveHost(req);
  const data = await getLiveData();
  const siteLogo = resolveSiteLogoUrl(data.settings);
  const siteTitle = String(data.settings?.site_title || '').trim();
  const xml = generateVideosSitemapXml(data.videos || [], host, siteLogo, siteTitle);
  sendXmlOrGzip(req, res, xml, 86400);
});

// Dedicated Developers Sitemap
seoRouter.get(['/sitemap-developers.xml', '/sitemap_developers.xml', '/sitemap-developers.xml.gz', '/sitemap_developers.xml.gz'], async (req, res) => {
  const host = resolveHost(req);
  const data = await getLiveData();
  const siteLogo = resolveSiteLogoUrl(data.settings);
  const siteTitle = String(data.settings?.site_title || '').trim();
  const developers = data.settings?.developers || data.developers || [];
  const latestDate = getLatestItemDate(developers);
  const xml = generateDevelopersSitemapXml(host, latestDate, siteLogo, siteTitle, developers);
  sendXmlOrGzip(req, res, xml, 86400);
});

// Dedicated Categories Sitemap (Ensures valid XML with brand logo for crawlers requesting /sitemap-categories.xml)
seoRouter.get(['/sitemap-categories.xml', '/sitemap_categories.xml', '/sitemap-categories.xml.gz', '/sitemap_categories.xml.gz'], async (req, res) => {
  const host = resolveHost(req);
  const data = await getLiveData();
  const siteLogo = normalizeSitemapImageUrl(resolveSiteLogoUrl(data.settings), host.replace(/\/$/, ''), 512);
  const siteTitle = String(data.settings?.site_title || '').trim();
  const brandPrefix = siteTitle ? `${siteTitle} - ` : '';
  const latestAppDate = getLatestItemDate(data.apps || []);
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  <url>
    <loc>${host}/categories</loc>
    <lastmod>${latestAppDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
    <image:image>
      <image:loc>${escapeXml(siteLogo)}</image:loc>
      <image:title>${escapeXml(`${brandPrefix}App Categories`)}</image:title>
    </image:image>
  </url>
  <url>
    <loc>${host}/new-apps</loc>
    <lastmod>${latestAppDate}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
    <image:image>
      <image:loc>${escapeXml(siteLogo)}</image:loc>
      <image:title>${escapeXml(`${brandPrefix}New Apps`)}</image:title>
    </image:image>
  </url>
</urlset>`;
  sendXmlOrGzip(req, res, xml, 86400);
});

seoRouter.get('/rss.xml', async (req, res) => {
  const host = resolveHost(req);
  res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
  res.setHeader('Vary', 'Accept-Encoding');
  res.type('application/xml');
  const data = await getLiveData();
  const settings = data?.settings || {};
  const siteTitle = (settings.site_title || process.env.VITE_SITE_NAME || '').trim();
  const feedTitle = siteTitle ? `${siteTitle} News Feed` : 'News Feed';
  const icons = getAllSiteIconUrls(settings, host);
  const feedLogoUrl = icons.favicon144 || icons.searchLogo512 || `${host}/logo.png`;
  const channelImageXml = feedLogoUrl
    ? `    <image>\n      <url>${escapeXml(feedLogoUrl)}</url>\n      <title><![CDATA[${feedTitle}]]></title>\n      <link>${host}/news</link>\n    </image>\n`
    : '';
  const news = (data.news || []).filter((n: any) => n && n.slug && n.sync_to_public !== false);
  const items = news.slice(0, 30).map((n: any) => `    <item>
      <title><![CDATA[${n.title || ''}]]></title>
      <link>${host}/news/${String(n.slug || n.id).trim().replace(/^\/+|\/+$/g, '')}</link>
      <description><![CDATA[${n.description || n.seo_description || ''}]]></description>
      <pubDate>${new Date(n.published_at || n.publish_date || n.created_at || n.date || n.updated_at || Date.now()).toUTCString()}</pubDate>
    </item>`).join('\n');
  res.send(`<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0">\n  <channel>\n    <title><![CDATA[${feedTitle}]]></title>\n    <link>${host}/news</link>\n    <description>Latest News and Updates</description>\n${channelImageXml}${items}\n  </channel>\n</rss>`);
});
