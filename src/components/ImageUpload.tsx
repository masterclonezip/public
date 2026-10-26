import React, { useRef, useState, useEffect } from 'react';
import { 
  UploadCloud, 
  Loader2, 
  Image as ImageIcon, 
  Settings, 
  Check, 
  AlertCircle, 
  Cloud, 
  X, 
  ExternalLink, 
  Copy, 
  Maximize2, 
  Sparkles,
  RefreshCw 
} from 'lucide-react';
import { adminFetch } from '../services/adminAuthService';
import { storage } from '../lib/firebase';
import { toast } from './Toast';

interface ImageUploadProps {
  format?: 'webp' | 'png';
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  name?: string;
  placeholder?: string;
  className?: string;
}

export interface CloudinaryConfig {
  cloud_name: string;
  api_key: string;
  api_secret: string;
  upload_preset: string;
}

export function getResolvedCloudinaryConfig(): CloudinaryConfig {
  let cached: any = {};
  try {
    const raw = localStorage.getItem('cached_cloudinary_config');
    if (raw) cached = JSON.parse(raw);
  } catch (_) {}

  const initialSettings = (globalThis as any)?.__INITIAL_DATA__?.settings || {};

  const cloud_name = (
    cached.cloud_name ||
    initialSettings.cloudinary_cloud_name ||
    (import.meta.env?.VITE_CLOUDINARY_CLOUD_NAME as string) ||
    ''
  ).trim();

  const api_key = (
    cached.api_key ||
    initialSettings.cloudinary_api_key ||
    (import.meta.env?.VITE_CLOUDINARY_API_KEY as string) ||
    ''
  ).trim();

  const api_secret = (
    cached.api_secret ||
    initialSettings.cloudinary_api_secret ||
    (import.meta.env?.VITE_CLOUDINARY_API_SECRET as string) ||
    ''
  ).trim();

  const upload_preset = (
    cached.upload_preset ||
    initialSettings.cloudinary_upload_preset ||
    (import.meta.env?.VITE_CLOUDINARY_UPLOAD_PRESET as string) ||
    ''
  ).trim();

  return { cloud_name, api_key, api_secret, upload_preset };
}

async function generateSha1(str: string): Promise<string> {
  const enc = new TextEncoder();
  const hash = await crypto.subtle.digest('SHA-1', enc.encode(str));
  return Array.from(new Uint8Array(hash)).map(v => v.toString(16).padStart(2, '0')).join('');
}

/**
 * Optimizes image for upload while strictly preserving natural aspect ratio 
 * and full clarity up to 2560px without destructive cropping or cut-off.
 */
async function compressImageForUpload(file: File, maxDim = 2560, quality = 0.90, targetFormat: 'webp' | 'png' = 'webp'): Promise<Blob> {
  return new Promise((resolve) => {
    const mimeType = targetFormat === 'png' ? 'image/png' : 'image/webp';
    // If image is already an optimized WebP or small PNG under 500KB matching requested format, keep untouched
    if (file.size < 500 * 1024 && (file.type === mimeType || (targetFormat === 'webp' && file.type === 'image/png'))) {
      resolve(file);
      return;
    }
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      
      // Only scale down if width or height exceeds maxDim, maintaining strict 100% aspect ratio
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }
      
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // High quality bicubic interpolation
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            resolve(blob || file);
          },
          mimeType,
          targetFormat === 'png' ? undefined : quality
        );
      } else {
        resolve(file);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };
    img.src = url;
  });
}

