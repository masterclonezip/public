import { lazy, createElement, ComponentType, LazyExoticComponent } from 'react';

export type PreloadableComponent<T extends ComponentType<any>> = LazyExoticComponent<T> & {
  preload: () => Promise<{ default: T }>;
};

// Automatically clean up any leftover _v parameter from URL to maintain 100% pristine SEO URLs
if (typeof window !== 'undefined' && window.location.search && window.location.search.includes('_v=')) {
  try {
    const cleanUrl = new URL(window.location.href);
    cleanUrl.searchParams.delete('_v');
    const newSearch = cleanUrl.searchParams.toString();
    const finalPath = cleanUrl.pathname + (newSearch ? '?' + newSearch : '') + cleanUrl.hash;
    window.history.replaceState(null, '', finalPath);
  } catch (_) {}
}

// Global Vite Dynamic Import Preload Error Listener
// Catches hash mismatch when a new deployment is pushed while a user tab is already open
if (typeof window !== 'undefined') {
  window.addEventListener('vite:preloadError', (event) => {
    console.warn('[Vite Preload] Chunk mismatch detected after deployment. Reloading window:', event);
    const reloadKey = 'vite_preload_reload_' + (window.location.pathname || 'root');
    const hasReloaded = window.sessionStorage.getItem(reloadKey);
    if (!hasReloaded) {
      try {
        window.sessionStorage.setItem(reloadKey, 'true');
        window.location.reload();
      } catch (e) {
        window.location.reload();
      }
    }
  });
}

/**
 * Robust lazy import with automatic retry and clean page reload fallback for chunk loading errors.
 * Supports .preload() method for instant prefetching during idle time or user hover/touch.
 * When preloaded, renders synchronously on the very first frame to prevent any Suspense fallback flash.
 */
export const lazyWithRetry = <T extends ComponentType<any>>(
  componentImport: () => Promise<{ default: T }>
): PreloadableComponent<T> => {
  let preloadedPromise: Promise<{ default: T }> | null = null;
  let ResolvedComponent: T | null = null;

  const preload = () => {
    if (!preloadedPromise) {
      preloadedPromise = componentImport().then(
        (mod) => {
          if (mod && mod.default) {
            ResolvedComponent = mod.default;
          }
          return mod;
        },
        () => {
          preloadedPromise = null;
          return null as any;
        }
      );
    }
    return preloadedPromise;
  };

  const LazyComponent = lazy(async () => {
    if (ResolvedComponent) {
      return { default: ResolvedComponent };
    }

    const key = 'chunk_reload_retry_' + (typeof window !== 'undefined' ? window.location.pathname : '');
    let pageHasAlreadyBeenForceRefreshed = false;
    try {
      pageHasAlreadyBeenForceRefreshed = JSON.parse(window.sessionStorage.getItem(key) || 'false');
    } catch (e) {}

    // Attempt import with up to 2 retries
    let lastError: any = null;
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const component = preloadedPromise ? await preloadedPromise : await componentImport();
        if (component && component.default) {
          ResolvedComponent = component.default;
          try { window.sessionStorage.setItem(key, 'false'); } catch (e) {}
          return component;
        }
      } catch (err: any) {
        lastError = err;
        preloadedPromise = null;
        if (attempt < 2) {
          await new Promise(r => setTimeout(r, 250 * attempt));
        }
      }
    }

    const error = lastError;
    const errorMsg = String(error?.message || error || '');
    const isChunkError =
      error?.name === 'ChunkLoadError' ||
      /Failed to fetch dynamically imported module/i.test(errorMsg) ||
      /Loading chunk .* failed/i.test(errorMsg) ||
      /Importing a module script failed/i.test(errorMsg);

    if (typeof window !== 'undefined' && !pageHasAlreadyBeenForceRefreshed && isChunkError) {
      console.warn('[ChunkLoader] Chunk load failed after deployment. Refreshing page for latest bundle:', errorMsg);
      try { window.sessionStorage.setItem(key, 'true'); } catch(e) {}
      window.location.reload();

      return new Promise<{ default: T }>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Module load timed out: ${errorMsg}. Please refresh the page.`));
        }, 3000);
      });
    }

    throw error;
  });

  // Fast synchronous renderer when component is already preloaded in memory
  const FastComponent: any = (props: any) => {
    if (ResolvedComponent) {
      return createElement(ResolvedComponent, props);
    }
    return createElement(LazyComponent, props);
  };

  return Object.assign(FastComponent, { preload });
};

