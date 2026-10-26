import { Router } from 'express';
import staticData from '../../lib/staticData.json';
import { fetchStoreData } from '../../seoHelper';
import { resolveAppSlug } from '../../lib/slugResolver';
import { formatNewsDate, calculateReadingTime, getPlainTextSnippet } from '../../lib/newsUtils';

export const publicApiRouter = Router();

function sanitizeAppForPublicClient(app: any, keepRichDetails: boolean): any {
  if (!app) return app;
  const hasSecureLink = Boolean(
    app.has_secure_link ||
    app.more_information_url ||
    app.download_url ||
    app.encrypted_link ||
    app.encrypted_download_url ||
    (app.url && !String(app.url).includes('com.example'))
  );

  if (keepRichDetails) {
    const copy = { ...app, has_secure_link: hasSecureLink };
    delete copy.more_information_url;
    delete copy.download_url;
    delete copy.encrypted_link;
    delete copy.encrypted_download_url;
    if (copy.url && String(copy.url).includes('com.example')) {
      copy.url = '';
    }
    return copy;
  }

  return {
    id: app.id,
    name: app.name,
    slug: typeof app.slug === 'string' ? app.slug.trim() : app.slug,
    category: app.category,
    icon_url: app.icon_url,
    rating: app.rating,
    reviews: app.reviews,
    review_count: app.review_count,
    downloads: app.downloads,
    size: app.size,
    version: app.version,
    developer: app.developer,
    safety_status: app.safety_status,
    is_hot: app.is_hot,
    is_new: app.is_new,
    is_coming_soon: app.is_coming_soon,
    publish_date: app.publish_date,
    serial_number: app.serial_number,
    short_description: app.short_description,
    meta_title: app.meta_title,
    meta_description: app.meta_description,
    seo_title: app.seo_title,
    seo_description: app.seo_description,
    canonical_url: app.canonical_url,
    has_secure_link: hasSecureLink
  };
}

function sanitizeNewsCardForPublicList(n: any): any {
  if (!n) return n;
  const rawBody = n.content || n.description_html || n.description || '';
  const excerpt = n.excerpt || n.seo_description || n.description || getPlainTextSnippet(rawBody, 160);
  const dateRaw = n.published_at || n.created_at || n.date || '';
  return {
    id: typeof n.id === 'string' ? n.id.trim() : n.id,
    slug: typeof n.slug === 'string' ? n.slug.trim() : n.slug,
    title: n.title,
    seo_title: n.seo_title,
    description: excerpt,
    excerpt,
    seo_description: n.seo_description || excerpt,
    category: n.category,
    logo_url: n.logo_url,
    image_url: n.image_url,
    og_image_url: n.og_image_url,
    published_at: n.published_at,
    created_at: n.created_at,
    updated_at: n.updated_at,
    date: n.date,
    formatted_date: n.formatted_date || formatNewsDate(dateRaw),
    reading_time: n.reading_time || calculateReadingTime(rawBody),
    is_pinned: n.is_pinned,
    related_app_id: n.related_app_id,
    link: n.link
  };
}

