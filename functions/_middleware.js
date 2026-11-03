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
        'Cache-Control': 'public, max-age=31536000'
      }
    });
  }

  const response = await context.next();

  // Do not rewrite Admin portal responses or API routes
  const pathname = url.pathname;
  if (
    rawHost.startsWith('admin.') ||
    rawHost.startsWith('masterworld.') ||
    pathname.startsWith('/api/')
  ) {
    return response;
  }

  // Enforce strict no-store and noindex on /moreinfo gateway routes at the edge
  if (pathname.toLowerCase().startsWith('/moreinfo')) {
    const headers = new Headers(response.headers);
    headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private, max-age=0');
    headers.set('CDN-Cache-Control', 'no-store, private');
    headers.set('Cloudflare-CDN-Cache-Control', 'no-store, private');
    headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet');
    headers.set('Referrer-Policy', 'no-referrer');
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
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
