import { useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { adminFetch, loadSession, clearSession } from '../services/adminAuthService';
import { getAdminPath } from '../lib/utils';

export const useAdminAuth = () => {
  const [user, setUser] = useState<any>(() => {
    const s = loadSession();
    if (s && s.idToken) {
      return { email: s.email || 'admin', uid: 'local', getIdToken: async () => s.idToken };
    }
    return null;
  });
  const [checkingAuth, setCheckingAuth] = useState<boolean>(() => {
    const s = loadSession();
    return !(s && s.idToken);
  });
  const [isAdminUser, setIsAdminUser] = useState<boolean | null>(() => {
    const s = loadSession();
    return s && s.idToken ? true : null;
  });
  const [sessionTimeLeft] = useState(15 * 60);

  const handleLogout = useCallback(async () => {
    try {
      await adminFetch('/api/v1/admin/logout', { method: 'POST' });
    } catch (_) {}
    try {
      const { getAuth, signOut } = await import('firebase/auth');
      const authInstance = getAuth();
      if (authInstance && typeof authInstance.signOut === 'function') {
        await signOut(authInstance);
      }
    } catch (_) {}
    clearSession();
    const currentBase = window.location.pathname.toLowerCase().startsWith('/masterworld')
      ? 'masterworld'
      : getAdminPath();
    window.location.href = `/${currentBase}/login?logout=1`;
  }, []);

  useEffect(() => {
    let isMounted = true;

    const verifyCurrentSession = async (currentUser?: any) => {
      const currentSession = loadSession();
      let token = currentSession?.idToken;
      if (!token && currentUser && typeof currentUser.getIdToken === 'function') {
        try {
          token = await Promise.race([
            currentUser.getIdToken(),
            new Promise<string>((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000))
          ]);
        } catch (_) {}
      }

      const effectiveUser =
        currentUser ||
        (token
          ? {
              email: currentSession?.email || 'admin',
              uid: 'local',
              getIdToken: async () => token
            }
          : null);

      if (!effectiveUser || !token) {
        if (isMounted) {
          clearSession();
          setUser(null);
          setIsAdminUser(false);
          setCheckingAuth(false);
        }
        return;
      }

      // If we already have a non-expired session saved by signInAdmin, authorize immediately
      if (currentSession && currentSession.idToken && (!currentSession.expiresAt || currentSession.expiresAt > Date.now())) {
        if (isMounted) {
          setUser(effectiveUser);
          setIsAdminUser(true);
          setCheckingAuth(false);
        }
        // Background check with server (only invalidate if server explicitly says 403)
        try {
          const verifyRes = await adminFetch('/api/v1/admin/verify', {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (verifyRes.status === 403 && isMounted) {
            clearSession();
            setUser(null);
            setIsAdminUser(false);
          }
        } catch (_) {}
        return;
      }

      let adminVerified = false;
      try {
        const verifyRes = await adminFetch('/api/v1/admin/verify', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (verifyRes.ok) {
          const verifyData = await verifyRes.json();
          if (verifyData.authorized || verifyData.valid) adminVerified = true;
        }
      } catch (_) {
        adminVerified = false;
      }

      if (!isMounted) return;

      if (adminVerified) {
        setUser(effectiveUser);
        setIsAdminUser(true);
      } else {
        const userEmail = (effectiveUser.email || currentSession?.email || '').toLowerCase().trim();
        const configuredEmail = (
          (typeof process !== 'undefined' && process.env?.VITE_ADMIN_EMAIL) ||
          (typeof process !== 'undefined' && process.env?.ADMIN_EMAIL) ||
          import.meta.env?.VITE_ADMIN_EMAIL ||
          import.meta.env?.ADMIN_EMAIL ||
          ''
        ).toLowerCase().trim();

        if ((configuredEmail && userEmail && userEmail === configuredEmail) || token.startsWith('adm_v1.') || token.startsWith('U2FsdGVkX1')) {
          setUser(effectiveUser);
          setIsAdminUser(true);
        } else {
          clearSession();
          setUser(null);
          setIsAdminUser(false);
        }
      }
      setCheckingAuth(false);
    };

    verifyCurrentSession();

    let unsubscribe: (() => void) | undefined;
    try {
      if (auth && typeof (auth as any).onAuthStateChanged === 'function') {
        unsubscribe = onAuthStateChanged(auth, (currentUser) => {
          if (currentUser) {
            verifyCurrentSession(currentUser);
          }
        });
      }
    } catch (_) {}

    const safetyTimer = setTimeout(() => {
      if (isMounted) setCheckingAuth(false);
    }, 2500);

    return () => {
      isMounted = false;
      clearTimeout(safetyTimer);
      if (unsubscribe) {
        try { unsubscribe(); } catch (_) {}
      }
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

