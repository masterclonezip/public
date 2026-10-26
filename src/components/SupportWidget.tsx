/**
 * SupportWidget floating contact form
 * Provides expandable chat and ticketing routes formatted elegantly.
 */

import { useState, useMemo } from 'react';
import { MessageCircle, Mail, X, Send } from 'lucide-react';
import { useData } from '../contexts/DataContextPublic';
import { safeVibrate } from '../lib/utilsPublic';

export default function SupportWidget() {
  const { settings } = useData();
  const [isOpen, setIsOpen] = useState(false);

  const toggleWidget = () => {
    safeVibrate(50);
    setIsOpen(!isOpen);
  };

  // Protect email using useMemo
  const protectedEmail = useMemo(() => 
    (settings?.support_email || '').split('').map((char, i) => <span key={i}>{char}</span>),
    [settings?.support_email]
  );

  return (
    <div className="relative inline-block z-50">
      <button
        onClick={toggleWidget}
        className="flex items-center gap-2 w-8 h-8 xs:w-9 xs:h-9 lg:w-auto lg:h-11 lg:px-4 justify-center bg-blue-50 text-blue-500 rounded-full hover:bg-blue-100 transition-colors shrink-0"
        aria-label="Support Widget"
      >
        <MessageCircle className="w-3.5 h-3.5 xs:w-4 xs:h-4 lg:w-5 lg:h-5" />
        <span className="text-[13px] font-medium hidden lg:inline">Help</span>
      </button>

      {isOpen && (
        <div 
          className="absolute right-0 top-full mt-4 bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/10 rounded-2xl xs:rounded-3xl p-4 xs:p-6 w-[calc(100vw-24px)] max-w-xs sm:w-72 origin-top-right z-[100] shadow-xl transition-all duration-200"
        >
          <div className="flex justify-between items-center mb-6 border-b border-black/5 dark:border-white/5 pb-4">
            <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">Contact Support</h3>
            <button 
              type="button"
              onClick={toggleWidget} 
              className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-700 transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4"/>
            </button>
          </div>
          
          <div className="flex flex-col gap-2">
            <a 
              href={`https://wa.me/${(settings.helpline_whatsapp || '').replace('+','')}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-4 p-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 rounded-2xl transition-all group border border-transparent hover:border-black/5"
            >
              <div className="bg-[#25D366]/10 p-2.5 rounded-xl text-[#25D366] group-hover:scale-105 transition-transform"><MessageCircle className="w-5 h-5"/></div>
              <div className="flex flex-col">
                <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">WhatsApp</div>
                <div className="text-xs text-zinc-500 font-medium">Message us</div>
              </div>
            </a>

            {settings.helpline_telegram && (
              <a 
                href={settings.helpline_telegram.startsWith('http') ? settings.helpline_telegram : `https://t.me/${settings.helpline_telegram.replace('@', '')}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-4 p-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 rounded-2xl transition-all group border border-transparent hover:border-black/5"
              >
                <div className="bg-[#0088cc]/10 p-2.5 rounded-xl text-[#0088cc] group-hover:scale-105 transition-transform"><Send className="w-5 h-5"/></div>
                <div className="flex flex-col">
                  <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Telegram</div>
                  <div className="text-xs text-zinc-500 font-medium">Chat now</div>
                </div>
              </a>
            )}
            
            <a 
              href={`mailto:${settings.support_email}`} 
              className="flex items-center gap-4 p-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 rounded-2xl transition-all group border border-transparent hover:border-black/5"
            >
              <div className="bg-blue-500/10 p-2.5 rounded-xl text-blue-500 group-hover:scale-105 transition-transform"><Mail className="w-5 h-5"/></div>
              <div className="flex flex-col truncate">
                <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Email</div>
                <div className="text-xs text-zinc-500 font-medium truncate">{protectedEmail}</div>
              </div>
            </a>
          </div>
          
          <div className="mt-6 pt-4 text-center border-t border-black/5 dark:border-white/5">
              <p className="text-[10px] font-medium text-zinc-400">Response time: Usually within 24 hours</p>
          </div>
        </div>
      )}
    </div>
  );
}
