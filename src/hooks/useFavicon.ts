import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { AppConfig, GlobalSettings } from '../types';

export function useFavicon(settings: GlobalSettings | null, apps: AppConfig[]) {
  // We now rely on Meta.tsx and react-helmet-async for favicons.
  // Manual DOM mutation was causing 'Cannot read properties of null (reading 'removeChild')'
  // when Helmet unmounts.
}
