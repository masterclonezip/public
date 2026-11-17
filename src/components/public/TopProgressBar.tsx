import React, { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * TopProgressBar - High-performance YouTube/GitHub-style top navigation bar.
 * Gives instant feedback on route changes so user never wonders if the site responded.
 */
export default function TopProgressBar() {
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const completeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevPathRef = useRef(location.pathname + location.search);

  useEffect(() => {
    const currentPath = location.pathname + location.search;
    if (currentPath === prevPathRef.current) return;
    prevPathRef.current = currentPath;

    if (timerRef.current) clearTimeout(timerRef.current);
    if (completeTimerRef.current) clearTimeout(completeTimerRef.current);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);

    // Immediately start visual progress
    setLoading(true);
    setProgress(30);

    // Fast increment
    timerRef.current = setTimeout(() => {
      setProgress(75);
    }, 100);

    // Complete quickly
    completeTimerRef.current = setTimeout(() => {
      setProgress(100);
      hideTimerRef.current = setTimeout(() => {
        setLoading(false);
        setProgress(0);
      }, 200);
    }, 250);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (completeTimerRef.current) clearTimeout(completeTimerRef.current);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [location.pathname, location.search]);

  if (!loading && progress === 0) return null;

  return (
    <div 
      className="fixed top-0 left-0 right-0 z-[9999] h-[2.5px] pointer-events-none transition-all duration-200 ease-out"
      style={{
        opacity: loading ? 1 : 0,
      }}
      aria-hidden="true"
    >
      <div 
        className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-600 shadow-[0_0_8px_rgba(59,130,246,0.6)] transition-all duration-200 ease-out"
        style={{
          width: `${progress}%`
        }}
      />
    </div>
  );
}
