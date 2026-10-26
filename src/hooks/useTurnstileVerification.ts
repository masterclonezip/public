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

function isRealTurnstileKey(k: string): boolean {
  if (!k || k.length < 10) return false;
  if (
    k.includes('<') ||
    k.includes('>') ||
    k.includes('REPLACE_') ||
    k.includes('YOUR_') ||
    k === 'PLACEHOLDER'
  ) {
    return false;
  }
  return true;
}

export function useTurnstileVerification({
  appId,
  adminTurnstileSiteKey,
}: UseTurnstileVerificationOptions) {
  const [isReady, setIsReady] = useState(false);
  const [isBotBlocked, setIsBotBlocked] = useState(false);
  const [uiTimeoutExceeded, setUiTimeoutExceeded] = useState(false);

  const widgetRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const cfTokenRef = useRef<string | null>(null);
  const nonceRef = useRef<string | null>(null);
  const envRef = useRef<FrozenEnvProbe | null>(null);
  const initResponseTimeRef = useRef<number>(0);
  const retryCountRef = useRef<number>(0);
  const keyIndexRef = useRef<number>(0);
  const wasHiddenRef = useRef<boolean>(false);

  const adminSiteKeyRef = useRef<string | undefined>(adminTurnstileSiteKey);
  adminSiteKeyRef.current = adminTurnstileSiteKey;

  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const uiTimeoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scriptWaitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
  }, []);

  const removeWidget = useCallback(() => {
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

  const resolveCandidateSiteKeys = useCallback((): string[] => {
    const hostname =
      typeof window !== 'undefined' ? window.location.hostname.toLowerCase() : '';
    const rawConfiguredDomain = String((import.meta as any).env?.VITE_PUBLIC_DOMAIN || '').trim().toLowerCase();
    let configuredHost = '';
    try {
      if (rawConfiguredDomain) {
        configuredHost = new URL(rawConfiguredDomain.startsWith('http') ? rawConfiguredDomain : `https://${rawConfiguredDomain}`).hostname.toLowerCase();
      }
    } catch {
      configuredHost = rawConfiguredDomain.replace(/^https?:\/\//, '').split('/')[0];
    }
    const isProdDomain =
      Boolean(configuredHost && (hostname === configuredHost || hostname === `www.${configuredHost}` || hostname.endsWith(`.${configuredHost}`))) ||
      hostname.endsWith('.pages.dev');

    const envKey = String((import.meta as any).env?.VITE_TURNSTILE_SITE_KEY || '').trim();
    const adminKey = String(adminSiteKeyRef.current || '').trim();

    const candidates: string[] = [];
    const addKey = (k: string) => {
      if (!isRealTurnstileKey(k)) return;
      // §5.5 & §8 Test 15: Test keys (1x000...) are forbidden on production domains
      if (isProdDomain && k.startsWith('1x00000000000000000000')) return;
      if (!candidates.includes(k)) candidates.push(k);
    };

    // §7 Site key cascade: Admin setting -> VITE_TURNSTILE_SITE_KEY -> test key (non-production hosts only)
    addKey(adminKey);
    addKey(envKey);
    if (!isProdDomain) {
      addKey('1x00000000000000000000AA');
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
      setIsReady(false);
      if (!isSilentRetry) {
        setUiTimeoutExceeded(false);
      }

      // 15s UI Timeout guard (§5.5: never spin forever if content blocker blocks Turnstile)
      uiTimeoutTimerRef.current = setTimeout(() => {
        if (!unmountedRef.current && !cfTokenRef.current) {
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

        const candidateKeys = resolveCandidateSiteKeys();
        if (candidateKeys.length === 0) {
          clearTimers();
          setUiTimeoutExceeded(true);
          return;
        }

        const safeAppId = appId.replace(/[^A-Za-z0-9_-]/g, '-').slice(0, 64);

        // 2. Request server-issued signed nonce + device cookie (§5.4)
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

        // 3. Render Turnstile with hardware commitment cData = `${appId}_${nid}_${hw}` (§5.5)
        const renderTurnstileWidget = () => {
          if (unmountedRef.current) return;
          if (!window.turnstile || !widgetRef.current) {
            scriptWaitTimerRef.current = setTimeout(renderTurnstileWidget, 100);
            return;
          }

          removeWidget();

          const currentCandidates = resolveCandidateSiteKeys();
          if (currentCandidates.length === 0) {
            clearTimers();
            setUiTimeoutExceeded(true);
            return;
          }
          const idx = Math.min(keyIndexRef.current, currentCandidates.length - 1);
          const sitekey = currentCandidates[idx];

          const onWidgetError = () => {
            if (unmountedRef.current) return;
            cfTokenRef.current = null;
            setIsReady(false);
            // If another candidate key in the cascade is available (e.g., env key or non-prod fallback), try it immediately
            if (keyIndexRef.current + 1 < currentCandidates.length) {
              keyIndexRef.current += 1;
              renderTurnstileWidget();
              return;
            }
            if (retryCountRef.current < SESSION_RETRY_MAX) {
              retryCountRef.current += 1;
              void startSessionFlow(true);
            } else {
              setUiTimeoutExceeded(true);
            }
          };

          const softReinit = () => {
            if (unmountedRef.current) return;
            cfTokenRef.current = null;
            setIsReady(false);
            if (retryCountRef.current < SESSION_RETRY_MAX) {
              retryCountRef.current += 1;
              void startSessionFlow(true);
            } else {
              setUiTimeoutExceeded(true);
            }
          };

          const cData = `${safeAppId}_${nid}_${env.hw}`;

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
                cfTokenRef.current = t;
                retryCountRef.current = 0;
                markTokenReady();
              },
              'error-callback': onWidgetError,
              'expired-callback': softReinit,
              'timeout-callback': softReinit,
            });
            widgetIdRef.current = id;
          } catch {
            onWidgetError();
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
    [appId, clearTimers, markTokenReady, removeWidget, resolveCandidateSiteKeys]
  );

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
    setIsReady(false);
  }, [clearTimers, removeWidget]);

  return {
    isReady,
    isBotBlocked,
    setIsBotBlocked,
    uiTimeoutExceeded,
    widgetRef,
    cfTokenRef,
    nonceRef,
    envRef,
    retryCountRef,
    restartVerification,
    wipeSessionSecrets,
  };
}
