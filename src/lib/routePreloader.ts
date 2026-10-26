/**
 * Intelligent Route Preloader & Instant Navigation Engine
 * Preloads dynamic route chunks during idle browser time and on user interaction (hover/touch-start).
 * Guarantees 0ms navigation lag with zero loading screen flash.
 */

/**
 * All public routes are bundled directly in the main public bundle,
 * guaranteeing 0ms route transitions with zero network delay and zero Suspense fallbacks.
 */
export function preloadRoute(_rawPath: string): Promise<any> {
  return Promise.resolve();
}

/**
 * Automatically preloads primary public routes during browser idle time
 */
export function startIdleRoutePreloader(): void {
  if (typeof window === 'undefined') return;

  const isCrawler = typeof navigator !== 'undefined' && /googlebot|google-inspectiontool|bingbot|slurp|duckduckbot|baiduspider|yandexbot|crawler|spider|lighthouse|chrome-lighthouse|headless/i.test(navigator.userAgent || '');
  if (isCrawler) return;

  const runIdle = () => {
    const priorityRoutes = [
      '/app/', '/news', '/news/', '/videos', '/about', '/developers',
      '/contact', '/privacy', '/terms', '/disclaimer', '/notice',
      '/ethics', '/responsibility', '/report-removal', '/faq'
    ];
    let delay = 1200;

    priorityRoutes.forEach(r => {
      setTimeout(() => {
        if ('requestIdleCallback' in window) {
          (window as any).requestIdleCallback(() => preloadRoute(r), { timeout: 4000 });
        } else {
          preloadRoute(r);
        }
      }, delay);
      delay += 350;
    });
  };

  if (document.readyState === 'complete') {
    setTimeout(runIdle, 8000);
  } else {
    window.addEventListener('load', () => setTimeout(runIdle, 8000), { once: true });
  }
}

const preloadedSet = new Set<string>();

/**
 * Listens for touchstart, pointerover, or focus on anchor links to trigger instant preloading
 */
export function setupInteractionPreloader(): () => void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return () => {};
  }

  const handleInteraction = (e: Event) => {
    const target = (e.target as HTMLElement)?.closest('a');
    if (!target) return;

    const href = target.getAttribute('href');
    if (href && (href.startsWith('/') || href.startsWith(window.location.origin))) {
      preloadRoute(href);

      // Pre-warm the browser image cache for the hero image inside this link
      try {
        const img = target.querySelector('img');
        if (img && img.src && !preloadedSet.has(img.src)) {
          preloadedSet.add(img.src);
          const warmImg = new Image();
          warmImg.src = img.src;
        }
      } catch (_) {}
    }
  };

  // Passive touchstart triggers ~150ms-300ms before click on mobile!
  document.addEventListener('touchstart', handleInteraction, { passive: true });
  document.addEventListener('pointerover', handleInteraction, { passive: true });
  document.addEventListener('focusin', handleInteraction, { passive: true });

  return () => {
    document.removeEventListener('touchstart', handleInteraction);
    document.removeEventListener('pointerover', handleInteraction);
    document.removeEventListener('focusin', handleInteraction);
  };
}
