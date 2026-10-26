import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { adminFetch, loadSession, clearSession } from '../services/adminAuthService';
import { getAdminPath } from '../lib/utils';

export const useAdminAuth = () => {
  const [user, setUser] = useState<any>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isAdminUser, setIsAdminUser] = useState<boolean | null>(null);
  const [sessionTimeLeft, setSessionTimeLeft] = useState(15 * 60);

  const handleLogout = async () => {
    try {
      await adminFetch('/api/v1/admin/logout', { method: 'POST' });
    } catch (e) {}
    try {
      const { getAuth, signOut } = await import('firebase/auth');
      const authInstance = getAuth();
      if (authInstance) {
        await signOut(authInstance);
      }
    } catch (e) {}
    clearSession();
    const currentBase = window.location.pathname.toLowerCase().startsWith('/masterworld') 
      ? 'masterworld' 
      : getAdminPath();
    window.location.href = `/${currentBase}/login?logout=1`;
  };

  useEffect(() => {
    const session = loadSession();
    if (!auth && (!session || !session.idToken)) {
      setIsAdminUser(false);
      setUser(null);
      setCheckingAuth(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth!, async (currentUser) => {
      const currentSession = loadSession();
      let token = currentSession?.idToken;
      if (!token && currentUser) {
        try {
          token = await currentUser.getIdToken();
        } catch (_) {}
      }
      const effectiveUser = currentUser || (token ? { email: currentSession?.email, uid: 'local', getIdToken: async () => token } : null);
        
      if (effectiveUser && token) {
        let adminVerified = false;
        try {
          const idToken = await effectiveUser.getIdToken();
          const verifyRes = await adminFetch('/api/v1/admin/verify', {
            headers: { 'Authorization': `Bearer ${idToken}` }
          });
          if (verifyRes.ok) {
            const verifyData = await verifyRes.json();
            if (verifyData.authorized) adminVerified = true;
          }
        } catch (e) {
          adminVerified = false;
        }
          
        if (adminVerified) {
          setUser(effectiveUser);
          setIsAdminUser(true);
        } else {
          // Static host fallback (e.g. Cloudflare Pages / Vercel without active Node.js server):
          // Authorize if user's authenticated email matches configured admin email from environment
          const userEmail = (effectiveUser.email || currentSession?.email || '').toLowerCase().trim();
          const configuredEmail = (
            (typeof process !== 'undefined' && process.env?.VITE_ADMIN_EMAIL) ||
            (typeof process !== 'undefined' && process.env?.ADMIN_EMAIL) ||
            import.meta.env?.VITE_ADMIN_EMAIL ||
            import.meta.env?.ADMIN_EMAIL ||
            ''
          ).toLowerCase().trim();

          if (configuredEmail && userEmail && userEmail === configuredEmail) {
            setUser(effectiveUser);
            setIsAdminUser(true);
          } else {
            clearSession();
            setUser(null);
            setIsAdminUser(false);
          }
        }
        setCheckingAuth(false);
      } else {
        clearSession();
        setUser(null);
        setIsAdminUser(false);
        setCheckingAuth(false);
      }
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    let timerId: any;
    if (user && isAdminUser) {
      timerId = setInterval(() => {
        setSessionTimeLeft((prev) => {
          if (prev <= 1) {
            handleLogout();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timerId);
  }, [user, isAdminUser]);

  useEffect(() => {
    const resetTimer = () => setSessionTimeLeft(prev => {
      if (prev < 15 * 60) return 15 * 60;
      return prev;
    });
    window.addEventListener('mousemove', resetTimer, { passive: true });
    window.addEventListener('keydown', resetTimer, { passive: true });
    window.addEventListener('click', resetTimer, { passive: true });
    return () => {
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('keydown', resetTimer);
      window.removeEventListener('click', resetTimer);
    };
  }, []);

  return {
    user,
    checkingAuth,
    isAdminUser,
    sessionTimeLeft,
    handleLogout
  };
};
