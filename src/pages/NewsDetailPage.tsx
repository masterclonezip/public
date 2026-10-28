import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, Link, Navigate, useNavigate } from 'react-router-dom';
import Meta from '../components/Meta';
import { useData } from '../contexts/DataContextPublic';
import { mockNews as staticMockNews, loadFullStaticDataset } from '../lib/lightFallback';
import { ArrowLeft, ShieldAlert } from 'lucide-react';
import { safeHtml } from '../lib/safeHtmlPublic';
import { NewsArticleHeader } from '../components/public/newsDetails/NewsArticleHeader';
import { NewsRelatedAppBox } from '../components/public/newsDetails/NewsRelatedAppBox';
import { AppSimilarCarousel } from '../components/public/appDetails/AppSimilarCarousel';
import { formatNewsDate, calculateReadingTime, getNextNewsChain } from '../lib/newsUtils';
import { getOptimizedImageUrl, normalizeIsoDate } from '../seo/utils';

export default function NewsDetailPage() {
  const { news: mockNews = [], apps = [], settings: mockSettings, loading, refreshAll, updateNewsDetail } = useData();
  const { slug } = useParams();
  const navigate = useNavigate();

  const handleHtmlClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = (e.target as HTMLElement).closest('a');
    if (!target) return;
    const href = target.getAttribute('href');
    if (!href) return;
    if (href.startsWith('/') && !href.startsWith('//')) {
      e.preventDefault();
      navigate(href);
    } else if (typeof window !== 'undefined' && href.startsWith(window.location.origin)) {
      try {
        const url = new URL(href);
        e.preventDefault();
        navigate(url.pathname + url.search + url.hash);
      } catch (_) {}
    }
  };
  
  const cleanSlug = useMemo(() => {
    if (!slug) return '';
    try {
      return decodeURIComponent(slug).toLowerCase().trim().replace(/\/+$/, '');
    } catch (_) {
      return slug.toLowerCase().trim().replace(/\/+$/, '');
    }
  }, [slug]);

  const [fetchedNewsItem, setFetchedNewsItem] = useState<any | null>(null);

  const activeSlugRef = useRef<string>(cleanSlug);
  activeSlugRef.current = cleanSlug;

  const contextNewsItem = useMemo(() => {
    if (!cleanSlug) return null;
    let fromInit = null;
    if (typeof window !== 'undefined' && (window as any).__INITIAL_DATA__?.news) {
      fromInit = (window as any).__INITIAL_DATA__.news.find((n: any) => 
        (n.slug || '').toLowerCase().trim() === cleanSlug || (n.id || '').toLowerCase().trim() === cleanSlug
      );
    }

    const fromMock = mockNews.find(n => (n.slug || '').toLowerCase().trim() === cleanSlug || (n.id || '').toLowerCase().trim() === cleanSlug);
    const fromStatic = staticMockNews.find(n => (n.slug || '').toLowerCase().trim() === cleanSlug || (n.id || '').toLowerCase().trim() === cleanSlug);

    const candidates = [fromInit, fromMock, fromStatic].filter(Boolean);
    if (candidates.length === 0) return null;

    // Pick candidate with richest content
    candidates.sort((a, b) => {
      const aLen = Math.max((a.content || '').length, (a.description_html || '').length);
      const bLen = Math.max((b.content || '').length, (b.description_html || '').length);
      return bLen - aLen;
    });

    const best = candidates[0];
    const fullHtml = (best.content && best.content.trim().length > 10)
      ? best.content
      : ((best.description_html && best.description_html.trim().length > 10) ? best.description_html : '');

    return {
      ...best,
      content: fullHtml,
      description_html: fullHtml,
      description: best.description || ''
    };
  }, [cleanSlug, mockNews]);

  const validFetchedNews = useMemo(() => {
    if (!fetchedNewsItem || !cleanSlug) return null;
    const fSlug = String(fetchedNewsItem.slug || '').toLowerCase().trim();
    const fId = String(fetchedNewsItem.id || '').toLowerCase().trim();
    return (fSlug === cleanSlug || fId === cleanSlug) ? fetchedNewsItem : null;
  }, [fetchedNewsItem, cleanSlug]);

  const newsItem = validFetchedNews || contextNewsItem;

  const [copied, setCopied] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [remoteCheckDoneSlug, setRemoteCheckDoneSlug] = useState<string>('');
  const syncAttemptedRef = useRef<Record<string, boolean>>({});

  useEffect(() => {
    window.scrollTo(0, 0);
    setIsRefreshing(false);
    setCopied(false);
    setFetchedNewsItem((prev: any) => {
      if (!prev) return null;
      const prevSlug = String(prev.slug || prev.id || '').toLowerCase().trim();
      return prevSlug === cleanSlug ? prev : null;
    });
  }, [slug, cleanSlug]);

  const hasFullBody = useMemo(() => {
    if (!newsItem) return false;
    const c = (newsItem.content || '').trim();
    const d = (newsItem.description_html || '').trim();
    return c.length > 250 || d.length > 250;
  }, [newsItem]);

  useEffect(() => {
    const slugKey = cleanSlug || '';
    if (!slugKey) return;

    // 1. If news item already has complete rich content from SSR / initialData, bypass client fetch completely
    if (hasFullBody) {
      setRemoteCheckDoneSlug(slugKey);
      return;
    }

    // 2. Check if fetchedNewsItem is already loaded for this slug
    const fetchedSlug = fetchedNewsItem ? String(fetchedNewsItem.slug || fetchedNewsItem.id || '').toLowerCase().trim() : '';
    if (fetchedNewsItem && fetchedSlug === slugKey && ((fetchedNewsItem.content || '').length > 250)) {
      setRemoteCheckDoneSlug(slugKey);
      return;
    }

    // 3. Instant 0ms memory fallback from static dataset (instant FCP/LCP when switching URLs)
    loadFullStaticDataset().then(dataset => {
      if (activeSlugRef.current !== slugKey) return;
      const match = (dataset?.news || []).find((n: any) =>
        (n.slug || '').toLowerCase().trim() === slugKey || (n.id || '').toLowerCase().trim() === slugKey
      );
      if (match && ((match.content || '').length > 250 || (match.description_html || '').length > 250)) {
        setFetchedNewsItem(match);
        updateNewsDetail?.(match);
      }
    }).catch(() => {});

    // 4. Concurrently query public API for real-time Firestore updates
    if (!syncAttemptedRef.current[slugKey]) {
      syncAttemptedRef.current[slugKey] = true;
      setIsRefreshing(true);

      fetch(`/api/v1/public/news/${encodeURIComponent(slugKey)}`, {
        headers: { 'Accept': 'application/json' }
      })
        .then(res => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        })
        .then(data => {
          if (activeSlugRef.current !== slugKey) return;
          const resolvedNews = data?.news || data?.newsItem;
          if (data?.status === 'OK' && resolvedNews) {
            setFetchedNewsItem(resolvedNews);
            updateNewsDetail?.(resolvedNews);
          } else if (!newsItem && refreshAll) {
            refreshAll(true);
          }
        })
        .catch(err => {
          console.warn("News body fetch fallback notice:", err);
          if (!newsItem && refreshAll) refreshAll(true);
        })
        .finally(() => {
          if (activeSlugRef.current === slugKey) {
            setIsRefreshing(false);
            setRemoteCheckDoneSlug(slugKey);
          }
        });
    }
  }, [cleanSlug, hasFullBody]);

  const relatedApp = useMemo(() => {
    if (!newsItem) return null;
    if (newsItem.related_app_id) {
      const found = apps.find(a => a.id === newsItem.related_app_id || a.slug === newsItem.related_app_id);
      if (found) return found;
    }
    if (newsItem.link) {
      const cleanLink = newsItem.link.trim();
      const appSlugFromLink = cleanLink.replace(/^.*\/app\//, '').replace(/\/$/, '').split(/[?#]/)[0];
      if (appSlugFromLink) {
        const found = apps.find(a => a.slug?.toLowerCase() === appSlugFromLink.toLowerCase() || a.id === appSlugFromLink);
        if (found) return found;
      }
    }
    return null;
  }, [newsItem, apps]);

  const downloadTarget = useMemo(() => {
    if (relatedApp) {
      return { url: `/app/${relatedApp.slug || relatedApp.id}`, isInternal: true };
    }
    if (newsItem?.link) {
      const isInternal = newsItem.link.startsWith('/') || newsItem.link.includes('/app/');
      let cleanUrl = newsItem.link;
      if (isInternal && newsItem.link.includes('/app/')) {
        cleanUrl = '/app/' + newsItem.link.replace(/^.*\/app\//, '');
      }
      return { url: cleanUrl, isInternal };
    }
    return null;
  }, [relatedApp, newsItem]);

  // 16 Category Similar Apps (single-pass, zero garbage allocations)
  const similarCategoryApps = useMemo(() => {
    if (!apps || apps.length === 0) return { list: [], category: '', totalCount: 0 };

    const targetCategory = (relatedApp?.category || newsItem?.category || 'All Apps').trim();
    const cleanTargetCat = targetCategory.toLowerCase();
    const isAll = cleanTargetCat === 'all' || cleanTargetCat === 'all apps';
    const relAppId = relatedApp ? String(relatedApp.id || '') : '';
    const relAppSlug = relatedApp ? String(relatedApp.slug || '').toLowerCase() : '';

    const newApps: any[] = [];
    const regularApps: any[] = [];
    let totalCatCount = 0;

    for (let i = 0; i < apps.length; i++) {
      const a = apps[i];
      if (!a) continue;

      const aId = String(a.id || '');
      const aSlug = String(a.slug || '').toLowerCase();
      const isBaseApp = Boolean(relatedApp && (aId === relAppId || aSlug === relAppSlug));

      const aCat = (a.category || '').toLowerCase();
      const matches = isAll || aCat.includes(cleanTargetCat) || cleanTargetCat.includes(aCat);

      if (matches) {
        totalCatCount++;
        if (!isBaseApp) {
          const rawItem = a as any;
          const isHot = Boolean(
            rawItem.is_hot === true || rawItem.is_hot === 'true' || rawItem.is_hot === 1 ||
            rawItem.isHot === true || rawItem.isHot === 'true' || rawItem.isHot === 1 ||
            (typeof rawItem.badge === 'string' && rawItem.badge.trim().toLowerCase() === 'hot')
          );
          const isNew = Boolean(
            rawItem.is_new === true || rawItem.is_new === 'true' || rawItem.is_new === 1 ||
            rawItem.isNew === true || rawItem.isNew === 'true' || rawItem.isNew === 1 ||
            (typeof rawItem.badge === 'string' && rawItem.badge.trim().toLowerCase() === 'new')
          );
          if (isHot || isNew) {
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
    const strSeed = String(cleanSlug || newsItem?.slug || newsItem?.id || '');
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
    // Stagger regular apps circularly starting right after the base app's serial number or hash seed
    const pickedRegular: any[] = [];
    if (remainingSlots > 0 && regularApps.length > 0) {
      let startIndex = absSeed % regularApps.length;
      const baseSerial = Number(relatedApp?.serial_number);
      if (!isNaN(baseSerial) && baseSerial > 0) {
        const nextIdx = regularApps.findIndex(a => (Number(a.serial_number) || 0) > baseSerial);
        if (nextIdx !== -1) startIndex = nextIdx;
      }

      const countToPick = Math.min(remainingSlots, regularApps.length);
      for (let step = 0; step < countToPick; step++) {
        pickedRegular.push(regularApps[(startIndex + step) % regularApps.length]);
      }
    }

    const finalList = [...pinnedNew, ...pickedRegular].map((a: any) => ({
      id: a.id,
      name: a.name,
      slug: a.slug,
      icon_url: a.icon_url || a.logo_url,
      is_new: Boolean(a.is_new === true || a.is_new === 'true' || a.isNew || a.badge?.toLowerCase() === 'new'),
      is_hot: Boolean(a.is_hot === true || a.is_hot === 'true' || a.isHot || a.badge?.toLowerCase() === 'hot'),
      serial_number: a.serial_number
    }));

    return {
      list: finalList,
      category: targetCategory,
      totalCount: totalCatCount
    };
  }, [apps, relatedApp, newsItem, cleanSlug]);

  const handleShare = () => {
    const url = newsItem?.canonical_url || window.location.href;
    const shareTitle = newsItem?.seo_title || newsItem?.title || 'News Article';
    const shareText = newsItem?.seo_description || newsItem?.description || '';
    if (navigator.share) {
      navigator.share({ title: shareTitle, text: shareText, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }).catch(() => {});
    }
  };

  if (!newsItem && (loading || isRefreshing || (cleanSlug && remoteCheckDoneSlug !== cleanSlug))) {
    return (
      <div className="flex flex-col items-center justify-center py-20 min-h-[40vh] text-center px-4 max-w-sm mx-auto">
        <div className="w-8 h-8 border-[3px] border-black/10 dark:border-white/10 border-t-blue-500 rounded-full animate-spin mb-4"></div>
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mt-2">Loading Article</h3>
        <p className="text-sm text-zinc-500 mt-2 leading-relaxed">
          Loading article content...
        </p>
      </div>
    );
  }

  if (!newsItem) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-4 max-w-md mx-auto">
        <Meta 
          title="404 - News Not Found" 
          description="The requested news article could not be located." 
          noindex={true} 
        />
        <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 rounded-2xl flex items-center justify-center mb-6">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">News Not Found</h1>
        <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-3 leading-relaxed mb-8">
          The requested article "<span className="font-mono font-medium text-zinc-800 dark:text-zinc-200">{slug}</span>" could not be located.
        </p>
        <Link 
          to="/news" 
          className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-[16px] font-semibold text-sm transition-all hover:scale-[1.02] active:scale-[0.98] shadow-md"
        >
          <ArrowLeft className="w-4 h-4" /> Return to News Hub
        </Link>
      </div>
    );
  }

  const articleTitle = newsItem.seo_title || newsItem.meta_title || newsItem.title || 'News Article';
  const bodyContent = newsItem.content || newsItem.description_html || newsItem.description || '';
  const plainBody = bodyContent.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
  const articleDesc = newsItem.seo_description || newsItem.meta_description || newsItem.description || plainBody.substring(0, 160);
  const rawArticleImage = newsItem.og_image_url || newsItem.image_url || newsItem.logo_url || newsItem.image || '';
  const optimizedArticleImage = rawArticleImage ? (getOptimizedImageUrl(rawArticleImage, 1200) || rawArticleImage) : '';
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const canonicalUrl = newsItem.canonical_url || `${origin}/news/${newsItem.slug || newsItem.id}`;
  const rawDatePublished = newsItem.published_at || newsItem.publish_date || newsItem.created_at || newsItem.date || '';
  const datePublished = normalizeIsoDate(rawDatePublished);
  const dateModified = normalizeIsoDate(newsItem.updated_at || rawDatePublished, datePublished);
  const authorName = newsItem.ceo_name || newsItem.author || 'Editorial Team';
  const articleCategory = newsItem.category || 'General';

  const newsArticleSchema = {
    "@context": "https://schema.org",
    "@type": ["NewsArticle", "Article"],
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": canonicalUrl
    },
    "name": articleTitle,
    "headline": articleTitle,
    "description": articleDesc,
    "articleBody": plainBody || articleDesc,
    "image": optimizedArticleImage ? [optimizedArticleImage] : [],
    "datePublished": datePublished,
    "dateModified": dateModified,
    "articleSection": articleCategory,
    "inLanguage": "en",
    "isAccessibleForFree": true,
    "author": {
      "@type": "Person",
      "name": authorName
    },
    "publisher": {
      "@type": "Organization",
      "name": mockSettings?.site_title || "",
      "url": origin,
      "logo": {
        "@type": "ImageObject",
        "url": mockSettings?.logo_url || `${origin}/logo.png`
      }
    }
  };

  const newsWebPageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${canonicalUrl}#webpage`,
    "url": canonicalUrl,
    "name": articleTitle,
    "headline": articleTitle,
    "description": articleDesc,
    "inLanguage": "en"
  };

  const newsBreadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": origin || "/"
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "News",
        "item": `${origin}/news`
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": newsItem.title,
        "item": canonicalUrl
      }
    ]
  };

  return (
    <article className="max-w-3xl mx-auto px-3 sm:px-0 pb-20 text-left">
      <Meta 
        title={articleTitle}
        description={articleDesc}
        keywords={newsItem.seo_keywords}
        image={rawArticleImage}
        type="article"
        publishedTime={datePublished}
        modifiedTime={dateModified}
        author={authorName}
        section={articleCategory}
        tags={Array.isArray(newsItem.tags) ? newsItem.tags : undefined}
        canonical={canonicalUrl}
        schema={[newsArticleSchema, newsWebPageSchema]}
        breadcrumbSchema={newsBreadcrumbSchema}
      />

      <NewsArticleHeader 
        title={newsItem.title || 'News Article'}
        category={articleCategory}
        formattedDate={formatNewsDate(newsItem.date, newsItem.published_at, newsItem.created_at)}
        author={authorName}
        readingTime={calculateReadingTime(bodyContent)}
        logoUrl={rawArticleImage}
        copied={copied}
        onShare={handleShare}
      />

      {/* 1. App View/Download Action Box (Directly below banner image) */}
      <NewsRelatedAppBox 
        downloadTarget={downloadTarget}
        relatedApp={relatedApp}
        newsItem={newsItem}
        className="my-5 sm:my-6"
      />

      {bodyContent ? (
        <div 
          onClick={handleHtmlClick}
          className="prose dark:prose-invert max-w-none text-zinc-800 dark:text-zinc-200 leading-relaxed text-sm sm:text-base space-y-4 font-normal mt-6"
          dangerouslySetInnerHTML={{ __html: safeHtml(bodyContent) }}
        />
      ) : (
        <div className="mt-6 space-y-4 animate-pulse">
          <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-3/4"></div>
          <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-full"></div>
          <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-5/6"></div>
          <div className="h-24 bg-zinc-100 dark:bg-zinc-900 rounded-xl w-full"></div>
        </div>
      )}

      {/* 2. App View/Download Action Box (Directly after the full HTML body) */}
      <NewsRelatedAppBox 
        downloadTarget={downloadTarget}
        relatedApp={relatedApp}
        newsItem={newsItem}
        className="my-8"
      />

      {/* Similar Applications in the same category (Placed below primary article body) */}
      {similarCategoryApps.list.length > 0 && (
        <AppSimilarCarousel 
          relatedApps={similarCategoryApps.list}
          specificCategory={similarCategoryApps.category}
          totalCategoryCount={similarCategoryApps.totalCount}
        />
      )}

      {/* 3. Latest News & Updates Internal Linking ("Next, Next, Next" Daisy-Chain Engine) */}
      {(() => {
        const recentNews = getNextNewsChain(newsItem, mockNews, 6);
        if (recentNews.length === 0) return null;

        return (
          <section aria-labelledby="recent-news-heading" className="mt-8 pt-6 border-t border-zinc-200/80 dark:border-zinc-800/80 text-left">
            <div className="flex items-center justify-between gap-2 mb-4">
              <h2 id="recent-news-heading" className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100">
                Latest News &amp; Updates
              </h2>
              <Link to="/news" className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline no-underline">
                View all news →
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {recentNews.map((rn: any) => {
                const rnSlug = String(rn.slug || rn.id || '').trim();
                const rnTitle = rn.title || 'News Article';
                const rnCat = rn.category || 'Update';
                const rnDate = formatNewsDate(rn.date, rn.published_at, rn.created_at);
                return (
                  <Link
                    key={rn.id || rnSlug}
                    to={`/news/${encodeURIComponent(rnSlug)}`}
                    className="p-3.5 rounded-xl border border-zinc-200/70 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/50 hover:bg-zinc-100/80 dark:hover:bg-zinc-800/80 transition-colors flex flex-col justify-between gap-1.5 no-underline"
                  >
                    <h3 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100 line-clamp-2 leading-snug">
                      {rnTitle}
                    </h3>
                    <div className="flex items-center gap-2 text-[10px] font-medium text-zinc-500 dark:text-zinc-400">
                      <span className="text-blue-600 dark:text-blue-400 font-semibold">{rnCat}</span>
                      {rnDate && (
                        <>
                          <span>•</span>
                          <span>{rnDate}</span>
                        </>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })()}
    </article>
  );
}
