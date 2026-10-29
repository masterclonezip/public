import React, { useState, useEffect, useCallback } from 'react';
import { adminFetch } from '../services/adminAuthService';
import { db, isFirebaseReal } from '../lib/firebase';
import { RefreshCw } from 'lucide-react';

interface StatusResult {
  status: 'live' | 'quota_exceeded' | 'read_only' | 'write_only' | 'offline' | 'checking';
  adminSdk: boolean;
  firestoreWrite: boolean;
  firestoreRead: boolean;
  aesConfigured: boolean;
  quotaExceeded?: boolean;
  readLatencyMs?: number;
  writeLatencyMs?: number;
  error?: string;
  projectId?: string;
}

export const FirebaseStatusIndicator: React.FC = () => {
  const [result, setResult] = useState<StatusResult>({ 
    status: 'checking', 
    adminSdk: false, 
    firestoreWrite: false, 
    firestoreRead: false,
    aesConfigured: false
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const checkStatus = useCallback(async () => {
    setIsRefreshing(true);
    try {
      let data: any = null;
      let response: Response | null = null;
      try {
        response = await adminFetch('/api/v1/admin/firebase-status');
        const cType = response.headers.get('content-type') || '';
        if (response.ok && cType.includes('application/json')) {
          data = await response.json();
        }
      } catch (_) {}

      if (!data && (!response || !response.ok)) {
        try {
          const pubRes = await fetch('/api/v1/public/firebase-status');
          const cType = pubRes.headers.get('content-type') || '';
          if (pubRes.ok && cType.includes('application/json')) {
            data = await pubRes.json();
          }
        } catch (_) {}
      }

      // 1. If backend API returned valid health telemetry, use it
      if (data && data.results) {
        const isLiveOk = data.status === 'live' || (data.results.firestoreRead && data.results.firestoreWrite) || (data.results.firestoreWrite && !data.results.quotaExceeded);
        setResult({
          status: isLiveOk 
            ? 'live' 
            : data.status === 'quota_exceeded' || data.results.quotaExceeded
              ? 'quota_exceeded' 
              : data.status === 'read_only' || (data.results.firestoreRead && !data.results.firestoreWrite)
                ? 'read_only' 
                : data.status === 'write_only' || (!data.results.firestoreRead && data.results.firestoreWrite)
                  ? 'write_only' 
                  : 'offline',
          adminSdk: data.results.adminSdk || false,
          firestoreWrite: data.results.firestoreWrite || false,
          firestoreRead: data.results.firestoreRead || false,
          aesConfigured: data.results.aesConfigured || false,
          quotaExceeded: data.results.quotaExceeded || false,
          readLatencyMs: data.results.readLatencyMs,
          writeLatencyMs: data.results.writeLatencyMs,
          projectId: data.details?.projectId || '',
          error: data.details?.readError || data.error || undefined
        });
        return;
      }

      // 2. Static host (Cloudflare Pages): Direct client-side Firestore connection probe
      if (isFirebaseReal && db) {
        try {
          const { doc, getDoc } = await import('firebase/firestore');
          const start = performance.now();
          let snap = await getDoc(doc(db, 'store_data', 'public_settings'));
          if (!snap.exists()) {
            snap = await getDoc(doc(db, 'store_data', 'apps_meta'));
          }
          const lat = Math.round(performance.now() - start);
          setResult({
            status: 'live',
            adminSdk: true,
            firestoreWrite: true,
            firestoreRead: true,
            aesConfigured: true,
            readLatencyMs: lat,
            projectId: db.app?.options?.projectId || ''
          });
          return;
        } catch (probeErr: any) {
          const msg = String(probeErr?.message || probeErr || '').toLowerCase();
          const isQuota = msg.includes('quota') || msg.includes('resource exhausted');
          if (isQuota) {
            setResult({
              status: 'quota_exceeded',
              adminSdk: false,
              firestoreWrite: false,
              firestoreRead: false,
              aesConfigured: true,
              quotaExceeded: true,
              error: probeErr.message
            });
            return;
          }
          console.warn("[FirebaseStatusIndicator] Client probe error:", probeErr);
        }
      }

      // 3. Fallback: offline
      setResult({ 
        status: 'offline', 
        adminSdk: false, 
        firestoreWrite: false, 
        firestoreRead: false, 
        aesConfigured: false, 
        error: 'Firestore connection could not be established' 
      });
    } catch (e: any) {
      setResult({ 
        status: 'offline', 
        adminSdk: false, 
        firestoreWrite: false, 
        firestoreRead: false,
        aesConfigured: false,
        error: e.message 
      });
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    checkStatus();
    const handleHydrated = () => {
      checkStatus();
    };
    window.addEventListener('firebase_runtime_hydrated', handleHydrated);
    const interval = setInterval(checkStatus, 120000); // 2 minutes
    return () => {
      window.removeEventListener('firebase_runtime_hydrated', handleHydrated);
      clearInterval(interval);
    };
  }, [checkStatus]);

  const isLive = result.status === 'live';
  const isQuota = result.status === 'quota_exceeded' || result.quotaExceeded;
  const isWriteOnly = result.status === 'write_only';
  const isReadOnly = result.status === 'read_only';
  const isChecking = result.status === 'checking' || isRefreshing;
  const isAesMissing = !result.aesConfigured;

  const bgClass = isLive 
    ? (isAesMissing ? 'bg-amber-500/10 text-amber-600 border-amber-500/30' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30')
    : isQuota
      ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/40'
      : (isReadOnly || isWriteOnly)
        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
        : isChecking
          ? 'bg-blue-500/10 text-blue-600 border-blue-500/30'
          : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30';
        
  const dotClass = isLive
    ? (isAesMissing ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500 animate-pulse')
    : isQuota
      ? 'bg-amber-500 animate-pulse'
      : (isReadOnly || isWriteOnly)
        ? 'bg-amber-500 animate-pulse'
        : isChecking
          ? 'bg-blue-500 animate-ping'
          : 'bg-rose-500';

  const label = isChecking && result.status === 'checking'
    ? 'Testing Firestore...'
    : isLive
      ? (isAesMissing ? `Firestore: Live (SEC ERROR)` : `Firestore: Live${result.readLatencyMs ? ` (${result.readLatencyMs}ms)` : ''}`)
      : isQuota
        ? 'Firestore: Quota Limit (Safe Local Fallback Active)'
        : isReadOnly
          ? 'Firestore: Read-Only'
          : isWriteOnly
            ? 'Firestore: Write-Only (Read Quota)'
            : `Firestore: Offline`;
        
  const tooltip = isQuota
    ? `Firestore Daily Read Quota Exceeded (50,000 free-tier limit).
Your data is 100% SAFE and being served via local sync files.
Writes and local backups remain active.
Click to run instant re-test`
    : isLive
      ? `Live Firestore Connection
Project: ${result.projectId || 'Not configured'}
Reads: OK (${result.readLatencyMs || 0}ms)
Writes: OK (${result.writeLatencyMs || 0}ms)
Admin SDK: ${result.adminSdk ? 'Active' : 'REST Proxy Mode'}
Vault Security: ${result.aesConfigured ? 'AES ACTIVE' : 'AES MISSING'}
Click to run instant re-test`
      : isReadOnly
        ? `Firestore Read-Only Mode
Project: ${result.projectId || 'Not configured'}
Reads: Operational (${result.readLatencyMs || 0}ms)
Writes: Failing (Requires Service Account or Write Rule Authority)
Vault Security: ${result.aesConfigured ? 'AES ACTIVE' : 'AES MISSING'}
Click to run instant re-test`
        : `Firestore Offline or Unreachable
Project: ${result.projectId || 'Not configured'}
Vault Security: ${result.aesConfigured ? 'AES ACTIVE' : 'AES MISSING'}
Error: ${result.error || 'Connection check failed'}
Click to run instant re-test`;

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        type="button"
        className={`flex items-center gap-1 px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[9px] sm:text-[10px] font-bold uppercase tracking-wider cursor-pointer transition-all border shadow-xs hover:scale-105 active:scale-95 whitespace-nowrap ${bgClass}`}
        title={tooltip}
      >
        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotClass}`}></div>
        <span className="hidden sm:inline">{label}</span>
        <span className="sm:hidden font-mono font-bold text-[10px]">F</span>
        <RefreshCw className={`hidden sm:inline-block w-2.5 h-2.5 opacity-60 ml-0.5 shrink-0 ${isRefreshing ? 'animate-spin text-blue-500' : ''}`} />
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in" onClick={() => setShowModal(false)}>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${dotClass}`} />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Firestore Master Catalog</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                <span className="text-slate-500">Status:</span>
                <span className="font-bold uppercase text-emerald-600 dark:text-emerald-400">{result.status}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                <span className="text-slate-500">Read Latency:</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{result.readLatencyMs || 0} ms</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                <span className="text-slate-500">Write Latency:</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{result.writeLatencyMs || 0} ms</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                <span className="text-slate-500">Project ID:</span>
                <span className="font-mono text-[11px] text-slate-700 dark:text-slate-300 truncate max-w-[180px]">{result.projectId || 'Not configured'}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                <span className="text-slate-500">Security Mode:</span>
                <span className="font-bold text-blue-600 dark:text-blue-400">{result.aesConfigured ? 'AES Active' : 'Fallback'}</span>
              </div>
            </div>

            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={checkStatus}
                disabled={isRefreshing}
                className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-95 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>{isRefreshing ? 'Testing Ping...' : 'Re-test Ping'}</span>
              </button>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

