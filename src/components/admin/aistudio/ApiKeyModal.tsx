import React, { useState } from 'react';
import { Key, Check, X, ExternalLink, ShieldCheck, RefreshCw } from 'lucide-react';
import { StudioConfig } from './types';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: StudioConfig;
  onSaveConfig: (newConfig: Partial<StudioConfig>) => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig
}) => {
  const [apiKeyInput, setApiKeyInput] = useState(config.apiKey || '');
  const [selectedPreset, setSelectedPreset] = useState<string>(() => {
    const m = config.model || 'gemini-flash-latest';
    if (['gemini-flash-latest', 'gemini-2.5-flash', 'gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-2.0-flash'].includes(m)) {
      return m;
    }
    return 'custom';
  });
  const [customModelInput, setCustomModelInput] = useState(() => {
    const m = config.model || 'gemini-flash-latest';
    if (!['gemini-flash-latest', 'gemini-2.5-flash', 'gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-2.0-flash'].includes(m)) {
      return m;
    }
    return '';
  });
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');
  const [testLatency, setTestLatency] = useState<number | null>(null);

  if (!isOpen) return null;

  const activeModelName = selectedPreset === 'custom' 
    ? (customModelInput.trim() || 'gemini-flash-latest') 
    : selectedPreset;

  const handleTestKey = async () => {
    const keyToTest = apiKeyInput.trim();
    if (!keyToTest) {
      setTestStatus('error');
      setTestMessage('Please enter your Google Gemini API key first.');
      return;
    }
    setTestStatus('testing');
    setTestMessage(`Contacting Google AI Studio with model "${activeModelName}"...`);
    setTestLatency(null);

    const startTime = performance.now();
    try {
      // 1. Try server test endpoint
      try {
        const srvRes = await fetch('/api/v1/admin/community/aistudio-gemini', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'test',
            apiKey: keyToTest,
            model: activeModelName
          })
        });

        if (srvRes.ok) {
          const srvData = await srvRes.json();
          if (srvData.success) {
            setTestStatus('success');
            setTestLatency(srvData.latencyMs || Math.round(performance.now() - startTime));
            setTestMessage(`Success! Verified ${srvData.model || activeModelName} (${srvData.latencyMs || Math.round(performance.now() - startTime)}ms). AI Connected & Ready.`);
            return;
          }
        }
      } catch (_) {}

      // 2. Client direct test fallback
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(activeModelName)}:generateContent?key=${encodeURIComponent(keyToTest)}`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-goog-api-key': keyToTest
        },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: 'Respond with exactly two words: AI Connected' }] }]
        })
      });

      const latencyMs = Math.round(performance.now() - startTime);
      setTestLatency(latencyMs);

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error?.message || `HTTP ${res.status} (${res.statusText})`);
      }

      const data = await res.json();
      const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || 'Connected';
      const modelVer = data?.modelVersion || activeModelName;

      setTestStatus('success');
      setTestMessage(`Success! Verified ${modelVer} (${latencyMs}ms). Model replied: "${reply}"`);
    } catch (err: any) {
      setTestStatus('error');
      setTestMessage(`Connection failed: ${err.message}`);
    }
  };

  const handleSave = async () => {
    const cleanKey = apiKeyInput.trim();
    onSaveConfig({
      apiKey: cleanKey,
      model: activeModelName
    });

    // Also persist directly to server admin settings
    try {
      await fetch('/api/v1/admin/community/aistudio-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config: {
            apiKey: cleanKey,
            model: activeModelName
          }
        })
      });
    } catch (_) {}

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-5 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-slate-100">Google AI Studio (Gemini) Key</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3 text-xs">
          <div>
            <label className="text-slate-300 font-medium block mb-1">Google Gemini API Key</label>
            <input
              type="password"
              value={apiKeyInput}
              onChange={e => setApiKeyInput(e.target.value)}
              placeholder="Enter your Gemini API key..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500"
            />
            <div className="mt-1 flex items-center justify-between text-[11px]">
              <span className="text-slate-500">Saved securely in admin browser storage</span>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-emerald-400 hover:underline flex items-center gap-1"
              >
                <span>Get Free Key</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-slate-300 font-medium">Gemini AI Model</label>
              <span className="text-[10px] text-emerald-400 font-medium bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/40">
                100% Free Tier Compatible
              </span>
            </div>
            <select
              value={selectedPreset}
              onChange={e => setSelectedPreset(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="gemini-flash-latest">Gemini Flash (gemini-flash-latest — Recommended & Fastest)</option>
              <option value="gemini-2.5-flash">Gemini 2.5 Flash (gemini-2.5-flash — Stable Production)</option>
              <option value="gemini-3.8-flash">Gemini 3.8 Flash (gemini-3.8-flash — High Speed)</option>
              <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash Lite (gemini-3.1-flash-lite — Low Quota)</option>
              <option value="gemini-2.0-flash">Gemini 2.0 Flash (gemini-2.0-flash — Alternate Tier)</option>
              <option value="custom">Custom Model Name (Type manually)</option>
            </select>

            {selectedPreset === 'custom' && (
              <div className="mt-2">
                <input
                  type="text"
                  value={customModelInput}
                  onChange={e => setCustomModelInput(e.target.value)}
                  placeholder="e.g. gemini-flash-latest or gemini-3.7-flash..."
                  className="w-full bg-slate-950 border border-amber-600/50 rounded-lg px-3 py-2 text-xs text-amber-200 placeholder-slate-600 focus:outline-none focus:border-amber-400"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Specify any official Google AI Studio model identifier.
                </p>
              </div>
            )}
          </div>

          {/* Quota Switching Tip Box */}
          <div className="p-2.5 rounded-lg bg-blue-950/30 border border-blue-900/40 text-[11px] text-blue-300/90 space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-blue-200">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
              <span>Multi-Account & Model Rotation Architecture</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              If Google hits a daily quota limit or 503 spike on <strong className="text-slate-200">Gemini 3.8</strong>, simply switch model to <strong className="text-slate-200">Gemini 3.7</strong> or paste a new account API key above. No website restarts required!
            </p>
          </div>

          {testMessage && (
            <div
              className={`p-2.5 rounded-lg text-[11px] ${
                testStatus === 'success'
                  ? 'bg-emerald-950/40 border border-emerald-500/40 text-emerald-300'
                  : testStatus === 'error'
                  ? 'bg-red-950/40 border border-red-500/40 text-red-300'
                  : 'bg-slate-800 text-slate-300'
              }`}
            >
              <div className="flex items-center justify-between gap-1">
                <span>{testMessage}</span>
                {testLatency !== null && testStatus === 'success' && (
                  <span className="font-mono text-[10px] bg-emerald-900/60 px-1 py-0.5 rounded">
                    {testLatency}ms
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-800">
          <button
            onClick={handleTestKey}
            disabled={testStatus === 'testing'}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs transition flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${testStatus === 'testing' ? 'animate-spin' : ''}`} />
            <span>Test Connection</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition"
            >
              Save Configuration
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
