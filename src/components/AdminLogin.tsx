import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, isFirebaseConfigured, isFirebaseReal } from '../lib/firebase';
import { GoogleAuthProvider, signInWithPopup, getRedirectResult, signInWithRedirect } from 'firebase/auth';
import { signInAdmin } from '../services/adminAuthService';
import { ShieldCheck, Loader2, AlertCircle, Key, Mail, Lock } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AdminLogin({ onSuccess }: { onSuccess: (idToken: string, refreshToken: string, email: string) => void }) {
  const [error, setError] = useState<string | null>(null);
  const [showMfa, setShowMfa] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'password' | 'google'>('password');

  useEffect(() => {
    if (!isFirebaseReal || !auth) return;
    const checkRedirect = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result) {
          setIsLoading(true);
          const user = result.user;
          const idToken = await user.getIdToken();
          const refreshToken = user.refreshToken || '';
          const userEmail = (user.email || '').toLowerCase().trim();
          
          try {
            const verifyRes = await fetch("/api/v1/admin/google-login", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ idToken, email: userEmail }),
            });
            if (verifyRes.ok) {
              const verifyData = await verifyRes.json();
              if (verifyData.token) {
                onSuccess(verifyData.token, refreshToken, userEmail);
                return;
              }
            }
          } catch (_) {}

          // Check against configured admin email from environment
          const configuredEmail = (
            (typeof process !== 'undefined' && process.env?.VITE_ADMIN_EMAIL) ||
            (typeof process !== 'undefined' && process.env?.ADMIN_EMAIL) ||
            import.meta.env?.VITE_ADMIN_EMAIL ||
            import.meta.env?.ADMIN_EMAIL ||
            ''
          ).toLowerCase().trim();

          if (configuredEmail && userEmail === configuredEmail) {
            onSuccess(idToken, refreshToken, userEmail);
            return;
          } else {
            throw new Error(`Access Denied: ${userEmail} is not authorized as an administrator.`);
          }
        }
      } catch (err: any) {
        console.error('Redirect login error:', err);
        setError(err.message || 'Authentication failed during redirect.');
        setIsLoading(false);
      }
    };
    checkRedirect();
  }, [onSuccess]);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (isFirebaseReal && auth) {
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        try {
          const popupResult = await signInWithPopup(auth, provider);
          if (popupResult && popupResult.user) {
            const idToken = await popupResult.user.getIdToken();
            const userEmail = (popupResult.user.email || '').toLowerCase().trim();

            try {
              const verifyRes = await fetch("/api/v1/admin/google-login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ idToken, email: userEmail }),
              });
              if (verifyRes.ok) {
                const verifyData = await verifyRes.json();
                if (verifyData.token) {
                  onSuccess(verifyData.token, popupResult.user.refreshToken || '', userEmail);
                  return;
                }
              }
            } catch (_) {}

            const configuredEmail = (
              (typeof process !== 'undefined' && process.env?.VITE_ADMIN_EMAIL) ||
              (typeof process !== 'undefined' && process.env?.ADMIN_EMAIL) ||
              import.meta.env?.VITE_ADMIN_EMAIL ||
              import.meta.env?.ADMIN_EMAIL ||
              ''
            ).toLowerCase().trim();

            if (configuredEmail && userEmail === configuredEmail) {
              onSuccess(idToken, popupResult.user.refreshToken || '', userEmail);
              return;
            } else {
              throw new Error(`Access Denied: ${userEmail} is not authorized as an administrator.`);
            }
          }
        } catch (popupErr: any) {
          if (popupErr.code === 'auth/popup-blocked' || popupErr.code === 'auth/cancelled-popup-request') {
            await signInWithRedirect(auth, provider);
            return;
          }
          throw popupErr;
        }
      } else {
        throw new Error('Firebase Auth is not available in current configuration.');
      }
    } catch (err: any) {
      console.error('Google login error:', err);
      setError(err.message || 'Failed to authenticate with Google.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter both your administrator email and password.');
      return;
    }
    setIsLoading(true);
    setError(null);

    try {
      const res = await signInAdmin(email, password, undefined, showMfa ? mfaCode : undefined);
      if (res.mfaRequired) {
        setShowMfa(true);
      } else if (res.ok && res.session) {
        onSuccess(res.session.idToken, res.session.refreshToken, res.session.email);
      } else {
        setError(res.error || 'Invalid administrator email or password.');
      }
    } catch (err: any) {
      setError(err.message || 'Server connection error during login.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white p-4 relative overflow-hidden">
      <div className="absolute inset-0 z-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-600/20 rounded-full blur-[120px] opacity-50 mix-blend-screen pointer-events-none"></div>
      </div>
      
      <div className="w-full max-w-md relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-zinc-900/90  border border-white/10 p-8 rounded-3xl shadow-2xl"
        >
          <div className="flex justify-center mb-6 relative">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-[0_0_40px_rgba(37,99,235,0.4)]">
              <ShieldCheck className="w-8 h-8 text-white" />
            </div>
          </div>
          
          <div className="text-center mb-6">
            <h1 className="text-2xl font-black mb-2 tracking-tight">Admin Portal</h1>
            <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Cloud Directory Control System</p>
          </div>

          <div className="flex bg-zinc-800/80 p-1 rounded-xl mb-6 border border-white/5">
            <button
              type="button"
              onClick={() => { setMode('password'); setError(null); }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${mode === 'password' ? 'bg-blue-600 text-white shadow-md' : 'text-zinc-400 hover:text-white'}`}
            >
              Email & Password
            </button>
            <button
              type="button"
              onClick={() => { setMode('google'); setError(null); }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${mode === 'google' ? 'bg-blue-600 text-white shadow-md' : 'text-zinc-400 hover:text-white'}`}
            >
              Google Auth
            </button>
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-6 p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs flex items-start gap-3"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="font-medium leading-normal">{error}</span>
            </motion.div>
          )}

          {mode === 'password' ? (
            <form onSubmit={handlePasswordSignIn} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1.5 uppercase tracking-wider">Admin Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="admin@example.com"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1.5 uppercase tracking-wider">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••••••"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-medium"
                  />
                </div>
              </div>

              
          {showMfa && (
            <div className="mb-4">
              <label className="block text-xs font-bold text-zinc-400 mb-1.5 uppercase tracking-wider">2FA Authenticator Code</label>
              <input
                type="text"
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value)}
                required
                placeholder="123456"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-medium text-center tracking-[0.5em]"
              />
            </div>
          )}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl py-3.5 text-sm transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Key className="w-4 h-4" />}
            <span>{isLoading ? 'Authenticating Session...' : 'Sign In to Admin Dashboard'}</span>
          </button>
        </form>
          ) : (
            <div className="space-y-4">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-3 bg-white hover:bg-zinc-100 text-zinc-900 shadow-[0_0_20px_rgba(255,255,255,0.15)] rounded-2xl py-3.5 px-4 font-bold transition-all active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-zinc-900" />
                ) : (
                  <svg className="w-5 h-5" viewBox="0 0 24 24" width="20" height="20">
                    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.92h6.61c-.29 1.5-1.14 2.78-2.4 3.63v3.02h3.88c2.27-2.1 3.65-5.18 3.65-8.5z" />
                    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.02c-1.08.72-2.45 1.16-4.05 1.16-3.11 0-5.74-2.11-6.68-4.96H1.21v3.11C3.18 21.88 7.39 24 12 24z" />
                    <path fill="#FBBC05" d="M5.32 14.27c-.24-.72-.38-1.49-.38-2.27s.14-1.55.38-2.27V6.62H1.21C.44 8.24 0 10.07 0 12s.44 3.76 1.21 5.38l4.11-3.11z" />
                    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.39 0 3.18 2.12 1.21 5.38l4.11 3.11c.94-2.85 3.57-4.96 6.68-4.96z" />
                  </svg>
                )}
                <span>{isLoading ? 'Authenticating...' : 'Sign In with Google'}</span>
              </button>
            </div>
          )}

          <div className="mt-8 pt-6 border-t border-white/10">
            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest flex items-center justify-center gap-1.5">
              <span>Secure Session Enforcer</span>
              <span className="w-1 h-1 rounded-full bg-zinc-600" />
              <span>Admin Access Only</span>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
