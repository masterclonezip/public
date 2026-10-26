/**
 * Main Application Core
 * Coordinates global routes, SEO head tag helpers, persistent layouts, and custom dynamic components.
 */

import { DataProvider, useData } from './contexts/DataContextPublic';
import { useLocation, useParams, BrowserRouter as Router, Routes, Route, Link, Navigate, useNavigationType } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { Menu, Shield, ShieldCheck, Info, ArrowRight, X, LayoutGrid, Newspaper, Sparkles, Send, MoreHorizontal, Search, Video, Star, Facebook, Instagram, Twitter, Linkedin, Youtube, Users, Trash2 } from 'lucide-react';

import React, { useState, useEffect, useLayoutEffect, useMemo, Suspense, ComponentType, LazyExoticComponent } from 'react';
import { lazyWithRetry } from './lib/lazyWithRetry';

// Error Boundary component for robust UI
interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode | ((reset: () => void) => React.ReactNode);
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

function PublicRouteErrorFallback({ error, onReset }: { error?: Error; onReset?: () => void }) {
  const isChunkError = error && (
    error.name === 'ChunkLoadError' ||
    /Failed to fetch dynamically imported module/i.test(error.message || '') ||
    /Loading chunk/i.test(error.message || '') ||
    /Importing a module script failed/i.test(error.message || '')
  );

  const handleRefresh = () => {
    if (onReset) onReset();
    window.location.reload();
  };

  return (
    <div className="flex flex-col items-center justify-center py-20 min-h-[40vh] text-center px-4 max-w-md mx-auto">
      <div className="w-14 h-14 bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center mb-5 border border-red-500/20 shadow-sm">
        <Shield className="w-7 h-7" />
      </div>
      <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
        {isChunkError ? 'New App Version Available' : 'Unable to Load Section'}
      </h2>
      <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mb-6 leading-relaxed">
        {isChunkError
          ? 'A newer version of the website has just been deployed. Please reload to view the latest updates.'
          : 'An unexpected error occurred while displaying this page. You can refresh or return to the directory.'}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={handleRefresh}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-xs transition-all shadow-sm active:scale-95"
        >
          {isChunkError ? 'Reload Latest Version' : 'Refresh Page'}
        </button>
        <Link
          to="/"
          onClick={() => { if (onReset) onReset(); }}
          className="px-5 py-2.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-xl font-semibold text-xs transition-all"
        >
          Return Home
        </Link>
      </div>
    </div>
  );
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error: Error): ErrorBoundaryState { 
    return { hasError: true, error }; 
  }
  componentDidCatch(error: any, errorInfo: any) { 
    console.error("UI Render Error caught by boundary:", error, errorInfo); 
  }
  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    if (this.state.hasError && this.props.children !== prevProps.children) {
      this.setState({ hasError: false, error: undefined });
    }
  }
  reset = () => {
    this.setState({ hasError: false, error: undefined });
  };
  render() {
    if (this.state.hasError) {
      if (typeof this.props.fallback === 'function') {
        return this.props.fallback(this.reset);
      }
      return this.props.fallback || <PublicRouteErrorFallback error={this.state.error} onReset={this.reset} />;
    }
    return this.props.children;
  }
}

// Redirect helper for legacy or uncanonical routes directly to canonical /app/:slug
function LegacyRedirect() {
  const { slug } = useParams<{ slug: string }>();
  return <Navigate to={`/app/${slug || ''}`} replace />;
}

import Home from './pages/Home';
import AppDetails from './pages/AppDetails';
const GatewayPage = lazyWithRetry(() => import('./pages/GatewayPage'));
import NewsPage from './pages/NewsPage';
import NewsDetailPage from './pages/NewsDetailPage';
import VideosPage from './pages/VideosPage';
import VideoDetailPage from './pages/VideoDetailPage';
import Developers from './pages/Developers';
import About from './pages/About';
import Contact from './pages/Contact';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';
import Responsibility from './pages/Responsibility';
import Notice from './pages/Notice';
import Ethics from './pages/Ethics';
import Disclaimer from './pages/Disclaimer';
import ReportRemoval from './pages/ReportRemoval';
import SafetyStatus from './pages/SafetyStatus';
import FaqPage from './pages/FaqPage';
import FallbackRouteMatcher from './components/FallbackRouteMatcher';

const ReportAppModal = lazyWithRetry(() => import('./components/ReportAppModal').then(m => ({ default: m.ReportAppModal })));

export { AppDetails };

import { getAdminPath } from './lib/utils';
import Ticker from './components/Ticker';
import LanguageSelector from './components/LanguageSelector';

import PublicHeader from './components/public/PublicHeader';
import PublicFooter from './components/public/PublicFooter';
import PublicBackToTop from './components/public/PublicBackToTop';
import TopProgressBar from './components/public/TopProgressBar';
import { setupInteractionPreloader, startIdleRoutePreloader } from './lib/routePreloader';

import { useSEO } from './hooks/useSEO';
import { useFavicon } from './hooks/useFavicon';

function ScrollToTop() {
  const { pathname } = useLocation();
  const action = useNavigationType();

  useEffect(() => {
    if (action !== "POP") {
      window.scrollTo(0, 0);
    }
  }, [pathname]);

  return null;
}

function NavigateWithSlug({ prefix }: { prefix: string }) {
  const { slug } = useParams();
  return <Navigate to={`${prefix}${slug}`} replace />;
}

