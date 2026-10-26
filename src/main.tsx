/**
 * Front-end entry point of the Portal Directory application
 * Mounts the core React layout with Global Error Boundary handlers.
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import GlobalErrorBoundary from './components/GlobalErrorBoundary';
import './index.css';
import './i18n';

// Clean query parameters like _v to guarantee 100% clean canonical SEO URLs
if (typeof window !== 'undefined' && window.location.search && window.location.search.includes('_v=')) {
  try {
    const url = new URL(window.location.href);
    url.searchParams.delete('_v');
    const newSearch = url.searchParams.toString();
    const cleanUrl = url.pathname + (newSearch ? '?' + newSearch : '') + url.hash;
    window.history.replaceState(null, '', cleanUrl);
  } catch (_) {}
}

// Force wipe old mock/static data from local storage cache
const CACHE_VERSION = '5.0';
if (typeof window !== 'undefined' && window.localStorage) {
  if (localStorage.getItem('rummystore_cache_version') !== CACHE_VERSION) {
    localStorage.removeItem('rummystore_apps');
    localStorage.removeItem('rummystore_settings');
    localStorage.removeItem('rummystore_news');
    localStorage.removeItem('rummystore_blogs');
    localStorage.removeItem('rummystore_videos');
    localStorage.removeItem('rummystore_public_data');
    localStorage.removeItem('rummystore_cache');
    localStorage.removeItem('cached_firestore_data');
    localStorage.removeItem('rummystore_firestore_cache');
    localStorage.removeItem('yd_public_data_cache');
    localStorage.removeItem('yd_public_data');
    localStorage.setItem('rummystore_cache_version', CACHE_VERSION);
  }
}


// Global chunk loading error handler: only reload if an actual dynamic JavaScript module fails to load after a deployment
if (typeof window !== 'undefined') {
  const handleChunkError = (event: ErrorEvent | PromiseRejectionEvent) => {
    // Ignore HTML DOM element resource errors (e.g., 404 images, favicons, audio, video)
    if ('target' in event && event.target && event.target !== window && (event.target as any).tagName) {
      return;
    }

    const error = 'reason' in event ? event.reason : event.error;
    const errorMsg = String(error?.message || error || (event as ErrorEvent).message || '');
    
    // Strictly verify this is a dynamic JS module chunk failure and not a generic network/image error
    const isChunkError =
      error?.name === 'ChunkLoadError' ||
      /Failed to fetch dynamically imported module/i.test(errorMsg) ||
      /Loading chunk .* failed/i.test(errorMsg) ||
      /Importing a module script failed/i.test(errorMsg);

    if (isChunkError) {
      const reloadKey = 'global_chunk_err_reload';
      const hasReloaded = sessionStorage.getItem(reloadKey);
      if (!hasReloaded) {
        sessionStorage.setItem(reloadKey, 'true');
        console.warn('[Global] Dynamic module chunk fetch failed. Reloading page for updated deployment bundle...', errorMsg);
        window.location.reload();
      }
    }
  };

  window.addEventListener('error', handleChunkError);
  window.addEventListener('unhandledrejection', handleChunkError);
}

const rootEl = document.getElementById('root');
if (rootEl) {
  const ua = (typeof navigator !== 'undefined' && navigator.userAgent) ? navigator.userAgent : '';
  const isSearchCrawler = /googlebot|google-inspectiontool|storebot-google|apis-google|mediapartners-google|adsbot-google|bingbot|slurp|duckduckbot|baiduspider|yandexbot|applebot|gptbot|claudebot|perplexitybot|oai-searchbot|bytespider|facebookexternalhit|twitterbot|linkedinbot/i.test(ua);
  const pathLower = (typeof window !== 'undefined' && window.location?.pathname) ? (window.location.pathname.toLowerCase().replace(/\/+$/, '') || '/') : '/';
  const isAdminRoute = pathLower.startsWith('/admin') || pathLower.startsWith('/masterworld') || pathLower.startsWith('/login');
  const ssrPath = typeof window !== 'undefined' ? String((window as any).__SSR_PATH__ || '').toLowerCase() : '';
  const hasPreRenderedSsrDom = rootEl.children.length > 0 && (!ssrPath || ssrPath === pathLower);

  // When a search engine crawler (e.g., Googlebot Smartphone / Google InspectionTool) inspects a pre-rendered public route,
  // keeping the server-rendered DOM intact prevents createRoot() from wiping #root and aborting in-flight image loads.
  if (!(isSearchCrawler && hasPreRenderedSsrDom && !isAdminRoute)) {
    createRoot(rootEl).render(
      <StrictMode>
        <GlobalErrorBoundary>
          <App />
        </GlobalErrorBoundary>
      </StrictMode>
    );
  }
}



