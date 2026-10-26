/**
 * LOCAL DEVELOPMENT PROXY
 * This file is only used for local development in AI Studio.
 * During sync, it is OVERWRITTEN by either AppPublic.tsx (for Dex) or AppAdmin.tsx (for Masterworld).
 * DO NOT add routes here. Add them to AppPublic.tsx or AppAdmin.tsx directly.
 */
import React, { useState, useEffect, Suspense } from 'react';
import AppPublic from './AppPublic';
import { getAdminPath } from './lib/utils';
import { lazyWithRetry } from './lib/lazyWithRetry';

const AppAdmin = lazyWithRetry(() => import('./AppAdmin'));

export default function App() {
  const adminPath = getAdminPath();
  
  // Ensure public routes always initialize cleanly and admin mode stays isolated on refresh
  const [mode, setMode] = useState<'admin' | 'public'>(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname.toLowerCase();
      const savedMode = localStorage.getItem('aistudio_view_mode');
      const isExplicitAdminRoute = (
        path.startsWith(`/${adminPath.toLowerCase()}`) ||
        path.startsWith('/admin') ||
        path.startsWith('/masterworld') ||
        path === '/login' ||
        path.startsWith('/login/')
      );
      if (isExplicitAdminRoute) {
        return 'admin';
      }
      const isExplicitPublicRoute = (
        path.startsWith('/app/') ||
        path.startsWith('/news') ||
        path.startsWith('/category/') ||
        path.startsWith('/categories') ||
        path.startsWith('/videos') ||
        path.startsWith('/about') ||
        path.startsWith('/contact') ||
        path.startsWith('/privacy') ||
        path.startsWith('/terms') ||
        path.startsWith('/moreinfo')
      );
      if (isExplicitPublicRoute) {
        return 'public';
      }
      // Root path '/' and all public content paths must strictly initialize in public mode
      return 'public';
    }
    return 'public';
  });

  const [isCollapsed, setIsCollapsed] = useState(false);

  // Synchronize browser URL when switching modes
  const handleSwitchMode = (targetMode: 'admin' | 'public') => {
    setMode(targetMode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('aistudio_view_mode', targetMode);
      if (targetMode === 'public') {
        const path = window.location.pathname.toLowerCase();
        if (
          path.startsWith(`/${adminPath.toLowerCase()}`) ||
          path.startsWith('/admin') ||
          path.startsWith('/masterworld') ||
          path.startsWith('/login')
        ) {
          window.history.pushState(null, '', '/');
        }
      } else {
        const path = window.location.pathname.toLowerCase();
        if (
          !path.startsWith(`/${adminPath.toLowerCase()}`) &&
          !path.startsWith('/admin') &&
          !path.startsWith('/masterworld') &&
          !path.startsWith('/login')
        ) {
          window.history.pushState(null, '', `/${adminPath}/login`);
        }
      }
    }
  };

  const isDevelopmentPreview = typeof window !== 'undefined' && (
    window.location.hostname.includes('run.app') ||
    window.location.hostname.includes('localhost') ||
    window.location.hostname.includes('127.0.0.1') ||
    window.location.hostname.includes('webcontainer')
  );

  return (
    <>
      {/* Floating Instant Preview Switcher (Only visible inside AI Studio Dev Preview) */}
      {isDevelopmentPreview && (
        <div 
          className="fixed bottom-4 right-4 z-[999999] select-none font-sans"
          style={{ pointerEvents: 'auto' }}
        >
          {isCollapsed ? (
            <button
              type="button"
              onClick={() => setIsCollapsed(false)}
              title="Expand AI Studio View Switcher"
              className="w-11 h-11 rounded-full bg-slate-900/95 text-white border-2 border-amber-400 shadow-2xl flex items-center justify-center text-lg hover:scale-105 active:scale-95 transition-all cursor-pointer"
            >
              {mode === 'admin' ? '🛡️' : '🌐'}
            </button>
          ) : (
            <div className="flex items-center gap-2 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 shadow-2xl rounded-full p-1.5 pl-3.5 text-xs text-white">
              <div className="flex items-center gap-1.5 pr-1">
                <span className={`w-2 h-2 rounded-full ${mode === 'admin' ? 'bg-emerald-400 animate-pulse' : 'bg-blue-400 animate-pulse'}`} />
                <span className="font-semibold text-slate-200 text-[11px] whitespace-nowrap">
                  {mode === 'admin' ? 'Admin Panel' : 'Public Site'}
                </span>
              </div>

              <button
                type="button"
                onClick={() => handleSwitchMode(mode === 'admin' ? 'public' : 'admin')}
                className={`px-3 py-1.5 rounded-full font-bold text-[11px] transition-all shadow cursor-pointer active:scale-95 whitespace-nowrap flex items-center gap-1 ${
                  mode === 'admin'
                    ? 'bg-blue-600 hover:bg-blue-500 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                }`}
              >
                {mode === 'admin' ? '🌐 Switch to Public' : '⚙️ Switch to Admin'}
              </button>

              <button
                type="button"
                onClick={() => setIsCollapsed(true)}
                title="Minimize switch bar"
                className="w-6 h-6 rounded-full hover:bg-slate-800 text-slate-400 hover:text-slate-200 flex items-center justify-center text-xs transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}
        </div>
      )}

      {mode === 'admin' ? (
        <Suspense fallback={
          <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#090d16', color: '#fff' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: '32px', height: '32px', border: '3px solid rgba(255,255,255,0.2)', borderTopColor: '#3b82f6', borderRadius: '50%', margin: '0 auto 12px', animation: 'spin 1s linear infinite' }} />
              <div style={{ fontWeight: 600 }}>Loading Admin Panel...</div>
            </div>
          </div>
        }>
          <AppAdmin />
        </Suspense>
      ) : (
        <AppPublic />
      )}
    </>
  );
}

