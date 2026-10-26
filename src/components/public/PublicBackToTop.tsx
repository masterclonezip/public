import React, { useState, useEffect } from 'react';
import { ArrowRight } from 'lucide-react';

export function PublicBackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let timer: any = null;
    const checkScroll = () => {
      const isVisible = window.scrollY > window.innerHeight / 2;
      setVisible(prev => (prev !== isVisible ? isVisible : prev));
      timer = null;
    };
    const handleScroll = () => {
      if (!timer) {
        timer = setTimeout(checkScroll, 150);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const scrollToTop = () => {
    if (window.navigator && window.navigator.vibrate) {
      try {
        window.navigator.vibrate(50);
      } catch (e) {}
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <button
      type="button"
      onClick={scrollToTop}
      className={`fixed bottom-6 right-6 z-[90] p-3.5 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white rounded-full shadow-xl border border-black/10 dark:border-white/20 transition-all duration-300 hover:scale-110 active:scale-95 cursor-pointer ${
        visible ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto' : 'opacity-0 translate-y-5 scale-90 pointer-events-none'
      }`}
      aria-label="Back to top"
    >
      <ArrowRight className="w-5 h-5 -rotate-90 text-blue-600 dark:text-blue-400" />
    </button>
  );
}

export default PublicBackToTop;
