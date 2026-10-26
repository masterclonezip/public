/**
 * AppDetails deep overview
 * Renders technical and design features of individual applications with peer user reviews.
 */

import { useParams, useNavigate } from 'react-router-dom';
import { useData } from '../contexts/DataContextPublic';
import { Check } from 'lucide-react';
import { useEffect, useMemo, useState, useRef } from 'react';
import Meta from '../components/Meta';
import { useLiveAppStats } from '../hooks/useReviews';
import { getCachedLiveAppStats } from '../lib/communityFirebase';

import { mockApps as staticMockApps, loadFullStaticDataset } from '../lib/lightFallback';
import { resolveAppSlug } from '../lib/slugResolver';
import { getPrefetchedApp } from '../lib/preloadHelper';
import AppDetailsSkeleton from '../components/public/AppDetailsSkeleton';
import AppHeader from '../components/public/AppHeader';
import AppActionButtons from '../components/public/AppActionButtons';
import AppScreenshots from '../components/public/AppScreenshots';
import AppAboutSection from '../components/public/AppAboutSection';
import AppFaqSection from '../components/public/AppFaqSection';
import AppSpecsBar from '../components/public/AppSpecsBar';
import AppSafetyBoxes from '../components/public/AppSafetyBoxes';
import UserReviews from '../components/UserReviews';
import { AppDetailsNavigation } from '../components/public/appDetails/AppDetailsNavigation';
import { AppSimilarCarousel } from '../components/public/appDetails/AppSimilarCarousel';
import AppNotFound from '../components/public/appDetails/AppNotFound';
import { buildSoftwareSchema, buildWebPageSchema, buildBreadcrumbSchema, buildFaqSchema } from '../components/public/appDetails/appDetailsSchemas';

export { AppDetailsSkeleton };

