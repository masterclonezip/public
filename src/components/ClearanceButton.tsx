import { ArrowRight, RefreshCw, Info } from 'lucide-react';
import { useData } from '../contexts/DataContextPublic';
import { useTurnstileVerification } from '../hooks/useTurnstileVerification';
import { useClearanceDispatch } from '../hooks/useClearanceDispatch';

interface ClearanceButtonProps {
  appId: string;
  appSlug?: string;
  nv: 0 | 1;
  status?: 'Verified' | 'Caution' | 'Unsafe';
  onBotBlocked?: () => void;
}

export default function ClearanceButton({
  appId,
  appSlug,
  nv,
  onBotBlocked,
}: ClearanceButtonProps) {
  const { settings } = useData();
  const cleanSlug = (appSlug || appId || 'item').replace(/[^a-zA-Z0-9_-]/g, '-');

  const {
    isReady,
    isBotBlocked,
    setIsBotBlocked,
    uiTimeoutExceeded,
    widgetRef,
    cfTokenRef,
    nonceRef,
    envRef,
    restartVerification,
    wipeSessionSecrets,
  } = useTurnstileVerification({
    appId,
    adminTurnstileSiteKey: (settings as any)?.turnstile_site_key,
  });

  const {
    setButtonRef,
    isDispatching,
    unavailableMessage,
    needsManualRetry,
    handleManualRetry,
  } = useClearanceDispatch({
    appId,
    nv,
    isReady,
    cfTokenRef,
    nonceRef,
    envRef,
    setIsBotBlocked,
    restartVerification,
    wipeSessionSecrets,
  });

  if (isBotBlocked) {
    if (onBotBlocked) {
      onBotBlocked();
    }
    return null;
  }

  return (
    <div className="w-full flex flex-col items-center gap-3.5 select-none">
      {/* §5.5: Always-visible Turnstile widget container stays in layout (never display:none, never off-screen) and reserves ~65px height */}
      <div
        ref={widgetRef}
        className="w-full min-h-[65px] flex items-center justify-center overflow-hidden rounded-xl"
        aria-label="Verification container"
      />

      {/* Unavailable Package Notice (§5.7 G7 & §5.9) */}
      {unavailableMessage ? (
        <div className="w-full rounded-2xl bg-amber-500/10 border border-amber-500/20 p-4 text-center flex flex-col items-center gap-2">
          <Info className="w-5 h-5 text-amber-500 shrink-0" />
          <p className="text-xs sm:text-sm font-semibold text-zinc-800 dark:text-zinc-200 leading-relaxed">
            {unavailableMessage}
          </p>
        </div>
      ) : needsManualRetry ? (
        <div className="w-full rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-black/10 dark:border-white/10 p-4 text-center flex flex-col items-center gap-3">
          <p className="text-xs sm:text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Please try again
          </p>
          <button
            type="button"
            onClick={handleManualRetry}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm transition-all cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Try Again</span>
          </button>
        </div>
      ) : uiTimeoutExceeded && !isReady ? (
        <div className="w-full rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-black/10 dark:border-white/10 p-4 text-center flex flex-col items-center gap-3">
          <p className="text-xs sm:text-sm font-medium text-zinc-700 dark:text-zinc-300 leading-relaxed">
            Verification could not be completed. Please check your connection and reload.
          </p>
          <button
            type="button"
            onClick={handleManualRetry}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm transition-all cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Reload Verification</span>
          </button>
        </div>
      ) : (
        <button
          ref={setButtonRef}
          type="button"
          id={`clearance-btn-${cleanSlug}`}
          disabled={!isReady || isDispatching}
          className={`w-full py-4 px-8 rounded-2xl flex items-center justify-center gap-2.5 font-extrabold text-sm sm:text-base tracking-wide transition-all shadow-md ${
            isReady && !isDispatching
              ? 'premium-action-btn premium-action-btn-blowing text-white cursor-pointer active:scale-[0.98]'
              : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border border-black/5 dark:border-white/5 cursor-not-allowed'
          }`}
        >
          {isDispatching ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>CONNECTING…</span>
            </>
          ) : isReady ? (
            <>
              <span>PROCEED</span>
              <ArrowRight className="w-4 h-4" />
            </>
          ) : (
            <>
              <span className="w-4 h-4 border-2 border-zinc-400/30 border-t-zinc-500 dark:border-t-zinc-300 rounded-full animate-spin" />
              <span>VERIFYING…</span>
            </>
          )}
        </button>
      )}
    </div>
  );
}
