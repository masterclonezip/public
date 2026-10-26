import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { AppConfig, GlobalSettings, NewsItem, VideoItem } from '../types';

export function useSEO(
  settings: GlobalSettings | null,
  apps: AppConfig[],
  news: NewsItem[],
  videos: VideoItem[],
  isAdminPath: boolean = false
) {
  const location = useLocation();

  useEffect(() => {
    // We now strictly rely on Meta.tsx and react-helmet-async for all SEO metadata.
    // Manual DOM mutation via document.createElement/appendChild in this hook 
    // was causing duplicate <meta property="og:image"> and <link rel="canonical"> 
    // tags to stack up in the <head> during client-side navigation.
    // This caused scrapers to randomly mix up OpenGraph data between different apps.
    
    // Kept only to sync iframe preview title in dev mode if needed
    try {
      if (window.parent && window.parent !== window && window.parent.document) {
        window.parent.document.title = document.title || '';
      }
    } catch (e) {}
  }, [location.pathname]);
}