export default function AppDetails() {
  const { apps: mockApps, news: mockNews, settings: mockSettings, loading, refreshAll, updateAppDetail, mergeCatalogApps } = useData();
  const { slug: routeSlug, "*": splat } = useParams();
  const navigate = useNavigate();
  const decodedSplat = splat ? decodeURIComponent(splat) : '';
  const splatStripped = decodedSplat.replace(/^\/app\//, '/').replace(/^\/|\/$/g, '');
  const slug = routeSlug || splatStripped;

  const [fetchedApp, setFetchedApp] = useState<any | null>(null);
  const [isFetchingDetails, setIsFetchingDetails] = useState(false);
  const [remoteCheckDoneSlug, setRemoteCheckDoneSlug] = useState<string>('');

  // Instant multi-tier app resolution: Prioritizes full specifications, descriptions, and metadata
  const app = useMemo(() => {
    if (!slug) return null;
    const cleanKey = slug.toLowerCase().trim();

    // Only use fetchedApp if it explicitly matches the current slug
    const validFetchedApp =
      fetchedApp &&
      (String(fetchedApp.slug || '').toLowerCase().trim() === cleanKey ||
        String(fetchedApp.id || '').toLowerCase().trim() === cleanKey ||
        Boolean(resolveAppSlug(cleanKey, [fetchedApp])))
        ? fetchedApp
        : null;

    // 1. Resolve app from available sources (fetched, prefetched, client state, SSR initial data, and static catalogue)
    const prefetched = getPrefetchedApp(cleanKey);
    const validPrefetched =
      prefetched &&
      (String(prefetched.slug || '').toLowerCase().trim() === cleanKey ||
        String(prefetched.id || '').toLowerCase().trim() === cleanKey ||
        Boolean(resolveAppSlug(cleanKey, [prefetched])))
        ? prefetched
        : null;

    let resolvedApp = validFetchedApp || validPrefetched;
    if (!resolvedApp && Array.isArray(mockApps)) {
      resolvedApp = resolveAppSlug(cleanKey, mockApps);
    }
    if (!resolvedApp && typeof window !== 'undefined' && (window as any).__INITIAL_DATA__?.apps) {
      resolvedApp = resolveAppSlug(cleanKey, (window as any).__INITIAL_DATA__.apps);
    }
    if (!resolvedApp && Array.isArray(staticMockApps)) {
      resolvedApp = resolveAppSlug(cleanKey, staticMockApps);
    }

    if (!resolvedApp) return null;

    // 2. High-reliability fallback: If resolvedApp is missing rich content (description_html, features_html, etc.),
    // immediately recover them from staticMockApps or mockApps so the user and web crawlers see the full overview with 0ms delay.
    let descHtml = resolvedApp.description_html || '';
    let featHtml = resolvedApp.features_html || '';
    let screenShots = Array.isArray(resolvedApp.screenshots) && resolvedApp.screenshots.length > 0 ? resolvedApp.screenshots : [];
    let faqsList = Array.isArray(resolvedApp.faqs) && resolvedApp.faqs.length > 0 ? resolvedApp.faqs : [];
    let customBoxHtml = resolvedApp.custom_admin_box_html || '';
    let customBoxHeading = resolvedApp.custom_admin_box_heading || '';

    const fallbackApp = resolveAppSlug(slug, staticMockApps || []) || 
                        (typeof window !== 'undefined' && (window as any).__INITIAL_DATA__?.apps ? resolveAppSlug(slug, (window as any).__INITIAL_DATA__.apps) : null) ||
                        resolveAppSlug(slug, mockApps || []);

    if (fallbackApp) {
      if (!descHtml || descHtml.trim().length <= 10) {
        if (fallbackApp.description_html && fallbackApp.description_html.trim().length > 10) {
          descHtml = fallbackApp.description_html;
        }
      }
      if (!featHtml || featHtml.trim().length <= 5) {
        if (fallbackApp.features_html && fallbackApp.features_html.trim().length > 5) {
          featHtml = fallbackApp.features_html;
        }
      }
      if (screenShots.length === 0 && Array.isArray(fallbackApp.screenshots) && fallbackApp.screenshots.length > 0) {
        screenShots = fallbackApp.screenshots;
      }
      if (faqsList.length === 0 && Array.isArray(fallbackApp.faqs) && fallbackApp.faqs.length > 0) {
        faqsList = fallbackApp.faqs;
      }
      if (!customBoxHtml && fallbackApp.custom_admin_box_html) {
        customBoxHtml = fallbackApp.custom_admin_box_html;
      }
      if (!customBoxHeading && fallbackApp.custom_admin_box_heading) {
        customBoxHeading = fallbackApp.custom_admin_box_heading;
      }
    }

    return {
      ...resolvedApp,
      description_html: descHtml,
      features_html: featHtml,
      screenshots: screenShots,
      faqs: faqsList,
      custom_admin_box_html: customBoxHtml,
      custom_admin_box_heading: customBoxHeading,
      release_notes: resolvedApp.release_notes || '',
      yellow_box_msg: resolvedApp.yellow_box_msg || '',
      red_box_msg: resolvedApp.red_box_msg || '',
      idea_box_msg: resolvedApp.idea_box_msg || '',
      file_size: resolvedApp.file_size || '45 MB',
      version: resolvedApp.version || '1.0.0',
      developer: resolvedApp.developer || 'Developer',
      safety_status: resolvedApp.safety_status || 'Verified',
    };
  }, [slug, mockApps, fetchedApp]);
  
  const [triedRefresh, setTriedRefresh] = useState(false);
  const syncAttemptedRef = useRef<Record<string, boolean>>({});
  const [reviewsRefreshKey] = useState(0);
  const liveStats = useLiveAppStats(app?.id || '', app?.slug || '');

  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [shareToast, setShareToast] = useState(false);

  const specificCategory = useMemo(() => {
    if (!app?.category) return 'All Apps';
    const first = app.category.split(',')[0]?.trim() || '';
    return (first && !['all apps', 'all', 'apps', 'general'].includes(first.toLowerCase())) ? first : 'All Apps';
  }, [app?.category]);

  // Single-pass high-performance category metrics and balanced circular internal linking
  const { relatedApps, totalCategoryAppsCount } = useMemo(() => {
    if (!app || !Array.isArray(mockApps) || mockApps.length === 0) {
      return { relatedApps: [], totalCategoryAppsCount: 0 };
    }

    const currentCatLower = specificCategory.toLowerCase();
    const isAll = currentCatLower === 'all apps';
    const appId = String(app.id || '');
    const appSlug = String(app.slug || '').toLowerCase();

    const newApps: any[] = [];
    const regularApps: any[] = [];
    let totalCatCount = 0;

    for (let i = 0; i < mockApps.length; i++) {
      const a = mockApps[i] as any;
      if (!a || a.sync_to_public === false || a.is_Safety_alert === true || a.status === 'flagged') continue;

      const isCurrent = String(a.id) === appId || (a.slug && a.slug.toLowerCase() === appSlug);
      const aCat = (a.category || '').toLowerCase();
      const matchesCategory = isAll || aCat.includes(currentCatLower);

      if (matchesCategory) {
        totalCatCount++;
        if (!isCurrent) {
          const rawItem = a as any;
          const badgeStr = typeof rawItem.badge === 'string' ? rawItem.badge.trim().toUpperCase() : '';
          const tagsArr = Array.isArray(rawItem.tags) ? rawItem.tags : [];
          const isNew = Boolean(
            rawItem.is_new === true || rawItem.is_new === 'true' || rawItem.is_new === 1 ||
            rawItem.isNew === true || rawItem.isNew === 'true' || rawItem.isNew === 1 ||
            badgeStr === 'NEW' || badgeStr.includes('NEW') ||
            tagsArr.some((t: any) => String(t).toUpperCase().includes('NEW'))
          );
          if (isNew) {
            newApps.push(a);
          } else {
            regularApps.push(a);
          }
        }
      }
    }

    // 1. Sort new apps strictly by serial_number ascending
    newApps.sort((a, b) => (Number(a.serial_number) || 999999) - (Number(b.serial_number) || 999999));

    // 2. Sort regular apps strictly by serial_number ascending
    regularApps.sort((a, b) => (Number(a.serial_number) || 999999) - (Number(b.serial_number) || 999999));

    const maxCount = 16;
    const strSeed = String(app.slug || app.id || '');
    let seedHash = 0;
    for (let i = 0; i < strSeed.length; i++) seedHash = ((seedHash << 5) - seedHash) + strSeed.charCodeAt(i);
    const absSeed = Math.abs(seedHash);

    const maxNewSlots = Math.min(newApps.length, 6);
    const pinnedNew: any[] = [];
    if (maxNewSlots > 0 && newApps.length > 0) {
      const newStart = absSeed % newApps.length;
      for (let s = 0; s < maxNewSlots; s++) {
        pinnedNew.push(newApps[(newStart + s) % newApps.length]);
      }
    }
    const remainingSlots = maxCount - pinnedNew.length;

    // Balanced Circular Internal Linking:
    // Stagger regular apps circularly starting right after current app's position
    const pickedRegular: any[] = [];
    if (remainingSlots > 0 && regularApps.length > 0) {
      let startIndex = absSeed % regularApps.length;
      const currSerial = Number(app.serial_number);
      if (!isNaN(currSerial) && currSerial > 0) {
        const nextIdx = regularApps.findIndex(a => (Number(a.serial_number) || 0) > currSerial);
        if (nextIdx !== -1) startIndex = nextIdx;
      }

      const countToPick = Math.min(remainingSlots, regularApps.length);
      for (let step = 0; step < countToPick; step++) {
        pickedRegular.push(regularApps[(startIndex + step) % regularApps.length]);
      }
    }

    const mapped = [...pinnedNew, ...pickedRegular].map((a: any) => ({
      id: a.id,
      name: a.name,
      slug: a.slug,
      icon_url: a.icon_url,
      is_new: Boolean(a.is_new === true || a.is_new === 'true' || a.isNew || a.badge?.toLowerCase() === 'new'),
      is_hot: Boolean(a.is_hot === true || a.is_hot === 'true' || a.isHot || a.badge?.toLowerCase() === 'hot'),
      serial_number: a.serial_number
    }));

    return { relatedApps: mapped, totalCategoryAppsCount: totalCatCount };
  }, [mockApps, app?.category, app?.id, app?.slug, app?.serial_number, specificCategory]);

  useEffect(() => {
    if (!app?.is_coming_soon || !app?.publish_date) {
      setTimeRemaining(null);
      return;
    }

    const calculateRemaining = () => {
      const remaining = new Date(app.publish_date!).getTime() - new Date().getTime();
      setTimeRemaining(remaining > 0 ? remaining : 0);
    };

    calculateRemaining();
    const interval = setInterval(calculateRemaining, 1000);
    return () => clearInterval(interval);
  }, [app?.is_coming_soon, app?.publish_date]);

  const isActuallyComingSoon = app?.is_coming_soon && (timeRemaining === null || timeRemaining > 0);

  const activeSlugRef = useRef<string>(slug?.toLowerCase().trim() || '');
  activeSlugRef.current = slug?.toLowerCase().trim() || '';

  useEffect(() => {
    window.scrollTo(0, 0);
    setTriedRefresh(false);
    const curKey = slug?.toLowerCase().trim() || '';
    setFetchedApp((prev: any) => {
      if (!prev || !curKey) return null;
      const fSlug = String(prev.slug || prev.id || '').toLowerCase().trim();
      if (fSlug === curKey || resolveAppSlug(curKey, [prev])) return prev;
      return null;
    });
    setIsFetchingDetails(false);
  }, [slug]);

  useEffect(() => {
    const handlePrefetched = (evt: any) => {
      const prefetched = evt?.detail?.app;
      const curKey = activeSlugRef.current;
      if (prefetched && curKey) {
        const pSlug = String(prefetched.slug || prefetched.id || '').toLowerCase().trim();
        if (pSlug === curKey || resolveAppSlug(curKey, [prefetched])) {
          setFetchedApp(prefetched);
        }
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('yd-app-details-prefetched', handlePrefetched);
      return () => window.removeEventListener('yd-app-details-prefetched', handlePrefetched);
    }
  }, [slug]);

  useEffect(() => {
    if (app?.slug && slug) {
      const canonicalSlug = String(app.slug).trim().replace(/^\/+|\/+$/g, '');
      const requestedSlug = String(slug).trim().replace(/^\/+|\/+$/g, '');
      if (
        canonicalSlug &&
        requestedSlug &&
        canonicalSlug.toLowerCase() !== requestedSlug.toLowerCase() &&
        Boolean(resolveAppSlug(requestedSlug, [app]))
      ) {
        navigate(`/app/${canonicalSlug}`, { replace: true });
      }
    }
  }, [app, slug, navigate]);

  useEffect(() => {
    const slugKey = slug?.toLowerCase().trim() || '';
    if (!slugKey) return;

    // 1. Check if app already has complete rich content (description & features) from pre-render or memory
    const isFullPreRenderedApp = Boolean(
      app &&
      !(app as any)._isTrimmed &&
      ((app as any)._isFullApp ||
        (app.description_html && app.description_html.trim().length > 15 && Array.isArray(app.screenshots) && app.screenshots.length > 0))
    );
    if (isFullPreRenderedApp && Array.isArray(mockApps) && mockApps.length > 5) {
      setRemoteCheckDoneSlug(slugKey);
      return;
    }

    // 2. Check if fetchedApp is already loaded for this slug
    const fetchedSlug = fetchedApp ? String(fetchedApp.slug || fetchedApp.id || '').toLowerCase().trim() : '';
    if (fetchedApp && (fetchedSlug === slugKey || resolveAppSlug(slugKey, [fetchedApp]))) {
      setRemoteCheckDoneSlug(slugKey);
      return;
    }

    const prefetched = getPrefetchedApp(slugKey);
    if (
      prefetched &&
      (String(prefetched.slug || prefetched.id || '').toLowerCase().trim() === slugKey || resolveAppSlug(slugKey, [prefetched])) &&
      prefetched.description_html &&
      prefetched.description_html.trim().length > 10 &&
      Array.isArray(mockApps) &&
      mockApps.length > 5
    ) {
      setFetchedApp(prefetched);
      if (updateAppDetail) updateAppDetail(prefetched);
      setRemoteCheckDoneSlug(slugKey);
      return;
    }

    // 3. Instant 0ms memory fallback from static dataset (instant FCP/LCP when switching URLs)
    loadFullStaticDataset().then(dataset => {
      if (activeSlugRef.current !== slugKey) return;
      const match = resolveAppSlug(slugKey, dataset?.apps || []);
      if (match && match.description_html && match.description_html.trim().length > 10) {
        setFetchedApp(match);
        if (updateAppDetail) updateAppDetail(match);
      }
    }).catch(() => {});

    if (!syncAttemptedRef.current[slugKey]) {
      syncAttemptedRef.current[slugKey] = true;
      setIsFetchingDetails(true);

      fetch(`/api/v1/public/app/${encodeURIComponent(slugKey)}`)
        .then(res => {
          if (res.ok) return res.json();
          throw new Error(`HTTP ${res.status}`);
        })
        .then(data => {
          if (data?.status === 'OK' && data?.app) {
            if (
              Array.isArray(data.catalogApps) &&
              data.catalogApps.length > 0 &&
              mergeCatalogApps &&
              (!Array.isArray(mockApps) || mockApps.length < data.catalogApps.length)
            ) {
              mergeCatalogApps(data.catalogApps);
            }
            if (updateAppDetail) updateAppDetail(data.app);
            if (activeSlugRef.current === slugKey) {
              setFetchedApp(data.app);
            }
          }
        })
        .catch(() => {
          // Graceful fallback to static local cache
        })
        .finally(() => {
          if (activeSlugRef.current === slugKey) {
            setIsFetchingDetails(false);
            setRemoteCheckDoneSlug(slugKey);
          }
        });
    }
  }, [slug, fetchedApp, app, mockApps, updateAppDetail, mergeCatalogApps]);

  const cleanSlugKey = slug?.toLowerCase().trim() || '';
  if (!app && (loading || isFetchingDetails || (cleanSlugKey && remoteCheckDoneSlug !== cleanSlugKey))) {
    return <AppDetailsSkeleton />;
  }
  if (!app) return <AppNotFound slug={slug || ''} />;

  const title = app.seo_title || app.meta_title || app.name;
  
  const stripHtml = (html: string) => {
    if (!html) return '';
    return html.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
  };

  const cleanSeoDescription = (rawDesc: string) => {
    if (!rawDesc) return '';
    const trimmed = rawDesc.trim();
    if (trimmed.startsWith('<') || trimmed.includes('<meta ')) {
      const metaMatch = trimmed.match(/<meta\s+name=["']description["']\s+content=["'](.*?)["']/i);
      if (metaMatch && metaMatch[1]) return metaMatch[1].trim();
      const ogMatch = trimmed.match(/<meta\s+property=["']og:description["']\s+content=["'](.*?)["']/i);
      if (ogMatch && ogMatch[1]) return ogMatch[1].trim();
      return stripHtml(trimmed);
    }
    return trimmed;
  };
  
  const desc = cleanSeoDescription(app.seo_description || app.meta_description) || (app.description_html ? stripHtml(app.description_html).substring(0, 160) : `${app.name} application specifications`);
  const ogImage = app.og_image_url || app.icon_url;

  const staticStats = getCachedLiveAppStats(app?.id, app?.slug) || getCachedLiveAppStats(slug, slug);
  const activeStats = (liveStats && Number(liveStats.totalReviews) > 0) ? liveStats : staticStats;
  const hasLiveReviews = Boolean(activeStats && Number(activeStats.totalReviews) > 0);
  const realRatingVal = hasLiveReviews
    ? Math.max(1.0, Math.min(5.0, parseFloat(String(activeStats.averageRating))))
    : (app.rating ? Math.max(1.0, Math.min(5.0, parseFloat(String(app.rating)))) : 4.5);
  const configuredCount = parseInt(String(app.review_count || (app as any).reviews || '').replace(/[^0-9]/g, ''), 10) || 0;
  const realReviewCount = hasLiveReviews 
    ? Number(activeStats.totalReviews) 
    : configuredCount;

  const softwareSchema = buildSoftwareSchema(app, desc, hasLiveReviews, realRatingVal, realReviewCount);
  const webPageSchema = buildWebPageSchema(app, title, desc);
  const breadcrumbSchema = buildBreadcrumbSchema(app, specificCategory);
  const faqSchema = buildFaqSchema(app);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(window.location.href)
      .then(() => {
        setShareToast(true);
        setTimeout(() => setShareToast(false), 2050);
      })
      .catch((err) => console.error('Failed to copy text: ', err));
  };

  const handleShare = async () => {
    const shareUrl = app.canonical_url || window.location.href;
    const shareTitle = title;
    const shareText = desc;
    if (navigator.share) {
      try {
        await navigator.share({ title: shareTitle, text: shareText, url: shareUrl });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') copyToClipboard();
      }
    } else {
      copyToClipboard();
    }
  };

  const relatedNewsArticles = useMemo(() => {
    if (!mockNews || !Array.isArray(mockNews)) return [];
    const nameLower = (app?.name || '').toLowerCase().trim();
    const appId = app?.id;
    const appSlugLower = (app?.slug || '').toLowerCase().trim();
    return mockNews.filter(n => {
      if (!n || n.sync_to_public === false) return false;
      if (appId && (n.related_app_id === appId || String(n.related_app_id).toLowerCase() === appSlugLower)) return true;
      if (!nameLower) return false;
      return (
        n.title?.toLowerCase().includes(nameLower) ||
        n.description?.toLowerCase().includes(nameLower) ||
        (Array.isArray(n.tags) && n.tags.some((t: string) => t.toLowerCase() === nameLower))
      );
    });
  }, [mockNews, app?.name, app?.id, app?.slug]);

  const relatedNewsCount = relatedNewsArticles.length;
  const primaryNewsSlug = relatedNewsArticles.length > 0 ? relatedNewsArticles[0]?.slug : undefined;

  return (
    <div className="w-full">
      {shareToast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-5 py-3 rounded-full shadow-xl flex items-center gap-2 border border-white/10 dark:border-black/5 animate-fade-in transition-all"
        >
          <Check className="w-4 h-4 text-green-500 font-bold animate-bounce" />
          <span className="text-sm font-semibold tracking-wide">Link copied to clipboard!</span>
        </div>
      )}
      
      <AppDetailsNavigation appName={app.name} relatedNewsCount={relatedNewsCount} relatedNewsSlug={primaryNewsSlug} />

      <Meta 
        title={title}
        description={desc}
        keywords={app.seo_keywords}
        image={ogImage}
        canonical={app.canonical_url || `${typeof window !== 'undefined' ? window.location.origin : ''}/app/${app.slug}`}
        schema={[softwareSchema, webPageSchema, ...(faqSchema ? [faqSchema] : [])]}
        breadcrumbSchema={breadcrumbSchema}
      />
      <div className="w-full">
        <AppHeader app={app} />

        <AppSpecsBar 
          rating={realRatingVal} 
          file_size={app.file_size} 
          category={app.category} 
          version={app.version} 
        />

        <AppActionButtons 
          app={app} 
          isActuallyComingSoon={isActuallyComingSoon} 
          timeRemaining={timeRemaining} 
          handleShare={handleShare} 
        />

        <AppSimilarCarousel 
          relatedApps={relatedApps} 
          specificCategory={specificCategory} 
          totalCategoryCount={totalCategoryAppsCount}
          isLoading={relatedApps.length === 0 && (loading || isFetchingDetails || (Array.isArray(mockApps) && mockApps.length <= 1))}
        />

        <div>
          <AppScreenshots app={app} />
        </div>

        <div>
          <AppAboutSection app={app} isFetching={isFetchingDetails && !app.description_html} />
        </div>

        <div>
          <AppSafetyBoxes app={app} />
        </div>
      </div>

      {relatedNewsArticles.length > 0 && (
        <aside data-nosnippet aria-labelledby="app-related-news-heading" className="px-1 xs:px-2 sm:px-4 md:px-6 mb-6 xs:mb-8 text-left">
          <div className="py-5 border-t border-black/5 dark:border-white/5">
            <h2 id="app-related-news-heading" className="text-base xs:text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-3">
              Related News &amp; Updates
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {relatedNewsArticles.slice(0, 6).map((rn: any) => {
                const rnSlug = String(rn.slug || rn.id || '').trim();
                const rnTitle = rn.title || 'News Article';
                return (
                  <a
                    key={rn.id || rnSlug}
                    href={`/news/${encodeURIComponent(rnSlug)}`}
                    onClick={(e) => {
                      e.preventDefault();
                      navigate(`/news/${encodeURIComponent(rnSlug)}`);
                    }}
                    className="p-3 rounded-xl border border-zinc-200/70 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/50 hover:bg-zinc-100/80 dark:hover:bg-zinc-800/80 transition-colors flex items-center justify-between gap-2 no-underline"
                  >
                    <span className="text-xs sm:text-sm font-semibold text-zinc-800 dark:text-zinc-200 line-clamp-2">{rnTitle}</span>
                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400 shrink-0">Read →</span>
                  </a>
                );
              })}
            </div>
          </div>
        </aside>
      )}

      <div className="px-1 xs:px-2 sm:px-4 md:px-6 mb-6 xs:mb-8">
        <UserReviews 
          key={`${app.id}_${app.slug || ''}_${reviewsRefreshKey}`} 
          appId={app.id} 
          appTitle={app.name} 
          appSlug={app.slug}
          category={app.category}
          overallRating={realRatingVal} 
          totalReviewCount={realReviewCount} 
        />
      </div>
      
      <div>
        <AppFaqSection faqs={app.faqs} />
      </div>
    </div>
  );
}
