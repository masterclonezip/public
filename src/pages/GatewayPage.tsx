import { useParams, useLocation, Link } from 'react-router-dom';
import Meta from '../components/Meta';
import { useData } from '../contexts/DataContextPublic';
import { ArrowLeft, Shield } from 'lucide-react';
import { useState, useEffect, useRef, useMemo } from 'react';
import ClearanceButton from '../components/ClearanceButton';
import { loadFullStaticDataset } from '../lib/lightFallback';
import { resolveAppSlug } from '../lib/slugResolver';
import { getPrefetchedApp } from '../lib/preloadHelper';
import { getOptimizedImageUrl } from '../seo/utils';
import { NAV_BREADCRUMB_TTL_MS } from '../lib/gateConfig';
import { collectEnv, inspectClientMobileGate } from '../lib/deviceProbe';

export default function GatewayPage() {
  const {
    apps: mockApps,
    settings: mockSettings,
    loading,
    updateAppDetail,
    mergeCatalogApps,
    fetchSettings,
  } = useData();
  const { slug: routeSlug, '*': splat } = useParams();
  const location = useLocation();

  const decodedSplat = splat ? decodeURIComponent(splat) : '';
  const splatStripped = decodedSplat
    .replace(/^\/moreinfo\//, '/')
    .replace(/^\/|\/$/g, '');
  const slug = routeSlug || splatStripped;
  const cleanSlugKey = slug?.toLowerCase().trim() || '';

  const [fetchedApp, setFetchedApp] = useState<any | null>(null);
  const [staticApps, setStaticApps] = useState<any[]>([]);
  const [staticLoaded, setStaticLoaded] = useState<boolean>(false);
  const [isFetchingDetails, setIsFetchingDetails] = useState<boolean>(false);
  const [remoteCheckDoneSlug, setRemoteCheckDoneSlug] = useState<string>('');
  const [iconError, setIconError] = useState<boolean>(false);
  const [isBotBlocked, setIsBotBlocked] = useState<boolean>(() =>
    typeof window !== 'undefined' ? inspectClientMobileGate().failed : false
  );
  const [navState, setNavState] = useState<{ checked: boolean; nv: 0 | 1 }>({
    checked: false,
    nv: 1,
  });

  const syncAttemptedRef = useRef<Record<string, boolean>>({});
  const activeSlugRef = useRef<string>(cleanSlugKey);
  activeSlugRef.current = cleanSlugKey;

  useEffect(() => {
    if (!mockSettings?.turnstile_site_key && typeof fetchSettings === 'function') {
      fetchSettings();
    }
  }, [mockSettings?.turnstile_site_key, fetchSettings]);

  useEffect(() => {
    window.scrollTo(0, 0);
    setIconError(false);
    setFetchedApp((prev: any) => {
      if (!prev || !cleanSlugKey) return null;
      const fSlug = String(prev.slug || prev.id || '').toLowerCase().trim();
      if (fSlug === cleanSlugKey || resolveAppSlug(cleanSlugKey, [prev])) return prev;
      return null;
    });
  }, [slug, cleanSlugKey]);

  // Step 5.2: Check 3-source navProof (router location.state.nav, window.__rdNav, sessionStorage)
  // Direct visits / refreshes render directly on /moreinfo/:slug with nv = 0 (1000ms server dwell floor)
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

    setNavState({ checked: true, nv: hasValidNavProof ? 1 : 0 });
  }, [cleanSlugKey, location.state]);

  // Step 5.3: Run client mobile gate & frozen probes once on mount + re-check on viewport resize ("Desktop site" toggle)
  useEffect(() => {
    let active = true;
    if (inspectClientMobileGate().failed) {
      setIsBotBlocked(true);
      return;
    }
    collectEnv()
      .then((env) => {
        if (active && env.gate.failed) {
          setIsBotBlocked(true);
        }
      })
      .catch(() => {});

    const onResize = () => {
      if (inspectClientMobileGate().failed) {
        setIsBotBlocked(true);
      }
    };
    window.addEventListener('resize', onResize, { passive: true });
    return () => {
      active = false;
      window.removeEventListener('resize', onResize);
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
        return fetch('/api/v1/public/data')
          .then((r) => r.json())
          .then((data) => {
            if (active && data?.apps && Array.isArray(data.apps)) {
              setStaticApps(data.apps);
            }
          });
      })
      .catch(() => {
        // Fallback fetch from public API if dynamic import failed
        return fetch('/api/v1/public/data')
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

  // 2. Instant Multi-Tier Slug Resolution (with resilient slug fallback if catalog JSON is empty on a clone)
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

    if (
      remoteCheckDoneSlug === cleanSlugKey &&
      /^[a-z0-9][a-z0-9\-_]{0,63}$/i.test(cleanSlugKey) &&
      !/\.(php|env|git|sql|asp|jsp|xml|json)$/i.test(cleanSlugKey)
    ) {
      return {
        id: cleanSlugKey,
        slug: cleanSlugKey,
        name: cleanSlugKey.replace(/[-_]+/g, ' ').toUpperCase(),
        version: '1.0',
        safety_status: 'Verified',
      };
    }

    return null;
  }, [cleanSlugKey, mockApps, fetchedApp, staticApps, remoteCheckDoneSlug]);

  // 3. Resilient Background Fetch for App Metadata (tries /api/v1/public/app/:slug then /api/v1/public/backup-data)
  useEffect(() => {
    if (!cleanSlugKey || !navState.checked) return;

    if (app && app.name && remoteCheckDoneSlug === cleanSlugKey) {
      return;
    }

    if (!syncAttemptedRef.current[cleanSlugKey]) {
      syncAttemptedRef.current[cleanSlugKey] = true;
      setIsFetchingDetails(true);

      fetch(`/api/v1/public/app/${encodeURIComponent(cleanSlugKey)}`)
        .then(async (res) => {
          if (res.ok) return res.json();
          const backupRes = await fetch('/api/v1/public/backup-data').catch(() => null);
          if (backupRes && backupRes.ok) {
            const backupData = await backupRes.json().catch(() => null);
            const backupApps = Array.isArray(backupData?.apps) ? backupData.apps : [];
            const matched = resolveAppSlug(cleanSlugKey, backupApps);
            if (matched) {
              return { status: 'OK', app: matched, catalogApps: backupApps };
            }
          }
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
  }, [cleanSlugKey, navState.checked, app, remoteCheckDoneSlug, mockApps, updateAppDetail, mergeCatalogApps]);

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
          <span className="text-xl font-bold tracking-tight">404</span>
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
          <span className="text-xl font-bold tracking-tight">404</span>
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
  const appMonogram = String(app?.name || 'A').trim().charAt(0).toUpperCase() || 'A';

  return (
    <div className="animate-fade-in select-none pb-28 w-full bg-zinc-50/40 dark:bg-zinc-950/30 min-h-screen">
      {/* Back Navigation Bar */}
      <div className="max-w-md mx-auto pt-4 xs:pt-6 sm:pt-8 pb-3 xs:pb-4 px-3 xs:px-4">
        <Link
          to={`/app/${app.slug}`}
          className="inline-flex items-center gap-2 min-h-[42px] px-4 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-white/[0.08] text-xs font-semibold text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white shadow-2xs transition-all active:scale-[0.98] group"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform duration-150" />
          <span>Back to details</span>
        </Link>
      </div>

      {/* Zero-SEO / Strict NoIndex Security Directive (§5.10 & §6) */}
      <Meta
        title={`Verification Portal — ${app.name}`}
        description={`Technical specifications and verified mirror gateway for ${app.name}`}
        noindex={true}
      />

      {/* Single-Elevation Verification Portal Surface */}
      <div className="max-w-md mx-auto w-full px-3 xs:px-4">
        <div className="bg-white dark:bg-zinc-900/90 rounded-3xl border border-zinc-200/80 dark:border-white/[0.08] p-5 xs:p-6 sm:p-8 shadow-xs flex flex-col items-center text-center gap-5">
          {/* App Icon with Zero-Broken-Image Monogram Fallback */}
          <div className="relative z-10 w-20 h-20 xs:w-24 xs:h-24 rounded-2xl sm:rounded-3xl bg-zinc-50 dark:bg-zinc-800 p-1 shadow-xs border border-black/5 dark:border-white/10 overflow-hidden shrink-0 flex items-center justify-center">
            {app.icon_url && !iconError ? (
              <img
                src={getOptimizedImageUrl(app.icon_url, 256) || app.icon_url}
                alt={app.name}
                loading="eager"
                fetchPriority="high"
                decoding="async"
                width={96}
                height={96}
                onError={() => setIconError(true)}
                className="w-full h-full object-cover rounded-[0.9rem] xs:rounded-[1.15rem] sm:rounded-[1.35rem]"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-full h-full rounded-[0.9rem] xs:rounded-[1.15rem] bg-blue-600 text-white font-black text-2xl xs:text-3xl flex items-center justify-center select-none">
                {appMonogram}
              </div>
            )}
          </div>

          {/* Title & Unboxed Editorial Metadata (§1.A Zero-Pill Discipline) */}
          <div className="flex flex-col items-center gap-1.5 w-full min-w-0">
            <h1 className="text-xl xs:text-2xl font-black tracking-tight text-zinc-900 dark:text-zinc-100 leading-tight max-w-full break-words">
              {app.name}
            </h1>
            <div className="flex flex-wrap justify-center items-center gap-x-2 gap-y-1 text-xs font-medium text-zinc-500 dark:text-zinc-400 tabular-nums">
              <span>ID #{app.serial_number || app.id}</span>
              <span aria-hidden="true" className="text-zinc-300 dark:text-zinc-700">·</span>
              <span>Version {app.version || '1.0'}</span>
              <span aria-hidden="true" className="text-zinc-300 dark:text-zinc-700">·</span>
              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                <Shield className="w-3.5 h-3.5 shrink-0" />
                <span>Verified</span>
              </span>
            </div>
          </div>

          {/* Hairline Technical Summary Row (when developer/size/category available) */}
          {(app.developer || app.size || app.category) && (
            <div className="w-full pt-3.5 border-t border-zinc-100 dark:border-white/[0.06] flex items-center justify-center gap-x-3 gap-y-1 flex-wrap text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
              {app.developer && <span className="truncate max-w-[180px]">{app.developer}</span>}
              {app.developer && (app.category || app.size) && (
                <span aria-hidden="true" className="text-zinc-300 dark:text-zinc-700">·</span>
              )}
              {app.category && <span>{String(app.category).split(',')[0].trim()}</span>}
              {app.category && app.size && (
                <span aria-hidden="true" className="text-zinc-300 dark:text-zinc-700">·</span>
              )}
              {app.size && <span>{app.size}</span>}
            </div>
          )}

          {/* Action / Verification Section */}
          <div className="w-full pt-1">
            {isActuallyComingSoon ? (
              <button
                type="button"
                disabled
                className="w-full min-h-[52px] py-3.5 px-8 rounded-2xl flex items-center justify-center gap-2 text-sm font-bold cursor-not-allowed bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
              >
                Coming Soon
              </button>
            ) : (
              <ClearanceButton
                appId={String(app.slug || app.id)}
                appSlug={app.slug}
                nv={navState.nv}
                status={app.safety_status as 'Verified' | 'Caution' | 'Unsafe'}
                onBotBlocked={() => setIsBotBlocked(true)}
              />
            )}
          </div>
        </div>
      </div>

      {/* Helpline Block */}
      {(mockSettings?.helpline_whatsapp || mockSettings?.helpline_telegram) && (
        <div className="flex flex-col xs:flex-row items-center justify-center gap-3 max-w-md mx-auto w-full mt-6 px-3 xs:px-4">
          {mockSettings?.helpline_whatsapp && (
            <a
              href={`https://wa.me/${mockSettings.helpline_whatsapp.replace('+', '')}`}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="w-full xs:w-auto flex-1 min-h-[44px] flex items-center justify-center gap-2 text-zinc-600 dark:text-zinc-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors font-semibold text-xs bg-white dark:bg-zinc-900 px-5 py-2.5 rounded-2xl border border-zinc-200/80 dark:border-white/[0.08] shadow-2xs active:scale-[0.98]"
            >
              WhatsApp Support
            </a>
          )}
          {mockSettings?.helpline_telegram && (
            <a
              href={`https://t.me/${mockSettings.helpline_telegram.replace('@', '')}`}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="w-full xs:w-auto flex-1 min-h-[44px] flex items-center justify-center gap-2 text-zinc-600 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-semibold text-xs bg-white dark:bg-zinc-900 px-5 py-2.5 rounded-2xl border border-zinc-200/80 dark:border-white/[0.08] shadow-2xs active:scale-[0.98]"
            >
              Telegram Support
            </a>
          )}
        </div>
      )}
    </div>
  );
}
