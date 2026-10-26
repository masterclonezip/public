import { Router, Request, Response } from 'express';
import zlib from 'zlib';
import staticData from '../../lib/staticData.json';
import { fetchStoreData } from '../../seoHelper';
import { getAllSiteIconUrls } from '../../seo/utils';
import {
  generateMasterSitemapXml,
  generateAppsSitemapXml,
  generateNewsSitemapXml,
  generateVideosSitemapXml,
  generateStaticSitemapXml,
  generateDevelopersSitemapXml,
  getLatestItemDate
} from '../../lib/sitemapGenerator';

export const seoRouter = Router();

function resolveHost(req: Request): string {
  const configured = (process.env.PUBLIC_DOMAIN || process.env.VITE_PUBLIC_DOMAIN || '').trim().replace(/\/+$/, '');
  if (configured) {
    return configured.startsWith('http') ? configured : `https://${configured}`;
  }
  const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'https';
  const host = (req.headers['x-forwarded-host'] as string) || req.get('host') || 'localhost:3000';
  return `${proto.split(',')[0].trim()}://${host.split(',')[0].trim()}`;
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

function sendXmlOrGzip(req: Request, res: Response, xml: string, maxAgeSeconds: number = 3600) {
  res.setHeader('Cache-Control', `public, max-age=${maxAgeSeconds}, s-maxage=${maxAgeSeconds}`);
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
  const iconTag = icons.favicon16
    ? `\n  <Image width="16" height="16" type="image/png">${icons.favicon16.replace(/&/g, '&amp;')}</Image>`
    : '';

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<OpenSearchDescription xmlns="http://a9.com/-/spec/opensearch/1.1/">
  <ShortName>${siteTitle.replace(/[<>&'"]/g, '')}</ShortName>
  <Description>Search applications</Description>
  <InputEncoding>UTF-8</InputEncoding>${iconTag}
  <Url type="text/html" template="${host}/?s={searchTerms}"/>
</OpenSearchDescription>`;
  sendXmlOrGzip(req, res, xml, 3600);
});

seoRouter.get('/robots.txt', (req, res) => {
  const farFuture = new Date(Date.now() + 86400000 * 7).toUTCString();
  res.setHeader('Cache-Control', 'public, max-age=604800, s-maxage=604800');
  res.setHeader('Expires', farFuture);
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
  const xml = generateNewsSitemapXml(data.news || [], host);
  sendXmlOrGzip(req, res, xml, 3600);
});

// Dedicated Apps Sitemap
seoRouter.get(['/sitemap-apps.xml', '/sitemap_apps.xml', '/sitemap-apps.xml.gz', '/sitemap_apps.xml.gz'], async (req, res) => {
  const host = resolveHost(req);
  const data = await getLiveData();
  const xml = generateAppsSitemapXml(data.apps || [], host);
  sendXmlOrGzip(req, res, xml, 3600);
});

// Dedicated Static Pages Sitemap
seoRouter.get(['/sitemap-static.xml', '/sitemap_static.xml', '/sitemap-static.xml.gz', '/sitemap_static.xml.gz'], async (req, res) => {
  const host = resolveHost(req);
  const data = await getLiveData();
  const latestAppDate = getLatestItemDate(data.apps || []);
  const latestNewsDate = getLatestItemDate(data.news || []);
  const latestVideoDate = getLatestItemDate(data.videos || []);
  const settingsDate = data.settings?.last_updated || data.settings?.updated_at;
  const xml = generateStaticSitemapXml(host, {
    latestAppDate,
    latestNewsDate,
    latestVideoDate,
    settingsDate
  });
  sendXmlOrGzip(req, res, xml, 86400);
});

// Dedicated Videos Sitemap
seoRouter.get(['/sitemap-videos.xml', '/sitemap_videos.xml', '/sitemap-videos.xml.gz', '/sitemap_videos.xml.gz'], async (req, res) => {
  const host = resolveHost(req);
  const data = await getLiveData();
  const xml = generateVideosSitemapXml(data.videos || [], host);
  sendXmlOrGzip(req, res, xml, 86400);
});

// Dedicated Developers Sitemap
seoRouter.get(['/sitemap-developers.xml', '/sitemap_developers.xml', '/sitemap-developers.xml.gz', '/sitemap_developers.xml.gz'], async (req, res) => {
  const host = resolveHost(req);
  const data = await getLiveData();
  const latestDate = getLatestItemDate(data.settings?.developers || data.developers || []);
  const xml = generateDevelopersSitemapXml(host, latestDate);
  sendXmlOrGzip(req, res, xml, 86400);
});

// Dedicated Categories Sitemap (Ensures valid XML for crawlers requesting /sitemap-categories.xml)
seoRouter.get(['/sitemap-categories.xml', '/sitemap_categories.xml', '/sitemap-categories.xml.gz', '/sitemap_categories.xml.gz'], async (req, res) => {
  const host = resolveHost(req);
  const data = await getLiveData();
  const latestAppDate = getLatestItemDate(data.apps || []);
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${host}/categories</loc>
    <lastmod>${latestAppDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${host}/new-apps</loc>
    <lastmod>${latestAppDate}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
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
  const siteTitle = (data.settings?.site_title || process.env.VITE_SITE_NAME || '').trim();
  const feedTitle = siteTitle ? `${siteTitle} News Feed` : 'News Feed';
  const news = (data.news || []).filter((n: any) => n && n.slug && n.sync_to_public !== false);
  const items = news.slice(0, 30).map((n: any) => `    <item>
      <title><![CDATA[${n.title || ''}]]></title>
      <link>${host}/news/${String(n.slug || n.id).trim().replace(/^\/+|\/+$/g, '')}</link>
      <description><![CDATA[${n.description || n.seo_description || ''}]]></description>
      <pubDate>${new Date(n.published_at || n.publish_date || n.created_at || n.date || n.updated_at || Date.now()).toUTCString()}</pubDate>
    </item>`).join('\n');
  res.send(`<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0">\n  <channel>\n    <title><![CDATA[${feedTitle}]]></title>\n    <link>${host}/news</link>\n    <description>Latest News and Updates</description>\n${items}\n  </channel>\n</rss>`);
});
