import { useParams, useLocation, useNavigate, Link } from 'react-router-dom';
import Meta from '../components/Meta';
import { useData } from '../contexts/DataContextPublic';
import { ShieldAlert, ArrowLeft, Shield } from 'lucide-react';
import { useState, useEffect, useRef, useMemo } from 'react';
import ClearanceButton from '../components/ClearanceButton';
import { loadFullStaticDataset } from '../lib/lightFallback';
import { resolveAppSlug } from '../lib/slugResolver';
import { getPrefetchedApp } from '../lib/preloadHelper';
import { getOptimizedImageUrl } from '../seo/utils';
import { NAV_BREADCRUMB_TTL_MS } from '../lib/gateConfig';
import { collectEnv } from '../lib/deviceProbe';

export default function GatewayPage() {
  const {
    apps: mockApps,
    settings: mockSettings,
    loading,
    updateAppDetail,
    mergeCatalogApps,
  } = useData();
  const { slug: routeSlug, '*': splat } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const decodedSplat = splat ? decodeURIComponent(splat) : '';
  const splatStripped = decodedSplat
    .replace(/^\/(?:moreinfo|info|gateway|download)\//, '/')
    .replace(/^\/|\/$/g, '');
  const slug = routeSlug || splatStripped;
  const cleanSlugKey = slug?.toLowerCase().trim() || '';

  const [fetchedApp, setFetchedApp] = useState<any | null>(null);
  const [staticApps, setStaticApps] = useState<any[]>([]);
  const [staticLoaded, setStaticLoaded] = useState<boolean>(false);
  const [isFetchingDetails, setIsFetchingDetails] = useState<boolean>(false);
  const [remoteCheckDoneSlug, setRemoteCheckDoneSlug] = useState<string>('');
  const [isBotBlocked, setIsBotBlocked] = useState<boolean>(false);
  const [navState, setNavState] = useState<{ checked: boolean; nv: 0 | 1 }>({
    checked: false,
    nv: 1,
  });

  const syncAttemptedRef = useRef<Record<string, boolean>>({});
  const activeSlugRef = useRef<string>(cleanSlugKey);
  activeSlugRef.current = cleanSlugKey;

  useEffect(() => {
    window.scrollTo(0, 0);
    setFetchedApp((prev: any) => {
      if (!prev || !cleanSlugKey) return null;
      const fSlug = String(prev.slug || prev.id || '').toLowerCase().trim();
      if (fSlug === cleanSlugKey || resolveAppSlug(cleanSlugKey, [prev])) return prev;
      return null;
    });
  }, [slug, cleanSlugKey]);

  // Step 5.2: Check 3-source navProof (router location.state.nav, window.__rdNav, sessionStorage)
  // with one-time redirect and loop guard
  useEffect(() => {
    if (!cleanSlugKey) {
      setNavState({ checked: true, nv: 0 });
      return;
    }

    const now = Date.now();
    let hasValidNavProof = false;

    // Source 1: Router location.state.nav
    const stateNav = (location.state as { nav?: number } | null)?.nav;
    if (
      typeof stateNav === 'number' &&
      now - stateNav >= 0 &&
      now - stateNav <= NAV_BREADCRUMB_TTL_MS
    ) {
      hasValidNavProof = true;
    }

    // Source 2: In-memory window.__rdNav
    if (!hasValidNavProof && typeof window !== 'undefined' && window.__rdNav) {
      const mem = window.__rdNav;
      if (
        mem.slug === cleanSlugKey &&
        typeof mem.ts === 'number' &&
        now - mem.ts >= 0 &&
        now - mem.ts <= NAV_BREADCRUMB_TTL_MS
      ) {
        hasValidNavProof = true;
      }
    }

    // Source 3: sessionStorage entry
    if (!hasValidNavProof) {
      try {
        const storedTs = Number(sessionStorage.getItem(`rd_nav_${cleanSlugKey}`) || '0');
        if (storedTs > 0 && now - storedTs >= 0 && now - storedTs <= NAV_BREADCRUMB_TTL_MS) {
          hasValidNavProof = true;
        }
      } catch {
        // Storage blocked in private/in-app browser
      }
    }

    if (hasValidNavProof) {
      setNavState({ checked: true, nv: 1 });
      return;
    }

    // navProof is missing: bounce ONCE to /app/:slug; on second arrival render with nv = 0 (no loop)
    if (typeof window !== 'undefined' && window.__rdBounced !== cleanSlugKey) {
      window.__rdBounced = cleanSlugKey;
      navigate(`/app/${encodeURIComponent(cleanSlugKey)}`, { replace: true });
      return;
    }

    setNavState({ checked: true, nv: 0 });
  }, [cleanSlugKey, location.state, navigate]);

  // Step 5.3: Run client mobile gate & frozen probes once on mount
  useEffect(() => {
    let active = true;
    collectEnv()
      .then((env) => {
        if (active && env.gate.failed) {
          setIsBotBlocked(true);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  // 1. High-Availability Background Static Dataset Loader
  useEffect(() => {
    let active = true;
    loadFullStaticDataset()
      .then((ds) => {
        if (active && ds?.apps && Array.isArray(ds.apps) && ds.apps.length > 0) {
          setStaticApps(ds.apps);
          setStaticLoaded(true);
          return;
        }
        return fetch('/public-api/staticData.json')
          .then((r) => r.json())
          .then((data) => {
            if (active && data?.apps && Array.isArray(data.apps)) {
              setStaticApps(data.apps);
            }
          });
      })
      .catch(() => {
        // Fallback fetch from public staticData.json if dynamic import failed
        return fetch('/public-api/staticData.json')
          .then((r) => r.json())
          .then((data) => {
            if (active && data?.apps && Array.isArray(data.apps)) {
              setStaticApps(data.apps);
            }
          })
          .catch(() => {});
      })
      .finally(() => {
        if (active) setStaticLoaded(true);
      });
    return () => {
      active = false;
    };
  }, []);

  // 2. Instant Multi-Tier Slug Resolution
  const app = useMemo(() => {
    if (!cleanSlugKey) return null;

    if (fetchedApp) {
      const fSlug = String(fetchedApp.slug || fetchedApp.id || '')
        .toLowerCase()
        .trim();
      if (fSlug === cleanSlugKey || resolveAppSlug(cleanSlugKey, [fetchedApp])) {
        return fetchedApp;
      }
    }

    const prefetched = getPrefetchedApp(cleanSlugKey);
    if (prefetched) return prefetched;

    const resolvedFromMock = resolveAppSlug(cleanSlugKey, mockApps);
    if (resolvedFromMock) return resolvedFromMock;

    if (typeof window !== 'undefined' && Array.isArray((window as any).__INITIAL_DATA__?.apps)) {
      const resolvedFromInitial = resolveAppSlug(
        cleanSlugKey,
        (window as any).__INITIAL_DATA__.apps
      );
      if (resolvedFromInitial) return resolvedFromInitial;
    }

    const resolvedFromStatic = resolveAppSlug(cleanSlugKey, staticApps);
    if (resolvedFromStatic) return resolvedFromStatic;

    return null;
  }, [cleanSlugKey, mockApps, fetchedApp, staticApps]);

  // 3. Resilient Background Fetch for App Metadata
  useEffect(() => {
    if (!cleanSlugKey || !navState.checked) return;

    if (app && app.name) {
      setRemoteCheckDoneSlug(cleanSlugKey);
      return;
    }

    if (!syncAttemptedRef.current[cleanSlugKey]) {
      syncAttemptedRef.current[cleanSlugKey] = true;
      setIsFetchingDetails(true);

      fetch(`/api/v1/public/app/${encodeURIComponent(cleanSlugKey)}`)
        .then((res) => {
          if (res.ok) return res.json();
          throw new Error(`HTTP ${res.status}`);
        })
        .then((data) => {
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
            if (activeSlugRef.current === cleanSlugKey) {
              setFetchedApp(data.app);
            }
          }
        })
        .catch(() => {})
        .finally(() => {
          if (activeSlugRef.current === cleanSlugKey) {
            setIsFetchingDetails(false);
            setRemoteCheckDoneSlug(cleanSlugKey);
          }
        });
    }
  }, [cleanSlugKey, navState.checked, app, mockApps, updateAppDetail, mergeCatalogApps]);

  // Disguised 404 UI (§5.3 & §5.9): styled "404 — Page Not Found" screen with neutral "Home" link to "/"
  if (isBotBlocked) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-4 max-w-md mx-auto min-h-[60vh]">
        <Meta
          title="404 — Page Not Found"
          description="The requested page could not be found."
          noindex={true}
        />
        <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 rounded-2xl flex items-center justify-center mb-6">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
          404 — Page Not Found
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-2 leading-relaxed mb-8">
          The page you are looking for does not exist or is unavailable.
        </p>
        <Link
          to="/"
          className="inline-flex items-center justify-center px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-semibold text-sm transition-all shadow-md"
        >
          Home
        </Link>
      </div>
    );
  }

  if (!navState.checked) {
    return null;
  }

  if (
    !app &&
    (!staticLoaded ||
      loading ||
      isFetchingDetails ||
      (cleanSlugKey && remoteCheckDoneSlug !== cleanSlugKey))
  ) {
    return (
      <div className="flex flex-col items-center justify-center py-24 min-h-[50vh]">
        <div className="w-9 h-9 border-[3px] border-black/10 dark:border-white/10 border-t-blue-500 rounded-full animate-spin mb-4" />
        <p className="text-sm font-semibold tracking-wide text-zinc-500 animate-pulse">
          INITIALIZING…
        </p>
      </div>
    );
  }

  if (!app) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-4 max-w-md mx-auto min-h-[60vh]">
        <Meta
          title="404 — Page Not Found"
          description="The requested page could not be found."
          noindex={true}
        />
        <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 rounded-2xl flex items-center justify-center mb-6">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
          404 — Page Not Found
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-2 leading-relaxed mb-8">
          The page you are looking for does not exist or is unavailable.
        </p>
        <Link
          to="/"
          className="inline-flex items-center justify-center px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-semibold text-sm transition-all shadow-md"
        >
          Home
        </Link>
      </div>
    );
  }

  const isActuallyComingSoon = app?.is_coming_soon;

  return (
    <div className="animate-fade-in select-none pb-40 w-full bg-zinc-50/30 dark:bg-zinc-950/20 min-h-screen">
      {/* Back Button */}
      <div className="max-w-4xl mx-auto mb-4 xs:mb-6 sm:mb-8 pt-4 xs:pt-6 sm:pt-8 px-3 xs:px-4 sm:px-6">
        <Link
          to={`/app/${app.slug}`}
          className="inline-flex items-center gap-1.5 xs:gap-2 text-[10px] xs:text-[11px] font-bold uppercase tracking-wider text-zinc-500 hover:text-emerald-600 dark:text-zinc-400 dark:hover:text-emerald-400 transition-colors bg-white dark:bg-zinc-900 px-3 xs:px-4 py-2 xs:py-2.5 rounded-full border border-black/[0.05] dark:border-white/[0.05] shadow-sm hover:shadow-md transition-all group"
        >
          <ArrowLeft className="w-3 h-3 xs:w-3.5 xs:h-3.5 group-hover:-translate-x-1 transition-transform duration-200" />
          Back to details
        </Link>
      </div>

      {/* Zero-SEO / Strict NoIndex Security Directive (§5.10 & §6) */}
      <Meta
        title={`Verification Portal — ${app.name}`}
        description={`Technical specifications and verified mirror gateway for ${app.name}`}
        noindex={true}
      />

      {/* Main App Presentation & Action */}
      <div className="max-w-4xl mx-auto w-full mb-8 sm:mb-12 px-3 xs:px-4 sm:px-6">
        <div className="flex flex-col items-center gap-5 xs:gap-8">
          <div className="flex flex-col items-center text-center gap-3 xs:gap-4 w-full">
            <div className="relative group shrink-0">
              <div className="relative z-10 w-20 h-20 xs:w-24 xs:h-24 sm:w-28 sm:h-28 rounded-2xl sm:rounded-3xl bg-white dark:bg-zinc-800 p-1 shadow-md border border-black/5 dark:border-white/10 overflow-hidden hover:scale-105 transition-transform duration-200">
                {app.icon_url ? (
                  <img
                    src={getOptimizedImageUrl(app.icon_url, 256) || app.icon_url}
                    alt={app.name}
                    loading="eager"
                    fetchPriority="high"
                    decoding="async"
                    width={128}
                    height={128}
                    className="w-full h-full object-cover rounded-[1.1rem] xs:rounded-[1.4rem] sm:rounded-[1.8rem]"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-700 animate-pulse" />
                )}
              </div>
            </div>

            <div className="flex flex-col items-center">
              <h1 className="text-xl xs:text-2xl sm:text-3xl font-black tracking-tight mb-1.5 xs:mb-2 text-zinc-800 dark:text-zinc-100">
                {app.name}
              </h1>
              <div className="flex flex-wrap justify-center items-center gap-1.5">
                <span className="inline-flex items-center px-2.5 xs:px-3 py-1 rounded-lg text-[9px] xs:text-[10px] font-bold uppercase tracking-wider bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-black/[0.04] shadow-sm">
                  ID: {app.serial_number || app.id}
                </span>
                <span className="inline-flex items-center px-2.5 xs:px-3 py-1 rounded-lg text-[9px] xs:text-[10px] font-bold uppercase tracking-wider bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-black/[0.04] shadow-sm">
                  Ver: {app.version}
                </span>
                <span className="inline-flex items-center px-2.5 xs:px-3 py-1 rounded-lg text-[9px] xs:text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-sm">
                  <Shield className="w-2.5 h-2.5 xs:w-3 xs:h-3 mr-1 inline" />
                  Verified
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center gap-4 w-full">
            {isActuallyComingSoon ? (
              <div className="w-full max-w-[340px] flex flex-col items-center">
                <button
                  type="button"
                  disabled
                  className="w-full py-4 px-10 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-sm text-sm font-bold shrink-0 cursor-not-allowed bg-amber-500/10 text-amber-500 border border-amber-500/20"
                >
                  Coming Soon
                </button>
              </div>
            ) : (
              <div className="w-full max-w-[360px]">
                <ClearanceButton
                  appId={String(app.slug || app.id)}
                  appSlug={app.slug}
                  nv={navState.nv}
                  status={app.safety_status as 'Verified' | 'Caution' | 'Unsafe'}
                  onBotBlocked={() => setIsBotBlocked(true)}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Helpline Block */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-6 max-w-4xl mx-auto w-full mt-12 mb-20 px-4 sm:px-6">
        {mockSettings?.helpline_whatsapp && (
          <a
            href={`https://wa.me/${mockSettings.helpline_whatsapp.replace('+', '')}`}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="flex items-center justify-center gap-2 text-zinc-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors font-bold text-xs uppercase tracking-wider bg-white dark:bg-zinc-900 px-6 py-3.5 rounded-full border border-black/[0.05] dark:border-white/[0.05] shadow-sm hover:shadow"
          >
            WhatsApp Support
          </a>
        )}
        {mockSettings?.helpline_telegram && (
          <a
            href={`https://t.me/${mockSettings.helpline_telegram.replace('@', '')}`}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="flex items-center justify-center gap-2 text-zinc-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors font-bold text-xs uppercase tracking-wider bg-white dark:bg-zinc-900 px-6 py-3.5 rounded-full border border-black/[0.05] dark:border-white/[0.05] shadow-sm hover:shadow"
          >
            Telegram Support
          </a>
        )}
      </div>
    </div>
  );
}
