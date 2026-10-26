/**
 * Main Admin Application Core
 * Coordinates admin authentication, routing, and live layout configurations.
 */

import React, { useState, useEffect, Suspense } from 'react';
import { useLocation, BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { DataProvider, useData } from './contexts/DataContext';
import { getAdminPath } from './lib/utils';
import { lazyWithRetry } from './lib/lazyWithRetry';
import './index.css';

// Error Boundary component for robust UI
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error?: any }> {
  state: { hasError: boolean; error?: any } = { hasError: false };
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error: any) { return { hasError: true, error }; }
  componentDidCatch(error: any, errorInfo: any) { console.error("Admin Load Error:", error, errorInfo); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 max-w-lg mx-auto my-16 bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900/50 rounded-2xl shadow-sm text-center space-y-3">
          <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-950/50 text-red-600 flex items-center justify-center mx-auto text-lg font-bold">!</div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Admin Panel Notice</h2>
          <p className="text-xs text-slate-500 break-words">{this.state.error?.message || this.state.error?.toString() || "An unexpected error occurred while loading this view."}</p>
          <button 
            type="button"
            onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }} 
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow cursor-pointer transition-all"
          >
            Reload Admin
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Polished, high-performance loading screen
function LoadingScreen({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 min-h-[40vh]">
      <div className="w-8 h-8 border-[3px] border-black/10 dark:border-white/10 border-t-blue-500 rounded-full animate-spin mb-4"></div>
      <p className="text-sm font-medium tracking-wide text-zinc-500 animate-pulse">{message}</p>
    </div>
  );
}

const AdminLoginPageLazy = lazyWithRetry(() => import('./pages/AdminLogin'));
const AdminDashboard = lazyWithRetry(() => import('./pages/AdminDashboard'));

import { useAdminAuth } from './hooks/useAdminAuth';

// Route-level authentication guard: strictly prevents unauthenticated access to admin dashboard & modules
function ProtectedAdminRoute({ children }: { children: React.ReactNode }) {
  const { user, isAdminUser, checkingAuth } = useAdminAuth();
  const adminPath = getAdminPath();
  const location = useLocation();
  const currentBase = location.pathname.toLowerCase().startsWith('/masterworld') ? 'masterworld' : adminPath;

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-300">
        <div className="w-8 h-8 border-[3px] border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-3"></div>
        <p className="text-xs font-semibold tracking-wider uppercase text-slate-400">Verifying Admin Access...</p>
      </div>
    );
  }

  if (!user || !isAdminUser) {
    return <Navigate to={`/${currentBase}/login`} state={{ from: location.pathname }} replace />;
  }

  return <>{children}</>;
}

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

function AppContent() {
  const { settings, quotaExceeded } = useData();
  const location = useLocation();
  const adminPath = getAdminPath();
  const isAdminPath = location.pathname.startsWith(`/${adminPath}`);

  // Dynamic SEO meta tag manager that reacts to the current page state, keeping it strictly in sync with the database settings
  useEffect(() => {
    if (!settings) return;
    const siteTitle = settings.site_title || '';
    document.title = siteTitle ? `Admin Dashboard - ${siteTitle}` : 'Admin Dashboard';

    // Dynamically synchronize favicon with firebase database changes live
    const targetUrl = settings.favicon_url || settings.logo_url || "";
    if (targetUrl) {
      const allIcons = Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel*="icon"], link[rel*="apple-touch-icon"]'));
      if (allIcons.length > 0) {
        allIcons.forEach((link) => {
          link.href = targetUrl;
        });
      } else {
        const newLink = document.createElement('link');
        newLink.rel = 'icon';
        newLink.type = 'image/png';
        newLink.href = targetUrl;
        document.head.appendChild(newLink);
      }
    }
  }, [settings]);

  useEffect(() => {
    document.body.style.overflow = '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isAdminPath]);

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950">
      <ScrollToTop />
      {quotaExceeded && (
        <div className="w-full bg-amber-500/10 border-b border-amber-500/20 text-amber-600 dark:text-amber-400 py-3 text-xs sm:text-sm font-semibold animate-fade-in z-50">
          <div className="w-full flex flex-col md:flex-row items-center justify-between gap-4 px-3 sm:px-6 md:px-10 text-center md:text-left">
            <div className="flex items-center gap-2.5">
              <svg className="w-5 h-5 text-amber-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>
                <strong>Database Quota Exceeded:</strong> You have reached your Firebase plan's free daily quota for read/write operations. The database quota will reset tomorrow.
              </span>
            </div>
            <a 
              href="https://console.firebase.google.com/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold uppercase text-[10px] tracking-wider rounded-lg transition-all shadow-md shrink-0 active:scale-95"
            >
              Upgrade Firebase Plan
            </a>
          </div>
        </div>
      )}
      
      <div className="flex-1 w-full flex flex-col">
        <Suspense fallback={<LoadingScreen />}>
          <Routes location={location}>
            <Route path="/login" element={<ErrorBoundary><AdminLoginPageLazy /></ErrorBoundary>} />
            <Route path="/" element={<Navigate to={`/${adminPath}/login`} replace />} />
            {Array.from(new Set([adminPath, 'admin', 'masterworld'])).map(base => (
              <React.Fragment key={base}>
                <Route path={`/${base}`} element={<Navigate to={`/${base}/login`} replace />} />
                <Route path={`/${base}/login`} element={<ErrorBoundary><AdminLoginPageLazy /></ErrorBoundary>} />
                <Route path={`/${base}/*`} element={
                  <ProtectedAdminRoute>
                    <ErrorBoundary><AdminDashboard /></ErrorBoundary>
                  </ProtectedAdminRoute>
                } />
              </React.Fragment>
            ))}
            <Route path="*" element={<Navigate to={`/${adminPath}/login`} replace />} />
          </Routes>
        </Suspense>
      </div>
    </div>
  );
}

function App() {
  return (
    <HelmetProvider>
      <DataProvider>
        <Router>
          <AppContent />
        </Router>
      </DataProvider>
    </HelmetProvider>
  );
}

import { ToastContainer } from "./components/Toast";

export default function AppWithToast() {
  return (
    <>
      <ToastContainer />
      <App />
    </>
  );
}

