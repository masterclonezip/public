import staticData from '../src/lib/staticData.json';

function getEdgeSizedLogoUrl(url, size = 192) {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) return '';
  if (trimmed.includes('res.cloudinary.com') && trimmed.includes('/upload/')) {
    const cleanUrl = trimmed.replace(/\/upload\/(?:(?:[a-z]{1,3}_[a-zA-Z0-9_.:-]+,?)+\/)*/, '/upload/');
    if (size > 0) {
      return cleanUrl.replace('/upload/', `/upload/f_png,q_auto:best,w_${size},h_${size},c_pad/`);
    }
    return cleanUrl.replace('/upload/', '/upload/f_png,q_auto:best/');
  }
  return trimmed;
}

export async function onRequest(context) {
  const url = new URL(context.request.url);
  const rawHost = url.hostname.toLowerCase();

  // 1. Strict 301 Redirect from www. to non-www
  if (rawHost.startsWith('www.')) {
    url.hostname = rawHost.replace(/^www\./i, '');
    url.protocol = 'https:';
    return new Response(null, {
      status: 301,
      headers: {
        Location: url.toString(),
        'Cache-Control': 'public, max-age=31536000',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }

  const pathname = url.pathname;
  const lowerPath = pathname.toLowerCase();

  // 1b. Edge Brand Icon & Web App Manifest Resolution (Ensures /sitemap*.xml tab icons & PWA manifest always show the high-res brand logo)
  const isIconOrManifest =
    lowerPath === '/favicon.ico' ||
    lowerPath === '/favicon.png' ||
    lowerPath === '/favicon.svg' ||
    lowerPath === '/favicon-16x16.png' ||
    lowerPath === '/favicon-32x32.png' ||
    lowerPath === '/favicon-48x48.png' ||
    lowerPath === '/apple-touch-icon.png' ||
    lowerPath === '/apple-touch-icon-precomposed.png' ||
    lowerPath === '/android-chrome-192x192.png' ||
    lowerPath === '/android-chrome-512x512.png' ||
    lowerPath === '/logo.png' ||
    lowerPath === '/site.webmanifest';

  if (isIconOrManifest && !rawHost.startsWith('admin.') && !rawHost.startsWith('masterworld.')) {
    const settings = (staticData && staticData.settings) || {};
    const envObj = context.env || {};
    const rawLogo = String(
      settings.logo_url ||
        settings.favicon_url ||
        envObj.VITE_SITE_LOGO_URL ||
        envObj.VITE_SITE_FAVICON_URL ||
        ''
    ).trim();
    const rawFavicon = String(
      settings.favicon_url ||
        settings.logo_url ||
        envObj.VITE_SITE_FAVICON_URL ||
        envObj.VITE_SITE_LOGO_URL ||
        rawLogo
    ).trim();

    if (lowerPath === '/site.webmanifest') {
      const siteTitle = String(settings.site_title || envObj.VITE_SITE_NAME || '').trim();
      const icon48 = getEdgeSizedLogoUrl(rawFavicon, 48) || '/favicon-32x32.png';
      const icon96 = getEdgeSizedLogoUrl(rawFavicon, 96) || '/apple-touch-icon.png';
      const icon144 = getEdgeSizedLogoUrl(rawFavicon, 144) || '/apple-touch-icon.png';
      const icon192 = getEdgeSizedLogoUrl(rawFavicon, 192) || '/android-chrome-192x192.png';
      const icon512 = getEdgeSizedLogoUrl(rawFavicon, 512) || '/android-chrome-512x512.png';
      const manifestJson = JSON.stringify(
        {
          id: '/',
          start_url: '/',
          scope: '/',
          name: siteTitle,
          short_name: siteTitle,
          display: 'standalone',
          orientation: 'portrait',
          lang: 'en-IN',
          icons: [
            { src: icon48, sizes: '48x48', type: 'image/png', purpose: 'any' },
            { src: icon96, sizes: '96x96', type: 'image/png', purpose: 'any' },
            { src: icon144, sizes: '144x144', type: 'image/png', purpose: 'any' },
            { src: icon192, sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
            { src: icon512, sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
          ],
          theme_color: '#2563eb',
          background_color: '#ffffff',
          shortcuts: [{ name: 'News', url: '/news' }]
        },
        null,
        2
      );
      return new Response(manifestJson, {
        status: 200,
        headers: {
          'Content-Type': 'application/manifest+json; charset=utf-8',
          'Cache-Control': 'public, max-age=3600, s-maxage=3600',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    if (rawFavicon.startsWith('http://') || rawFavicon.startsWith('https://')) {
      let size = 192;
      let sourceUrl = rawFavicon;
      if (lowerPath === '/favicon-16x16.png') size = 16;
      else if (lowerPath === '/favicon-32x32.png') size = 32;
      else if (lowerPath === '/favicon-48x48.png') size = 48;
      else if (lowerPath === '/apple-touch-icon.png' || lowerPath === '/apple-touch-icon-precomposed.png') size = 180;
      else if (lowerPath === '/android-chrome-192x192.png' || lowerPath === '/favicon.ico' || lowerPath === '/favicon.png' || lowerPath === '/favicon.svg') size = 192;
      else if (lowerPath === '/android-chrome-512x512.png') size = 512;
      else if (lowerPath === '/logo.png') {
        size = 512;
        sourceUrl = rawLogo || rawFavicon;
      }

      const targetIconUrl = getEdgeSizedLogoUrl(sourceUrl, size);
      if (targetIconUrl) {
        try {
          const iconRes = await fetch(targetIconUrl, {
            cf: { cacheEverything: true, cacheTtl: 86400 }
          });
          if (iconRes.ok) {
            return new Response(iconRes.body, {
              status: 200,
              headers: {
                'Content-Type': 'image/png',
                'Cache-Control': 'public, max-age=3600, s-maxage=86400',
                'Access-Control-Allow-Origin': '*',
                'Timing-Allow-Origin': '*'
              }
            });
          }
        } catch (_) {}
        return new Response(null, {
          status: 302,
          headers: {
            Location: targetIconUrl,
            'Cache-Control': 'public, max-age=3600',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }
    }
  }

  const response = await context.next();

  // Do not rewrite Admin portal responses or API routes
  if (
    rawHost.startsWith('admin.') ||
    rawHost.startsWith('masterworld.') ||
    pathname.startsWith('/api/')
  ) {
    return response;
  }

  // Enforce strict no-store, crawler/desktop/cloud 404 block, and SPA template fallback on /moreinfo gateway routes at the edge
  if (pathname.toLowerCase().startsWith('/moreinfo')) {
    const ua = (context.request.headers.get('user-agent') || '').toLowerCase();
    const chMobile = (context.request.headers.get('sec-ch-ua-mobile') || '').trim();
    const chPlat = (context.request.headers.get('sec-ch-ua-platform') || '')
      .trim()
      .replace(/^"|"$/g, '')
      .toLowerCase();
    const asn = Number(context.request.cf?.asn || 0);
    const asOrg = String(context.request.cf?.asOrganization || '').toLowerCase();

    const isCrawlerOrBot =
      /googlebot|bingbot|yandexbot|baiduspider|duckduckbot|slurp|ahrefsbot|semrushbot|dotbot|mj12bot|petalbot|bytespider|gptbot|claudebot|perplexitybot|ccbot|curl\/|wget\/|python|scrapy|httpx|aiohttp|headlesschrome|puppeteer|playwright|selenium|phantomjs/.test(
        ua
      );

    const isDesktopOrDesktopMode =
      chMobile === '?0' ||
      /^(windows|macos|chrome os|chromium os|linux)$/.test(chPlat) ||
      /windows nt|win64|wow64|cros|x11;\s*linux\s+(x86_64|i[3-6]86)|linux\s+(x86_64|i[3-6]86)|macintosh/.test(
        ua
      ) ||
      !/android|iphone|ipad|ipod/.test(ua);

    const isCloudServerAsn =
      [16509, 14618, 396982, 8075, 14061, 24940, 16276, 63949, 20473, 12876, 31898].includes(
        asn
      ) ||
      /amazon|aws|digitalocean|hetzner|ovh|linode|vultr|choopa|contabo|leaseweb|alibaba|tencent|azure|microsoft/.test(
        asOrg
      );

    if (isCrawlerOrBot || isDesktopOrDesktopMode || isCloudServerAsn) {
      const disguised404Html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>404 — Page Not Found</title><meta name="robots" content="noindex,nofollow,noarchive,nosnippet"><style>body{margin:0;font-family:system-ui,-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#fafafa;color:#18181b;text-align:center;padding:24px}.box{max-width:380px}.badge{width:64px;height:64px;border-radius:16px;background:#f4f4f5;color:#71717a;display:inline-flex;align-items:center;justify-content:center;font-weight:700;font-size:20px;margin-bottom:20px}h1{font-size:22px;margin:0 0 8px}p{font-size:14px;color:#71717a;margin:0 0 24px;line-height:1.5}a{display:inline-block;padding:10px 24px;background:#2563eb;color:#fff;text-decoration:none;border-radius:14px;font-weight:600;font-size:14px}</style></head><body><div class="box"><div class="badge">404</div><h1>404 — Page Not Found</h1><p>The page you are looking for does not exist or is unavailable.</p><a href="/">Home</a></div></body></html>`;
      return new Response(disguised404Html, {
        status: 404,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-store, no-cache, must-revalidate, private, max-age=0',
          'X-Robots-Tag': 'noindex, nofollow, noarchive, nosnippet',
          'Referrer-Policy': 'no-referrer'
        }
      });
    }

    let gatewayRes = response;
    if (gatewayRes.status === 404 && context.env && context.env.ASSETS) {
      const tplUrl = new URL('/template.html', url.origin);
      const tplRes = await context.env.ASSETS.fetch(new Request(tplUrl.toString(), context.request)).catch(() => null);
      if (tplRes && tplRes.ok) {
        gatewayRes = tplRes;
      } else {
        const idxUrl = new URL('/index.html', url.origin);
        const idxRes = await context.env.ASSETS.fetch(new Request(idxUrl.toString(), context.request)).catch(() => null);
        if (idxRes && idxRes.ok) {
          gatewayRes = idxRes;
        }
      }
    }

    const headers = new Headers(gatewayRes.headers);
    headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private, max-age=0');
    headers.set('CDN-Cache-Control', 'no-store, private');
    headers.set('Cloudflare-CDN-Cache-Control', 'no-store, private');
    headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet');
    headers.set('Referrer-Policy', 'no-referrer');

    // Inject live Cloudflare Pages runtime Turnstile Site Key directly into /moreinfo HTML at the Edge
    // so even when the site is compiled into static code or env vars are marked Encrypted/Secret,
    // the browser receives the exact 24-character 0x4... Site Key at 0ms on page load.
    const envObj = context.env || {};
    const rawEdgeCandidates = [
      envObj.VITE_TURNSTILE_SITE_KEY,
      envObj.TURNSTILE_SITE_KEY,
      envObj.CF_TURNSTILE_SITE_KEY,
      envObj.CLOUDFLARE_TURNSTILE_SITE_KEY,
      envObj.PUBLIC_TURNSTILE_SITE_KEY,
      envObj.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
      envObj.VITE_TURNSTILE_KEY,
      envObj.TURNSTILE_KEY,
      ...Object.values(envObj),
    ];
    let edgeSiteKey = '';
    for (const raw of rawEdgeCandidates) {
      if (typeof raw !== 'string') continue;
      const cleaned = raw
        .replace(/[\u200B-\u200D\uFEFF\u00A0]/g, '')
        .trim()
        .replace(/^[A-Za-z0-9_]+\s*=\s*/, '')
        .replace(/^["'`]+|["'`]+$/g, '')
        .trim();
      const m = cleaned.match(/^(0x4[A-Za-z0-9_-]{16,25})$/);
      if (m) {
        edgeSiteKey = m[1];
        break;
      }
    }

    const gwContentType = (gatewayRes.headers.get('content-type') || '').toLowerCase();
    if (edgeSiteKey && gwContentType.includes('text/html')) {
      const htmlText = await gatewayRes.text();
      const edgeScript = `<script>window.__CF_EDGE_TURNSTILE_SITE_KEY__=${JSON.stringify(edgeSiteKey)};</script>`;
      const injectedHtml = htmlText.includes('</head>')
        ? htmlText.replace('</head>', `${edgeScript}</head>`)
        : `${edgeScript}${htmlText}`;
      headers.delete('content-length');
      headers.delete('etag');
      return new Response(injectedHtml, {
        status: gatewayRes.ok ? 200 : gatewayRes.status,
        statusText: gatewayRes.ok ? 'OK' : gatewayRes.statusText,
        headers
      });
    }

    return new Response(gatewayRes.body, {
      status: gatewayRes.ok ? 200 : gatewayRes.status,
      statusText: gatewayRes.ok ? 'OK' : gatewayRes.statusText,
      headers
    });
  }

  const bareHost = rawHost.replace(/^(?:www\.|admin\.|masterworld\.)+/i, '');
  const isLocal =
    bareHost === 'localhost' ||
    bareHost === '127.0.0.1' ||
    bareHost.endsWith('.local');
  if (isLocal || !bareHost) {
    return response;
  }

  const canonicalOrigin = `https://${bareHost}`;
  const escapedBareHost = bareHost.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const contentType = (response.headers.get('content-type') || '').toLowerCase();

  // 2. Dynamic Edge Normalization for XML Sitemaps, RSS, OpenSearch, Robots.txt, LLMs.txt & AI Catalog
  const isSeoAsset =
    pathname.endsWith('.xml') ||
    pathname === '/robots.txt' ||
    pathname === '/llms.txt' ||
    pathname === '/ai-catalog.json' ||
    pathname === '/.well-known/ai-catalog.json';

  if (isSeoAsset && response.ok) {
    let text = await response.text();
    const hostVariantRegex = new RegExp(
      `https?:\\/\\/(?:www\\.|admin\\.|masterworld\\.)*${escapedBareHost}`,
      'gi'
    );
    text = text
      .replace(hostVariantRegex, canonicalOrigin)
      .replace(/https?:\/\/localhost(?::\d+)?/gi, canonicalOrigin)
      .replace(
        /(<(?:loc|image:loc|video:thumbnail_loc)>\s*https?:\/\/)(?:www\.|admin\.|masterworld\.)+([^<\s]+\s*<\/(?:loc|image:loc|video:thumbnail_loc)>)/gi,
        '$1$2'
      );

    if (pathname === '/robots.txt') {
      text = text.replace(/^Sitemap:\s*\/([^\s]+)$/gm, `Sitemap: ${canonicalOrigin}/$1`);
    } else if (pathname === '/opensearch.xml') {
      text = text.replace(/template="\/\?s=\{searchTerms\}"/g, `template="${canonicalOrigin}/?s={searchTerms}"`);
    }

    const headers = new Headers(response.headers);
    headers.set('Cache-Control', 'public, max-age=0, s-maxage=60, must-revalidate');
    headers.set('CDN-Cache-Control', 'public, max-age=60, must-revalidate');
    headers.set('Cloudflare-CDN-Cache-Control', 'public, max-age=60, must-revalidate');
    headers.delete('content-length');
    headers.delete('content-encoding');

    return new Response(text, {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  }

  // 3. Dynamic Edge Normalization for HTML Canonical, OpenGraph & JSON-LD Schema URLs
  if (contentType.includes('text/html') && response.ok) {
    let html = await response.text();
    const hostVariantRegex = new RegExp(
      `https?:\\/\\/(?:www\\.|admin\\.|masterworld\\.)+${escapedBareHost}`,
      'gi'
    );
    html = html
      .replace(hostVariantRegex, canonicalOrigin)
      .replace(/https?:\/\/localhost(?::\d+)?/gi, canonicalOrigin)
      .replace(
        /(<link[^>]+rel=["']canonical["'][^>]+href=["'])\/([^"']*["'])/gi,
        `$1${canonicalOrigin}/$2`
      )
      .replace(
        /(<meta[^>]+property=["']og:url["'][^>]+content=["'])\/([^"']*["'])/gi,
        `$1${canonicalOrigin}/$2`
      )
      .replace(
        /(<meta[^>]+name=["']twitter:url["'][^>]+content=["'])\/([^"']*["'])/gi,
        `$1${canonicalOrigin}/$2`
      );

    const headers = new Headers(response.headers);
    headers.delete('content-length');
    headers.delete('content-encoding');

    return new Response(html, {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  }

  return response;
}
