/**
 * FallbackRouteMatcher wildcard resolver
 * Directs dynamic routes to canonical paths without allowing non-canonical root URLs to render.
 */

import { useState, useEffect, useRef } from 'react';
import { useLocation, Link, Navigate } from 'react-router-dom';
import { useData } from '../contexts/DataContextPublic';
import { resolveAppSlug } from '../lib/slugResolver';
import Meta from './Meta';

const getInitialData = () => {
  if (typeof window !== 'undefined' && (window as any).__INITIAL_DATA__) {
    return (window as any).__INITIAL_DATA__;
  }
  return {};
};

export default function FallbackRouteMatcher() {
  const location = useLocation();
  const { apps, news, videos, loading, refreshAll } = useData();
  
  // Clean pathname into a lowercase slug
  const rawPath = decodeURIComponent(location.pathname);
  const slug = rawPath.replace(/^\/(app|download|moreinfo|info|moredetail|gateway)\//i, '/').replace(/^\/|\/$/g, '').toLowerCase().trim();
  
  const [triedRefresh, setTriedRefresh] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const syncAttemptedRef = useRef<Record<string, boolean>>({});

  useEffect(() => {
    setTriedRefresh(false);
    setIsRefreshing(false);
  }, [slug]);

  if (!slug || slug.match(/\.(xml|json|txt|php|png|jpg|jpeg|gif|svg|ico|webp|js|css|map|webmanifest)$/i)) {
    return (
      <div className="text-center py-20 px-4 min-h-[40vh] flex flex-col justify-center items-center">
        <Meta title="404 - Page Not Found" description="Page not found." noindex={true} />
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">Page Not Found</h1>
        <Link to="/" className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-[16px] font-semibold text-sm">Return to Home</Link>
      </div>
    );
  }

  // 1. Check if slug matches an app -> Always 301 Redirect to canonical /app/:slug
  const initData = getInitialData();
  const matchedApp = resolveAppSlug(slug, apps) || resolveAppSlug(slug, initData.apps || []);
  if (matchedApp && (matchedApp.slug || matchedApp.id)) {
    const targetSlug = matchedApp.slug || matchedApp.id;
    return <Navigate to={`/app/${targetSlug}`} replace />;
  }

  // 2. Check if slug matches news -> Redirect to /news/:slug
  const matchedNews = news.find(n => n.slug?.toLowerCase() === slug) || (initData.news || []).find((n: any) => n.slug?.toLowerCase() === slug);
  if (matchedNews && matchedNews.slug) {
    return <Navigate to={`/news/${matchedNews.slug}`} replace />;
  }

  // 3. Check if slug matches video -> Redirect to /videos/:slug
  const matchedVideo = videos.find(v => v.slug?.toLowerCase() === slug) || (initData.videos || []).find((v: any) => v.slug?.toLowerCase() === slug);
  if (matchedVideo && matchedVideo.slug) {
    return <Navigate to={`/videos/${matchedVideo.slug}`} replace />;
  }

  // 4. Check if slug matches a category -> Redirect to /category/:slug
  const matchedCategory = apps.some(a => (a.category || '').toLowerCase().replace(/[^a-z0-9]+/g, '-') === slug) || ['rummy-apps', 'yono-apps', 'teen-patti', 'all-apps', 'casino', 'slots'].includes(slug);
  if (matchedCategory) {
    return <Navigate to={`/category/${slug}`} replace />;
  }

  // 5. If data is still loading
  if (loading || isRefreshing) {
    return (
      <div className="flex flex-col items-center justify-center py-20 min-h-[40vh] text-center px-4 max-w-sm mx-auto">
        <div className="w-8 h-8 border-[3px] border-black/10 dark:border-white/10 border-t-blue-500 rounded-full animate-spin mb-4"></div>
        <p className="text-sm font-medium tracking-wide text-zinc-500 animate-pulse">Resolving URL...</p>
      </div>
    );
  }

  // 6. Trigger background refresh if not found in cache with short non-blocking timeout
  if (!syncAttemptedRef.current[slug] && !triedRefresh) {
    syncAttemptedRef.current[slug] = true;
    setIsRefreshing(true);
    const timeout = setTimeout(() => {
      setTriedRefresh(true);
      setIsRefreshing(false);
    }, 1200);

    refreshAll(true)
      .catch(err => console.warn("Fallback route match auto-sync failed:", err.message || err))
      .finally(() => {
        clearTimeout(timeout);
        setTriedRefresh(true);
        setIsRefreshing(false);
      });
    return (
      <div className="flex flex-col items-center justify-center py-20 min-h-[40vh] text-center px-4 max-w-sm mx-auto">
        <div className="w-8 h-8 border-[3px] border-black/10 dark:border-white/10 border-t-blue-500 rounded-full animate-spin mb-4"></div>
        <p className="text-sm font-medium tracking-wide text-zinc-500 animate-pulse">Resolving URL...</p>
      </div>
    );
  }

  return (
    <div className="text-center py-20 px-4 min-h-[40vh] flex flex-col justify-center items-center">
      <Meta 
        title="404 - Page Not Found" 
        description="We could not resolve this link to any application listing or news bulletin." 
        noindex={true} 
      />
      <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 rounded-2xl flex items-center justify-center mb-6">
        <span className="text-2xl font-bold">404</span>
      </div>
      <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">Page Not Found</h1>
      <p className="max-w-md mx-auto text-sm text-zinc-500 dark:text-zinc-400 mb-8 leading-relaxed font-medium">
        We could not resolve this link to any application listing or news bulletin.
      </p>
      <Link 
        to="/" 
        className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-[16px] font-semibold text-sm transition-all hover:scale-[1.02] active:scale-[0.98] shadow-md"
      >
        Return to Home
      </Link>
    </div>
  );
}
