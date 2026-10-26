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
  const [isVisible, setIsVisible] = React.useState(true);
  const containerRef = React.useRef<HTMLDivElement>(null);

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

  return (
    <div 
      ref={containerRef}
      className="w-full relative px-0 sm:px-4 max-w-4xl mx-auto mb-5 group/carousel select-none"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="w-full overflow-hidden rounded-2xl sm:rounded-[20px] shadow-sm sm:border border-zinc-100 dark:border-zinc-800/80 bg-zinc-50 dark:bg-zinc-950/40 relative h-[110px] xxs:h-[120px] xs:h-[135px] sm:h-[160px] md:h-[185px]">
        <div 
          className="flex h-full w-full transition-transform duration-300 ease-out"
          style={{ width: `${items.length * 100}%`, transform: `translateX(-${(currentIndex * 100) / items.length}%)` }}
        >
          {items.map((item, i) => {
            const isExternal = item.link && (item.link.startsWith('http://') || item.link.startsWith('https://') || item.link.startsWith('//'));
            const isJavaScript = item.link && item.link.trim().toLowerCase().startsWith('javascript:');
            
            if (isJavaScript) return null;

            const content = (
              <div className="w-full h-full relative overflow-hidden select-none pointer-events-none">
                <img 
                  loading={i === 0 ? "eager" : "lazy"}
                  decoding="async"
                  {...(i === 0 ? { fetchPriority: "high" as const } : { fetchPriority: "low" as const })}
                  width={800}
                  height={400}
                  src={getOptimizedImageUrl(item.image, 600) || `https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800&h=400&fit=crop`}
                  srcSet={item.image ? `${getOptimizedImageUrl(item.image, 400)} 400w, ${getOptimizedImageUrl(item.image, 600)} 600w, ${getOptimizedImageUrl(item.image, 800)} 800w` : undefined}
                  sizes="(max-width: 640px) 100vw, 800px"
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 pointer-events-none"
                  alt={item.title || "Featured banner"}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800&h=400&fit=crop`;
                  }}
                />
                
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent pt-10 pb-3 px-4 sm:px-6 flex flex-col justify-end" />
                
                <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5 flex flex-col justify-end">
                  <div className="flex items-center gap-1.5 mb-1 bg-black/40  px-2 py-0.5 rounded-full border border-white/10 w-fit">
                    <Sparkles className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                    <span className="text-white text-[9px] font-bold uppercase tracking-wider">Featured App</span>
                  </div>
                  <div>
                    <h3 className="text-white text-base sm:text-lg md:text-xl font-black tracking-tight leading-none mb-1 text-left">
                      {item.title}
                    </h3>
                    <p className="text-white/80 text-[11px] sm:text-xs font-semibold leading-tight line-clamp-1 text-left">
                      {item.subtitle}
                    </p>
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
                onTouchStart={() => targetSlug && preloadAppDetails(targetSlug)}
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
            onClick={handlePrev}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-black/40 hover:bg-black/60 border border-white/10 text-white  opacity-0 group-hover/carousel:opacity-100 transition-opacity duration-200 focus:outline-none cursor-pointer hidden md:flex"
            aria-label="Previous slide"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={handleNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-black/40 hover:bg-black/60 border border-white/10 text-white  opacity-0 group-hover/carousel:opacity-100 transition-opacity duration-200 focus:outline-none cursor-pointer hidden md:flex"
            aria-label="Next slide"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </>
      )}

      {items.length > 1 && (
        <div className="absolute bottom-1.5 left-0 right-0 flex justify-center gap-1.5 py-1 z-10">
          {items.map((_, i) => (
            <button
              key={`dot-${i}`}
              onClick={() => setCurrentIndex(i)}
              className="group/dot focus:outline-none cursor-pointer py-1"
              aria-label={`Go to slide ${i + 1}`}
            >
              <div 
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300", 
                  i === currentIndex ? "w-[18px] bg-white" : "w-[6px] bg-white/40 group-hover/dot:bg-white/60"
                )}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
});