export default function ImageUpload({ format = 'webp', value, defaultValue, onChange, name, placeholder, className }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [convertingBase64, setConvertingBase64] = useState(false);
  const [internalValue, setInternalValue] = useState<string>(value !== undefined ? value : (defaultValue || ''));
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showFullPreview, setShowFullPreview] = useState(false);
  const [imgLoadError, setImgLoadError] = useState(false);
  const [imgDimensions, setImgDimensions] = useState<{ width: number; height: number } | null>(null);
  const [localCloudinaryConfig, setLocalCloudinaryConfig] = useState<CloudinaryConfig>(getResolvedCloudinaryConfig());
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (value !== undefined) {
      setInternalValue(value);
      setImgLoadError(false);
    } else if (defaultValue !== undefined) {
      setInternalValue(defaultValue || '');
      setImgLoadError(false);
    }
  }, [value, defaultValue]);

  const handleChange = (newVal: string) => {
    setInternalValue(newVal);
    setImgLoadError(false);
    if (onChange) {
      onChange(newVal);
    }
  };

  const handleSaveQuickConfig = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      localStorage.setItem('cached_cloudinary_config', JSON.stringify(localCloudinaryConfig));
      setShowConfigModal(false);
      toast('Cloudinary configuration updated! Direct uploads are now ready.', 'success');
    } catch (_) {
      toast('Failed to save configuration', 'error');
    }
  };

  // Convert an existing base64 string to a real Cloudinary CDN URL in 1 click
  const handleConvertBase64ToCdn = async () => {
    if (!internalValue || !internalValue.startsWith('data:image/')) return;
    setConvertingBase64(true);
    try {
      const res = await adminFetch('/api/v1/admin/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_base64: internalValue })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.secure_url) {
        handleChange(data.secure_url);
        toast('Base64 string successfully converted to Cloudinary CDN URL!', 'success');
      } else {
        throw new Error(data.error || 'Server conversion failed');
      }
    } catch (err: any) {
      toast(err.message || 'Failed to convert Base64 to Cloudinary', 'error');
    } finally {
      setConvertingBase64(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    let uploadedUrl = '';
    let lastError = '';

    const cfg = getResolvedCloudinaryConfig();

    try {
      // 1. Maintain full resolution & high quality (up to 2560px, no cut-off), preserving PNG when requested
      const uploadPayload = await compressImageForUpload(file, 2560, 0.92, format);

      // Tier 1: Direct Cloudinary Signed Upload
      if (cfg.cloud_name && cfg.api_key && cfg.api_secret) {
        try {
          const timestamp = Math.round(Date.now() / 1000);
          const folder = (import.meta.env?.VITE_CLOUDINARY_UPLOAD_PRESET as string) || 'uploads';
          const strToSign = `folder=${folder}&timestamp=${timestamp}${cfg.api_secret}`;
          const signature = await generateSha1(strToSign);

          const formData = new FormData();
          formData.append('file', uploadPayload, file.name || 'image.webp');
          formData.append('api_key', cfg.api_key);
          formData.append('timestamp', String(timestamp));
          formData.append('signature', signature);
          formData.append('folder', folder);

          const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
          const timeoutId = controller ? setTimeout(() => controller.abort(), 12000) : null;

          const cRes = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cfg.cloud_name)}/image/upload`, {
            method: 'POST',
            body: formData,
            signal: controller?.signal
          });
          if (timeoutId) clearTimeout(timeoutId);

          if (cRes.ok) {
            const cData = await cRes.json();
            if (cData.secure_url) {
              uploadedUrl = cData.secure_url;
            }
          } else {
            const errData = await cRes.json().catch(() => ({}));
            lastError = errData.error?.message || `Signed HTTP ${cRes.status}`;
          }
        } catch (cErr: any) {
          lastError = cErr?.message || 'Signed upload failed';
        }
      }

      // Tier 2: Server Backend Direct Upload (/api/v1/admin/upload) - Fully resilient proxy
      if (!uploadedUrl) {
        try {
          const reader = new FileReader();
          const base64Data = await new Promise<string>((resolve) => {
            reader.onloadend = () => resolve((reader.result as string) || '');
            reader.readAsDataURL(uploadPayload);
          });
          if (base64Data) {
            const sRes = await adminFetch('/api/v1/admin/upload', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ image_base64: base64Data })
            });
            if (sRes.ok) {
              const sData = await sRes.json();
              if (sData.status === 'OK' && sData.secure_url) {
                uploadedUrl = sData.secure_url;
              }
            } else {
              const sErr = await sRes.json().catch(() => ({}));
              lastError = sErr.error || `Server HTTP ${sRes.status}`;
            }
          }
        } catch (serverUploadErr: any) {
          console.warn('[ImageUpload] Server upload fallback error:', serverUploadErr);
          lastError = serverUploadErr?.message || 'Server upload failed';
        }
      }

      // Tier 3: Direct Cloudinary Unsigned Upload (trying configured preset + fallbacks)
      if (!uploadedUrl && cfg.cloud_name) {
        const presetsToTry = [cfg.upload_preset, 'uploads', 'ml_default', 'unsigned'].filter(Boolean);
        for (const preset of presetsToTry) {
          if (uploadedUrl) break;
          try {
            const formData = new FormData();
            formData.append('file', uploadPayload, file.name || 'image.webp');
            formData.append('upload_preset', preset!);

            const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
            const timeoutId = controller ? setTimeout(() => controller.abort(), 8000) : null;

            const cRes = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cfg.cloud_name)}/image/upload`, {
              method: 'POST',
              body: formData,
              signal: controller?.signal
            });
            if (timeoutId) clearTimeout(timeoutId);

            if (cRes.ok) {
              const cData = await cRes.json();
              if (cData.secure_url) {
                uploadedUrl = cData.secure_url;
              }
            }
          } catch (_) {}
        }
      }

      // Tier 4: Firebase Storage fallback if available
      if (!uploadedUrl && storage) {
        try {
          const storagePromise = (async () => {
            const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
            const cleanName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
            const storageRef = ref(storage, `uploads/${cleanName}`);
            const snap = await uploadBytes(storageRef, uploadPayload);
            return await getDownloadURL(snap.ref);
          })();
          const timeoutPromise = new Promise<string>((_, reject) => 
            setTimeout(() => reject(new Error('Storage timeout')), 3000)
          );
          uploadedUrl = await Promise.race([storagePromise, timeoutPromise]);
        } catch (_) {}
      }

      if (!uploadedUrl) {
        const errorDetail = lastError ? `: ${lastError}` : '';
        toast(`Image upload failed${errorDetail}. Please check your Cloudinary settings.`, 'error');
        setShowConfigModal(true);
        return;
      }

      handleChange(uploadedUrl);
      if (uploadedUrl.startsWith('http')) {
        toast('Image uploaded to Cloudinary CDN successfully!', 'success');
      } else {
        toast('Image attached successfully!', 'success');
      }

    } catch (error: any) {
      console.error("Upload error:", error);
      toast(error.message || 'Image processing failed', 'error');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const hasImage = Boolean(internalValue && internalValue.trim().length > 0);
  const isBase64 = Boolean(internalValue && internalValue.trim().startsWith('data:image/'));
  const isCloudinary = Boolean(internalValue && internalValue.trim().includes('res.cloudinary.com'));

  return (
    <div className="space-y-1.5 w-full">
      <div className={`relative flex items-center w-full gap-2 ${className || ''}`}>
        {name && <input type="hidden" name={name} value={internalValue || ''} />}
        
        {/* Full-Fidelity Thumbnail Preview (Zero Cutoff, Click to Expand Full Size) */}
        {hasImage && (
          <button
            type="button"
            onClick={() => setShowFullPreview(true)}
            title="Click to view full-size image preview"
            className="shrink-0 w-9 sm:w-10 h-9 sm:h-10 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 flex items-center justify-center p-0.5 cursor-pointer hover:border-blue-500 hover:ring-2 hover:ring-blue-500/30 transition-all shadow-2xs group relative"
          >
            {!imgLoadError ? (
              <img 
                src={internalValue} 
                alt="Thumbnail Preview" 
                referrerPolicy="no-referrer"
                crossOrigin="anonymous"
                className="w-full h-full object-contain rounded-lg transition-transform group-hover:scale-105"
                onLoad={(e) => {
                  setImgLoadError(false);
                  const img = e.currentTarget;
                  setImgDimensions({ width: img.naturalWidth, height: img.naturalHeight });
                }}
                onError={() => {
                  setImgLoadError(true);
                }}
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800">
                <ImageIcon className="w-4 h-4" />
              </div>
            )}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-xl">
              <Maximize2 className="w-3.5 h-3.5 text-white" />
            </div>
          </button>
        )}

        <input
          type="text"
          value={internalValue || ''}
          onChange={(e) => handleChange(e.target.value)}
          className="flex-1 bg-transparent border-none outline-none focus:ring-0 px-3 py-2 text-[inherit] w-full min-w-0 font-mono text-xs"
          placeholder={placeholder || "https://res.cloudinary.com/veqj16xh/image/upload/..."}
        />

        <div className="shrink-0 flex items-center gap-1.5 pr-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleUpload}
            accept="image/*"
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center justify-center bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 px-3 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-70 disabled:cursor-not-allowed border border-blue-200 dark:border-blue-800 text-xs gap-1.5 cursor-pointer shadow-2xs"
            title="Upload image to Cloudinary CDN"
          >
            {uploading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Uploading...</span>
              </>
            ) : (
              <>
                <UploadCloud className="w-3.5 h-3.5" />
                <span>Upload</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setLocalCloudinaryConfig(getResolvedCloudinaryConfig());
              setShowConfigModal(true);
            }}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            title="Configure Cloudinary credentials"
          >
            <Cloud className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* URL Status Badges */}
      {isBase64 && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/50 text-[11px] text-amber-700 dark:text-amber-300">
          <span className="flex items-center gap-1.5 font-medium">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-500" />
            <span><strong>Base64 image detected</strong> (Not a Cloudinary URL).</span>
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleConvertBase64ToCdn}
              disabled={convertingBase64}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-600 hover:bg-amber-700 text-white font-semibold text-[10px] cursor-pointer shadow-2xs disabled:opacity-50"
            >
              {convertingBase64 ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
              <span>{convertingBase64 ? 'Converting...' : 'Convert to Cloudinary CDN'}</span>
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="underline font-semibold hover:text-amber-900 dark:hover:text-amber-100 cursor-pointer"
            >
              Re-upload
            </button>
          </div>
        </div>
      )}

      {isCloudinary && (
        <div className="flex items-center justify-between px-2 text-[10.5px]">
          <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
            <Check className="w-3 h-3 text-emerald-500" />
            <span>Cloudinary CDN URL (Optimized &amp; High-Speed)</span>
          </div>
          {imgDimensions && (
            <span className="text-slate-400 dark:text-slate-500 font-mono text-[10px]">
              {imgDimensions.width} × {imgDimensions.height} px
            </span>
          )}
        </div>
      )}

      {/* Full-Size Image Preview Modal (Zero Cutoff, 100% Native Aspect Ratio) */}
      {showFullPreview && hasImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setShowFullPreview(false)}
        >
          <div 
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-blue-500" />
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                  Full Image Preview
                </h4>
                {imgDimensions && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-mono font-medium">
                    {imgDimensions.width} × {imgDimensions.height} px
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(internalValue);
                    toast('Image URL copied to clipboard!', 'success');
                  }}
                  className="px-2.5 py-1 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg flex items-center gap-1 transition"
                  title="Copy URL"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy URL</span>
                </button>
                {internalValue.startsWith('http') && (
                  <a
                    href={internalValue}
                    target="_blank"
                    rel="noreferrer"
                    className="px-2.5 py-1 text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg flex items-center gap-1 transition font-medium"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open Original</span>
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setShowFullPreview(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body: True Aspect Ratio, Zero Cutoff Preview */}
            <div className="p-6 flex-1 flex items-center justify-center bg-slate-950/5 dark:bg-slate-950/40 overflow-auto min-h-[280px]">
              <img 
                src={internalValue} 
                alt="Full Image Preview" 
                referrerPolicy="no-referrer"
                crossOrigin="anonymous"
                className="max-w-full max-h-[72vh] object-contain rounded-xl shadow-lg border border-slate-200/50 dark:border-slate-800"
                onLoad={(e) => {
                  const img = e.currentTarget;
                  setImgDimensions({ width: img.naturalWidth, height: img.naturalHeight });
                }}
              />
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between text-xs">
              <span className="font-mono text-slate-500 dark:text-slate-400 truncate max-w-md">
                {internalValue}
              </span>
              <button
                type="button"
                onClick={() => setShowFullPreview(false)}
                className="px-4 py-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg font-medium cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Cloudinary Config Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 max-w-md w-full shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Cloud className="w-4 h-4 text-blue-500" />
                Cloudinary Upload Configuration
              </h4>
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Enter your Cloudinary credentials so uploads generate short, CDN-optimized WebP URLs instead of large base64 strings.
            </p>

            <form onSubmit={handleSaveQuickConfig} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Cloud Name</label>
                <input
                  type="text"
                  value={localCloudinaryConfig.cloud_name}
                  onChange={(e) => setLocalCloudinaryConfig({ ...localCloudinaryConfig, cloud_name: e.target.value })}
                  placeholder="e.g. veqj16xh"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 font-mono text-slate-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">API Key</label>
                <input
                  type="text"
                  value={localCloudinaryConfig.api_key}
                  onChange={(e) => setLocalCloudinaryConfig({ ...localCloudinaryConfig, api_key: e.target.value })}
                  placeholder="e.g. 883757976464181"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 font-mono text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">API Secret</label>
                <input
                  type="password"
                  value={localCloudinaryConfig.api_secret}
                  onChange={(e) => setLocalCloudinaryConfig({ ...localCloudinaryConfig, api_secret: e.target.value })}
                  placeholder="Enter API Secret"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 font-mono text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Upload Preset (Optional)</label>
                <input
                  type="text"
                  value={localCloudinaryConfig.upload_preset}
                  onChange={(e) => setLocalCloudinaryConfig({ ...localCloudinaryConfig, upload_preset: e.target.value })}
                  placeholder="e.g. uploads or ml_default"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 font-mono text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="px-3 py-1.5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-xs cursor-pointer"
                >
                  Save Credentials
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
