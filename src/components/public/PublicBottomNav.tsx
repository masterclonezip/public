import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Video, LayoutGrid, Newspaper, HelpCircle } from 'lucide-react';
import { useScrollDirection } from '../../hooks/useScrollDirection';

export function PublicBottomNav() {
  const { pathname } = useLocation();
  const { scrollDirection } = useScrollDirection();

  // Hide the floating bar when scrolling down to reveal content; reveal when scrolling up or at the top
  const isBottomNavHidden = scrollDirection === 'down';

  const triggerHaptic = () => {
    if (window.navigator && window.navigator.vibrate) {
      setTimeout(() => {
        try {
          window.navigator.vibrate(15);
        } catch (e) {}
      }, 0);
    }
  };

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/';
    return pathname.startsWith(path);
  };

  const navItems = [
    { icon: LayoutGrid, label: 'Home', path: '/' },
    { icon: Newspaper, label: 'News', path: '/news' },
    { icon: Video, label: 'Videos', path: '/videos' },
    { icon: HelpCircle, label: 'Support', path: '/contact' }
  ];

  return (
    <nav 
      aria-label="Mobile Navigation"
      className={`fixed bottom-2 xxs:bottom-3 xs:bottom-4 inset-x-0 z-50 flex justify-center pointer-events-none md:hidden pb-safe px-1.5 xxs:px-2 xs:px-4 transition-all duration-300 ease-in-out transform ${
        isBottomNavHidden 
          ? 'translate-y-24 opacity-0 pointer-events-none' 
          : 'translate-y-0 opacity-100'
      }`}
    >
      <div className="flex items-center gap-0.5 xxs:gap-1 xs:gap-1.5 p-0.5 xxs:p-1 xs:p-1.5 pointer-events-auto bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border border-slate-200/80 dark:border-zinc-800 shadow-2xl shadow-slate-900/20 dark:shadow-black/60 rounded-full max-w-full overflow-x-auto no-scrollbar scroll-smooth">
        {navItems.map((item) => {
          const active = isActive(item.path);
          return (
            <Link 
              key={item.path}
              to={item.path} 
              onClick={triggerHaptic} 
              aria-label={item.label}
              aria-current={active ? 'page' : undefined}
              className={`flex items-center justify-center gap-1 xxs:gap-1.5 xs:gap-2 px-2 xxs:px-2.5 xs:px-3.5 sm:px-4 py-1.5 xxs:py-2 xs:py-2.5 rounded-full transition-all duration-200 active:scale-90 select-none min-h-[34px] xxs:min-h-[38px] xs:min-h-[44px] min-w-[34px] xxs:min-w-[38px] xs:min-w-[44px] ${
                active 
                  ? 'bg-blue-600 text-white font-extrabold shadow-md shadow-blue-600/30' 
                  : 'text-slate-700 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-white'
              }`}
            >
              <item.icon className={`w-3.5 h-3.5 xxs:w-4 xxs:h-4 xs:w-[18px] xs:h-[18px] shrink-0 ${active ? 'text-white' : 'text-slate-600 dark:text-zinc-400'}`} />
              <span className={`text-[9px] xxs:text-[10px] xs:text-[11px] sm:text-[12px] font-bold tracking-tight transition-all duration-300 whitespace-nowrap ${
                active ? 'max-w-[48px] xxs:max-w-[55px] xs:max-w-[70px] opacity-100' : 'max-w-0 opacity-0 overflow-hidden hidden sm:inline-block'
              }`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export default PublicBottomNav;

