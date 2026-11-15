import React from 'react';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../../lib/utilsPublic';
import { getOptimizedImageUrl } from '../../seo/utils';
import { preloadAppDetails } from '../../lib/preloadHelper';

interface BannerProps {
  items: any[];
}

export const FeaturedBanner = React.memo(({ items }: BannerProps) => {
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [isHovered, setIsHovered] = React.useState(false);
  const [isDragging, setIsDragging] = React.useState(false);
  const [dragOffsetPx, setDragOffsetPx] = React.useState(0);
  const [isVisible, setIsVisible] = React.useState(true);
  const [failedSlides, setFailedSlides] = React.useState<Record<number, boolean>>({});
  const containerRef = React.useRef<HTMLDivElement>(null);
  const touchStartXRef = React.useRef<number | null>(null);
  const touchStartYRef = React.useRef<number | null>(null);
  const touchDeltaXRef = React.useRef<number>(0);
  const isHorizontalSwipeRef = React.useRef<boolean | null>(null);
  const didSwipeRef = React.useRef<boolean>(false);

  React.useEffect(() => {
    if (!containerRef.current || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(([entry]) => {
      setIsVisible(entry.isIntersecting);
    }, { rootMargin: '100px' });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  React.useEffect(() => {
    if (!items || items.length <= 1 || isHovered || isDragging || !isVisible) return;
    
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length);
    }, 4500); // 4.5s autoplay rotation
    
    return () => clearInterval(interval);
  }, [items, isHovered, isDragging, isVisible]);

  if (!items || items.length === 0) return null;

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % items.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!items || items.length <= 1) return;
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
    touchDeltaXRef.current = 0;
    isHorizontalSwipeRef.current = null;
    didSwipeRef.current = false;
    setDragOffsetPx(0);
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (touchStartXRef.current === null || touchStartYRef.current === null) return;
    const dx = e.touches[0].clientX - touchStartXRef.current;
    const dy = e.touches[0].clientY - touchStartYRef.current;

    if (isHorizontalSwipeRef.current === null && (Math.abs(dx) > 6 || Math.abs(dy) > 6)) {
      isHorizontalSwipeRef.current = Math.abs(dx) > Math.abs(dy);
    }

    if (isHorizontalSwipeRef.current) {
      touchDeltaXRef.current = dx;
      if (Math.abs(dx) > 10) didSwipeRef.current = true;
      setDragOffsetPx(dx);
    }
  };

  const handleTouchEnd = () => {
    if (touchStartXRef.current !== null && items.length > 1) {
      if (touchDeltaXRef.current <= -40) {
        handleNext();
      } else if (touchDeltaXRef.current >= 40) {
        handlePrev();
      }
    }
    touchStartXRef.current = null;
    touchStartYRef.current = null;
    touchDeltaXRef.current = 0;
    isHorizontalSwipeRef.current = null;
    setDragOffsetPx(0);
    setIsDragging(false);
    setTimeout(() => {
      didSwipeRef.current = false;
    }, 50);
  };

  const handleClickCapture = (e: React.MouseEvent<HTMLDivElement>) => {
    if (didSwipeRef.current) {
      e.preventDefault();
      e.stopPropagation();
      didSwipeRef.current = false;
    }
  };

  return (
    <div 
      ref={containerRef}
      className="w-full relative px-0 sm:px-4 max-w-4xl mx-auto mb-3.5 sm:mb-5 group/carousel select-none"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      onClickCapture={handleClickCapture}
    >
      <div className="w-full overflow-hidden rounded-2xl sm:rounded-[20px] shadow-sm sm:border border-zinc-100 dark:border-zinc-800/80 bg-zinc-900 relative h-[144px] xs:h-[156px] sm:h-[175px] md:h-[195px] touch-pan-y">
        <div 
          className={cn(
            "flex h-full w-full",
            isDragging && isHorizontalSwipeRef.current ? "transition-none" : "transition-transform duration-300 ease-out"
          )}
          style={{
            width: `${items.length * 100}%`,
            transform: `translate3d(calc(-${(currentIndex * 100) / items.length}% + ${dragOffsetPx}px), 0, 0)`
          }}
        >
          {items.map((item, i) => {
            const isExternal = item.link && (item.link.startsWith('http://') || item.link.startsWith('https://') || item.link.startsWith('//'));
            const isJavaScript = item.link && item.link.trim().toLowerCase().startsWith('javascript:');
            
            if (isJavaScript) return null;

            const hasValidImage = Boolean(item.image) && !failedSlides[i];

            const content = (
              <div className="w-full h-full relative overflow-hidden select-none pointer-events-none bg-gradient-to-br from-slate-900 via-blue-950 to-zinc-900">
                {hasValidImage && (
                  <img 
                    loading={i === 0 ? "eager" : "lazy"}
                    decoding="async"
                    {...(i === 0 ? { fetchPriority: "high" as const } : { fetchPriority: "low" as const })}
                    width={800}
                    height={400}
                    src={getOptimizedImageUrl(item.image, 600)}
                    srcSet={`${getOptimizedImageUrl(item.image, 400)} 400w, ${getOptimizedImageUrl(item.image, 600)} 600w, ${getOptimizedImageUrl(item.image, 800)} 800w`}
                    sizes="(max-width: 640px) 100vw, 800px"
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 pointer-events-none"
                    alt={item.title || "Featured banner"}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      if (item.image && target.src !== item.image && !target.dataset.retried) {
                        target.dataset.retried = '1';
                        target.src = item.image;
                      } else {
                        setFailedSlides(prev => ({ ...prev, [i]: true }));
                      }
                    }}
                  />
                )}
                
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />
                
                <div className="absolute inset-x-0 bottom-0 p-3.5 pb-6 sm:p-5 sm:pb-7 flex flex-col justify-end">
                  <div className="flex items-center gap-1.5 mb-1.5 bg-black/45 px-2.5 py-0.5 rounded-full border border-white/15 w-fit">
                    <Sparkles className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                    <span className="text-white text-[10px] font-bold uppercase tracking-wider">Featured</span>
                  </div>
                  <div>
                    <h3 className="text-white text-base sm:text-lg md:text-xl font-black tracking-tight leading-snug mb-0.5 text-left line-clamp-1">
                      {item.title}
                    </h3>
                    {item.subtitle && (
                      <p className="text-white/85 text-xs font-medium leading-tight line-clamp-1 text-left">
                        {item.subtitle}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );

            const slideStyle = { width: `${100 / items.length}%` };

            if (isExternal) {
              return (
                <a 
                  key={`banner-ext-${item.id || i}`}
                  href={item.link} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="h-full block flex-shrink-0"
                  style={slideStyle}
                  draggable={false}
                >
                  {content}
                </a>
              );
            }

            const targetSlug = (item.link || '').startsWith('/app/') ? item.link.replace(/^\/app\//, '') : '';
            return (
              <Link
                key={`banner-int-${item.id || i}`}
                to={item.link || "/"}
                onMouseEnter={() => targetSlug && preloadAppDetails(targetSlug)}
                onFocus={() => targetSlug && preloadAppDetails(targetSlug)}
                className="h-full block flex-shrink-0"
                style={slideStyle}
                draggable={false}
              >
                {content}
              </Link>
            );
          })}
        </div>
      </div>

      {items.length > 1 && (
        <>
          <button
            type="button"
            onClick={handlePrev}
            className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 z-10 w-9 h-9 flex items-center justify-center rounded-full bg-black/45 hover:bg-black/65 border border-white/15 text-white opacity-0 group-hover/carousel:opacity-100 transition-opacity duration-200 focus:outline-none cursor-pointer hidden md:flex"
            aria-label="Previous slide"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleNext}
            className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 z-10 w-9 h-9 flex items-center justify-center rounded-full bg-black/45 hover:bg-black/65 border border-white/15 text-white opacity-0 group-hover/carousel:opacity-100 transition-opacity duration-200 focus:outline-none cursor-pointer hidden md:flex"
            aria-label="Next slide"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </>
      )}

      {items.length > 1 && (
        <div className="absolute bottom-1.5 left-0 right-0 flex justify-center gap-1.5 z-10">
          {items.map((_, i) => (
            <button
              key={`dot-${i}`}
              type="button"
              onClick={() => setCurrentIndex(i)}
              className="group/dot focus:outline-none cursor-pointer p-1.5"
              aria-label={`Go to slide ${i + 1}`}
            >
              <div 
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300", 
                  i === currentIndex ? "w-[18px] bg-white" : "w-[6px] bg-white/45 group-hover/dot:bg-white/75"
                )}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
});
