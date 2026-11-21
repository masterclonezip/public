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

// One-time cleanup of legacy local storage keys on version bump
const CACHE_VERSION = '5.0';
if (typeof window !== 'undefined') {
  try {
    if (window.localStorage && localStorage.getItem('platform_cache_version') !== CACHE_VERSION) {
      localStorage.removeItem('platform_apps');
      localStorage.removeItem('platform_settings');
      localStorage.removeItem('platform_news');
      localStorage.removeItem('platform_blogs');
      localStorage.removeItem('platform_videos');
      localStorage.removeItem('platform_public_data');
      localStorage.removeItem('platform_cache');
      localStorage.removeItem('cached_firestore_data');
      localStorage.removeItem('platform_firestore_cache');
      localStorage.removeItem('platform_public_data_cache');
      localStorage.setItem('platform_cache_version', CACHE_VERSION);
    }
  } catch (_) {}
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

  const reloadOnceForMissingStylesheet = () => {
    try {
      const cssReloadKey = 'global_css_err_reload';
      if (!sessionStorage.getItem(cssReloadKey)) {
        sessionStorage.setItem(cssReloadKey, 'true');
        window.location.reload();
      }
    } catch (_) {}
  };

  window.addEventListener(
    'error',
    (event: Event) => {
      const target = event.target as HTMLLinkElement | null;
      if (
        target &&
        target.tagName === 'LINK' &&
        target.rel === 'stylesheet' &&
        (target.id === 'vite-inline-css' || (typeof target.href === 'string' && target.href.includes('/assets/')))
      ) {
        reloadOnceForMissingStylesheet();
      }
    },
    true
  );

  const verifyPrimaryStylesheetLoaded = () => {
    try {
      const cssLink = document.getElementById('vite-inline-css') as HTMLLinkElement | null;
      if (
        cssLink &&
        cssLink.rel === 'stylesheet' &&
        typeof cssLink.href === 'string' &&
        cssLink.href.includes('/assets/') &&
        !cssLink.sheet
      ) {
        reloadOnceForMissingStylesheet();
      }
    } catch (_) {}
  };

  if (document.readyState === 'complete') {
    verifyPrimaryStylesheetLoaded();
  } else {
    window.addEventListener('load', verifyPrimaryStylesheetLoaded, { once: true });
  }
}

const rootEl = document.getElementById('root');
if (rootEl) {
  createRoot(rootEl).render(
    <StrictMode>
      <GlobalErrorBoundary>
        <App />
      </GlobalErrorBoundary>
    </StrictMode>
  );
}




