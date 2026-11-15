/**
 * SupportWidget floating contact form
 * Provides expandable chat and ticketing routes formatted elegantly.
 */

import { useState, useMemo, useRef, useEffect } from 'react';
import { MessageCircle, Mail, X, Send } from 'lucide-react';
import { useData } from '../contexts/DataContextPublic';
import { safeVibrate } from '../lib/utilsPublic';

export default function SupportWidget() {
  const { settings } = useData();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const toggleWidget = () => {
    safeVibrate(50);
    setIsOpen(prev => !prev);
  };

  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown, { passive: true });
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const protectedEmail = useMemo(() => 
    (settings?.support_email || '').split('').map((char, i) => <span key={i}>{char}</span>),
    [settings?.support_email]
  );

  const whatsappNumber = (settings?.helpline_whatsapp || '').replace('+', '').trim();

  return (
    <div ref={containerRef} className="relative inline-block z-50">
      <button
        type="button"
        onClick={toggleWidget}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className="flex items-center gap-2 w-9 h-9 lg:w-auto lg:h-9 lg:px-3.5 justify-center bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 rounded-full hover:bg-blue-100 dark:hover:bg-blue-500/25 transition-colors shrink-0 cursor-pointer"
        aria-label="Support Widget"
      >
        <MessageCircle className="w-[17px] h-[17px] lg:w-[18px] lg:h-[18px]" />
        <span className="text-[13px] font-medium hidden lg:inline">Help</span>
      </button>

      {isOpen && (
        <div 
          role="dialog"
          aria-label="Contact Support"
          className="fixed inset-x-3 top-[60px] sm:inset-auto sm:absolute sm:right-0 sm:top-full sm:mt-3 bg-white dark:bg-zinc-900 border border-black/10 dark:border-white/10 rounded-2xl sm:rounded-3xl p-4 sm:p-5 w-auto sm:w-80 max-w-sm mx-auto sm:mx-0 z-[100] shadow-xl transition-all duration-200"
        >
          <div className="flex justify-between items-center mb-4 border-b border-black/5 dark:border-white/5 pb-3">
            <h3 className="font-semibold text-base sm:text-sm text-zinc-900 dark:text-zinc-100">Contact Support</h3>
            <button 
              type="button"
              onClick={() => setIsOpen(false)} 
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4"/>
            </button>
          </div>
          
          <div className="flex flex-col gap-2">
            {whatsappNumber && (
              <a 
                href={`https://wa.me/${whatsappNumber}`} 
                target="_blank" 
                rel="noopener noreferrer"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3.5 p-3 min-h-[52px] hover:bg-zinc-50 dark:hover:bg-zinc-800/50 rounded-2xl transition-all group border border-transparent hover:border-black/5"
              >
                <div className="bg-[#25D366]/10 p-2.5 rounded-xl text-[#25D366] shrink-0"><MessageCircle className="w-5 h-5"/></div>
                <div className="flex flex-col min-w-0">
                  <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">WhatsApp</div>
                  <div className="text-xs text-zinc-500 font-medium">Message us</div>
                </div>
              </a>
            )}

            {settings?.helpline_telegram && (
              <a 
                href={settings.helpline_telegram.startsWith('http') ? settings.helpline_telegram : `https://t.me/${settings.helpline_telegram.replace('@', '')}`} 
                target="_blank" 
                rel="noopener noreferrer"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3.5 p-3 min-h-[52px] hover:bg-zinc-50 dark:hover:bg-zinc-800/50 rounded-2xl transition-all group border border-transparent hover:border-black/5"
              >
                <div className="bg-[#0088cc]/10 p-2.5 rounded-xl text-[#0088cc] shrink-0"><Send className="w-5 h-5"/></div>
                <div className="flex flex-col min-w-0">
                  <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Telegram</div>
                  <div className="text-xs text-zinc-500 font-medium">Chat now</div>
                </div>
              </a>
            )}
            
            {settings?.support_email && (
              <a 
                href={`mailto:${settings.support_email}`} 
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3.5 p-3 min-h-[52px] hover:bg-zinc-50 dark:hover:bg-zinc-800/50 rounded-2xl transition-all group border border-transparent hover:border-black/5"
              >
                <div className="bg-blue-500/10 p-2.5 rounded-xl text-blue-500 shrink-0"><Mail className="w-5 h-5"/></div>
                <div className="flex flex-col min-w-0 truncate">
                  <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Email</div>
                  <div className="text-xs text-zinc-500 font-medium truncate">{protectedEmail}</div>
                </div>
              </a>
            )}
          </div>
          
          <div className="mt-4 pt-3 text-center border-t border-black/5 dark:border-white/5">
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Response time: Usually within 24 hours</p>
          </div>
        </div>
      )}
    </div>
  );
}
