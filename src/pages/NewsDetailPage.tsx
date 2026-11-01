import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import Meta from '../components/Meta';
import { useData } from '../contexts/DataContextPublic';
import { mockNews as staticMockNews, loadFullStaticDataset } from '../lib/lightFallback';
import { ArrowLeft, ShieldAlert } from 'lucide-react';
import { safeHtml } from '../lib/safeHtmlPublic';
import { NewsArticleHeader } from '../components/public/newsDetails/NewsArticleHeader';
import { NewsRelatedAppBox } from '../components/public/newsDetails/NewsRelatedAppBox';
import { formatNewsDate, calculateReadingTime, getNextNewsChain, getPlainTextSnippet } from '../lib/newsUtils';
import { getOptimizedImageUrl, normalizeIsoDate } from '../seo/utils';

const RICH_HTML_CONTENT_STYLE = `
  w-full text-sm sm:text-base text-zinc-800 dark:text-zinc-200 leading-relaxed
  [&_strong]:text-blue-600 dark:[&_strong]:text-blue-400 [&_strong]:font-semibold
  [&_b]:text-blue-600 dark:[&_b]:text-blue-400 [&_b]:font-semibold
  [&_p]:mb-4 [&_p]:leading-relaxed [&_p]:text-zinc-800 dark:[&_p]:text-zinc-200
  [&_a]:text-blue-600 dark:[&_a]:text-blue-400 [&_a]:font-semibold [&_a]:underline [&_a]:hover:text-blue-700
  [&_h1]:text-lg sm:[&_h1]:text-2xl [&_h1]:font-black [&_h1]:tracking-tight [&_h1]:text-zinc-900 dark:[&_h1]:text-zinc-100 [&_h1]:mt-5 [&_h1]:mb-2.5
  [&_h2]:text-base sm:[&_h2]:text-xl [&_h2]:font-extrabold [&_h2]:tracking-tight [&_h2]:text-zinc-900 dark:[&_h2]:text-zinc-100 [&_h2]:mt-5 [&_h2]:mb-2.5 [&_h2]:pt-3 [&_h2]:border-t [&_h2]:border-zinc-200/80 dark:[&_h2]:border-zinc-800/80 [&_h2:first-child]:border-t-0 [&_h2:first-child]:pt-0 [&_h2:first-child]:mt-0
  [&_h3]:text-sm sm:[&_h3]:text-lg [&_h3]:font-bold [&_h3]:tracking-tight [&_h3]:text-zinc-900 dark:[&_h3]:text-zinc-100 [&_h3]:mt-4 [&_h3]:mb-2
  [&_h4]:text-xs sm:[&_h4]:text-base [&_h4]:font-semibold [&_h4]:tracking-tight [&_h4]:text-zinc-900 dark:[&_h4]:text-zinc-100 [&_h4]:mt-3.5 [&_h4]:mb-1.5
  [&_ul]:my-3 [&_ul]:space-y-1.5 [&_ul]:list-disc [&_ul]:pl-5
  [&_ol]:my-3 [&_ol]:space-y-1.5 [&_ol]:list-decimal [&_ol]:pl-5
  [&_li]:leading-relaxed [&_li]:pl-1 [&_li::marker]:text-blue-600 dark:[&_li::marker]:text-blue-400 [&_li::marker]:font-bold
  [&_blockquote]:border-l-4 [&_blockquote]:border-blue-500 [&_blockquote]:pl-4 [&_blockquote]:py-2 [&_blockquote]:my-4 [&_blockquote]:bg-blue-50/50 dark:[&_blockquote]:bg-blue-950/20 [&_blockquote]:rounded-r-xl [&_blockquote]:italic
  [&_.art]:hidden [&_svg.art]:hidden
`.trim().replace(/\s+/g, ' ');

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
      const aLen = Math.max((a.content || '').length, (a.description_html || '').length, a._isFullArticle ? 1000 : 0);
      const bLen = Math.max((b.content || '').length, (b.description_html || '').length, b._isFullArticle ? 1000 : 0);
      return bLen - aLen;
    });

    const best = candidates[0];
    const fullHtml = (best.content && best.content.trim().length > 0)
      ? best.content
      : ((best.description_html && best.description_html.trim().length > 0) ? best.description_html : '');

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
    if ((newsItem as any)._isFullArticle) return true;
    const c = (newsItem.content || '').trim();
    const d = (newsItem.description_html || '').trim();
    return c.length > 20 || d.length > 20;
  }, [newsItem]);

  useEffect(() => {
    const slugKey = cleanSlug || '';
    if (!slugKey) return;

    // 1. If news item already has complete content from SSR / initialData, bypass client fetch completely
    if (hasFullBody) {
      setRemoteCheckDoneSlug(slugKey);
      return;
    }

    // 2. Check if fetchedNewsItem is already loaded for this slug
    const fetchedSlug = fetchedNewsItem ? String(fetchedNewsItem.slug || fetchedNewsItem.id || '').toLowerCase().trim() : '';
    if (fetchedNewsItem && fetchedSlug === slugKey && ((fetchedNewsItem.content || '').length > 20 || (fetchedNewsItem.description || '').length > 0)) {
      setRemoteCheckDoneSlug(slugKey);
      return;
    }

    // 3. Instant 0ms memory fallback from static dataset
    loadFullStaticDataset().then(dataset => {
      if (activeSlugRef.current !== slugKey) return;
      const match = (dataset?.news || []).find((n: any) =>
        (n.slug || '').toLowerCase().trim() === slugKey || (n.id || '').toLowerCase().trim() === slugKey
      );
      if (match && ((match.content || '').length > 0 || (match.description_html || '').length > 0 || (match.description || '').length > 0)) {
        setFetchedNewsItem(match);
        updateNewsDetail?.(match);
      }
    }).catch(() => {});

    // 4. Concurrently query public API for real-time Firestore updates only if article is missing or incomplete
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
        .catch(() => {
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
      const relLower = String(newsItem.related_app_id).toLowerCase().trim();
      const found = apps.find(a => String(a.id || '').toLowerCase().trim() === relLower || String(a.slug || '').toLowerCase().trim() === relLower);
      if (found) return found;
    }
    if (newsItem.link) {
      const cleanLink = newsItem.link.trim();
      const appSlugFromLink = cleanLink.replace(/^.*\/app\//, '').replace(/\/$/, '').split(/[?#]/)[0].toLowerCase().trim();
      if (appSlugFromLink) {
        const found = apps.find(a => String(a.slug || '').toLowerCase().trim() === appSlugFromLink || String(a.id || '').toLowerCase().trim() === appSlugFromLink);
        if (found) return found;
      }
    }
    return null;
  }, [newsItem, apps]);

  const downloadTarget = useMemo(() => {
    if (relatedApp) {
      return { url: `/app/${relatedApp.slug || relatedApp.id}`, isInternal: true };
    }
    if (newsItem?.link && newsItem.link.trim()) {
      const rawLink = newsItem.link.trim();
      const isInternal = rawLink.startsWith('/') || rawLink.includes('/app/');
      let cleanUrl = rawLink;
      if (isInternal && rawLink.includes('/app/')) {
        cleanUrl = '/app/' + rawLink.replace(/^.*\/app\//, '').replace(/\/$/, '').split(/[?#]/)[0];
      }
      return { url: cleanUrl, isInternal };
    }
    return null;
  }, [relatedApp, newsItem]);

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
          className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-[16px] font-semibold text-sm transition-all hover:scale-[1.02] active:scale-[0.98] shadow-md no-underline"
        >
          <ArrowLeft className="w-4 h-4" /> Return to News Hub
        </Link>
      </div>
    );
  }

  const articleTitle = newsItem.seo_title || newsItem.meta_title || newsItem.title || 'News Article';
  const rawBody = newsItem.content || newsItem.description_html || (newsItem.description ? `<p>${newsItem.description}</p>` : '');
  const plainBody = rawBody.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
  const articleDesc = newsItem.seo_description || newsItem.meta_description || newsItem.description || plainBody.substring(0, 160);
  const rawArticleImage = newsItem.og_image_url || newsItem.image_url || newsItem.logo_url || newsItem.image || '';
  const optimizedArticleImage = rawArticleImage ? (getOptimizedImageUrl(rawArticleImage, 1200) || rawArticleImage) : '';
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const canonicalUrl = newsItem.canonical_url || `${origin}/news/${newsItem.slug || newsItem.id}`;
  const rawDatePublished = newsItem.published_at || newsItem.publish_date || newsItem.created_at || newsItem.date || '';
  const datePublished = normalizeIsoDate(rawDatePublished);
  const dateModified = normalizeIsoDate(newsItem.updated_at || rawDatePublished, datePublished);
  const authorName = newsItem.ceo_name || newsItem.author || 'Editorial Team';
  const articleCategory = (newsItem.category || 'General').trim();
  const formattedDate = formatNewsDate(newsItem.date, newsItem.published_at, newsItem.created_at);
  const readingTime = calculateReadingTime(rawBody);

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

  const recentNews = getNextNewsChain(newsItem, mockNews, 6);

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
        formattedDate={formattedDate}
        author={authorName}
        readingTime={readingTime}
        logoUrl={rawArticleImage}
        copied={copied}
        onShare={handleShare}
      />

      {/* Related App Action Box (Shown once cleanly when linked app or target URL is configured) */}
      <NewsRelatedAppBox 
        downloadTarget={downloadTarget}
        relatedApp={relatedApp}
        newsItem={newsItem}
        className="my-5 sm:my-6"
      />

      {/* Article Body */}
      <div 
        onClick={handleHtmlClick}
        className={`mt-6 px-1 sm:px-4 ${RICH_HTML_CONTENT_STYLE}`}
        dangerouslySetInnerHTML={{ __html: safeHtml(rawBody) }}
      />

      {/* Contextual Topic & Hub Navigation Links */}
      <nav aria-label="Article Topic Navigation" className="mt-8 pt-5 border-t border-zinc-200/80 dark:border-zinc-800/80 px-1 sm:px-4 flex flex-wrap items-center gap-2 text-xs">
        <span className="font-bold text-zinc-500 dark:text-zinc-400 mr-1">Explore Topics:</span>
        <Link
          to={`/news?category=${encodeURIComponent(articleCategory)}`}
          className="px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-semibold border border-blue-200/50 dark:border-blue-800/50 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors no-underline"
        >
          {articleCategory} News
        </Link>
        <Link
          to="/news"
          className="px-3 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 font-medium hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors no-underline"
        >
          All News &amp; Updates
        </Link>
        <Link
          to="/new-apps"
          className="px-3 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 font-medium hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors no-underline"
        >
          New Apps
        </Link>
        <Link
          to="/categories"
          className="px-3 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 font-medium hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors no-underline"
        >
          App Categories
        </Link>
      </nav>

      {/* Latest News & Updates Internal Linking ("Next, Next, Next" Daisy-Chain Engine) */}
      {recentNews.length > 0 && (
        <section aria-labelledby="recent-news-heading" className="mt-8 pt-6 border-t border-zinc-200/80 dark:border-zinc-800/80 px-1 sm:px-4 text-left">
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
              const rnCat = (rn.category || 'Update').trim();
              const rnDate = formatNewsDate(rn.date, rn.published_at, rn.created_at);
              const rnDesc = getPlainTextSnippet(rn.description || rn.seo_description || rn.content, 110);
              return (
                <Link
                  key={rn.id || rnSlug}
                  to={`/news/${encodeURIComponent(rnSlug)}`}
                  className="p-3.5 rounded-xl border border-zinc-200/70 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/50 hover:bg-zinc-100/80 dark:hover:bg-zinc-800/80 transition-colors flex flex-col justify-between gap-1.5 no-underline"
                >
                  <div>
                    <div className="flex items-center gap-2 text-[10px] font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                      <span className="text-blue-600 dark:text-blue-400 font-semibold uppercase tracking-wider">{rnCat}</span>
                      {rnDate && (
                        <>
                          <span>•</span>
                          <span>{rnDate}</span>
                        </>
                      )}
                    </div>
                    <h3 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100 line-clamp-2 leading-snug">
                      {rnTitle}
                    </h3>
                    {rnDesc && (
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-2 mt-1 leading-relaxed">
                        {rnDesc}
                      </p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </article>
  );
}
