import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import YouTubePlayer from './YouTubePlayer';
import { AppConfig } from '../../types';
import { getOptimizedImageUrl } from '../../seo/utils';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface AppScreenshotsProps {
  app: AppConfig;
}

export default function AppScreenshots({ app }: AppScreenshotsProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const totalCount = app.screenshots?.length || 0;

  const openLightbox = (index: number) => {
    setCurrentIndex(index);
    setIsModalOpen(true);
  };

  const closeLightbox = () => {
    setIsModalOpen(false);
  };

  const scrollToIndex = useCallback((index: number, behavior: ScrollBehavior = 'smooth') => {
    if (!totalCount) return;
    const bounded = (index + totalCount) % totalCount;
    setCurrentIndex(bounded);
    const container = scrollRef.current;
    if (container && container.children[bounded]) {
      const child = container.children[bounded] as HTMLElement;
      container.scrollTo({ left: child.offsetLeft, behavior });
    }
  }, [totalCount]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox();
      else if (e.key === 'ArrowRight') scrollToIndex(currentIndex + 1);
      else if (e.key === 'ArrowLeft') scrollToIndex(currentIndex - 1);
    };
    
    if (isModalOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isModalOpen, currentIndex, scrollToIndex]);

  useEffect(() => {
    if (!isModalOpen) return;
    const container = scrollRef.current;
    if (container) {
      const timer = setTimeout(() => {
        if (container.children[currentIndex]) {
          const child = container.children[currentIndex] as HTMLElement;
          container.scrollLeft = child.offsetLeft;
        }
      }, 10);
      return () => clearTimeout(timer);
    }
  }, [isModalOpen]); // Only jump-scroll on initial modal open

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (!isModalOpen) return;
    const container = e.currentTarget;
    const width = container.clientWidth;
    if (width === 0) return;
    
    const newIndex = Math.round(container.scrollLeft / width);
    if (newIndex !== currentIndex && newIndex >= 0 && newIndex < totalCount) {
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
            className="flex-none w-[150px] sm:w-[220px] aspect-[9/16] rounded-xl overflow-hidden snap-center bg-zinc-100 dark:bg-zinc-800 shadow-sm border border-black/5 dark:border-white/10 active:scale-95 transition-transform cursor-pointer"
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
          <div className="absolute top-0 inset-x-0 flex justify-between items-center p-4 text-zinc-900 dark:text-zinc-100 z-20 pointer-events-none">
            <span className="font-semibold text-sm px-3 py-1 rounded-full bg-black/5 dark:bg-white/10 backdrop-blur-md">
              {currentIndex + 1} / {app.screenshots.length}
            </span>
            <button 
              type="button"
              onClick={closeLightbox}
              className="p-2.5 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 transition-colors pointer-events-auto cursor-pointer active:scale-95"
              aria-label="Close gallery"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Desktop/Tablet Prev & Next Controls */}
          {app.screenshots.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => scrollToIndex(currentIndex - 1)}
                className="hidden sm:flex items-center justify-center absolute left-4 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20 text-zinc-900 dark:text-white transition-all cursor-pointer active:scale-95"
                aria-label="Previous screenshot"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                type="button"
                onClick={() => scrollToIndex(currentIndex + 1)}
                className="hidden sm:flex items-center justify-center absolute right-4 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20 text-zinc-900 dark:text-white transition-all cursor-pointer active:scale-95"
                aria-label="Next screenshot"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}

          {/* Full Screen Scrollable Gallery */}
          <div 
            ref={scrollRef}
            onScroll={handleScroll}
            className="absolute inset-0 w-screen h-[100dvh] flex flex-row overflow-x-auto overflow-y-hidden snap-x snap-mandatory hide-scrollbar touch-pan-x"
          >
            {app.screenshots.map((imgUrl, i) => (
              <div 
                key={`full-screenshot-${i}`}
                onClick={closeLightbox}
                className="flex-none w-screen h-[100dvh] snap-center flex items-center justify-center p-2 sm:p-8"
              >
                <img 
                  src={getOptimizedImageUrl(imgUrl, 1200)} 
                  alt={`${app.name} screenshot ${i + 1} - gameplay preview`} 
                  onClick={(e) => e.stopPropagation()}
                  className="max-w-full max-h-[88vh] object-contain rounded-xl shadow-lg border border-black/5 dark:border-white/5 select-none"
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
