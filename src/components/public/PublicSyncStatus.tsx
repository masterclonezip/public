import React, { useState } from 'react';
import { useData } from '../../contexts/DataContextPublic';

export function PublicSyncStatus() {
  const { isConnected, refreshAll, lastSyncTime, testCloudConnection, isLive } = useData();
  const [syncing, setSyncing] = useState(false);
  const [testing, setTesting] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const isAdminPath = false;

  if (!isAdminPath) {
    return null;
  }

  const handleForceSync = async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      await refreshAll();
      alert("Manual Sync: Your data is now up-to-date with the Cloud Server.");
    } catch (err: any) {
      alert("Sync Failed: Failed to reach Cloud Server. " + err.message);
    } finally {
      setSyncing(false);
    }
  };

  const handleTestConnection = async () => {
    if (testing) return;
    setTesting(true);
    const success = await testCloudConnection();
    if (success) {
      alert("Real-time OK: The cloud acknowledged your test signal. Your connection is healthy!");
    } else {
      alert("Real-time ERROR: Failed to send signal to cloud. Please check if your device allows WebSockets or try another network.");
    }
    setTesting(false);
  };

  const handleClearCache = () => {
    if (!confirmClear) {
      setConfirmClear(true);
      setTimeout(() => setConfirmClear(false), 4000);
    } else {
      localStorage.clear();
      window.location.reload();
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-center gap-2">
        <button 
          onClick={handleForceSync}
          disabled={syncing}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-medium transition-all ${isConnected === true ? (isLive ? 'bg-green-500/10 text-green-600 shadow-sm' : 'bg-orange-500/10 text-orange-600 shadow-sm') : isConnected === false ? 'bg-red-500/10 text-red-600 shadow-sm' : 'bg-slate-500/10 text-slate-500 text-slate-400'}`}
        >
          <div className={`w-1.5 h-1.5 rounded-full ${syncing ? 'bg-blue-500 animate-spin' : isConnected === true ? (isLive ? 'bg-green-500' : 'bg-orange-500') : isConnected === false ? 'bg-red-500' : 'bg-slate-400 animate-pulse'}`}></div>
          {syncing ? 'Syncing...' : isConnected === true ? (isLive ? 'Live' : 'Cached') : isConnected === false ? 'Offline' : 'Connecting'}
        </button>
        {lastSyncTime && (
          <span className="text-[10px] text-zinc-400">Updated: {lastSyncTime}</span>
        )}
      </div>
      
      <div className="flex items-center gap-4 mt-1">
        <button 
          onClick={handleTestConnection}
          disabled={testing}
          className="text-[11px] text-blue-500 hover:text-blue-600 font-medium transition-colors"
        >
          {testing ? 'Testing...' : 'Diagnostics'}
        </button>
        <button 
          onClick={handleClearCache}
          className={`text-[11px] font-medium transition-colors ${confirmClear ? 'text-red-500' : 'text-zinc-500 hover:text-zinc-700'}`}
        >
          {confirmClear ? 'Confirm Reset' : 'Reset'}
        </button>
      </div>
    </div>
  );
}

export default PublicSyncStatus;
