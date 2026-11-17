import { getField } from './utils';
import { resolveAppSlug } from '../lib/slugResolver';
import * as renderers from './renderers/index';
import { getLocalFallbackReviewsForApp } from './reviewFallback';

function wrapWithLayout(bodyContent: string, settings: any): string {
  const headerHtml = renderers.renderHeader(settings);
  const tickerHtml = renderers.renderTicker(settings);
  const footerHtml = renderers.renderFooter(settings);
  return `
    <div class="flex flex-col min-h-screen">
      <a href="#main-content" class="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:font-semibold focus:rounded-lg focus:shadow-lg focus:outline-none">Skip to main content</a>
      ${headerHtml}
      <main id="main-content" tabindex="-1" class="flex-1 w-full max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8 py-0 sm:py-3 pb-16 sm:pb-24 [overflow-x:clip] relative focus:outline-none">
        <div class="w-full h-full">
          ${bodyContent}
        </div>
      </main>
      ${tickerHtml}
      ${footerHtml}
    </div>
  `;
}

export async function getPagePreRender(urlPath: string, data: any): Promise<string> {
  const { apps: rawApps = [], settings = {}, news: rawNews = [], videos: rawVideos = [], developers = [] } = data || {};
  const apps = Array.isArray(rawApps) ? rawApps.filter((a: any) => a && a.sync_to_public !== false) : [];
  const news = Array.isArray(rawNews) ? rawNews.filter((n: any) => n && n.sync_to_public !== false) : [];
  const videos = Array.isArray(rawVideos)
    ? rawVideos.filter((v: any) => v && v.sync_to_public !== false && v.sync_to_public !== 'false' && v.is_published !== false && v.is_draft !== true)
    : [];
  const cleanPath = urlPath.split('?')[0].split('#')[0].replace(/\/+$/, '') || '/';
  const cleanPathLower = cleanPath.toLowerCase();

  if (cleanPathLower.startsWith('/admin') || cleanPathLower.startsWith('/masterworld')) {
    return `
      <div class="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white font-sans">
        <div class="flex flex-col items-center gap-3">
          <div class="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <span class="text-xs font-mono text-slate-400">Loading Masterworld Admin...</span>
        </div>
      </div>
    `;
  }

  let bodyHtml = '';

  if (cleanPathLower === '/' || cleanPathLower === '') {
    let pageNum = 1;
    try {
      const match = urlPath.match(/[?&]page=(\d+)/i);
      if (match && match[1]) {
        pageNum = Math.max(1, parseInt(match[1], 10) || 1);
      }
    } catch (_) {}
    bodyHtml = renderers.renderHome(apps, settings, news, videos, pageNum);
  } else if (cleanPathLower === '/new-apps') {
    bodyHtml = renderers.renderHome(apps, settings, news, videos, 1, {
      activeTab: 'All Apps',
      isNewAppsRoute: true
    });
  } else if (cleanPathLower === '/categories') {
    bodyHtml = renderers.renderHome(apps, settings, news, videos, 1, {
      activeTab: 'Categories'
    });
  } else if (cleanPathLower.startsWith('/category/') || cleanPathLower.startsWith('/categories/')) {
    const rawCatSlug = cleanPathLower.replace(/^\/(category|categories)\/?/, '').replace(/^\/|\/$/g, '');
    const rawCat = rawCatSlug.toLowerCase().replace(/[-_]+/g, ' ').trim();
    const allKnownCats = (Array.isArray(settings?.categories) && settings.categories.length > 0)
      ? settings.categories
      : ['All Apps', 'Games', 'Apps', 'Entertainment'];
    const matched = allKnownCats.find((c: string) =>
      c.toLowerCase().trim() === rawCat ||
      c.toLowerCase().replace(/[-_\s]+/g, '') === rawCat.replace(/\s+/g, '') ||
      rawCat.includes(c.toLowerCase().trim())
    );
    const resolvedTab = matched || (rawCat
      ? rawCat.split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
      : 'All Apps');
    bodyHtml = renderers.renderHome(apps, settings, news, videos, 1, {
      activeTab: resolvedTab
    });
  } else if (cleanPathLower === '/news') {
    let pageNum = 1;
    try {
      const match = urlPath.match(/[?&]page=(\d+)/i);
      if (match && match[1]) {
        pageNum = Math.max(1, parseInt(match[1], 10) || 1);
      }
    } catch (_) {}
    bodyHtml = renderers.renderNewsList(news, settings, pageNum);
  } else if (cleanPathLower.startsWith('/news/')) {
    const rawNewsSlug = cleanPath.split('/news/')[1] || '';
    const cleanNewsSlug = decodeURIComponent(rawNewsSlug).toLowerCase().trim().replace(/\/+$/, '').split(/[?#]/)[0];
    const newsItem = news.find((n: any) => {
      const nSlug = (getField(n, 'slug') || '').toLowerCase().trim();
      const nId = (getField(n, 'id') || '').toLowerCase().trim();
      return (nSlug && nSlug === cleanNewsSlug) || (nId && nId === cleanNewsSlug);
    });
    if (newsItem) {
      bodyHtml = renderers.renderNewsDetail(cleanNewsSlug, news, settings, apps);
    } else {
      const matchedApp = apps.find((a: any) => {
        const aSlug = (getField(a, 'slug') || '').toLowerCase().trim();
        const aId = (getField(a, 'id') || '').toLowerCase().trim();
        return (aSlug && aSlug === cleanNewsSlug) || (aId && aId === cleanNewsSlug);
      });
      if (matchedApp) {
        bodyHtml = renderers.renderAppDetails(cleanNewsSlug, apps, settings, [], null, news);
      } else {
        bodyHtml = renderers.render404(urlPath, settings);
      }
    }
  } else if (cleanPathLower === '/videos') {
    bodyHtml = renderers.renderVideosList(videos, settings);
  } else if (cleanPathLower.startsWith('/videos/') || cleanPathLower.startsWith('/video/')) {
    const slug = cleanPath.replace(/^\/videos?\//i, '').trim();
    bodyHtml = renderers.renderVideoDetail(slug, videos, settings);
  } else if (cleanPathLower === '/about') {
    bodyHtml = renderers.renderAbout(settings);
  } else if (cleanPathLower === '/contact') {
    bodyHtml = renderers.renderContact(settings);
  } else if (cleanPathLower === '/privacy') {
    bodyHtml = renderers.renderPrivacy(settings);
  } else if (cleanPathLower === '/terms') {
    bodyHtml = renderers.renderTerms(settings);
  } else if (cleanPathLower === '/responsibility') {
    bodyHtml = renderers.renderResponsibility(settings);
  } else if (cleanPathLower === '/report-removal') {
    bodyHtml = renderers.renderReportRemoval(settings);
  } else if (cleanPathLower === '/notice') {
    bodyHtml = renderers.renderNotice(settings);
  } else if (cleanPathLower === '/ethics') {
    bodyHtml = renderers.renderEthics(settings);
  } else if (cleanPathLower === '/disclaimer') {
    bodyHtml = renderers.renderDisclaimer(settings);
  } else if (cleanPathLower === '/developers' || cleanPathLower === '/developer') {
    bodyHtml = renderers.renderDevelopersList(developers, settings);
  } else if (cleanPathLower === '/faq' || cleanPathLower === '/faqs') {
    bodyHtml = renderers.renderFaqPage(settings);
  } else if (cleanPathLower === '/safety' || cleanPathLower === '/safety-status') {
    bodyHtml = renderers.renderResponsibility(settings);
  } else if (cleanPathLower.startsWith('/moreinfo/')) {
    const parts = cleanPathLower.split('/');
    const slug = parts[parts.length - 1];
    bodyHtml = renderers.renderGateway(slug, settings, apps);
  } else if (cleanPathLower.startsWith('/app/')) {
    const slug = cleanPathLower.replace(/^\/app\//, '/').replace(/^\/|\/$/g, '');
    const matchedApp = resolveAppSlug(slug, apps) || apps.find((a: any) => getField(a, 'slug')?.toLowerCase() === slug.toLowerCase());
    const seoFeed = matchedApp ? getLocalFallbackReviewsForApp(getField(matchedApp, 'id'), getField(matchedApp, 'slug')) : { reviews: [], stats: null };
    bodyHtml = renderers.renderAppDetails(slug, apps, settings, seoFeed.reviews, seoFeed.stats, news);
  } else {
    const slug = cleanPathLower.replace(/^\/|\/$/g, '');
    const app = resolveAppSlug(slug, apps) || apps.find((a: any) => getField(a, 'slug')?.toLowerCase() === slug);
    const newsItem = news.find((n: any) => getField(n, 'slug')?.toLowerCase() === slug);
    const videoItem = videos.find((v: any) => getField(v, 'slug')?.toLowerCase() === slug);

    if (app) {
      const seoFeed = getLocalFallbackReviewsForApp(getField(app, 'id'), getField(app, 'slug'));
      bodyHtml = renderers.renderAppDetails(slug, apps, settings, seoFeed.reviews, seoFeed.stats, news);
    } else if (newsItem) {
      bodyHtml = renderers.renderNewsDetail(slug, news, settings, apps);
    } else if (videoItem) {
      bodyHtml = renderers.renderVideoDetail(slug, videos, settings);
    } else {
      bodyHtml = renderers.render404(urlPath, settings);
    }
  }

  return wrapWithLayout(bodyHtml, settings);
}
