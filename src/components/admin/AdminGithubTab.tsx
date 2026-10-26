import React, { useState, useEffect, useRef } from 'react';
import { 
  Github, Save, RefreshCw, Upload, FileText, ShieldAlert, 
  Link as LinkIcon, CheckCircle2, AlertCircle, Copy, Check, 
  Eye, EyeOff, Terminal, Activity, ArrowRight, Sparkles 
} from 'lucide-react';
import { toast } from '../Toast';
import { adminFetch } from '../../services/adminAuthService';
import { testGitHubConnection } from '../../lib/githubSync';

interface AdminGithubTabProps {
  pushAllToGitHub: (e?: any, logCb?: (msg: string) => void, appsList?: any[], settings?: any, newsList?: any[], videosList?: any[]) => Promise<any>;
  gitConfig: any;
  saveGitConfig: (config: any) => Promise<void>;
  generatePreview: () => string;
  appsList: any[];
  settings: any;
  newsList: any[];
  videosList: any[];
}

interface LogEntry {
  id: string;
  time: string;
  text: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'step';
}

export const AdminGithubTab = React.memo(({
  pushAllToGitHub,
  gitConfig,
  saveGitConfig,
  generatePreview,
  appsList,
  settings,
  newsList,
  videosList
}: AdminGithubTabProps) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<number>(0);
  const [currentStepText, setCurrentStepText] = useState<string>('');
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [showPreview, setShowPreview] = useState(false);
  const [previewContent, setPreviewContent] = useState<string>("");
  const [showToken, setShowToken] = useState(false);
  const [copiedLogs, setCopiedLogs] = useState(false);
  const [localConfig, setLocalConfig] = useState(gitConfig || { owner: '', repo: '', branch: 'main', token: '' });

  const logsEndRef = useRef<HTMLDivElement>(null);

  const getLogType = (text: string): LogEntry['type'] => {
    const lower = text.toLowerCase();
    if (lower.includes('error') || lower.includes('failed') || lower.includes('aborted') || text.includes('❌')) {
      return 'error';
    }
    if (lower.includes('success') || text.includes('✅') || lower.includes('completed')) {
      return 'success';
    }
    if (lower.includes('warning') || text.includes('⚠️') || lower.includes('conflict') || lower.includes('retrying')) {
      return 'warning';
    }
    if (lower.includes('syncing (') || lower.includes('step') || lower.includes('initiating')) {
      return 'step';
    }
    return 'info';
  };

  const appendLog = (text: string) => {
    const type = getLogType(text);
    
    // Extract step progress e.g. (3/8)
    const stepMatch = text.match(/\((\d+)\/(\d+)\)/);
    if (stepMatch) {
      const current = parseInt(stepMatch[1], 10);
      const total = parseInt(stepMatch[2], 10);
      if (total > 0) {
        const pct = Math.round((current / total) * 85) + 10;
        setSyncProgress(Math.min(95, pct));
        setCurrentStepText(`Step ${current} of ${total}`);
      }
    } else if (text.includes('Vault') || text.includes('AES')) {
      setSyncProgress(90);
      setCurrentStepText('Securing Link Vault');
    } else if (text.includes('API bundle')) {
      setSyncProgress(95);
      setCurrentStepText('Finalizing API Bundle');
    } else if (type === 'success' && text.includes('Sync completed successfully')) {
      setSyncProgress(100);
      setCurrentStepText('Sync Complete');
    }

    setLogs(prev => [
      ...prev,
      {
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        time: new Date().toLocaleTimeString(),
        text,
        type
      }
    ]);
  };

  // Auto-scroll terminal to bottom whenever new logs arrive
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  useEffect(() => {
    if (gitConfig) {
      setLocalConfig(gitConfig);
    }
  }, [gitConfig]);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await saveGitConfig(localConfig);
      toast('GitHub Configuration saved successfully.', 'success');
    } catch (err: any) {
      toast(`Error saving GitHub config: ${err.message}`, 'error');
    }
  };

  const handleManualSync = async () => {
    setSyncing(true);
    setSyncStatus('syncing');
    setSyncProgress(5);
    setCurrentStepText('Initializing Sync Pipeline');
    
    setLogs([{
      id: `${Date.now()}_start`,
      time: new Date().toLocaleTimeString(),
      text: `🚀 Starting GitHub Static Release Sync to repository "${localConfig.repo || gitConfig?.repo || 'Dex'}"...`,
      type: 'info'
    }]);

    try {
      // Auto-save local config if changed
      try {
        if (localConfig.token && (!gitConfig?.token || localConfig.token !== gitConfig.token || localConfig.repo !== gitConfig.repo)) {
          await saveGitConfig(localConfig);
        }
      } catch (saveErr) {}

      const result = await pushAllToGitHub(
        localConfig, 
        (msg: string) => {
          appendLog(msg);
        }, 
        appsList,
        settings,
        newsList,
        videosList
      );
      const targetMsg = (result as any)?.targetRepo ? ` to ${(result as any).targetRepo}` : "";
      setSyncProgress(100);
      setSyncStatus('success');
      setCurrentStepText('All Files Synchronized');
      appendLog(`🎉 Static Build and GitHub Sync completed successfully${targetMsg}!`);
      toast(`Sync completed successfully${targetMsg}!`, 'success');
    } catch (err: any) {
      setSyncStatus('error');
      setCurrentStepText('Sync Encountered Error');
      const cleanErr = err.message || 'Push failed';
      appendLog(`❌ ERROR: ${cleanErr}`);
      toast(`Sync failed: ${cleanErr}`, 'error');
    } finally {
      setSyncing(false);
    }
  };

  const handleTestConnection = async () => {
    setSyncing(true);
    setSyncStatus('syncing');
    setSyncProgress(30);
    setCurrentStepText('Testing GitHub API Connection');
    appendLog("🔍 Testing GitHub API Credentials and Repository Permissions...");
    try {
      const data = await testGitHubConnection(localConfig);

      setSyncProgress(100);
      setSyncStatus('success');
      setCurrentStepText('Connection Verified');
      appendLog(`✅ SUCCESS: ${data.message || 'Connection successful!'}`);
      if (data.permissions) {
        appendLog(`📋 Permissions: Push=${data.permissions.push ? '✅ Yes' : '❌ No'}, Pull=${data.permissions.pull ? '✅ Yes' : '❌ No'}, Admin=${data.permissions.admin ? '✅ Yes' : '❌ No'}`);
        if (!data.permissions.push) {
          appendLog("⚠️ WARNING: Token lacks PUSH permissions. Sync commits will be rejected by GitHub.");
        }
      }
      toast("GitHub Connection Successful!", "success");
    } catch (err: any) {
      setSyncStatus('error');
      setCurrentStepText('Connection Failed');
      const cleanErr = err?.message || 'Connection failed';
      appendLog(`❌ ERROR: ${cleanErr}`);
      toast(`Connection Failed: ${cleanErr}`, "error");
    } finally {
      setSyncing(false);
    }
  };

  const handleCopyLogs = () => {
    if (logs.length === 0) return;
    const logText = logs.map(l => `[${l.time}] ${l.text}`).join('\n');
    navigator.clipboard.writeText(logText);
    setCopiedLogs(true);
    toast('Logs copied to clipboard', 'info');
    setTimeout(() => setCopiedLogs(false), 2000);
  };

  const handleTogglePreview = () => {
    if (!showPreview) {
      try {
        const payload = generatePreview();
        setPreviewContent(payload);
      } catch (err) {
        setPreviewContent(`Error generating preview: ${err}`);
      }
    }
    setShowPreview(!showPreview);
  };

  return (
    <div className="animate-fade-in space-y-6 max-w-5xl mx-auto pb-12">
      {/* Top Header Card */}
      <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black flex items-center gap-2.5 text-slate-900 dark:text-white">
            <span className="p-2 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl">
              <Github className="w-5 h-5" />
            </span>
            Source Control & GitHub Static Build Sync
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Build production static datasets (<code className="font-mono text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-1 py-0.5 rounded">staticData.ts</code>, <code className="font-mono text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-1 py-0.5 rounded">sitemaps</code>, AES Vault) and push directly to GitHub.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {syncStatus === 'syncing' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 animate-pulse">
              <Activity className="w-3.5 h-3.5 animate-spin" /> Syncing in Progress
            </span>
          )}
          {syncStatus === 'success' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="w-3.5 h-3.5" /> Synced
            </span>
          )}
          {syncStatus === 'error' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
              <AlertCircle className="w-3.5 h-3.5" /> Sync Error
            </span>
          )}
        </div>
      </div>

      {/* Security Info Card */}
      <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 rounded-2xl p-4 sm:p-5 relative overflow-hidden">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-xl shrink-0 mt-0.5">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div className="space-y-1 text-xs sm:text-sm">
            <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
              Automated Link Encryption Active
            </h3>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              All private download clearance links are automatically encrypted via AES-256 before being committed to GitHub. Public scrapers cannot extract target URLs from GitHub source code.
            </p>
          </div>
        </div>
      </div>

      {/* Sync Execution Console & Controls */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-300">
              <Terminal className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                Live Synchronization Terminal
                {syncing && (
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                )}
              </h3>
            </div>
          </div>
          
          <div className="flex items-center gap-2 self-end sm:self-auto">
            {logs.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={handleCopyLogs}
                  className="px-2.5 py-1 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
                  title="Copy terminal logs"
                >
                  {copiedLogs ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedLogs ? 'Copied' : 'Copy'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLogs([]);
                    setSyncProgress(0);
                    setSyncStatus('idle');
                    setCurrentStepText('');
                  }}
                  className="px-2.5 py-1 text-xs font-semibold text-slate-500 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-all cursor-pointer"
                >
                  Clear ({logs.length})
                </button>
              </>
            )}
          </div>
        </div>

        {/* Progress Bar Header when active */}
        {(syncing || syncProgress > 0) && (
          <div className="space-y-2 bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60 transition-all">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                {syncing && <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-500" />}
                {currentStepText || 'Synchronizing with GitHub...'}
              </span>
              <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{syncProgress}%</span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
              <div 
                className={`h-full transition-all duration-300 rounded-full ${
                  syncStatus === 'error' 
                    ? 'bg-rose-500' 
                    : syncStatus === 'success' 
                    ? 'bg-emerald-500' 
                    : 'bg-blue-600'
                }`}
                style={{ width: `${syncProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Terminal Logs Viewport */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 h-[280px] sm:h-[300px] overflow-y-auto font-mono text-xs space-y-1.5 shadow-inner select-text">
          {logs.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-2 text-center p-4">
              <Upload className="w-8 h-8 text-slate-700" />
              <p>Ready to synchronize target repository ({localConfig.repo || gitConfig?.repo || 'Dex'}).</p>
              <p className="text-[11px] text-slate-600">Click &quot;Trigger Full Static Build Sync&quot; below to begin.</p>
            </div>
          ) : (
            logs.map((log) => {
              let colorClass = 'text-slate-300';
              if (log.type === 'error') colorClass = 'text-rose-400 font-semibold';
              else if (log.type === 'success') colorClass = 'text-emerald-400 font-semibold';
              else if (log.type === 'warning') colorClass = 'text-amber-300';
              else if (log.type === 'step') colorClass = 'text-sky-300 font-medium';

              return (
                <div key={log.id} className="flex items-start gap-2.5 leading-relaxed hover:bg-white/5 px-1.5 py-0.5 rounded transition-colors">
                  <span className="text-slate-600 shrink-0 select-none">[{log.time}]</span>
                  <span className={`break-words flex-1 ${colorClass}`}>{log.text}</span>
                </div>
              );
            })
          )}
          <div ref={logsEndRef} />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-1">
          <button 
            type="button"
            onClick={handleManualSync} 
            disabled={syncing || (!gitConfig?.token && !localConfig.token)} 
            className="flex-1 min-h-[48px] bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 cursor-pointer active:scale-[0.99]"
          >
            {syncing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {syncing 
              ? `Synchronizing ${currentStepText ? `(${currentStepText})` : 'Repository...'}` 
              : `Trigger Full Static Build Sync (to ${localConfig.repo || gitConfig?.repo || 'Dex'})`}
          </button>
          
          <button 
            type="button"
            onClick={handleTogglePreview} 
            className="flex-none px-5 min-h-[48px] bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
          >
            <FileText className="w-4 h-4" />
            {showPreview ? 'Hide Payload' : 'Preview Payload'}
          </button>
        </div>

        {showPreview && (
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 animate-in fade-in duration-200">
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-bold text-xs text-slate-700 dark:text-slate-300">Generated Code Payload (staticData.ts)</h4>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(previewContent);
                  toast('Payload code copied!', 'info');
                }}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold flex items-center gap-1"
              >
                <Copy className="w-3 h-3" /> Copy Payload
              </button>
            </div>
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 h-[350px] overflow-y-auto font-mono text-xs text-slate-300 shadow-inner whitespace-pre-wrap select-text">
              {previewContent}
            </div>
          </div>
        )}
      </div>

      {/* Repository Settings Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm space-y-5">
        <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">GitHub Repository Credentials</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Configure the target GitHub repository for static site deployment.</p>
        </div>

        <form onSubmit={handleSaveConfig} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Repository Owner</label>
              <input 
                type="text" 
                value={localConfig.owner || ''} 
                onChange={e => setLocalConfig({...localConfig, owner: e.target.value})} 
                placeholder="e.g. your-github-org"
                className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm dark:text-white focus:ring-2 focus:ring-blue-500 transition-all font-mono" 
                required 
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Repository Name</label>
              <input 
                type="text" 
                value={localConfig.repo || ''} 
                onChange={e => setLocalConfig({...localConfig, repo: e.target.value})} 
                placeholder="e.g. public-site"
                className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm dark:text-white focus:ring-2 focus:ring-blue-500 transition-all font-mono" 
                required 
              />
              <p className="text-[11px] text-slate-500 mt-1">Public website repository name (e.g. <strong>Dex</strong>).</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Branch</label>
              <input 
                type="text" 
                value={localConfig.branch || ''} 
                onChange={e => setLocalConfig({...localConfig, branch: e.target.value})} 
                placeholder="main" 
                className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm dark:text-white focus:ring-2 focus:ring-blue-500 transition-all font-mono" 
                required 
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">GitHub Personal Access Token (PAT)</label>
              <div className="relative">
                <input 
                  type={showToken ? "text" : "password"} 
                  value={localConfig.token || ''} 
                  onChange={e => setLocalConfig({...localConfig, token: e.target.value})} 
                  placeholder="github_pat_..." 
                  className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl p-3 pr-10 text-sm dark:text-white focus:ring-2 focus:ring-blue-500 transition-all font-mono" 
                  required 
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1"
                  title={showToken ? "Hide token" : "Show token"}
                >
                  {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Fine-grained token with <strong>Contents: Read & Write</strong> access.</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button 
              type="submit" 
              className="bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 px-6 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer active:scale-95"
            >
              <Save className="w-4 h-4" /> Save Configuration
            </button>
            <button 
              type="button" 
              onClick={handleTestConnection} 
              disabled={syncing || !localConfig.token}
              className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 disabled:opacity-50 text-slate-700 dark:text-slate-200 px-6 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              {syncing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <LinkIcon className="w-4 h-4" />}
              Test Connection
            </button>
          </div>
        </form>
      </div>
    </div>
  );
});

AdminGithubTab.displayName = 'AdminGithubTab';

export default AdminGithubTab;
