import React, { useState, useEffect } from 'react';
import { Shield, CheckCircle2, AlertTriangle, Key, Loader2, Copy, Check } from 'lucide-react';
import { adminFetch } from '../services/adminAuthService';

export default function SecurityTab() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [tempSecret, setTempSecret] = useState('');
  const [qrCodeUri, setQrCodeUri] = useState('');
  const [code, setCode] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [showDisableVerify, setShowDisableVerify] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetch2FAConfig = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await adminFetch('/api/v1/admin/2fa/config');
      if (!res.ok) {
        throw new Error(await res.text() || 'Failed to fetch 2FA configuration.');
      }
      const data = await res.json();
      setEnabled(data.enabled);
      if (!data.enabled) {
        setTempSecret(data.tempSecret || '');
        setQrCodeUri(data.qrCodeUri || '');
      }
    } catch (err: any) {
      setError(err.message || 'Unable to connect to security configuration API.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch2FAConfig();
  }, []);

  const handleCopySecret = () => {
    navigator.clipboard.writeText(tempSecret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleEnable2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || code.trim().length !== 6) {
      setError('Please enter a valid 6-digit verification code.');
      return;
    }
    try {
      setSubmitting(true);
      setError('');
      setSuccess('');
      const res = await adminFetch('/api/v1/admin/2fa/enable', {
        method: 'POST',
        body: JSON.stringify({ secret: tempSecret, code: code.trim() }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to verify verification code.');
      }
      setSuccess('MFA PROTECTION SHIELD ACTIVE: Your administrative portal is now fortified.');
      setEnabled(true);
      setCode('');
    } catch (err: any) {
      setError(err.message || 'MFA validation failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDisable2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disableCode || disableCode.trim().length !== 6) {
      setError('Please enter your current 6-digit verification code to confirm.');
      return;
    }
    try {
      setSubmitting(true);
      setError('');
      setSuccess('');
      const res = await adminFetch('/api/v1/admin/2fa/disable', {
        method: 'POST',
        body: JSON.stringify({ code: disableCode.trim() }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Deactivation failed.');
      }
      setSuccess('MFA DEACTIVATED: Admin login has reverted to single-factor password-only security.');
      setEnabled(false);
      setDisableCode('');
      setShowDisableVerify(false);
      // Refresh config to get a new secret and QR code URI
      await fetch2FAConfig();
    } catch (err: any) {
      setError(err.message || 'MFA deactivation code invalid.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-pink-500" />
        <p className="text-slate-400 font-bold text-xs uppercase tracking-widest italic animate-pulse">
          Decrypting Security Vault...
        </p>
      </div>
    );
  }

  const qrImageUrl = qrCodeUri
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrCodeUri)}`
    : '';

  return (
    <div className="space-y-6">
      {/* Tab Header */}
      <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
        <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tighter italic">
          Admin Portal Security
        </h2>
        <p className="text-xs text-slate-500 mt-1 uppercase font-semibold tracking-wider">
          Establish multi-factor cryptographic authentication barriers to secure the administrative controls.
        </p>
      </div>

      {/* Alert Messages */}
      {error && (
        <div className="bg-rose-500/10 border-2 border-rose-500/20 text-rose-600 dark:text-rose-400 p-4 rounded-xl flex items-start space-x-3 text-xs font-bold uppercase tracking-wide">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>{error}</div>
        </div>
      )}

      {success && (
        <div className="bg-emerald-500/10 border-2 border-emerald-500/20 text-emerald-600 dark:text-emerald-400 p-4 rounded-xl flex items-start space-x-3 text-xs font-bold uppercase tracking-wide">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>{success}</div>
        </div>
      )}

      {/* Status Panel */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-1 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800/60 rounded-2xl p-5 flex flex-col items-center justify-center text-center space-y-4">
          <div className={`p-4 rounded-full transition-colors ${enabled ? 'bg-emerald-500/15 text-emerald-500' : 'bg-amber-500/15 text-amber-500'}`}>
            <Shield className="w-12 h-12" />
          </div>
          <div>
            <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${
              enabled ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
            }`}>
              {enabled ? 'Protected' : 'Unprotected'}
            </span>
          </div>
          <div className="space-y-1">
            <h4 className="font-extrabold text-sm text-slate-800 dark:text-slate-200 uppercase tracking-tight">
              {enabled ? 'Multi-Factor Shield Active' : 'Single Factor Security'}
            </h4>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 font-semibold px-4">
              {enabled
                ? 'Your account is fully fortified with standard RFC 6238 TOTP authentication.'
                : 'MFA protection is inactive. We highly recommend activating 2FA immediately to protect administrative parameters.'}
            </p>
          </div>
        </div>

        <div className="md:col-span-2 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800/60 rounded-2xl p-6 relative">
          {!enabled ? (
            /* Setup Flow */
            <div className="space-y-6">
              <div>
                <h3 className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest italic mb-2">
                  Enrolling Admin Authenticator (2FA)
                </h3>
                <ol className="space-y-4 text-xs font-semibold text-slate-500 dark:text-slate-400 leading-relaxed">
                  <li className="flex items-start space-x-3">
                    <span className="bg-pink-500/10 text-pink-500 font-black rounded-lg w-5 h-5 flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">
                      1
                    </span>
                    <span>Scan the cryptographic QR code or manually input the secret key below using your authenticator app (e.g. Google Authenticator, Authy, or Microsoft Authenticator).</span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <span className="bg-pink-500/10 text-pink-500 font-black rounded-lg w-5 h-5 flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">
                      2
                    </span>
                    <span>Enter the generated 6-digit temporal passcode displayed in your app to activate MFA.</span>
                  </li>
                </ol>
              </div>

              <div className="grid sm:grid-cols-5 gap-6 items-center">
                {/* QR Code Container */}
                <div className="sm:col-span-2 flex flex-col items-center justify-center">
                  {qrImageUrl ? (
                    <div className="bg-white p-3 rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-md">
                      <img
                        src={qrImageUrl}
                        alt="2FA QR Code"
                        className="w-36 h-36 select-none"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  ) : (
                    <div className="w-36 h-36 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-400">
                      Generating...
                    </div>
                  )}
                  <span className="text-[9px] font-bold text-slate-400 mt-2 uppercase tracking-wider italic">
                    Scan with Authenticator
                  </span>
                </div>

                {/* Secret Key Input */}
                <div className="sm:col-span-3 space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">
                      Manual Secret Key
                    </label>
                    <div className="flex">
                      <code className="flex-1 bg-white dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800/80 rounded-l-xl p-2.5 font-mono text-xs text-pink-500 select-all font-bold tracking-widest overflow-x-auto">
                        {tempSecret}
                      </code>
                      <button
                        type="button"
                        onClick={handleCopySecret}
                        className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border-2 border-l-0 border-slate-100 dark:border-slate-800/80 rounded-r-xl px-3 text-slate-500 hover:text-slate-700 transition-all flex items-center justify-center"
                        title="Copy to Clipboard"
                      >
                        {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <form onSubmit={handleEnable2FA} className="space-y-3">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">
                        Verification Passcode
                      </label>
                      <input
                        type="text"
                        maxLength={6}
                        value={code}
                        onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                        placeholder="e.g. 123456"
                        className="w-full bg-white dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800/80 rounded-xl p-2.5 text-center font-mono text-lg font-black tracking-[0.4em] focus:ring-2 focus:ring-pink-500 focus:outline-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={submitting || code.trim().length !== 6}
                      className="w-full bg-pink-500 hover:bg-pink-600 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 text-white font-black text-xs uppercase tracking-widest italic py-3 px-4 rounded-xl shadow-lg shadow-pink-500/10 active:scale-[0.98] transition-all flex items-center justify-center space-x-2 cursor-pointer"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Verifying Cryptographic Seal...</span>
                        </>
                      ) : (
                        <>
                          <Key className="w-4 h-4" />
                          <span>Verify & Enable 2FA Protection</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          ) : (
            /* Activated Info & Disabling Option */
            <div className="space-y-6 flex flex-col justify-between h-full">
              <div>
                <h3 className="text-xs font-black text-emerald-500 uppercase tracking-widest italic mb-2 flex items-center">
                  <CheckCircle2 className="w-4 h-4 mr-1.5" />
                  MFA Protection Guard Enabled
                </h3>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 leading-relaxed">
                  The admin portal settings and secure credential files are locked under dual-factor identity constraints. Future login attempts on this machine or external sessions will require providing the 6-digit security code generated by your cryptographic token device.
                </p>
              </div>

              <div className="border-t border-slate-100 dark:border-slate-800 pt-5 mt-4">
                {!showDisableVerify ? (
                  <button
                    type="button"
                    onClick={() => setShowDisableVerify(true)}
                    className="text-xs font-bold uppercase tracking-wide text-rose-500 hover:text-rose-600 bg-rose-500/5 hover:bg-rose-500/10 py-2.5 px-4 rounded-xl transition-all"
                  >
                    Deactivate Multi-Factor Authentication
                  </button>
                ) : (
                  <form onSubmit={handleDisable2FA} className="bg-rose-500/5 border border-rose-500/10 rounded-2xl p-4 space-y-4">
                    <div>
                      <h4 className="text-[10px] font-black text-rose-500 uppercase tracking-widest italic mb-1">
                        Confirm MFA Deactivation
                      </h4>
                      <p className="text-[11px] font-semibold text-slate-400 leading-normal mb-3">
                        Disabling 2FA places your admin dashboard at higher risk. Please enter your current 6-digit authenticator code to authorize deactivation:
                      </p>
                      <input
                        type="text"
                        maxLength={6}
                        value={disableCode}
                        onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, ''))}
                        placeholder="e.g. 123456"
                        className="w-full max-w-[200px] bg-white dark:bg-slate-950 border-2 border-rose-500/20 rounded-xl p-2 text-center font-mono text-md font-black tracking-[0.4em] focus:ring-2 focus:ring-rose-500 focus:outline-none block"
                      />
                    </div>
                    <div className="flex items-center space-x-3">
                      <button
                        type="submit"
                        disabled={submitting || disableCode.trim().length !== 6}
                        className="bg-rose-500 hover:bg-rose-600 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 text-white font-bold text-[10px] uppercase tracking-widest italic py-2 px-4 rounded-lg flex items-center space-x-1"
                      >
                        {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />}
                        Confirm & Disable
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowDisableVerify(false);
                          setDisableCode('');
                        }}
                        className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-500"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
