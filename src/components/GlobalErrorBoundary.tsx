/**
 * GlobalErrorBoundary safety fallbacks
 * Captures lifecycle errors smoothly, providing recovery states and stack dump downloads.
 */

import React, { Component, ErrorInfo } from 'react';
import { AlertOctagon, RefreshCw, Home, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';

interface Props {
  children?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  expanded: boolean;
  copied: boolean;
}

export default class GlobalErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      expanded: false,
      copied: false
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });
    console.error('Unhandled Application Shell Exception:', error, errorInfo);

    // Auto-reload on chunk load failure (when Vercel deploys a new build and old JS hashes 404)
    const errorMsg = String(error?.message || error || '');
    const isChunkError =
      error?.name === 'ChunkLoadError' ||
      /Failed to fetch dynamically imported module/i.test(errorMsg) ||
      /Loading chunk .* failed/i.test(errorMsg) ||
      /Importing a module script failed/i.test(errorMsg);

    if (isChunkError) {
      const reloadKey = 'chunk_err_boundary_reload';
      const lastReload = parseInt(sessionStorage.getItem(reloadKey) || '0', 10);
      const now = Date.now();
      if (now - lastReload > 10000) {
        sessionStorage.setItem(reloadKey, String(now));
        console.warn('[GlobalErrorBoundary] Chunk import failure detected. Auto-reloading page for fresh bundle...');
        window.location.reload();
      }
    }
  }

  handleReset = (): void => {
    // Clear standard errors & perform clean page reload
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      expanded: false,
      copied: false
    });
    window.location.reload();
  };

  handleGoHome = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      expanded: false,
      copied: false
    });
    window.location.href = '/';
  };

  handleCopyText = (): void => {
    if (!this.state.error) return;
    const diagnostics = `Error: ${this.state.error.message}\nStack: ${this.state.error.stack}\nComponent Stack: ${this.state.errorInfo?.componentStack || ''}`;
    navigator.clipboard.writeText(diagnostics);
    this.setState({ copied: true });
    setTimeout(() => this.setState({ copied: false }), 2000);
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full flex items-center justify-center p-6 bg-zinc-50 dark:bg-zinc-950 font-sans transition-colors duration-300">
          <div className="max-w-2xl w-full bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/10 rounded-3xl shadow-xl overflow-hidden p-8 sm:p-12 text-center flex flex-col items-center">
            {/* Visual Header Icon */}
            <div className="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200/50 dark:border-red-500/20 flex items-center justify-center text-red-500 mb-6 shrink-0 shadow-inner">
              <AlertOctagon className="w-8 h-8" />
            </div>

            {/* Error Message and Context */}
            <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-white tracking-tight leading-tight mb-3">
              Something went wrong
            </h1>
            <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 max-w-md mx-auto mb-8 leading-relaxed">
              An unexpected application error has interrupted your current view. Please try again or return to the main dashboard.
            </p>

            {/* Action Panel */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full max-w-sm mb-8">
              <button
                onClick={this.handleReset}
                className="flex items-center justify-center gap-2 w-full sm:flex-1 h-12 px-6 bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-900 font-semibold rounded-2xl transition-all shadow-md hover:shadow-lg active:scale-98 cursor-pointer text-sm"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Try Again</span>
              </button>
              <button
                onClick={this.handleGoHome}
                className="flex items-center justify-center gap-2 w-full sm:flex-1 h-12 px-6 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700/80 text-zinc-800 dark:text-zinc-200 font-semibold rounded-2xl transition-all cursor-pointer text-sm border border-black/5 dark:border-white/5 active:scale-98"
              >
                <Home className="w-4 h-4" />
                <span>Return Home</span>
              </button>
            </div>

            {/* Technical Diagnostics Block */}
            {this.state.error && (
              <div className="w-full border-t border-zinc-100 dark:border-zinc-800 pt-6 text-left">
                <button
                  onClick={() => this.setState(prev => ({ expanded: !prev.expanded }))}
                  className="flex items-center justify-between w-full py-2 text-xs font-semibold text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300 transition-colors cursor-pointer select-none"
                >
                  <span className="uppercase tracking-wider">Technical Details</span>
                  {this.state.expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {this.state.expanded && (
                  <div className="mt-4 flex flex-col bg-zinc-50 dark:bg-zinc-950/80 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-4 overflow-hidden relative">
                    <div className="flex items-center justify-between gap-4 mb-2 shrink-0 border-b border-zinc-200/50 dark:border-zinc-800/40 pb-2">
                      <span className="text-xs font-mono text-zinc-400 select-none">
                        Exception Log Error Stack
                      </span>
                      <button
                        onClick={this.handleCopyText}
                        className="flex items-center gap-1 px-2.5 py-1 text-[10px] uppercase tracking-wider font-semibold text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300 bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/5 rounded-lg transition-colors cursor-pointer shadow-sm"
                      >
                        {this.state.copied ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                            <span className="text-emerald-500">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy Info</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div className="overflow-auto max-h-48 text-[11px] font-mono leading-relaxed text-red-600 dark:text-red-400 whitespace-pre-wrap select-text">
                      {(() => {
                        const errMsg = this.state.error.message;
                        if (errMsg && errMsg.startsWith('{') && errMsg.endsWith('}')) {
                          try {
                            const parsed = JSON.parse(errMsg);
                            if (parsed && typeof parsed === 'object' && 'error' in parsed && 'operationType' in parsed) {
                              return (
                                <div className="space-y-3 text-left">
                                  <div className="bg-red-500/10 border border-red-500/25 rounded-2xl p-4 text-xs text-red-600 dark:text-red-400 font-semibold flex items-start gap-2.5">
                                    <span className="font-mono uppercase tracking-wider bg-red-600/15 text-red-700 dark:text-red-400 px-2 py-0.5 rounded-lg text-[9px] shrink-0 font-bold border border-red-500/10">
                                      {parsed.operationType} Fail
                                    </span>
                                    <span>
                                      Failed to resolve database collections for targeting reference: <strong className="font-mono text-zinc-900 dark:text-white">{parsed.path || 'unknown'}</strong>
                                    </span>
                                  </div>
                                  <div className="text-zinc-800 dark:text-zinc-200 bg-zinc-100/60 dark:bg-zinc-900 border border-black/[0.04] dark:border-white/[0.04] rounded-2xl p-4 font-mono text-left max-h-32 overflow-y-auto">
                                    {String(parsed.error)}
                                  </div>
                                  {parsed.authInfo?.userId && (
                                    <div className="text-[10px] text-zinc-500 flex flex-wrap gap-x-4 gap-y-1 border-t border-zinc-200/50 dark:border-zinc-800/50 pt-2.5 font-mono select-none">
                                      <span>UID: {parsed.authInfo.userId}</span>
                                      {parsed.authInfo.email && <span>EMAIL: {parsed.authInfo.email}</span>}
                                      {parsed.authInfo.emailVerified !== null && <span>VERIFIED: {String(parsed.authInfo.emailVerified)}</span>}
                                    </div>
                                  )}
                                </div>
                              );
                            }
                          } catch (_) {}
                        }
                        return <p className="font-bold mb-1">{this.state.error.toString()}</p>;
                      })()}
                      {this.state.errorInfo?.componentStack && (
                        <p className="mt-2 text-zinc-400 dark:text-zinc-600">
                          {this.state.errorInfo.componentStack}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
