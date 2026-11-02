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

/**
 * Strictly validates that a key is a 24-character Cloudflare Turnstile Site Key (`0x4...`).
 * Rejects 35-character Secret Keys, 40-character API Tokens, and placeholders so Cloudflare's
 * iframe never renders a white "Troubleshoot" error box.
 */
function isRealTurnstileKey(raw: unknown): boolean {
  const k = sanitizeTurnstileKey(raw);
  if (!k || isTestTurnstileSiteKey(k)) return false;
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
  return /^0x4[A-Za-z0-9_-]{17,24}$/.test(k);
}

const WIDGET_SOLVE_WATCHDOG_MS = 2500;

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
      metaEnv.VITE_TURNSTILE_SECRET_KEY,
      metaEnv.TURNSTILE_SECRET_KEY,
      metaEnv.VITE_TURNSTILE_TOKEN,
      metaEnv.TURNSTILE_TOKEN,
      buildEnv.VITE_TURNSTILE_SITE_KEY,
      buildEnv.TURNSTILE_SITE_KEY,
      buildEnv.VITE_TURNSTILE_SECRET_KEY,
      buildEnv.TURNSTILE_SECRET_KEY,
      buildEnv.VITE_TURNSTILE_TOKEN,
      buildEnv.TURNSTILE_TOKEN,
    ];

    const candidates: string[] = [];
    for (const raw of rawSources) {
      const k = sanitizeTurnstileKey(raw);
      if (!isRealTurnstileKey(k)) continue;
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

      const activateHardwareFallback = () => {
        if (unmountedRef.current) return;
        removeWidget();
        setIsPreviewFallback(true);
        if (nonceRef.current && envRef.current && !envRef.current.gate.failed) {
          cfTokenRef.current = `HWPROOF.${nonceRef.current}.${envRef.current.hw}`;
          retryCountRef.current = 0;
          setUiTimeoutExceeded(false);
          markTokenReady();
        } else {
          setUiTimeoutExceeded(true);
        }
      };

      // 15s UI Timeout guard (§5.5: never spin forever if content blocker blocks Turnstile)
      uiTimeoutTimerRef.current = setTimeout(() => {
        if (!unmountedRef.current && !cfTokenRef.current) {
          removeWidget();
          if (nonceRef.current && envRef.current && !envRef.current.gate.failed) {
            activateHardwareFallback();
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
          removeWidget();
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
          removeWidget();
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
            removeWidget();
            setUiTimeoutExceeded(true);
          }
          return;
        }

        if (typeof data.siteKey === 'string' && isRealTurnstileKey(data.siteKey)) {
          serverSiteKeyRef.current = sanitizeTurnstileKey(data.siteKey);
        }
        if (Array.isArray(data.siteKeys)) {
          serverSiteKeysRef.current = data.siteKeys
            .map((k: unknown) => sanitizeTurnstileKey(k))
            .filter((k: string) => isRealTurnstileKey(k));
        }

        const nonce = data.nonce.trim();
        const nid = nonce.split('.')[0] || '';
        if (nid.length !== 32) {
          clearTimers();
          removeWidget();
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

          const realCandidates = resolveRealSiteKeys();

          // If no valid 24-char Turnstile Site Key is configured, immediately use hardware-committed verification
          // without rendering any broken or test Cloudflare iframe.
          if (realCandidates.length === 0) {
            activateHardwareFallback();
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
              removeWidget();
              const latestRealCandidates = resolveRealSiteKeys();
              if (keyIndexRef.current + 1 < latestRealCandidates.length) {
                keyIndexRef.current += 1;
                renderTurnstileWidget();
                return;
              }
              // When the widget domain is not yet allowlisted in Cloudflare (110200) or Turnstile
              // fails on the user's mobile carrier, immediately destroy the iframe and activate
              // hardware-committed verification bound to the server-signed nonce and GPU silicon hash.
              activateHardwareFallback();
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
              removeWidget();
              if (retryCountRef.current < SESSION_RETRY_MAX) {
                retryCountRef.current += 1;
                void startSessionFlow(true);
              } else {
                activateHardwareFallback();
              }
            }, 60);
          };

          const cData = `${safeAppId}_${nid}_${env.hw}`;

          // Start a 2.5s per-widget solve watchdog so a hung/blocked iframe on mobile never stalls the user
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
              appearance: 'interaction-only',
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
          removeWidget();
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
    [appId, clearTimers, markTokenReady, removeWidget, resolveRealSiteKeys]
  );

  // If adminTurnstileSiteKey arrives asynchronously from DataContextPublic after mount,
  // and we haven't solved with a real key yet, re-run verification with the real key.
  useEffect(() => {
    const cleanAdminKey = sanitizeTurnstileKey(adminTurnstileSiteKey);
    if (
      cleanAdminKey &&
      isRealTurnstileKey(cleanAdminKey) &&
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
