import React, { useState, useEffect } from 'react';
import { Save, ShieldCheck, KeyRound, Cloud, UploadCloud, CheckCircle2, AlertCircle, RefreshCw, Sparkles, Wifi } from 'lucide-react';
import ImageUpload from '../ImageUpload';
import { ensureDefaultSettings } from '../../lib/defaultLegalContent';
import { SeoFieldWithLimit } from './SeoFieldWithLimit';
import { toast } from '../Toast';
import { generateSha1 } from '../../lib/cryptoUtils';
import { getAllSiteIconUrls, getEnvLogoUrl, getEnvFaviconUrl } from '../../seo/utils';
import { loadStudioConfig, saveStudioConfig, normalizeClientModelId } from './aistudio/storage';
import { verifyStudioConnection } from './aistudio/geminiEngine';

interface AdminSettingsTabProps {
  settings: any;
  handleSaveSettings: (e: React.FormEvent) => void;
  saving: boolean;
}

export const AdminSettingsTab = React.memo(({ settings: rawSettings, handleSaveSettings, saving }: AdminSettingsTabProps) => {
  const settings = ensureDefaultSettings(rawSettings || {});
  const [testingCloudinary, setTestingCloudinary] = useState(false);
  const [cloudinaryTestResult, setCloudinaryTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [liveLogoUrl, setLiveLogoUrl] = useState<string>(() => settings.logo_url || settings.favicon_url || getEnvLogoUrl() || '');
  const [liveFaviconUrl, setLiveFaviconUrl] = useState<string>(() => settings.favicon_url || settings.logo_url || getEnvFaviconUrl() || '');

  // Unified Gemini Studio Key & Model state
  const [geminiKeyInput, setGeminiKeyInput] = useState<string>(() => {
    const cfg = loadStudioConfig(settings.gemini_api_key, settings.gemini_model);
    return cfg.apiKey || settings.gemini_api_key || '';
  });
  const [geminiModelInput, setGeminiModelInput] = useState<string>(() => {
    const cfg = loadStudioConfig(settings.gemini_api_key, settings.gemini_model);
    return normalizeClientModelId(cfg.model || settings.gemini_model || 'gemini-2.5-flash');
  });
  const [testingGemini, setTestingGemini] = useState(false);
  const [geminiTestResult, setGeminiTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  useEffect(() => {
    const handleSync = (e: Event) => {
      const evt = e as CustomEvent;
      if (evt.detail && typeof evt.detail === 'object') {
        if (typeof evt.detail.apiKey === 'string') setGeminiKeyInput(evt.detail.apiKey);
        if (evt.detail.model) setGeminiModelInput(normalizeClientModelId(evt.detail.model));
      }
    };
    window.addEventListener('aistudio-config-sync', handleSync);
    return () => window.removeEventListener('aistudio-config-sync', handleSync);
  }, []);

  const handleTestAndSaveGemini = async (e?: React.MouseEvent, overrideModel?: string) => {
    if (e) e.preventDefault();
    const cleanKey = geminiKeyInput.trim();
    const targetModel = normalizeClientModelId(overrideModel || geminiModelInput);

    const existingCfg = loadStudioConfig(cleanKey, targetModel);
    saveStudioConfig({
      ...existingCfg,
      apiKey: cleanKey,
      model: targetModel,
      updatedAt: Date.now()
    });

    setTestingGemini(true);
    setGeminiTestResult(null);

    const status = await verifyStudioConnection(cleanKey, targetModel, false);
    setTestingGemini(false);

    if (status.state === 'connected') {
      const finalModel = status.model || targetModel;
      setGeminiModelInput(finalModel);
      saveStudioConfig({
        ...existingCfg,
        apiKey: cleanKey,
        model: finalModel,
        updatedAt: Date.now()
      });
      const msg = `Connected to ${finalModel} in ${status.latencyMs || 1}ms (${
        status.keySource === 'server_env' ? 'Server Key' : status.keyMask || 'Verified Key'
      })${status.warningMessage ? ` — ${status.warningMessage}` : ''}`;
      setGeminiTestResult({ success: true, message: msg });
      toast(`Gemini connected: ${finalModel} (${status.latencyMs || 1}ms)`, 'success');
    } else {
      const errMsg = status.errorMessage || 'Please enter a valid Google AI Studio API key.';
      setGeminiTestResult({ success: false, message: errMsg });
      toast(errMsg, 'error');
    }
  };

  const previewIcons = getAllSiteIconUrls({
    ...settings,
    logo_url: liveLogoUrl,
    favicon_url: liveFaviconUrl || liveLogoUrl
  });

  const handleTestCloudinary = async (e: React.MouseEvent) => {
    e.preventDefault();
    const form = (e.target as HTMLElement).closest('form');
    if (!form) return;

    const cloudName = (form.querySelector('input[name="cloudinary_cloud_name"]') as HTMLInputElement)?.value?.trim();
    const apiKey = (form.querySelector('input[name="cloudinary_api_key"]') as HTMLInputElement)?.value?.trim();
    const apiSecret = (form.querySelector('input[name="cloudinary_api_secret"]') as HTMLInputElement)?.value?.trim();
    const uploadPreset = (form.querySelector('input[name="cloudinary_upload_preset"]') as HTMLInputElement)?.value?.trim();

    if (!cloudName) {
      toast('Please enter your Cloudinary Cloud Name.', 'error');
      return;
    }

    setTestingCloudinary(true);
    setCloudinaryTestResult(null);

    try {
      // Create a 1x1 transparent PNG blob for testing
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      const testBlob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
      if (!testBlob) throw new Error('Could not create test image payload');

      let verified = false;
      let successMsg = '';
      let lastErrMsg = '';

      // Test 1: Signed Upload Test (API Key + API Secret)
      if (apiKey && apiSecret) {
        try {
          const timestamp = Math.round(Date.now() / 1000);
          
          // Test with folder=uploads
          const strToSignWithFolder = `folder=uploads&timestamp=${timestamp}${apiSecret}`;
          const signatureWithFolder = await generateSha1(strToSignWithFolder);

          const formDataFolder = new FormData();
          formDataFolder.append('file', testBlob, 'test_ping.png');
          formDataFolder.append('api_key', apiKey);
          formDataFolder.append('timestamp', String(timestamp));
          formDataFolder.append('signature', signatureWithFolder);
          formDataFolder.append('folder', 'uploads');

          const resFolder = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image/upload`, {
            method: 'POST',
            body: formDataFolder
          });
          const dataFolder = await resFolder.json().catch(() => ({}));

          if (resFolder.ok && dataFolder.secure_url) {
            verified = true;
            successMsg = `Successfully connected to Cloudinary cloud "${cloudName}"! Signed uploads verified successfully.`;
          } else {
            // Test without folder
            const strToSign = `timestamp=${timestamp}${apiSecret}`;
            const signature = await generateSha1(strToSign);

            const formData = new FormData();
            formData.append('file', testBlob, 'test_ping.png');
            formData.append('api_key', apiKey);
            formData.append('timestamp', String(timestamp));
            formData.append('signature', signature);

            const res = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image/upload`, {
              method: 'POST',
              body: formData
            });
            const data = await res.json().catch(() => ({}));

            if (res.ok && data.secure_url) {
              verified = true;
              successMsg = `Successfully connected to Cloudinary cloud "${cloudName}"! Signed uploads verified successfully.`;
            } else {
              lastErrMsg = data.error?.message || dataFolder.error?.message || `Signed test returned HTTP ${res.status}`;
            }
          }
        } catch (signedErr: any) {
          lastErrMsg = signedErr?.message || 'Signed upload network error';
        }
      }

      // Test 2: Unsigned Upload Preset Test (try user preset, uploads, ml_default, or unsigned)
      const presetsToTry = [uploadPreset, 'uploads', 'ml_default', 'unsigned'].filter(Boolean);
      for (const preset of presetsToTry) {
        if (verified) break;
        try {
          const formData = new FormData();
          formData.append('file', testBlob, 'test_ping.png');
          formData.append('upload_preset', preset!);

          const res = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image/upload`, {
            method: 'POST',
            body: formData
          });
          const data = await res.json().catch(() => ({}));
          if (res.ok && data.secure_url) {
            verified = true;
            successMsg = `Successfully connected to Cloudinary cloud "${cloudName}"! Verified upload preset "${preset}".`;
          } else if (!lastErrMsg) {
            lastErrMsg = data.error?.message || `Preset test returned HTTP ${res.status}`;
          }
        } catch (presetErr: any) {
          if (!lastErrMsg) lastErrMsg = presetErr?.message || 'Preset upload network error';
        }
      }

      // Test 3: Backend Server Upload Endpoint Test
      if (!verified) {
        try {
          const idToken = (await (globalThis as any).firebaseAuthUser?.getIdToken?.()) || undefined;
          const sigRes = await fetch('/api/v1/admin/upload/signature', {
            headers: idToken ? { 'Authorization': `Bearer ${idToken}` } : {}
          });
          if (sigRes.ok) {
            const sigData = await sigRes.json();
            if (sigData.status === 'OK' && sigData.cloud_name) {
              verified = true;
              successMsg = `Server Cloudinary service is ready for cloud "${sigData.cloud_name}"!`;
            }
          }
        } catch (_) {}
      }

      if (verified) {
        setCloudinaryTestResult({ success: true, message: successMsg });
        toast('Cloudinary connection successful!', 'success');
        // Cache verified config in localStorage for immediate direct uploads
        try {
          localStorage.setItem('cached_cloudinary_config', JSON.stringify({
            cloud_name: cloudName,
            api_key: apiKey,
            api_secret: apiSecret,
            upload_preset: uploadPreset
          }));
        } catch (_) {}
        return;
      }

      if (lastErrMsg) {
        throw new Error(lastErrMsg);
      } else {
        throw new Error('Please provide either valid API Key & Secret or an Unsigned Upload Preset.');
      }
    } catch (err: any) {
      const displayErr = err?.message || 'Connection test failed';
      setCloudinaryTestResult({ success: false, message: displayErr });
      toast(`Cloudinary test failed: ${displayErr}`, 'error');
    } finally {
      setTestingCloudinary(false);
    }
  };
  return (
  <div className="animate-fade-in space-y-8">
    <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-6 rounded-2xl border border-black/10 dark:border-white/10 shadow-sm">
      <div>
        <h2 className="text-xl font-bold dark:text-white">Global Settings</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage global identity, content, and legal text.</p>
      </div>
    </div>
    <form
      key={settings.last_updated || (settings.privacy_content ? 'loaded' : 'unloaded') || settings.site_title || 'settings-form'}
      onSubmit={(e) => {
        const existingCfg = loadStudioConfig(geminiKeyInput, geminiModelInput);
        saveStudioConfig({
          ...existingCfg,
          apiKey: geminiKeyInput.trim(),
          model: normalizeClientModelId(geminiModelInput),
          updatedAt: Date.now()
        });
        handleSaveSettings(e);
      }}
      className="space-y-8"
    >
      
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
        <h3 className="font-bold text-sm text-slate-900 dark:text-white border-b border-black/5 dark:border-white/5 pb-2">Branding & Identity</h3>
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Site Title</label>
            <input type="text" name="site_title" defaultValue={settings.site_title} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-sm dark:text-white focus:ring-2 focus:ring-blue-500 transition-all" required />
          </div>
          <SeoFieldWithLimit
            label="Global SEO Title (Overrides Site Title in SERP)"
            name="seo_title"
            defaultValue={settings.seo_title || ''}
            maxChars={58}
            placeholder="e.g. Official Application Directory & Portal"
            helperText="Recommended: 50–58 characters for full visibility in Google SERP."
          />
          <SeoFieldWithLimit
            label="Global SEO Description"
            type="textarea"
            name="meta_description"
            defaultValue={settings.meta_description || ''}
            maxChars={155}
            rows={3}
            placeholder="e.g. Safe verification portal and transparent app directory for card and casual games..."
            helperText="Recommended: 130–155 characters for complete display in Google search."
          />
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Global SEO Keywords (Comma Separated)</label>
            <input type="text" name="seo_keywords" defaultValue={settings.seo_keywords} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-sm dark:text-white focus:ring-2 focus:ring-blue-500 transition-all" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Google Analytics ID</label>
            <input type="text" name="ga_tracking_id" defaultValue={settings.ga_tracking_id || settings.google_analytics_id} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-sm dark:text-white focus:ring-2 focus:ring-blue-500 transition-all" placeholder="G-XXXXXXXXXX" />
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/80 space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-900 dark:text-slate-100 mb-1">
                Main Logo URL (Website Header, Footer & Master Brand Icon)
              </label>
              <div className="text-[11px] text-slate-600 dark:text-slate-300 space-y-1 mb-3 bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700/60">
                <p><strong>Recommended Size:</strong> <span className="text-blue-600 dark:text-blue-400 font-semibold">512 × 512 px</span> (Square PNG with Transparent Background)</p>
                <p><strong>Dual Configuration Support:</strong> Upload here in Admin Settings <em>or</em> set <code className="px-1 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-[10px]">VITE_SITE_LOGO_URL</code> in Environment Variables.</p>
                <p><strong>Automatic Multi-Size Engine:</strong> If Favicon URL is left blank, this single logo automatically generates your Header Logo, Footer Logo, Google Search Result Icon (48×48, 96×96, 144×144, 512×512), Apple Touch Icon (180×180), and Android PWA Icons (192×192, 512×512).</p>
              </div>
              <ImageUpload
                name="logo_url"
                format="png"
                value={liveLogoUrl}
                onChange={(val) => {
                  setLiveLogoUrl(val);
                  if (!liveFaviconUrl) setLiveFaviconUrl(val);
                }}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm dark:text-white focus-within:ring-2 focus-within:ring-blue-500 overflow-hidden"
              />
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/80 space-y-3">
            <div>
              <div className="flex items-center justify-between gap-2 mb-1">
                <label className="block text-xs font-bold text-slate-900 dark:text-slate-100">
                  Favicon & Google Search Result Icon URL (Auto-Synced if Blank)
                </label>
                {liveLogoUrl && liveFaviconUrl !== liveLogoUrl && (
                  <button
                    type="button"
                    onClick={() => setLiveFaviconUrl(liveLogoUrl)}
                    className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                  >
                    Use Main Logo
                  </button>
                )}
              </div>
              <div className="text-[11px] text-slate-600 dark:text-slate-300 space-y-1 mb-3 bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700/60">
                <p><strong>Google Search Compliance:</strong> Automatically outputs <span className="text-emerald-600 dark:text-emerald-400 font-semibold">48×48, 96×96, 144×144, 192×192, and 512×512 px</span> PNG multiples required by Google Search Console & Organization Schema.</p>
                <p><strong>Browser & Mobile Compliance:</strong> Automatically outputs <span className="text-emerald-600 dark:text-emerald-400 font-semibold">16×16, 32×32</span> (Browser Tabs) and <span className="text-emerald-600 dark:text-emerald-400 font-semibold">180×180 px</span> (Apple iOS Touch Icon).</p>
              </div>
              <ImageUpload
                name="favicon_url"
                format="png"
                value={liveFaviconUrl}
                onChange={(val) => setLiveFaviconUrl(val)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm dark:text-white focus-within:ring-2 focus-within:ring-blue-500 overflow-hidden"
              />
            </div>
          </div>

          {(previewIcons.masterLogo || previewIcons.masterFavicon) && (
            <div className="sm:col-span-2 bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/50 rounded-xl p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    Automatic Multi-Size Logo & Google Search Icon Matrix (Active)
                  </span>
                </div>
                <span className="text-[11px] text-emerald-700 dark:text-emerald-300 font-medium">
                  Source: {(settings.logo_url || settings.favicon_url || liveLogoUrl) ? 'Admin Settings / Live Input' : 'Environment Variable (VITE_SITE_LOGO_URL)'}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
                <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center gap-2.5">
                  <img src={previewIcons.headerLogo || previewIcons.masterLogo || '/logo.png'} alt="Header Logo" className="w-9 h-9 object-contain rounded bg-slate-100 dark:bg-slate-800 p-1 shrink-0" />
                  <div className="min-w-0">
                    <div className="font-bold text-slate-800 dark:text-slate-200 truncate">Header & Footer</div>
                    <div className="text-[10px] text-slate-500">Auto-Fit 120px</div>
                  </div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center gap-2.5">
                  <img src={previewIcons.favicon48 || '/favicon.ico'} alt="Google Search 48x48" className="w-9 h-9 object-contain rounded bg-slate-100 dark:bg-slate-800 p-1 shrink-0" />
                  <div className="min-w-0">
                    <div className="font-bold text-slate-800 dark:text-slate-200 truncate">Google SERP Icon</div>
                    <div className="text-[10px] text-slate-500">48×48 & 96×96 PNG</div>
                  </div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center gap-2.5">
                  <img src={previewIcons.appleTouch180 || '/apple-touch-icon.png'} alt="Apple Touch 180x180" className="w-9 h-9 object-contain rounded bg-slate-100 dark:bg-slate-800 p-1 shrink-0" />
                  <div className="min-w-0">
                    <div className="font-bold text-slate-800 dark:text-slate-200 truncate">Apple & Android</div>
                    <div className="text-[10px] text-slate-500">180×180 & 192×192</div>
                  </div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center gap-2.5">
                  <img src={previewIcons.searchLogo512 || '/logo.png'} alt="Schema 512x512" className="w-9 h-9 object-contain rounded bg-slate-100 dark:bg-slate-800 p-1 shrink-0" />
                  <div className="min-w-0">
                    <div className="font-bold text-slate-800 dark:text-slate-200 truncate">Schema Organization</div>
                    <div className="text-[10px] text-slate-500">512×512 PNG</div>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Main Index Heading</label>
            <input type="text" name="secure_index_title" defaultValue={settings.secure_index_title ?? ''} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-sm dark:text-white focus:ring-2 focus:ring-blue-500 transition-all" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Main Index Subtitle</label>
            <input type="text" name="secure_index_subtitle" defaultValue={settings.secure_index_subtitle ?? ''} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-sm dark:text-white focus:ring-2 focus:ring-blue-500 transition-all" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Trending Searches (Comma Separated)</label>
            <input type="text" name="trending_searches" defaultValue={settings.trending_searches ? (Array.isArray(settings.trending_searches) ? settings.trending_searches.join(', ') : settings.trending_searches) : ''} placeholder="e.g. Action Games, Casual Apps, Tools" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-sm dark:text-white focus:ring-2 focus:ring-blue-500 transition-all" />
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
        <div>
          <h3 className="font-bold text-sm text-slate-900 dark:text-white border-b border-black/5 dark:border-white/5 pb-2">Static & Legal Pages SEO (Meta Titles & Descriptions)</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Configure distinct, high-ranking meta titles and descriptions for all static and legal pages. If left blank, clean defaults will be used.</p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2">
          {/* Disclaimer */}
          <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-3">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Disclaimer Page (/disclaimer)</h4>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">SEO Title</label>
              <input type="text" name="disclaimer_meta_title" defaultValue={settings.disclaimer_meta_title ?? ''} placeholder="Disclaimer" className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-xs dark:text-white focus:ring-2 focus:ring-blue-500 transition-all" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Meta Description</label>
              <textarea name="disclaimer_meta_description" rows={2} defaultValue={settings.disclaimer_meta_description ?? ''} placeholder="Official platform disclaimer regarding application listings and content..." className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-xs dark:text-white focus:ring-2 focus:ring-blue-500 transition-all"></textarea>
            </div>
          </div>

          {/* Ethics */}
          <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-3">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Ethics & Safety Page (/ethics)</h4>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">SEO Title</label>
              <input type="text" name="ethics_meta_title" defaultValue={settings.ethics_meta_title ?? ''} placeholder="Ethics & Safety" className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-xs dark:text-white focus:ring-2 focus:ring-blue-500 transition-all" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Meta Description</label>
              <textarea name="ethics_meta_description" rows={2} defaultValue={settings.ethics_meta_description ?? ''} placeholder="Our commitment to ethical gaming evaluation, player security, and unbiased reviews..." className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-xs dark:text-white focus:ring-2 focus:ring-blue-500 transition-all"></textarea>
            </div>
          </div>

          {/* About Us */}
          <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-3">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">About Us Page (/about)</h4>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">SEO Title</label>
              <input type="text" name="about_meta_title" defaultValue={settings.about_meta_title ?? ''} placeholder="About Us" className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-xs dark:text-white focus:ring-2 focus:ring-blue-500 transition-all" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Meta Description</label>
              <textarea name="about_meta_description" rows={2} defaultValue={settings.about_meta_description ?? ''} placeholder="Learn more about our platform mission, safe verification frameworks, and transparency..." className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-xs dark:text-white focus:ring-2 focus:ring-blue-500 transition-all"></textarea>
            </div>
          </div>

          {/* Contact */}
          <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-3">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Contact Page (/contact)</h4>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">SEO Title</label>
              <input type="text" name="contact_meta_title" defaultValue={settings.contact_meta_title ?? ''} placeholder="Contact Us" className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-xs dark:text-white focus:ring-2 focus:ring-blue-500 transition-all" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Meta Description</label>
              <textarea name="contact_meta_description" rows={2} defaultValue={settings.contact_meta_description ?? ''} placeholder="Get in touch with our helpdesk team. Submit your inquiries, suggestions, or feedback securely..." className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-xs dark:text-white focus:ring-2 focus:ring-blue-500 transition-all"></textarea>
            </div>
          </div>

          {/* Privacy Policy */}
          <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-3">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Privacy Policy Page (/privacy)</h4>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">SEO Title</label>
              <input type="text" name="privacy_meta_title" defaultValue={settings.privacy_meta_title ?? ''} placeholder="Privacy Policy" className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-xs dark:text-white focus:ring-2 focus:ring-blue-500 transition-all" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Meta Description</label>
              <textarea name="privacy_meta_description" rows={2} defaultValue={settings.privacy_meta_description ?? ''} placeholder="Our official privacy guidelines explaining cookie protection, device logs, and storage security..." className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-xs dark:text-white focus:ring-2 focus:ring-blue-500 transition-all"></textarea>
            </div>
          </div>

          {/* Terms */}
          <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-3">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Terms of Service Page (/terms)</h4>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">SEO Title</label>
              <input type="text" name="terms_meta_title" defaultValue={settings.terms_meta_title ?? ''} placeholder="Terms & Conditions" className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-xs dark:text-white focus:ring-2 focus:ring-blue-500 transition-all" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Meta Description</label>
              <textarea name="terms_meta_description" rows={2} defaultValue={settings.terms_meta_description ?? ''} placeholder="Official user agreement protocols, cookies consent directives, and listing guidelines..." className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-xs dark:text-white focus:ring-2 focus:ring-blue-500 transition-all"></textarea>
            </div>
          </div>

          {/* Responsibility */}
          <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-3">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Responsibility & Safety (/responsibility)</h4>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">SEO Title</label>
              <input type="text" name="responsibility_meta_title" defaultValue={settings.responsibility_meta_title ?? ''} placeholder="Responsible Gaming" className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-xs dark:text-white focus:ring-2 focus:ring-blue-500 transition-all" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Meta Description</label>
              <textarea name="responsibility_meta_description" rows={2} defaultValue={settings.responsibility_meta_description ?? ''} placeholder="Official safety guidelines advising users on secure gaming techniques and safety benchmarks..." className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-xs dark:text-white focus:ring-2 focus:ring-blue-500 transition-all"></textarea>
            </div>
          </div>

          {/* Report & Removal */}
          <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-3">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Report & Removal Policy (/report-removal)</h4>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">SEO Title</label>
              <input type="text" name="report_removal_meta_title" defaultValue={settings.report_removal_meta_title ?? ''} placeholder="Report & Removal Policy" className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-xs dark:text-white focus:ring-2 focus:ring-blue-500 transition-all" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Meta Description</label>
              <textarea name="report_removal_meta_description" rows={2} defaultValue={settings.report_removal_meta_description ?? ''} placeholder="Our official report and removal policy regarding intellectual property and DMCA content guidelines..." className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-xs dark:text-white focus:ring-2 focus:ring-blue-500 transition-all"></textarea>
            </div>
          </div>

          {/* Legal Notice */}
          <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-3">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Legal Notice Page (/notice)</h4>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">SEO Title</label>
              <input type="text" name="notice_meta_title" defaultValue={settings.notice_meta_title ?? ''} placeholder="Legal Notice" className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-xs dark:text-white focus:ring-2 focus:ring-blue-500 transition-all" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Meta Description</label>
              <textarea name="notice_meta_description" rows={2} defaultValue={settings.notice_meta_description ?? ''} placeholder="Official notices, critical safety parameters, and legal transparency alerts..." className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-xs dark:text-white focus:ring-2 focus:ring-blue-500 transition-all"></textarea>
            </div>
          </div>

          {/* Developers Directory */}
          <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-3">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Developers Directory (/developers)</h4>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">SEO Title</label>
              <input type="text" name="developers_meta_title" defaultValue={settings.developers_meta_title ?? ''} placeholder="Developer Profiles" className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-xs dark:text-white focus:ring-2 focus:ring-blue-500 transition-all" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Meta Description</label>
              <textarea name="developers_meta_description" rows={2} defaultValue={settings.developers_meta_description ?? ''} placeholder="Meet the talented engineering teams developing high-performance secure platforms..." className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-xs dark:text-white focus:ring-2 focus:ring-blue-500 transition-all"></textarea>
            </div>
          </div>

          {/* News Index */}
          <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-3">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">News Index (/news)</h4>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">SEO Title</label>
              <input type="text" name="news_meta_title" defaultValue={settings.news_meta_title ?? ''} placeholder="News & Updates" className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-xs dark:text-white focus:ring-2 focus:ring-blue-500 transition-all" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Meta Description</label>
              <textarea name="news_meta_description" rows={2} defaultValue={settings.news_meta_description ?? ''} placeholder="Stay updated with the latest news, transmissions, and intel from our secure network..." className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-xs dark:text-white focus:ring-2 focus:ring-blue-500 transition-all"></textarea>
            </div>
          </div>

          {/* Videos Index */}
          <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-3">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Videos Index (/videos)</h4>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">SEO Title</label>
              <input type="text" name="videos_meta_title" defaultValue={settings.videos_meta_title ?? ''} placeholder="Video Reviews" className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-xs dark:text-white focus:ring-2 focus:ring-blue-500 transition-all" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Meta Description</label>
              <textarea name="videos_meta_description" rows={2} defaultValue={settings.videos_meta_description ?? ''} placeholder="Watch high-quality video walkthroughs and tutorials of our catalog applications..." className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-xs dark:text-white focus:ring-2 focus:ring-blue-500 transition-all"></textarea>
            </div>
          </div>

          {/* New Apps Directory */}
          <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-3">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">New Apps Directory (/new-apps)</h4>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">SEO Title</label>
              <input type="text" name="new_apps_meta_title" defaultValue={(settings as any).new_apps_meta_title ?? ''} placeholder="New Apps & Latest Releases" className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-xs dark:text-white focus:ring-2 focus:ring-blue-500 transition-all" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Meta Description</label>
              <textarea name="new_apps_meta_description" rows={2} defaultValue={(settings as any).new_apps_meta_description ?? ''} placeholder="Explore the newest released applications with verified ratings..." className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-xs dark:text-white focus:ring-2 focus:ring-blue-500 transition-all"></textarea>
            </div>
          </div>

          {/* Categories Directory */}
          <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-3">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Categories Directory (/categories)</h4>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">SEO Title</label>
              <input type="text" name="categories_meta_title" defaultValue={(settings as any).categories_meta_title ?? ''} placeholder="App Categories & Genres" className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-xs dark:text-white focus:ring-2 focus:ring-blue-500 transition-all" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Meta Description</label>
              <textarea name="categories_meta_description" rows={2} defaultValue={(settings as any).categories_meta_description ?? ''} placeholder="Browse all gaming and entertainment application categories..." className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-xs dark:text-white focus:ring-2 focus:ring-blue-500 transition-all"></textarea>
            </div>
          </div>

          {/* FAQ Page */}
          <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-3">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">FAQ Page (/faq)</h4>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">SEO Title</label>
              <input type="text" name="faq_meta_title" defaultValue={settings.faq_meta_title ?? ''} placeholder="Frequently Asked Questions" className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-xs dark:text-white focus:ring-2 focus:ring-blue-500 transition-all" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Meta Description</label>
              <textarea name="faq_meta_description" rows={2} defaultValue={settings.faq_meta_description ?? ''} placeholder="Answers to frequently asked questions about app verification and downloads..." className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-xs dark:text-white focus:ring-2 focus:ring-blue-500 transition-all"></textarea>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
        <h3 className="font-bold text-sm text-slate-900 dark:text-white border-b border-black/5 dark:border-white/5 pb-2">Legal Content</h3>
        <div className="grid gap-6">
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">About Us Page Content (HTML)</label>
            <textarea name="about_content" rows={12} defaultValue={settings.about_content} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-xs font-mono dark:text-slate-300 focus:ring-2 focus:ring-blue-500 transition-all"></textarea>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Privacy Policy Body (HTML)</label>
            <textarea name="privacy_content" rows={12} defaultValue={settings.privacy_content} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-xs font-mono dark:text-slate-300 focus:ring-2 focus:ring-blue-500 transition-all"></textarea>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Terms & Conditions Body (HTML)</label>
            <textarea name="terms_content" rows={12} defaultValue={settings.terms_content} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-xs font-mono dark:text-slate-300 focus:ring-2 focus:ring-blue-500 transition-all"></textarea>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Platform Responsibility Clause (HTML)</label>
            <textarea name="responsibility_content" rows={12} defaultValue={settings.responsibility_content} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-xs font-mono dark:text-slate-300 focus:ring-2 focus:ring-blue-500 transition-all" placeholder="<p>Our commitment to user safety...</p>"></textarea>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Report & Removal Policy Body (HTML)</label>
            <textarea name="report_removal_content" rows={12} defaultValue={settings.report_removal_content} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-xs font-mono dark:text-slate-300 focus:ring-2 focus:ring-blue-500 transition-all" placeholder="<h2>1. Overview</h2>..."></textarea>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
        <h3 className="font-bold text-sm text-slate-900 dark:text-white border-b border-black/5 dark:border-white/5 pb-2">App Store & Disclaimers</h3>
        <div className="grid gap-6">
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Portal Main Heading</label>
            <input type="text" name="portal_heading" defaultValue={settings.portal_heading} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-sm dark:text-white focus:ring-2 focus:ring-blue-500 transition-all" />
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Disclaimer Heading</label>
              <input type="text" name="disclaimer_heading" defaultValue={settings.disclaimer_heading} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-sm dark:text-white focus:ring-2 focus:ring-blue-500 transition-all" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Ethics Heading</label>
              <input type="text" name="ethics_heading" defaultValue={settings.ethics_heading} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-sm dark:text-white focus:ring-2 focus:ring-blue-500 transition-all" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Disclaimer Text (HTML supported)</label>
            <textarea name="disclaimer_text" rows={3} defaultValue={settings.disclaimer_text} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-sm dark:text-white focus:ring-2 focus:ring-blue-500 transition-all"></textarea>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Ethics Text (HTML supported)</label>
            <textarea name="ethics_discrimination_text" rows={3} defaultValue={settings.ethics_discrimination_text} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-sm dark:text-white focus:ring-2 focus:ring-blue-500 transition-all"></textarea>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Important Notice Heading (More Details Page)</label>
            <input type="text" name="important_notice_heading" defaultValue={settings.important_notice_heading} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-sm dark:text-white focus:ring-2 focus:ring-blue-500 transition-all" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Important Notice Content</label>
            <textarea name="important_notice" rows={2} defaultValue={settings.important_notice} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-sm dark:text-white focus:ring-2 focus:ring-blue-500 transition-all"></textarea>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
        <h3 className="font-bold text-sm text-slate-900 dark:text-white border-b border-black/5 dark:border-white/5 pb-2">Custom Website Title Banner</h3>
        <div className="grid gap-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Enable Title Banner</label>
              <select name="hero_title_visible" defaultValue={settings.hero_title_visible !== false ? 'true' : 'false'} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-sm dark:text-white focus:ring-2 focus:ring-blue-500 transition-all">
                <option value="true">Show Hero Banner</option>
                <option value="false">Hide Hero Banner</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Banner Writing Style (Font Concept)</label>
              <select name="hero_title_style" defaultValue={settings.hero_title_style || 'modern'} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-sm dark:text-white focus:ring-2 focus:ring-blue-500 transition-all">
                <option value="modern">Modern Display (Space Grotesk - Extra Black)</option>
                <option value="serif">Elegant Editorial (Playfair - High Contrast)</option>
                <option value="mono">Cyber Industrial (JetBrains Mono - Tech Accent)</option>
                <option value="elegant">Neo-Minimal (Inter - Balanced Sans-Serif)</option>
              </select>
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Gradient Color Palette</label>
              <select name="hero_title_color" defaultValue={settings.hero_title_color || 'classic-dark'} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-sm dark:text-white focus:ring-2 focus:ring-blue-500 transition-all">
                <option value="classic-dark">Classic High-Contrast</option>
                <option value="emerald-indigo">Emerald To Indigo</option>
                <option value="neon-sky">Neon Sky</option>
                <option value="sunset-fire">Sunset Fire</option>
                <option value="cosmic-purple">Nebula Pink</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Animation Design</label>
              <select name="hero_title_animation" defaultValue={settings.hero_title_animation || 'fade-in'} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-sm dark:text-white focus:ring-2 focus:ring-blue-500 transition-all">
                <option value="fade-in">Fade In (Smooth Dissolve)</option>
                <option value="slide-up" className="dark:bg-zinc-900">Slide Up (Sleek Bottom-Up Gliding)</option>
                <option value="bounce-in" className="dark:bg-zinc-900">Bounce Zoom (Snapping Elastic Expansion)</option>
                <option value="zoom-out" className="dark:bg-zinc-900">Cinematic Zoom Out (Slow Depth Entrance)</option>
                <option value="glow-pulse" className="dark:bg-zinc-900">Pulse Glow (Ethereal Periodic Illumination)</option>
                <option value="none" className="dark:bg-zinc-900">No Animation (Static Plain Render)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Hero Banner Writing Text (Title)</label>
            <input type="text" name="hero_title_text" defaultValue={settings.hero_title_text ?? ''} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-sm dark:text-white focus:ring-2 focus:ring-blue-500 transition-all" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Hero Tagline / Subtitle</label>
            <input type="text" name="hero_title_subtitle" defaultValue={settings.hero_title_subtitle ?? ''} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-sm dark:text-white focus:ring-2 focus:ring-blue-500 transition-all" />
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
        <h3 className="font-bold text-sm text-slate-900 dark:text-white border-b border-black/5 dark:border-white/5 pb-2">Support & Ticker</h3>
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Announcement Ticker Text</label>
            <input type="text" name="ticker_text" defaultValue={settings.ticker_text} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-sm dark:text-white focus:ring-2 focus:ring-blue-500 transition-all" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Support Email</label>
            <input type="email" name="support_email" defaultValue={settings.support_email} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-sm dark:text-white focus:ring-2 focus:ring-blue-500 transition-all" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Telegram Link</label>
            <input type="text" name="helpline_telegram" defaultValue={settings.helpline_telegram} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-sm dark:text-white focus:ring-2 focus:ring-blue-500 transition-all" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">WhatsApp Link</label>
            <input type="text" name="helpline_whatsapp" defaultValue={settings.helpline_whatsapp} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-sm dark:text-white focus:ring-2 focus:ring-blue-500 transition-all" />
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
        <div className="flex items-center gap-2 border-b border-black/5 dark:border-white/5 pb-2">
          <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">Cloudflare Turnstile Anti-Bot Security Keys</h3>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          Configure custom Cloudflare Turnstile credentials. The <strong>Site Key</strong> is public and loaded by the browser widget. The <strong>Secret Key</strong> is strictly kept on the server for back-channel validation. If left blank, the system automatically uses environment variables or high-availability defaults.
        </p>
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-blue-500" />
              Turnstile Site Key (Public)
            </label>
            <input 
              type="text" 
              name="turnstile_site_key" 
              defaultValue={settings.turnstile_site_key || ''} 
              placeholder="0x4AAAAAAAx..." 
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-sm font-mono dark:text-white focus:ring-2 focus:ring-blue-500 transition-all" 
            />
            <span className="text-[11px] text-slate-400 mt-1 block">Used by the client-side Cloudflare Turnstile widget.</span>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              Turnstile Secret Key (Private / Server-Only)
            </label>
            <input 
              type="password" 
              name="turnstile_secret_key" 
              defaultValue={settings.turnstile_secret_key || ''} 
              placeholder="0x4AAAAAAAx... (Kept on server)" 
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-sm font-mono dark:text-white focus:ring-2 focus:ring-blue-500 transition-all" 
            />
            <span className="text-[11px] text-slate-400 mt-1 block">Validated by the backend server to block fake or spoofed tokens.</span>
          </div>
        </div>
      </div>

      {/* Cloudinary Media Storage & Image CDN */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-black/5 dark:border-white/5 pb-3">
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <span className="p-1.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg">
                <Cloud className="w-4 h-4" />
              </span>
              Cloudinary Media Storage & Image CDN
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Produces short, blazing-fast, auto-optimized WebP URLs (<code className="text-blue-600 dark:text-blue-400 font-mono text-[11px]">https://res.cloudinary.com/...</code>) for app icons, screenshots, and news. Prevents long base64 strings.
            </p>
          </div>
          <button
            type="button"
            onClick={handleTestCloudinary}
            disabled={testingCloudinary}
            className="px-4 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 border border-blue-200 dark:border-blue-800 rounded-xl text-xs font-bold transition flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
          >
            {testingCloudinary ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <UploadCloud className="w-3.5 h-3.5" />}
            {testingCloudinary ? 'Testing...' : 'Test Cloudinary Connection'}
          </button>
        </div>

        {cloudinaryTestResult && (
          <div className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
            cloudinaryTestResult.success 
              ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/50 text-emerald-800 dark:text-emerald-300' 
              : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/50 text-rose-800 dark:text-rose-300'
          }`}>
            {cloudinaryTestResult.success ? <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500 mt-0.5" /> : <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />}
            <span className="leading-relaxed">{cloudinaryTestResult.message}</span>
          </div>
        )}

        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Cloudinary Cloud Name
            </label>
            <input 
              type="text" 
              name="cloudinary_cloud_name" 
              defaultValue={settings.cloudinary_cloud_name || ''} 
              placeholder="Enter your Cloudinary Cloud Name" 
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-sm font-mono dark:text-white focus:ring-2 focus:ring-blue-500 transition-all" 
            />
            <span className="text-[11px] text-slate-400 mt-1 block">Your Cloudinary account cloud name (found in your Cloudinary Dashboard).</span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Cloudinary API Key
            </label>
            <input 
              type="text" 
              name="cloudinary_api_key" 
              defaultValue={settings.cloudinary_api_key || ''} 
              placeholder="Enter your Cloudinary API Key" 
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-sm font-mono dark:text-white focus:ring-2 focus:ring-blue-500 transition-all" 
            />
            <span className="text-[11px] text-slate-400 mt-1 block">Used for direct high-speed client and server uploads.</span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Cloudinary API Secret
            </label>
            <input 
              type="password" 
              name="cloudinary_api_secret" 
              defaultValue={settings.cloudinary_api_secret || ''} 
              placeholder="Enter your Cloudinary API Secret" 
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-sm font-mono dark:text-white focus:ring-2 focus:ring-blue-500 transition-all" 
            />
            <span className="text-[11px] text-slate-400 mt-1 block">Stored securely in your encrypted settings. Never exposed to public users.</span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Upload Preset (Optional for Unsigned Uploads)
            </label>
            <input 
              type="text" 
              name="cloudinary_upload_preset" 
              defaultValue={settings.cloudinary_upload_preset || ''} 
              placeholder="e.g. uploads or ml_default" 
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-sm font-mono dark:text-white focus:ring-2 focus:ring-blue-500 transition-all" 
            />
            <span className="text-[11px] text-slate-400 mt-1 block">Optional unsigned preset configured in Cloudinary Settings -&gt; Upload.</span>
          </div>
        </div>
      </div>

      {/* Google AI Studio & Gemini Configuration */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-black/5 dark:border-white/5 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">Google AI Studio &amp; Gemini Key</h3>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium border border-amber-500/20">
              Instant Sync with AI Review Studio
            </span>
          </div>
          <button
            type="button"
            onClick={(e) => handleTestAndSaveGemini(e)}
            disabled={testingGemini}
            className="px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold transition flex items-center gap-1.5 self-start sm:self-auto cursor-pointer disabled:opacity-50"
          >
            {testingGemini ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Wifi className="w-3.5 h-3.5" />}
            {testingGemini ? 'Connecting...' : 'Test & Save Gemini Key'}
          </button>
        </div>

        {geminiTestResult && (
          <div
            className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
              geminiTestResult.success
                ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/50 text-emerald-800 dark:text-emerald-300'
                : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/50 text-rose-800 dark:text-rose-300'
            }`}
          >
            {geminiTestResult.success ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
            )}
            <span className="leading-relaxed font-medium">{geminiTestResult.message}</span>
          </div>
        )}

        <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-400 space-y-1">
          <p className="font-semibold text-slate-800 dark:text-slate-200">How to use your Gemini API Key:</p>
          <p>1. Get your 100% free Gemini API key from <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-blue-600 dark:text-blue-400 underline font-medium">Google AI Studio</a>.</p>
          <p>2. Paste it below and click <strong>Test &amp; Save Gemini Key</strong> — it connects in milliseconds and automatically syncs with the <strong>AI Reviews</strong> tab.</p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Google Gemini API Key
            </label>
            <input 
              type="password" 
              name="gemini_api_key" 
              value={geminiKeyInput}
              onChange={(e) => {
                const val = e.target.value;
                setGeminiKeyInput(val);
                const existingCfg = loadStudioConfig(val, geminiModelInput);
                saveStudioConfig({
                  ...existingCfg,
                  apiKey: val.trim(),
                  model: geminiModelInput,
                  updatedAt: Date.now()
                });
              }}
              placeholder="AIzaSy... (Paste your Gemini API Key)" 
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-sm font-mono dark:text-white focus:ring-2 focus:ring-amber-500 transition-all" 
            />
            <span className="text-[11px] text-slate-400 mt-1 block">Private key stored securely in your admin settings. Never exposed in public git commits.</span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Active Gemini Model
            </label>
            <select
              name="gemini_model"
              value={geminiModelInput}
              onChange={(e) => {
                const nextModel = normalizeClientModelId(e.target.value);
                setGeminiModelInput(nextModel);
                handleTestAndSaveGemini(undefined, nextModel);
              }}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-sm dark:text-white focus:ring-2 focus:ring-amber-500 transition-all"
            >
              <option value="gemini-2.5-flash">Gemini 2.5 Flash (Fastest &amp; Reliable Free Tier — Recommended)</option>
              <option value="gemini-3-flash-preview">Gemini 3 Flash Preview (Next-Gen Crowd Psychology)</option>
              <option value="gemini-2.5-flash-lite">Gemini 2.5 Flash-Lite (Ultra-High Free Quota / Fast Batch)</option>
              <option value="gemini-3.1-flash-lite-preview">Gemini 3.1 Flash-Lite Preview (Next-Gen High Volume)</option>
              <option value="gemini-2.5-pro">Gemini 2.5 Pro (Deep Analytical &amp; Strategy)</option>
              <option value="gemini-flash-latest">Gemini Flash Latest (Auto-Updated Alias)</option>
            </select>
            <span className="text-[11px] text-slate-400 mt-1 block">Switching models here immediately updates the AI Review Studio &amp; Backend.</span>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
        <h3 className="font-bold text-sm text-slate-900 dark:text-white border-b border-black/5 dark:border-white/5 pb-2">Social Media Links</h3>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Facebook URL</label>
            <input type="text" name="social_facebook" defaultValue={settings.social_links?.facebook} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-sm dark:text-white focus:ring-2 focus:ring-blue-500 transition-all" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Instagram URL</label>
            <input type="text" name="social_instagram" defaultValue={settings.social_links?.instagram} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-sm dark:text-white focus:ring-2 focus:ring-blue-500 transition-all" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Twitter / X URL</label>
            <input type="text" name="social_twitter" defaultValue={settings.social_links?.twitter} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-sm dark:text-white focus:ring-2 focus:ring-blue-500 transition-all" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">LinkedIn URL</label>
            <input type="text" name="social_linkedin" defaultValue={settings.social_links?.linkedin} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-sm dark:text-white focus:ring-2 focus:ring-blue-500 transition-all" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">YouTube URL</label>
            <input type="text" name="social_youtube" defaultValue={settings.social_links?.youtube} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-sm dark:text-white focus:ring-2 focus:ring-blue-500 transition-all" />
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold transition-all flex items-center gap-2 shadow-sm disabled:opacity-50">
          {saving ? 'Saving...' : <><Save className="w-5 h-5"/> Save Settings</>}
        </button>
      </div>
    </form>
  </div>
  );
});

AdminSettingsTab.displayName = 'AdminSettingsTab';

export default AdminSettingsTab;