function AppContent() {
  const { settings, apps = [], news = [], videos = [], quotaExceeded, fetchApps } = useData();
  const [reportApp, setReportApp] = useState<any>(null);
  const location = useLocation();
  const isAdminPath = false;

  // Use the extracted hooks
  useSEO(settings, apps, news, videos, isAdminPath);
  useFavicon(settings, apps);

  // Lazy-load full 74-app catalog if navigating to Home, Categories, or New Apps from a trimmed app page
  useEffect(() => {
    const p = location.pathname.toLowerCase();
    const isCatalogRoute = p === '/' || p === '/new-apps' || p.startsWith('/categories') || p.startsWith('/category');
    if (isCatalogRoute && apps.length > 0 && apps.length < 25 && fetchApps) {
      fetchApps();
    }
  }, [location.pathname, apps.length, fetchApps]);

  // Initialize fast user-interaction route preloading (prefetches only on touchstart/pointerover, 0ms idle bandwidth waste)
  useEffect(() => {
    const cleanup = setupInteractionPreloader();
    startIdleRoutePreloader();
    return () => {
      cleanup();
    };
  }, []);

  useEffect(() => {
    const handleOpenReport = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail && detail.app) {
        setReportApp(detail.app);
      }
    };
    window.addEventListener('open-report-modal', handleOpenReport);
    return () => {
      window.removeEventListener('open-report-modal', handleOpenReport);
    };
  }, []);

  const triggerHaptic = () => {
    if (window.navigator && window.navigator.vibrate) {
      setTimeout(() => {
        try {
          window.navigator.vibrate(10);
        } catch (e) {}
      }, 0);
    }
  };

  // Memoize static layout parts to prevent redundant re-renders
  const memoizedHeader = useMemo(() => <PublicHeader />, [location.pathname, settings]);
  const memoizedFooter = useMemo(() => <PublicFooter />, [settings]);

  useEffect(() => {
    document.body.style.overflow = '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [location.pathname, isAdminPath]);

  // __PUBLIC_BLOCK_START__
  return (
    <div className="flex flex-col min-h-screen" suppressHydrationWarning={true}>
      <a 
        href="#main-content" 
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:font-semibold focus:rounded-lg focus:shadow-lg focus:outline-none"
      >
        Skip to main content
      </a>
      <TopProgressBar />
      <ScrollToTop />
      {memoizedHeader}

      <main id="main-content" tabIndex={-1} suppressHydrationWarning={true} className="flex-1 w-full max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 py-0 sm:py-3 pb-16 sm:pb-24 overflow-x-hidden relative focus:outline-none">
        <div className="w-full h-full" suppressHydrationWarning={true}>
          <ErrorBoundary>
            <Routes location={location}>
              <Route path="/" element={<Home />} />
              <Route path="/new-apps" element={<Home />} />
              <Route path="/category/:category" element={<Home />} />
              <Route path="/category/:category/*" element={<Home />} />
              <Route path="/categories" element={<Home />} />
              <Route path="/categories/:category" element={<Home />} />
              <Route path="/news" element={<NewsPage />} />
              <Route path="/blogs" element={<Navigate to="/" replace />} />
              <Route path="/videos" element={<VideosPage />} />
              <Route path="/about" element={<About />} />
              <Route path="/developers" element={<Developers />} />
              <Route path="/developer" element={<Navigate to="/developers" replace />} />
              <Route path="/developer/:slug" element={<Navigate to="/developers" replace />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/report-removal" element={<ReportRemoval />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/responsibility" element={<Responsibility />} />
              <Route path="/notice" element={<Notice />} />
              <Route path="/ethics" element={<Ethics />} />
              <Route path="/disclaimer" element={<Disclaimer />} />
              <Route path="/faq" element={<FaqPage />} />
              <Route path="/faqs" element={<FaqPage />} />
              <Route path="/safety" element={<SafetyStatus />} />
              <Route path="/safety-status" element={<SafetyStatus />} />

              {/* Direct dynamic routes for better SEO and speed */}
              <Route path="/app/:slug" element={<AppDetails />} />
              <Route path="/app/:slug/*" element={<AppDetails />} />
              <Route path="/moreinfo/:slug" element={<GatewayPage />} />
              <Route path="/moreinfo/:slug/*" element={<GatewayPage />} />
              <Route path="/gateway/:slug" element={<GatewayPage />} />
              <Route path="/info/:slug" element={<GatewayPage />} />
              <Route path="/moredetail/:slug" element={<GatewayPage />} />
              <Route path="/download/:slug" element={<GatewayPage />} />
              <Route path="/news/:slug" element={<NewsDetailPage />} />
              <Route path="/blogs/:slug" element={<Navigate to="/" replace />} />
              <Route path="/blog/:slug" element={<Navigate to="/" replace />} />
              <Route path="/videos/:slug" element={<VideoDetailPage />} />
              <Route path="/video/:slug" element={<VideoDetailPage />} />
              
              <Route path="/login" element={<Navigate to="/admin/login" replace />} />
              <Route path="/wp-admin" element={<Navigate to="/" replace />} />
              <Route path="/dashboard" element={<Navigate to="/" replace />} />
              <Route path="/panel" element={<Navigate to="/" replace />} />

              {/* THE MOST IMPORTANT ROUTE FOR GOOGLE INDEXING: ROOT SLUG MAPPING */}
              <Route path="/:slug" element={<FallbackRouteMatcher />} />
              
              <Route path="*" element={<FallbackRouteMatcher />} />
            </Routes>
          </ErrorBoundary>
        </div>
      </main>
      

      
      <Ticker />
      {memoizedFooter}
      <PublicBackToTop />

      {reportApp && (
        <Suspense fallback={null}>
          <ReportAppModal app={reportApp} onClose={() => setReportApp(null)} />
        </Suspense>
      )}
    </div>
  );
  // __PUBLIC_BLOCK_END__
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

export default App;
