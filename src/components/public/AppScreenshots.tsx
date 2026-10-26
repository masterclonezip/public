import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import YouTubePlayer from './YouTubePlayer';
import { AppConfig } from '../../types';
import { getOptimizedImageUrl } from '../../seo/utils';
import { X } from 'lucide-react';

interface AppScreenshotsProps {
  app: AppConfig;
}

export default function AppScreenshots({ app }: AppScreenshotsProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const openLightbox = (index: number) => {
    setCurrentIndex(index);
    setIsModalOpen(true);
  };

  const closeLightbox = () => {
    setIsModalOpen(false);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox();
    };
    
    if (isModalOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
      
      // Auto-scroll to the selected image when modal opens
      if (scrollRef.current) {
        const container = scrollRef.current;
        setTimeout(() => {
          if (container && container.children[currentIndex]) {
            const child = container.children[currentIndex] as HTMLElement;
            container.scrollLeft = child.offsetLeft;
          }
        }, 10);
      }
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isModalOpen]); // Intentionally omitting currentIndex from deps to only auto-scroll on open

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (!isModalOpen) return;
    const container = e.currentTarget;
    const width = container.clientWidth;
    if (width === 0) return;
    
    const newIndex = Math.round(container.scrollLeft / width);
    if (newIndex !== currentIndex && newIndex >= 0 && newIndex < (app.screenshots?.length || 0)) {
      setCurrentIndex(newIndex);
    }
  };

  if (!app.screenshots?.length && !app.video_url) return null;

  return (
    <div className="w-full mb-6">
      {/* Inline Gallery */}
      <div className="flex overflow-x-auto hide-scrollbar gap-3 px-4 sm:px-0 pb-3 snap-x items-center -mx-4 sm:-mx-0">
        {app.video_url && (
          <YouTubePlayer videoUrl={app.video_url} />
        )}
        {app.screenshots && app.screenshots.map((imgUrl, i) => (
          <button 
            type="button"
            key={`screenshot-${i}`} 
            onClick={() => openLightbox(i)}
            className="flex-none w-[150px] sm:w-[220px] aspect-[9/16] rounded-xl overflow-hidden snap-center bg-zinc-100 dark:bg-zinc-800 shadow-sm border border-black/5 dark:border-white/10 active:scale-95 transition-transform"
            aria-label={`View screenshot ${i + 1} fullscreen`}
          >
            <img 
              src={getOptimizedImageUrl(imgUrl, 400)} 
              alt={`${app.name} screenshot ${i + 1} - gameplay preview`} 
              width={150}
              height={267}
              loading="lazy" 
              decoding="async"
              className="w-full h-full object-cover select-none pointer-events-none" 
            />
          </button>
        ))}
      </div>

      {/* Fullscreen Swipeable Lightbox Modal */}
      {isModalOpen && app.screenshots && createPortal(
        <div 
          role="dialog"
          aria-modal="true"
          aria-label="Screenshot preview gallery"
          className="fixed inset-0 z-[99999] bg-white/98 dark:bg-zinc-950/98 backdrop-blur-sm animate-in fade-in duration-200 overflow-hidden overscroll-none w-screen h-[100dvh]" 
          style={{ position: 'fixed' }}
        >
          {/* Header */}
          <div className="absolute top-0 inset-x-0 flex justify-between items-center p-4 text-zinc-900 dark:text-zinc-100 z-10 pointer-events-none">
            <span className="font-medium text-sm drop-shadow-sm">
              {currentIndex + 1} / {app.screenshots.length}
            </span>
            <button 
              type="button"
              onClick={closeLightbox}
              className="p-2 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 transition-colors pointer-events-auto"
              aria-label="Close gallery"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Full Screen Scrollable Gallery */}
          <div 
            ref={scrollRef}
            onScroll={handleScroll}
            className="absolute inset-0 w-screen h-[100dvh] flex flex-row overflow-x-auto overflow-y-hidden snap-x snap-mandatory hide-scrollbar touch-pan-x"
          >
            {app.screenshots.map((imgUrl, i) => (
              <div 
                key={`full-screenshot-${i}`}
                className="flex-none w-screen h-[100dvh] snap-center flex items-center justify-center p-2 sm:p-8"
              >
                <img 
                  src={getOptimizedImageUrl(imgUrl, 1200)} 
                  alt={`${app.name} screenshot ${i + 1} - gameplay preview`} 
                  className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-sm border border-black/5 dark:border-white/5"
                  loading={i === currentIndex ? "eager" : "lazy"}
                  draggable={false}
                />
              </div>
            ))}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
