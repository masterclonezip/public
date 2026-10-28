import React, { useState, useEffect } from 'react';
import {
  Key,
  Sparkles,
  CheckCircle2,
  X,
  ExternalLink,
  ShieldCheck,
  Cpu,
  Wifi,
  AlertCircle,
  Loader2,
  Trash2,
  RefreshCw,
  Eye,
  EyeOff
} from 'lucide-react';
import { StudioConfig, AIConnectionStatus } from './types';
import { SUPPORTED_GEMINI_MODELS, verifyStudioConnection } from './geminiEngine';
import { normalizeClientModelId, saveStudioConfig } from './storage';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: StudioConfig;
  connectionStatus: AIConnectionStatus;
  onSaveConfigAndStatus: (newConfig: StudioConfig, newStatus: AIConnectionStatus) => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({
  isOpen,
  onClose,
  config,
  connectionStatus,
  onSaveConfigAndStatus
}) => {
  const [apiKeyInput, setApiKeyInput] = useState(config.apiKey || '');
  const [showKey, setShowKey] = useState(false);

  const normalizedConfigModel = normalizeClientModelId(config.model);
  const isKnownPreset = SUPPORTED_GEMINI_MODELS.some(m => m.id === normalizedConfigModel);

  const [selectedPreset, setSelectedPreset] = useState(
    isKnownPreset ? normalizedConfigModel : 'custom'
  );
  const [customModelInput, setCustomModelInput] = useState(
    isKnownPreset ? '' : normalizedConfigModel
  );

  const [testing, setTesting] = useState(false);
  const [liveStatus, setLiveStatus] = useState<AIConnectionStatus>(connectionStatus);

  useEffect(() => {
    if (isOpen) {
      setApiKeyInput(config.apiKey || '');
      const norm = normalizeClientModelId(config.model);
      const match = SUPPORTED_GEMINI_MODELS.some(m => m.id === norm);
      setSelectedPreset(match ? norm : 'custom');
      setCustomModelInput(match ? '' : norm);
      setLiveStatus(connectionStatus);
    }
  }, [isOpen, config.apiKey, config.model, connectionStatus]);

  if (!isOpen) return null;

  const finalModel = normalizeClientModelId(
    selectedPreset === 'custom'
      ? customModelInput.trim() || 'gemini-2.5-flash'
      : selectedPreset
  );

  const executeSaveAndVerify = async (
    targetKey: string,
    targetModel: string,
    closeOnSuccess = false,
    deepPing = false
  ) => {
    const cleanKey = targetKey.trim();
    const normModel = normalizeClientModelId(targetModel);

    // 1. Save immediately in 0ms so UI and storage are locked in right away
    const immediateConfig = saveStudioConfig({
      ...config,
      apiKey: cleanKey,
      model: normModel,
      updatedAt: Date.now()
    });

    setTesting(true);
    setLiveStatus(prev => ({
      ...prev,
      state: 'checking',
      model: normModel
    }));

    // 2. Sub-250ms connection & model verification
    const status = await verifyStudioConnection(cleanKey, normModel, deepPing);
    setLiveStatus(status);
    setTesting(false);

    const verifiedConfig = saveStudioConfig({
      ...immediateConfig,
      apiKey: cleanKey,
      model: status.model || normModel,
      updatedAt: Date.now()
    });

    onSaveConfigAndStatus(verifiedConfig, status);

    if (closeOnSuccess && status.state === 'connected') {
      setTimeout(() => {
        onClose();
      }, 180);
    }
  };

  const handleSelectModelCard = async (modelId: string) => {
    setSelectedPreset(modelId);
    if (modelId !== 'custom') {
      await executeSaveAndVerify(apiKeyInput, modelId, false, false);
    }
  };

  const handleClearKey = async () => {
    setApiKeyInput('');
    await executeSaveAndVerify('', finalModel, false, false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-3 sm:p-4 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-indigo-500/10 via-violet-500/10 to-transparent shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/25">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Gemini API Key &amp; Model Engine
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Sub-second direct verification &amp; instant model switching
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5 overflow-y-auto">
          {/* Live Connection Diagnostic Banner */}
          <div
            className={`p-3.5 rounded-xl border flex items-start justify-between gap-3 ${
              liveStatus.state === 'connected'
                ? 'bg-emerald-50/90 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200'
                : liveStatus.state === 'checking'
                ? 'bg-indigo-50/90 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800/60 text-indigo-900 dark:text-indigo-200'
                : 'bg-rose-50/90 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/60 text-rose-900 dark:text-rose-200'
            }`}
          >
            <div className="flex items-start gap-2.5 min-w-0">
              {liveStatus.state === 'connected' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              ) : liveStatus.state === 'checking' ? (
                <Loader2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 animate-spin shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              )}
              <div className="text-xs space-y-1 min-w-0">
                <div className="font-bold flex flex-wrap items-center gap-2">
                  <span>
                    {liveStatus.state === 'connected'
                      ? 'Gemini Engine Connected & Ready'
                      : liveStatus.state === 'checking'
                      ? 'Verifying Key & Model...'
                      : liveStatus.state === 'missing_key'
                      ? 'API Key Required'
                      : 'Connection Issue Detected'}
                  </span>
                  {liveStatus.state === 'connected' && (
                    <span className="px-2 py-0.5 rounded-md bg-emerald-600/15 text-emerald-700 dark:text-emerald-300 font-mono text-[10px]">
                      {liveStatus.model} • {liveStatus.latencyMs}ms
                    </span>
                  )}
                </div>

                {liveStatus.state === 'connected' ? (
                  <p className="text-[11px] opacity-90">
                    Active Key:{' '}
                    <span className="font-mono font-semibold">
                      {liveStatus.keyMask || 'Verified'}
                    </span>{' '}
                    (
                    {liveStatus.keySource === 'server_env'
                      ? 'Server Environment Key'
                      : 'Custom Studio Key'}
                    )
                    {liveStatus.warningMessage ? ` — ${liveStatus.warningMessage}` : ''}
                  </p>
                ) : (
                  <p className="text-[11px] opacity-90 break-words">
                    {liveStatus.errorMessage ||
                      'Paste your free Google AI Studio API key below and click Save & Connect.'}
                  </p>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => executeSaveAndVerify(apiKeyInput, finalModel, false, true)}
              disabled={testing}
              className="px-2.5 py-1.5 rounded-lg bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-800 text-[11px] font-bold text-slate-700 dark:text-slate-200 border border-slate-200/70 dark:border-slate-700 flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
              Ping
            </button>
          </div>

          {/* API Key Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Google AI Studio API Key
              </label>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
              >
                Get Free API Key <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="relative flex items-center">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKeyInput}
                onChange={e => setApiKeyInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    executeSaveAndVerify(apiKeyInput, finalModel, true, false);
                  }
                }}
                placeholder="AIzaSy... (Paste your Google AI Studio API Key)"
                className="w-full bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-xl pl-3.5 pr-20 py-2.5 text-sm font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
              />
              <div className="absolute right-2 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setShowKey(v => !v)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
                  title={showKey ? 'Hide API Key' : 'Show API Key'}
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                {apiKeyInput.trim() && (
                  <button
                    type="button"
                    onClick={handleClearKey}
                    className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg cursor-pointer"
                    title="Clear custom API key"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5">
              Clicking any model below or pressing Enter connects and locks your key &amp; model in milliseconds.
            </p>
          </div>

          {/* Model Selection Grid */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-2 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-indigo-500" />
              Select Active Gemini Model (Tap to Switch Immediately)
            </label>
            <div className="grid grid-cols-1 gap-2">
              {SUPPORTED_GEMINI_MODELS.map(m => {
                const isSelected = selectedPreset === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => handleSelectModelCard(m.id)}
                    className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                      isSelected
                        ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-500 dark:border-indigo-500 ring-1 ring-indigo-500/30'
                        : 'bg-slate-50/70 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          {m.label}
                        </span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 border border-indigo-500/20">
                          {m.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {m.desc}
                      </p>
                    </div>
                    <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500 shrink-0 mt-0.5">
                      {m.id}
                    </span>
                  </button>
                );
              })}

              {/* Custom Model ID Option */}
              <button
                type="button"
                onClick={() => setSelectedPreset('custom')}
                className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer ${
                  selectedPreset === 'custom'
                    ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-500 ring-1 ring-indigo-500/30'
                    : 'bg-slate-50/70 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/80'
                }`}
              >
                <div className="text-xs font-bold text-slate-900 dark:text-white">
                  Custom Gemini Model ID
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Enter any exact Google AI Studio model identifier manually
                </p>
              </button>
            </div>

            {selectedPreset === 'custom' && (
              <div className="mt-2.5 animate-fade-in">
                <input
                  type="text"
                  value={customModelInput}
                  onChange={e => setCustomModelInput(e.target.value)}
                  placeholder="e.g., gemini-3.1-pro-preview or gemini-2.5-flash"
                  className="w-full bg-white dark:bg-slate-950 border border-indigo-300 dark:border-indigo-700 rounded-xl px-3.5 py-2.5 text-sm font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200/60 dark:border-slate-700/50">
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>
              Your API key and selected model are saved in encrypted admin storage and server brain memory — never exposed to public site visitors.
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <button
            type="button"
            onClick={() => executeSaveAndVerify(apiKeyInput, finalModel, false, false)}
            disabled={testing}
            className="px-3.5 py-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-800/60 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wifi className="w-3.5 h-3.5" />}
            Test Key &amp; Model
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 rounded-xl transition-colors cursor-pointer"
            >
              Close
            </button>
            <button
              type="button"
              disabled={testing}
              onClick={() => executeSaveAndVerify(apiKeyInput, finalModel, true, false)}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-600/20 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              {testing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              Save &amp; Connect ({finalModel})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
