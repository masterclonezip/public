/**
 * Ticker real-time news alerts ticker
 * Infinite layout loops summarizing portal safety alerts and direct mirror update patches.
 */

import { useData } from '../contexts/DataContextPublic';

export default function Ticker() {
  const { settings } = useData();
  if (!settings.ticker_text) return null;

  return (
    <div className="bg-transparent py-3 overflow-hidden border-t border-black/5 dark:border-white/5 flex items-center relative z-[70] select-none pointer-events-none cv-auto" style={{ contain: 'paint' }}>
      <div className="bg-blue-500 w-2 h-2 rounded-full absolute left-4 z-20 animate-pulse shadow-[0_0_12px_rgba(59,130,246,0.5)]" />
      
      <div className="flex whitespace-nowrap overflow-hidden pl-12 w-full relative">
        <div className="animate-marquee whitespace-nowrap min-w-full font-medium text-[13px] sm:text-[14px] tracking-wide text-zinc-600 dark:text-zinc-400">
          <span className="mx-10">{settings.ticker_text}</span>
          <span className="mx-10">{settings.ticker_text}</span>
          <span className="mx-10">{settings.ticker_text}</span>
          <span className="mx-10">{settings.ticker_text}</span>
        </div>
      </div>
    </div>
  );
}
