import { useState, useEffect, useRef, useCallback } from 'react';
import {
  TURNSTILE_ACTION,
  NONCE_REFRESH_MS,
  CLIENT_TAP_HOLD_MS,
  TURNSTILE_UI_TIMEOUT_MS,
  SESSION_RETRY_MAX,
} from '../lib/gateConfig';
import { collectEnv, type FrozenEnvProbe } from '../lib/deviceProbe';

declare global {
  interface Window {
    turnstile?: {
      render: (container: string | HTMLElement, options: Record<string, unknown>) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
    };
  }
}

export interface UseTurnstileVerificationOptions {
  appId: string;
  adminTurnstileSiteKey?: string;
}

const TURNSTILE_SCRIPT_SRC =
  'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

function ensureTurnstileScriptLoaded(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window.turnstile) return;
  const existing = document.querySelector(
    'script[src*="challenges.cloudflare.com/turnstile/v0/api.js"]'
  );
  if (existing) return;
  try {
    const s = document.createElement('script');
    s.src = TURNSTILE_SCRIPT_SRC;
    s.async = true;
    s.defer = true;
    document.head.appendChild(s);
  } catch {
    // Ignore DOM injection errors
  }
}

function sanitizeTurnstileKey(raw: unknown): string {
  if (!raw || typeof raw !== 'string') return '';
  return raw.trim().replace(/^["'`]+|["'`]+$/g, '').trim();
}

function isTestTurnstileSiteKey(k: string): boolean {
  return (
    k.startsWith('1x00000000000000000000') ||
    k.startsWith('2x00000000000000000000') ||
    k.startsWith('3x00000000000000000000')
  );
}

function isRealTurnstileKey(raw: unknown): boolean {
  const k = sanitizeTurnstileKey(raw);
  if (!k || k.length < 10) return false;
  if (
    k.includes('<') ||
    k.includes('>') ||
    k.includes('REPLACE_') ||
    k.includes('YOUR_') ||
    k === 'PLACEHOLDER' ||
    k === 'undefined' ||
    k === 'null'
  ) {
    return false;
  }
  return true;
}

const WIDGET_SOLVE_WATCHDOG_MS = 5000;

export function useTurnstileVerification({
  appId,
  adminTurnstileSiteKey,
}: UseTurnstileVerificationOptions) {
  const [isReady, setIsReady] = useState(false);
  const [isBotBlocked, setIsBotBlocked] = useState(false);
  const [uiTimeoutExceeded, setUiTimeoutExceeded] = useState(false);
  const [isPreviewFallback, setIsPreviewFallback] = useState(false);

  const widgetRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const cfTokenRef = useRef<string | null>(null);
  const nonceRef = useRef<string | null>(null);
  const envRef = useRef<FrozenEnvProbe | null>(null);
  const initResponseTimeRef = useRef<number>(0);
  const retryCountRef = useRef<number>(0);
  const keyIndexRef = useRef<number>(0);
  const wasHiddenRef = useRef<boolean>(false);
  const solvedWithRealKeyRef = useRef<boolean>(false);

  const adminSiteKeyRef = useRef<string | undefined>(adminTurnstileSiteKey);
  adminSiteKeyRef.current = adminTurnstileSiteKey;
  const serverSiteKeyRef = useRef<string>('');
  const serverSiteKeysRef = useRef<string[]>([]);

  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const uiTimeoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scriptWaitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const widgetWatchdogTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callbackDeferTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unmountedRef = useRef<boolean>(false);

  const clearTimers = useCallback(() => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
    if (uiTimeoutTimerRef.current) {
      clearTimeout(uiTimeoutTimerRef.current);
      uiTimeoutTimerRef.current = null;
    }
    if (scriptWaitTimerRef.current) {
      clearTimeout(scriptWaitTimerRef.current);
      scriptWaitTimerRef.current = null;
    }
    if (widgetWatchdogTimerRef.current) {
      clearTimeout(widgetWatchdogTimerRef.current);
      widgetWatchdogTimerRef.current = null;
    }
    if (callbackDeferTimerRef.current) {
      clearTimeout(callbackDeferTimerRef.current);
      callbackDeferTimerRef.current = null;
    }
  }, []);

  const removeWidget = useCallback(() => {
    if (widgetWatchdogTimerRef.current) {
      clearTimeout(widgetWatchdogTimerRef.current);
      widgetWatchdogTimerRef.current = null;
    }
    if (widgetIdRef.current && window.turnstile) {
      try {
        window.turnstile.remove(widgetIdRef.current);
      } catch {
        // Ignore widget cleanup errors
      }
      widgetIdRef.current = null;
    }
    if (widgetRef.current) {
      widgetRef.current.innerHTML = '';
    }
  }, []);

  const checkIsProdDomain = useCallback((): boolean => {
    const hostname =
      typeof window !== 'undefined' ? window.location.hostname.toLowerCase() : '';
    const rawConfiguredDomain = sanitizeTurnstileKey(
      (import.meta as any).env?.VITE_PUBLIC_DOMAIN ||
        (globalThis as any).__APP_BUILD_ENV__?.VITE_PUBLIC_DOMAIN ||
        ''
    ).toLowerCase();
    const strictHostCheck =
      sanitizeTurnstileKey((import.meta as any).env?.VITE_STRICT_HOST_CHECK || '') === '1';
    let configuredHost = '';
    try {
      if (rawConfiguredDomain) {
        configuredHost = new URL(
          rawConfiguredDomain.startsWith('http')
            ? rawConfiguredDomain
            : `https://${rawConfiguredDomain}`
        ).hostname
          .toLowerCase()
          .replace(/^www\./, '');
      }
    } catch {
      configuredHost = rawConfiguredDomain
        .replace(/^https?:\/\//, '')
        .split('/')[0]
        .replace(/^www\./, '');
    }
    const isPreviewOrCloneHost =
      !strictHostCheck &&
      (hostname.endsWith('.pages.dev') ||
        hostname.endsWith('.vercel.app') ||
        hostname.endsWith('.run.app') ||
        hostname === 'localhost' ||
        hostname === '127.0.0.1');
    return (
      strictHostCheck ||
      (!isPreviewOrCloneHost &&
        Boolean(
          configuredHost &&
            (hostname === configuredHost ||
              hostname === `www.${configuredHost}` ||
              hostname.endsWith(`.${configuredHost}`))
        ))
    );
  }, []);

  const resolveRealSiteKeys = useCallback((): string[] => {
    const metaEnv = ((import.meta as any).env || {}) as Record<string, unknown>;
    const buildEnv = ((globalThis as any).__APP_BUILD_ENV__ || {}) as Record<string, unknown>;

    const rawSources: unknown[] = [
      serverSiteKeyRef.current,
      ...serverSiteKeysRef.current,
      adminSiteKeyRef.current,
      metaEnv.VITE_TURNSTILE_SITE_KEY,
      metaEnv.TURNSTILE_SITE_KEY,
      metaEnv.CF_TURNSTILE_SITE_KEY,
      metaEnv.CLOUDFLARE_TURNSTILE_SITE_KEY,
      metaEnv.PUBLIC_TURNSTILE_SITE_KEY,
      metaEnv.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
      metaEnv.VITE_TURNSTILE_KEY,
      metaEnv.TURNSTILE_KEY,
      buildEnv.VITE_TURNSTILE_SITE_KEY,
      buildEnv.TURNSTILE_SITE_KEY,
    ];

    const candidates: string[] = [];
    for (const raw of rawSources) {
      const k = sanitizeTurnstileKey(raw);
      if (!isRealTurnstileKey(k)) continue;
      if (isTestTurnstileSiteKey(k)) continue;
      if (!candidates.includes(k)) {
        candidates.push(k);
      }
    }
    return candidates;
  }, []);

  const markTokenReady = useCallback(() => {
    if (unmountedRef.current) return;
    if (!cfTokenRef.current || !nonceRef.current) {
      setIsReady(false);
      return;
    }
    if (uiTimeoutTimerRef.current) {
      clearTimeout(uiTimeoutTimerRef.current);
      uiTimeoutTimerRef.current = null;
    }
    if (widgetWatchdogTimerRef.current) {
      clearTimeout(widgetWatchdogTimerRef.current);
      widgetWatchdogTimerRef.current = null;
    }
    const elapsed = Date.now() - initResponseTimeRef.current;
    const remainingHold = Math.max(0, CLIENT_TAP_HOLD_MS - elapsed);

    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    if (remainingHold === 0) {
      setIsReady(true);
    } else {
      holdTimerRef.current = setTimeout(() => {
        if (!unmountedRef.current && cfTokenRef.current && nonceRef.current) {
          setIsReady(true);
        }
      }, remainingHold);
    }
  }, []);

  const startSessionFlow = useCallback(
    async (isSilentRetry = false) => {
      if (unmountedRef.current || !appId) return;

      ensureTurnstileScriptLoaded();
      clearTimers();
      removeWidget();
      cfTokenRef.current = null;
      nonceRef.current = null;
      solvedWithRealKeyRef.current = false;
      setIsReady(false);
      setIsPreviewFallback(false);
      if (!isSilentRetry) {
        setUiTimeoutExceeded(false);
      }

      // 15s UI Timeout guard (§5.5: never spin forever if content blocker blocks Turnstile)
      uiTimeoutTimerRef.current = setTimeout(() => {
        if (!unmountedRef.current && !cfTokenRef.current) {
          if (!checkIsProdDomain() && nonceRef.current) {
            removeWidget();
            setIsPreviewFallback(true);
            cfTokenRef.current = 'XXXX.DUMMY.TOKEN.XXXX';
            markTokenReady();
            return;
          }
          setUiTimeoutExceeded(true);
        }
      }, TURNSTILE_UI_TIMEOUT_MS);

      try {
        // 1. Collect frozen env probe once (§5.3)
        const env = await collectEnv();
        if (unmountedRef.current) return;
        envRef.current = env;

        if (env.gate.failed) {
          clearTimers();
          setIsBotBlocked(true);
          return;
        }

        const safeAppId = appId.replace(/[^A-Za-z0-9_-]/g, '-').slice(0, 64);

        // 2. Request server-issued signed nonce + device cookie + runtime siteKey (§5.4)
        const res = await fetch('/api/v1/app/session-init', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ appId: safeAppId }),
        });

        if (unmountedRef.current) return;

        if (res.status === 404) {
          clearTimers();
          if (retryCountRef.current < SESSION_RETRY_MAX) {
            retryCountRef.current += 1;
            setTimeout(() => {
              if (!unmountedRef.current) void startSessionFlow(true);
            }, 600);
            return;
          }
          const hasTouch =
            (typeof navigator !== 'undefined' && Number(navigator.maxTouchPoints ?? 0) >= 1) ||
            (typeof window !== 'undefined' && 'ontouchstart' in window);
          if (hasTouch && env.gate.wb === 0 && env.gate.hl === 0 && env.gate.dk === 0) {
            setUiTimeoutExceeded(true);
            return;
          }
          setIsBotBlocked(true);
          return;
        }

        const data = await res.json().catch(() => null);
        if (!res.ok || !data || data.status === 'retry' || typeof data.nonce !== 'string') {
          if (retryCountRef.current < SESSION_RETRY_MAX) {
            retryCountRef.current += 1;
            setTimeout(() => {
              if (!unmountedRef.current) void startSessionFlow(true);
            }, 600);
          } else {
            clearTimers();
            setUiTimeoutExceeded(true);
          }
          return;
        }

        if (typeof data.siteKey === 'string' && sanitizeTurnstileKey(data.siteKey)) {
          serverSiteKeyRef.current = sanitizeTurnstileKey(data.siteKey);
        }
        if (Array.isArray(data.siteKeys)) {
          serverSiteKeysRef.current = data.siteKeys
            .map((k: unknown) => sanitizeTurnstileKey(k))
            .filter((k: string) => isRealTurnstileKey(k) && !isTestTurnstileSiteKey(k));
        }

        const nonce = data.nonce.trim();
        const nid = nonce.split('.')[0] || '';
        if (nid.length !== 32) {
          clearTimers();
          setUiTimeoutExceeded(true);
          return;
        }

        nonceRef.current = nonce;
        initResponseTimeRef.current = Date.now();

        // Schedule proactive silent refresh at NONCE_REFRESH_MS (90s) for idle tabs (§5.5)
        refreshTimerRef.current = setTimeout(() => {
          if (
            !unmountedRef.current &&
            typeof document !== 'undefined' &&
            document.visibilityState === 'visible'
          ) {
            retryCountRef.current = 0;
            void startSessionFlow(true);
          }
        }, NONCE_REFRESH_MS);

        const activatePreviewFallback = () => {
          if (unmountedRef.current) return;
          removeWidget();
          setIsPreviewFallback(true);
          cfTokenRef.current = 'XXXX.DUMMY.TOKEN.XXXX';
          retryCountRef.current = 0;
          markTokenReady();
        };

        // 3. Render Turnstile with hardware commitment cData = `${appId}_${nid}_${hw}` (§5.5)
        const renderTurnstileWidget = () => {
          if (unmountedRef.current) return;

          const realCandidates = resolveRealSiteKeys();
          const isProdDomain = checkIsProdDomain();

          // If no real Turnstile key is configured yet:
          // On non-production preview/clone hosts, activate clean preview verification without rendering Cloudflare's red "For testing only" banner.
          if (realCandidates.length === 0) {
            if (!isProdDomain) {
              activatePreviewFallback();
              return;
            }
            clearTimers();
            setUiTimeoutExceeded(true);
            return;
          }

          if (!window.turnstile || !widgetRef.current) {
            scriptWaitTimerRef.current = setTimeout(renderTurnstileWidget, 100);
            return;
          }

          removeWidget();
          setIsPreviewFallback(false);

          const idx = Math.min(keyIndexRef.current, realCandidates.length - 1);
          const sitekey = realCandidates[idx];

          // Always defer widget removal / re-render outside of Turnstile's own callback stack frame
          // so Cloudflare's api.js state machine never freezes on "Verifying..."
          const handleCandidateFailure = () => {
            if (unmountedRef.current || solvedWithRealKeyRef.current) return;
            if (widgetWatchdogTimerRef.current) {
              clearTimeout(widgetWatchdogTimerRef.current);
              widgetWatchdogTimerRef.current = null;
            }
            cfTokenRef.current = null;
            setIsReady(false);

            if (callbackDeferTimerRef.current) {
              clearTimeout(callbackDeferTimerRef.current);
            }
            callbackDeferTimerRef.current = setTimeout(() => {
              if (unmountedRef.current || solvedWithRealKeyRef.current) return;
              const latestRealCandidates = resolveRealSiteKeys();
              if (keyIndexRef.current + 1 < latestRealCandidates.length) {
                keyIndexRef.current += 1;
                renderTurnstileWidget();
                return;
              }
              if (!checkIsProdDomain()) {
                activatePreviewFallback();
                return;
              }
              if (retryCountRef.current < SESSION_RETRY_MAX) {
                retryCountRef.current += 1;
                void startSessionFlow(true);
              } else {
                setUiTimeoutExceeded(true);
              }
            }, 60);
          };

          const softReinit = () => {
            if (unmountedRef.current) return;
            if (widgetWatchdogTimerRef.current) {
              clearTimeout(widgetWatchdogTimerRef.current);
              widgetWatchdogTimerRef.current = null;
            }
            cfTokenRef.current = null;
            solvedWithRealKeyRef.current = false;
            setIsReady(false);
            if (callbackDeferTimerRef.current) {
              clearTimeout(callbackDeferTimerRef.current);
            }
            callbackDeferTimerRef.current = setTimeout(() => {
              if (unmountedRef.current) return;
              if (retryCountRef.current < SESSION_RETRY_MAX) {
                retryCountRef.current += 1;
                void startSessionFlow(true);
              } else if (!checkIsProdDomain()) {
                activatePreviewFallback();
              } else {
                setUiTimeoutExceeded(true);
              }
            }, 60);
          };

          const cData = `${safeAppId}_${nid}_${env.hw}`;

          // Start a 5s per-widget solve watchdog so a hung iframe on mobile/preview never spins for 15s
          widgetWatchdogTimerRef.current = setTimeout(() => {
            if (!unmountedRef.current && !cfTokenRef.current) {
              handleCandidateFailure();
            }
          }, WIDGET_SOLVE_WATCHDOG_MS);

          try {
            widgetRef.current.innerHTML = '';
            const id = window.turnstile.render(widgetRef.current, {
              sitekey,
              action: TURNSTILE_ACTION,
              cData,
              appearance: 'always',
              size: 'flexible',
              theme: 'auto',
              callback: (t: string) => {
                if (unmountedRef.current) return;
                if (widgetWatchdogTimerRef.current) {
                  clearTimeout(widgetWatchdogTimerRef.current);
                  widgetWatchdogTimerRef.current = null;
                }
                solvedWithRealKeyRef.current = true;
                setIsPreviewFallback(false);
                cfTokenRef.current = t;
                retryCountRef.current = 0;
                markTokenReady();
              },
              'error-callback': handleCandidateFailure,
              'expired-callback': softReinit,
              'timeout-callback': handleCandidateFailure,
            });
            widgetIdRef.current = id;
          } catch {
            handleCandidateFailure();
          }
        };

        renderTurnstileWidget();
      } catch {
        if (!unmountedRef.current) {
          if (retryCountRef.current < SESSION_RETRY_MAX) {
            retryCountRef.current += 1;
            setTimeout(() => {
              if (!unmountedRef.current) void startSessionFlow(true);
            }, 600);
          } else {
            clearTimers();
            setUiTimeoutExceeded(true);
          }
        }
      }
    },
    [appId, checkIsProdDomain, clearTimers, markTokenReady, removeWidget, resolveRealSiteKeys]
  );

  // If adminTurnstileSiteKey arrives asynchronously from DataContextPublic after mount,
  // and we haven't solved with a real key yet, re-run verification with the real key.
  useEffect(() => {
    const cleanAdminKey = sanitizeTurnstileKey(adminTurnstileSiteKey);
    if (
      cleanAdminKey &&
      isRealTurnstileKey(cleanAdminKey) &&
      !isTestTurnstileSiteKey(cleanAdminKey) &&
      !solvedWithRealKeyRef.current &&
      nonceRef.current
    ) {
      keyIndexRef.current = 0;
      retryCountRef.current = 0;
      void startSessionFlow(true);
    }
  }, [adminTurnstileSiteKey, startSessionFlow]);

  // Initial mount + visibilitychange (hidden -> visible) & pageshow (persisted) re-verification (§5.9)
  useEffect(() => {
    unmountedRef.current = false;
    retryCountRef.current = 0;
    keyIndexRef.current = 0;
    wasHiddenRef.current = false;
    void startSessionFlow(false);

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        wasHiddenRef.current = true;
      } else if (document.visibilityState === 'visible' && wasHiddenRef.current) {
        wasHiddenRef.current = false;
        const tokenAgeMs = Date.now() - initResponseTimeRef.current;
        if (!cfTokenRef.current || !nonceRef.current || tokenAgeMs > 60000) {
          retryCountRef.current = 0;
          void startSessionFlow(true);
        }
      }
    };

    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        retryCountRef.current = 0;
        void startSessionFlow(true);
      }
    };

    // Mouse pointerdown trap (§5.3: only flag genuine desktop mouse if device has NO touch capability)
    const onGlobalPointerDown = (e: PointerEvent) => {
      const hasTouch =
        (typeof navigator !== 'undefined' && Number(navigator.maxTouchPoints ?? 0) >= 1) ||
        (typeof window !== 'undefined' && 'ontouchstart' in window);
      if (e.pointerType === 'mouse' && e.isTrusted && !hasTouch) {
        setIsBotBlocked(true);
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pageshow', onPageShow);
    window.addEventListener('pointerdown', onGlobalPointerDown, { passive: true });

    return () => {
      unmountedRef.current = true;
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pageshow', onPageShow);
      window.removeEventListener('pointerdown', onGlobalPointerDown);
      clearTimers();
      removeWidget();
      cfTokenRef.current = null;
      nonceRef.current = null;
    };
  }, [clearTimers, removeWidget, startSessionFlow]);

  const restartVerification = useCallback(
    (manualReset = false) => {
      if (manualReset) {
        retryCountRef.current = 0;
        keyIndexRef.current = 0;
      }
      void startSessionFlow(!manualReset);
    },
    [startSessionFlow]
  );

  const wipeSessionSecrets = useCallback(() => {
    clearTimers();
    removeWidget();
    cfTokenRef.current = null;
    nonceRef.current = null;
    solvedWithRealKeyRef.current = false;
    setIsReady(false);
    setIsPreviewFallback(false);
  }, [clearTimers, removeWidget]);

  return {
    isReady,
    isBotBlocked,
    setIsBotBlocked,
    uiTimeoutExceeded,
    isPreviewFallback,
    widgetRef,
    cfTokenRef,
    nonceRef,
    envRef,
    retryCountRef,
    restartVerification,
    wipeSessionSecrets,
  };
}
