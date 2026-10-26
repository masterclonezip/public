import { useState, useEffect, useRef } from 'react';

export function useScrollDirection() {
  const [scrollDirection, setScrollDirection] = useState<'up' | 'down' | 'top'>('top');
  const [scrolled, setScrolled] = useState(false);
  const lastScrollY = useRef(0);
  const currentDirection = useRef<'up' | 'down' | 'top'>('top');
  const currentScrolled = useRef(false);

  useEffect(() => {
    let ticking = false;

    const updateScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY <= 20) {
        if (currentDirection.current !== 'top') {
          currentDirection.current = 'top';
          setScrollDirection('top');
        }
        if (currentScrolled.current) {
          currentScrolled.current = false;
          setScrolled(false);
        }
        lastScrollY.current = currentScrollY;
      } else {
        if (!currentScrolled.current) {
          currentScrolled.current = true;
          setScrolled(true);
        }
        const diff = currentScrollY - lastScrollY.current;
        if (Math.abs(diff) > 25) {
          const nextDir = diff > 0 ? 'down' : 'up';
          if (currentDirection.current !== nextDir) {
            currentDirection.current = nextDir;
            setScrollDirection(nextDir);
          }
          lastScrollY.current = currentScrollY;
        }
      }

      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(updateScroll);
        ticking = true;
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return { scrollDirection, scrolled };
}

export default useScrollDirection;
