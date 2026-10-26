import { useNavigate } from 'react-router-dom';
import { ArrowRight, Share2, Flag } from 'lucide-react';
import { AppConfig } from '../../types';

declare global {
  interface Window {
    __rdNav?: { slug: string; ts: number };
    __rdBounced?: string;
  }
}

interface AppActionButtonsProps {
  app: AppConfig;
  isActuallyComingSoon: boolean;
  timeRemaining: number | null;
  handleShare: () => void;
}

export default function AppActionButtons({
  app,
  isActuallyComingSoon,
  timeRemaining,
  handleShare,
}: AppActionButtonsProps) {
  const navigate = useNavigate();

  const handleDownload = () => {
    const targetSlug = String(app.slug || app.id || '').trim();
    const now = Date.now();
    try {
      window.__rdNav = { slug: targetSlug.toLowerCase(), ts: now };
    } catch {
      // Ignore in-memory write failure
    }
    try {
      sessionStorage.setItem(`rd_nav_${targetSlug.toLowerCase()}`, String(now));
    } catch {
      // Tolerate storage blocked in private/in-app browsers (§5.2)
    }
    const baseSegment = ['more', 'info'].join('');
    navigate(`/${baseSegment}/${encodeURIComponent(targetSlug)}`, {
      state: { nav: now },
    });
  };

  return (
    <div className="flex flex-col sm:flex-row w-full justify-center items-center gap-1.5 xxs:gap-2 xs:gap-3 select-none mb-3 sm:mb-5 px-1 xs:px-2 sm:px-4 md:px-6">
      <div className="w-full sm:flex-1 transition-transform duration-150 hover:scale-[1.01] active:scale-[0.98]">
        {isActuallyComingSoon ? (
          <div className="flex flex-col items-center">
            <button
              type="button"
              disabled
              className="w-full bg-amber-500/10 text-amber-600 dark:text-amber-500 border border-amber-500/20 font-bold py-2 xxs:py-2.5 px-3 xxs:px-4 xs:px-5 rounded-xl flex items-center justify-center gap-1.5 cursor-not-allowed text-[11px] xxs:text-xs xs:text-sm shadow-sm h-[38px] xxs:h-[40px] xs:h-[44px]"
            >
              Coming Soon
            </button>
            {timeRemaining !== null && timeRemaining > 0 && (
              <div className="mt-2 flex gap-1 justify-center">
                {(() => {
                  const s = Math.floor(timeRemaining / 1000);
                  const d = Math.floor(s / 86400);
                  const h = Math.floor((s % 86400) / 3600);
                  const m = Math.floor((s % 3600) / 60);
                  const sec = s % 60;
                  return [
                    { label: 'D', value: d.toString().padStart(2, '0') },
                    { label: 'H', value: h.toString().padStart(2, '0') },
                    { label: 'M', value: m.toString().padStart(2, '0') },
                    { label: 'S', value: sec.toString().padStart(2, '0') },
                  ].map((unit, i) => (
                    <div
                      key={`timer-${unit.label}-${i}`}
                      className="flex flex-col items-center bg-zinc-100 dark:bg-zinc-800 rounded px-1.5 py-1 border border-black/5 dark:border-white/5"
                    >
                      <span className="text-[10px] xxs:text-xs font-mono font-bold text-zinc-800 dark:text-zinc-200">
                        {unit.value}
                      </span>
                      <span className="text-[7px] xxs:text-[8px] uppercase tracking-widest text-zinc-500">
                        {unit.label}
                      </span>
                    </div>
                  ));
                })()}
              </div>
            )}
          </div>
        ) : (
          <div className="w-full flex flex-col items-center gap-1.5">
            <button
              type="button"
              id={`gateway-cta-${app.slug || app.id}`}
              onClick={handleDownload}
              onPointerEnter={() => {
                import('../../pages/GatewayPage').catch(() => {});
              }}
              onTouchStart={() => {
                import('../../pages/GatewayPage').catch(() => {});
              }}
              className="w-full premium-action-btn premium-action-btn-blowing cursor-pointer text-white !text-white font-bold py-2 xxs:py-2.5 px-3 xxs:px-4 xs:px-5 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all text-[11px] xxs:text-xs xs:text-sm shadow-md h-[38px] xxs:h-[40px] xs:h-[44px]"
            >
              <span className="flex items-center gap-1.5 font-bold text-white !text-white">
                <span>Download</span>
                <ArrowRight className="w-3.5 h-3.5 xs:w-4 xs:h-4 arrow-icon arrow-icon-loop text-white !text-white" />
              </span>
            </button>
          </div>
        )}
      </div>

      <div className="flex w-full gap-1.5 xxs:gap-2 xs:gap-3 sm:w-auto shrink-0">
        <div className="flex-1 sm:w-auto sm:min-w-[100px] xxs:sm:min-w-[120px] sm:max-w-[150px] transition-transform duration-150 hover:scale-[1.01] active:scale-[0.98]">
          <button
            type="button"
            onClick={handleShare}
            className="w-full bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 font-semibold py-2 xxs:py-2.5 px-2 xs:px-3 rounded-xl flex items-center justify-center gap-1 xs:gap-1.5 transition-all text-[11px] xxs:text-xs xs:text-sm border border-black/5 dark:border-white/5 shadow-sm h-[38px] xxs:h-[40px] xs:h-[44px] truncate cursor-pointer"
          >
            <Share2 className="w-3 h-3 xs:w-4 xs:h-4 text-blue-500 shrink-0" />{' '}
            <span className="truncate">Share</span>
          </button>
        </div>

        <div className="flex-1 sm:w-auto sm:min-w-[100px] xxs:sm:min-w-[120px] sm:max-w-[150px] transition-transform duration-150 hover:scale-[1.01] active:scale-[0.98]">
          <button
            type="button"
            onClick={() => {
              window.dispatchEvent(new CustomEvent('open-report-modal', { detail: { app } }));
            }}
            className="w-full bg-rose-50 hover:bg-rose-100/80 dark:bg-rose-950/20 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-semibold py-2 xxs:py-2.5 px-2 xs:px-3 rounded-xl flex items-center justify-center gap-1 xs:gap-1.5 transition-all text-[11px] xxs:text-xs xs:text-sm border border-rose-200/40 dark:border-rose-900/40 shadow-xs h-[38px] xxs:h-[40px] xs:h-[44px] truncate cursor-pointer"
          >
            <Flag className="w-3 h-3 xs:w-4 xs:h-4 text-rose-500 shrink-0" />{' '}
            <span className="truncate">Flag</span>
          </button>
        </div>
      </div>
    </div>
  );
}