publicApiRouter.get('/api/v1/public/app/:slug', async (req, res) => {
  const slugParam = req.params.slug;
  if (!slugParam) {
    return res.status(400).json({ status: 'ERROR', error: 'Slug parameter is required' });
  }

  const data = await fetchStoreData();
  const apps = (data?.apps || (staticData as any)?.apps || []).filter((a: any) => a && a.sync_to_public !== false);
  const app = resolveAppSlug(slugParam, apps);

  if (app) {
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800');
    res.setHeader('CDN-Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
    res.setHeader('Cloudflare-CDN-Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
    const catalogApps = apps.map((a: any) => sanitizeAppForPublicClient(a, false));
    return res.json({ status: 'OK', app: sanitizeAppForPublicClient(app, true), catalogApps });
  }

  res.status(404).json({ status: 'NOT_FOUND', error: 'App not found' });
});

publicApiRouter.get('/api/v1/public/news', async (req, res) => {
  const data = await fetchStoreData();
  const rawNews = data?.news || (staticData as any)?.news || [];
  const news = Array.isArray(rawNews)
    ? rawNews.filter((n: any) => n && n.sync_to_public !== false).map(sanitizeNewsCardForPublicList)
    : [];
  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=600, stale-while-revalidate=86400');
  res.json({ status: 'OK', news });
});

publicApiRouter.get('/api/v1/public/news/:slug', async (req, res) => {
  const slugParam = decodeURIComponent(req.params.slug || '').toLowerCase().trim();
  if (!slugParam) {
    return res.status(400).json({ status: 'ERROR', error: 'Slug parameter is required' });
  }

  const data = await fetchStoreData();
  const newsList = (data?.news || (staticData as any)?.news || []).filter((n: any) => n && n.sync_to_public !== false);
  const newsItem = newsList.find((n: any) => {
    const s = String(n.slug || n.id || '').toLowerCase().trim();
    const id = String(n.id || '').toLowerCase().trim();
    return s === slugParam || id === slugParam;
  });

  if (newsItem) {
    res.setHeader('Cache-Control', 'public, max-age=1800, s-maxage=3600, stale-while-revalidate=604800');
    return res.json({ status: 'OK', news: newsItem });
  }

  res.status(404).json({ status: 'NOT_FOUND', error: 'News item not found' });
});

publicApiRouter.get('/api/v1/public/videos', async (req, res) => {
  const data = await fetchStoreData();
  const videos = data?.videos || (staticData as any)?.videos || [];
  res.setHeader('Cache-Control', 'public, max-age=600, s-maxage=1200, stale-while-revalidate=86400');
  res.json({ status: 'OK', videos });
});

function sanitizeSettingsForPublicClient(settings: any): any {
  if (!settings || typeof settings !== 'object') return {};
  const copy = { ...settings };
  delete copy.turnstile_secret_key;
  return copy;
}

publicApiRouter.get('/api/v1/public/settings', async (req, res) => {
  const data = await fetchStoreData();
  const settings = sanitizeSettingsForPublicClient(data?.settings || (staticData as any)?.settings || {});
  res.setHeader('Cache-Control', 'public, max-age=600, s-maxage=1800, stale-while-revalidate=86400');
  res.json({ status: 'OK', settings });
});

publicApiRouter.get('/api/v1/public/developers', async (req, res) => {
  const data = await fetchStoreData();
  const developers = data?.developers || data?.settings?.developers || (staticData as any)?.developers || [];
  res.setHeader('Cache-Control', 'public, max-age=1800, s-maxage=3600, stale-while-revalidate=86400');
  res.json({ status: 'OK', developers });
});

publicApiRouter.get('/api/v1/public/faqs', async (req, res) => {
  const data = await fetchStoreData();
  const faqs = data?.settings?.website_faqs || (staticData as any)?.settings?.website_faqs || [];
  res.setHeader('Cache-Control', 'public, max-age=1800, s-maxage=3600, stale-while-revalidate=86400');
  res.json({ status: 'OK', faqs });
});

publicApiRouter.get('/api/v1/public/backup-data', async (req, res) => {
  try {
    const data = await fetchStoreData();
    const staticApps = (staticData as any)?.apps || (staticData as any)?.mockApps || [];
    const sourceApps = (Array.isArray(data?.apps) && data.apps.length > 0) ? data.apps : staticApps;
    const rawApps = sourceApps.filter((a: any) => a && a.sync_to_public !== false);
    const rawNews = (data?.news || (staticData as any)?.news || (staticData as any)?.mockNews || []).filter((n: any) => n && n.sync_to_public !== false);
    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600');
    return res.json({
      apps: Array.isArray(rawApps) ? rawApps.map((a: any) => sanitizeAppForPublicClient(a, false)) : [],
      settings: sanitizeSettingsForPublicClient(data?.settings || (staticData as any)?.settings || (staticData as any)?.mockSettings || {}),
      news: Array.isArray(rawNews) ? rawNews.map(sanitizeNewsCardForPublicList) : [],
      videos: data?.videos || (staticData as any)?.videos || (staticData as any)?.mockVideos || [],
      reviews: []
    });
  } catch (err) {
    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300');
    return res.json(staticData);
  }
});

publicApiRouter.get('/api/v1/public/backup-data-full', async (req, res) => {
  try {
    const data = await fetchStoreData();
    const staticApps = (staticData as any)?.apps || (staticData as any)?.mockApps || [];
    const sourceApps = (Array.isArray(data?.apps) && data.apps.length > 0) ? data.apps : staticApps;
    const rawApps = sourceApps.filter((a: any) => a && a.sync_to_public !== false);
    const rawNews = (data?.news || (staticData as any)?.news || (staticData as any)?.mockNews || []).filter((n: any) => n && n.sync_to_public !== false);
    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600');
    return res.json({
      apps: Array.isArray(rawApps) ? rawApps.map((a: any) => sanitizeAppForPublicClient(a, true)) : [],
      settings: sanitizeSettingsForPublicClient(data?.settings || (staticData as any)?.settings || (staticData as any)?.mockSettings || {}),
      news: rawNews,
      videos: data?.videos || (staticData as any)?.videos || (staticData as any)?.mockVideos || [],
      reviews: data?.reviews || []
    });
  } catch (err) {
    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300');
    return res.json(staticData);
  }
});
