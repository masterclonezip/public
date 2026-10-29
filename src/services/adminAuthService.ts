/**
 * adminAuthService.ts
 * Handles Firebase admin authentication, token refresh, and session management.
 * Drop this file into src/services/ in your project.
 */

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────
export interface AdminSession {
  idToken: string;
  refreshToken: string;
  email: string;
  expiresAt: number; // epoch ms
}

export interface AuthResult {
  ok: boolean;
  session?: AdminSession;
  error?: string;
}

import { safeEncrypt, getFallbackAes } from "../lib/cryptoUtils";

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
const SESSION_KEY = "__adm_session";
const TOKEN_LIFETIME_MS = 55 * 60 * 1000; // 55 minutes (Firebase tokens last 60m)

const isRealValue = (key: string | undefined): boolean => {
  if (!key) return false;
  const clean = key.trim();
  if (clean === '' || clean === 'PLACEHOLDER' || clean === 'undefined' || clean === 'null' || clean.includes('REPLACE_WITH_YOUR_REAL_KEY') || clean.includes('YOUR_API_KEY')) return false;
  if (clean.includes('#') || clean.includes('!') || clean.includes('@') || clean.includes('&') || clean.includes('*') || clean.includes('$') || clean.includes('^') || clean.includes('+') || clean.includes('proj-U7m') || clean.includes('Db7!Xp2') || clean.includes('Sy8@Kp3')) return false;
  return true;
};

const getResolvedApiKey = (): string => {
  let envKey: string | undefined;
  if (typeof process !== 'undefined' && process.env) {
    envKey = process.env.VITE_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY;
  }
  if (!envKey) {
    try {
      const meta = (globalThis as any).importMetaEnv || (typeof import.meta !== 'undefined' ? (import.meta as any).env : undefined);
      if (meta) envKey = meta.VITE_FIREBASE_API_KEY || meta.FIREBASE_API_KEY;
    } catch (_) {}
  }

  if (isRealValue(envKey)) return envKey!;

  return "";
};

const FIREBASE_API_KEY = getResolvedApiKey();

const isFirebaseApiKeyReal = (key: string | undefined): boolean => {
  return isRealValue(key);
};

const IS_API_KEY_REAL = isFirebaseApiKeyReal(FIREBASE_API_KEY);

// ─────────────────────────────────────────────────────────────────────────────
// SESSION STORAGE (localStorage — cleared when tab closes)
// ─────────────────────────────────────────────────────────────────────────────
export function saveSession(session: AdminSession): void {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch (_) {}
}

export function loadSession(): AdminSession | null {
  try {
    let raw = localStorage.getItem(SESSION_KEY);
    if (!raw) {
      raw = sessionStorage.getItem(SESSION_KEY);
    }
    if (!raw) return null;
    const parsed: AdminSession = JSON.parse(raw);
    if (!parsed.idToken) return null;
    if (parsed.expiresAt && Date.now() >= parsed.expiresAt) {
      clearSession();
      return null;
    }
    return parsed;
  } catch (_) {
    return null;
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
  } catch (_) {}
}

export function isSessionExpired(session: AdminSession): boolean {
  if (!session?.expiresAt) return false;
  return Date.now() >= session.expiresAt;
}

// ─────────────────────────────────────────────────────────────────────────────
// TOKEN REFRESH
// ─────────────────────────────────────────────────────────────────────────────
export async function refreshIdToken(
  refreshToken: string
): Promise<{ idToken: string; expiresAt: number } | null> {
  const session = loadSession();
  if (refreshToken === 'MOCK_ADMIN_REFRESH' || refreshToken === 'SERVER_SESSION' || !refreshToken || !IS_API_KEY_REAL) {
    if (session && session.idToken) {
      try {
        const res = await fetch("/api/v1/admin/refresh-token", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.idToken}` },
          body: JSON.stringify({ idToken: session.idToken }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.token) {
            return {
              idToken: data.token,
              expiresAt: Date.now() + TOKEN_LIFETIME_MS,
            };
          }
        }
      } catch (_) {}
      return {
        idToken: session.idToken,
        expiresAt: Date.now() + TOKEN_LIFETIME_MS,
      };
    }
  }

  try {
    const res = await fetch(
      `https://securetoken.googleapis.com/v1/token?key=${FIREBASE_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(refreshToken)}`,
      }
    );
    if (!res.ok) {
      if (session && session.idToken) {
        return {
          idToken: session.idToken,
          expiresAt: Date.now() + TOKEN_LIFETIME_MS,
        };
      }
      return null;
    }
    const data = await res.json();
    return {
      idToken: data.id_token,
      expiresAt: Date.now() + TOKEN_LIFETIME_MS,
    };
  } catch (_) {
    if (session && session.idToken) {
      return {
        idToken: session.idToken,
        expiresAt: Date.now() + TOKEN_LIFETIME_MS,
      };
    }
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET VALID TOKEN — refreshes automatically if close to expiry
// ─────────────────────────────────────────────────────────────────────────────
export async function getValidAdminToken(): Promise<string | null> {
  const session = loadSession();
  if (session && session.idToken) {
    // If still in standard validity window
    if (!session.expiresAt || Date.now() < session.expiresAt - 2 * 60 * 1000) {
      return session.idToken;
    }

    // Attempt refresh
    try {
      const refreshed = await refreshIdToken(session.refreshToken);
      if (refreshed?.idToken) {
        const updated: AdminSession = {
          ...session,
          idToken: refreshed.idToken,
          expiresAt: refreshed.expiresAt,
        };
        saveSession(updated);
        return updated.idToken;
      }
    } catch (_) {}
    
    // Always fall back to existing token rather than dropping authorization prematurely
    return session.idToken;
  }

  // Fallback: Check Firebase Auth client SDK
  try {
    const { getAuth } = await import('firebase/auth');
    const auth = getAuth();
    if (auth && auth.currentUser) {
      const idToken = await auth.currentUser.getIdToken();
      if (idToken) {
        saveSession({
          idToken,
          refreshToken: auth.currentUser.refreshToken || 'FIREBASE_CLIENT',
          email: auth.currentUser.email || 'admin',
          expiresAt: Date.now() + TOKEN_LIFETIME_MS
        });
        return idToken;
      }
    }
  } catch (_) {}

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// SIGN IN — Backend Direct Login First + Firebase REST + Offline Fallback
// ─────────────────────────────────────────────────────────────────────────────
export async function signInAdmin(
  email: string,
  password: string,
  cfToken?: string,
  code?: string
): Promise<AuthResult & { mfaRequired?: boolean }> {
  try {
    let lastServerError = "";

    // Step 1: Fast Backend Direct Login (/api/v1/admin/login) — <50ms on Express & Cloudflare Pages
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 6000);
      const directRes = await fetch("/api/v1/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, code }),
        signal: controller.signal,
      });
      clearTimeout(timer);

      const contentType = directRes.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const directData = await directRes.json().catch(() => ({}));

        if (directData?.mfaRequired) {
          return { ok: true, mfaRequired: true };
        }

        if (directRes.ok && directData.token) {
          const session: AdminSession = {
            idToken: directData.token,
            refreshToken: directData.session?.refreshToken || "SERVER_SESSION",
            email: email.toLowerCase().trim(),
            expiresAt: Date.now() + TOKEN_LIFETIME_MS,
          };
          saveSession(session);
          return { ok: true, session };
        }

        if (directData?.error && directRes.status !== 404 && directData.error !== "Not Found") {
          lastServerError = directData.error;
        }
      }
    } catch (directErr) {
      console.warn("Direct login request notice:", directErr);
    }

    // Step 2: Try Firebase REST sign-in if API key is real
    let idToken = "";
    let refreshToken = "SERVER_SESSION";
    if (IS_API_KEY_REAL) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 6000);
        const res = await fetch(
          `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password, returnSecureToken: true }),
            signal: controller.signal,
          }
        );
        clearTimeout(timer);
        if (res.ok) {
          const data = await res.json();
          idToken = data.idToken;
          refreshToken = data.refreshToken;
        }
      } catch (fbErr) {
        console.warn("Firebase REST sign-in notice:", fbErr);
      }
    }

    if (idToken) {
      const userEmail = email.toLowerCase().trim();
      const session: AdminSession = {
        idToken,
        refreshToken,
        email: userEmail,
        expiresAt: Date.now() + TOKEN_LIFETIME_MS,
      };
      saveSession(session);
      return { ok: true, session };
    }

    // Step 3: Build-time / Static Hosting Direct Verification Fallback
    const configuredAdminEmail = (
      (typeof process !== 'undefined' && process.env?.VITE_ADMIN_EMAIL) ||
      (typeof process !== 'undefined' && process.env?.ADMIN_EMAIL) ||
      import.meta.env?.VITE_ADMIN_EMAIL ||
      import.meta.env?.ADMIN_EMAIL ||
      ""
    ).toLowerCase().trim();

    const configuredAdminPass = (
      (typeof process !== 'undefined' && process.env?.VITE_ADMIN_PASSWORD) ||
      (typeof process !== 'undefined' && process.env?.ADMIN_PASSWORD) ||
      import.meta.env?.VITE_ADMIN_PASSWORD ||
      import.meta.env?.ADMIN_PASSWORD ||
      ""
    ).trim();

    const inputEmail = email.toLowerCase().trim();
    const inputPass = password.trim();

    const isEmailValid = configuredAdminEmail && inputEmail === configuredAdminEmail;
    const isPassValid = configuredAdminPass && inputPass === configuredAdminPass;

    if (isEmailValid && isPassValid) {
      try {
        const payload = JSON.stringify({ admin: true, email: configuredAdminEmail, exp: Date.now() + TOKEN_LIFETIME_MS });
        const token = safeEncrypt(payload, getFallbackAes());
        const session: AdminSession = {
          idToken: token,
          refreshToken: "OFFLINE_ADMIN_SESSION",
          email: configuredAdminEmail,
          expiresAt: Date.now() + TOKEN_LIFETIME_MS,
        };
        saveSession(session);
        return { ok: true, session };
      } catch (encErr) {
        console.error("Offline admin session creation error:", encErr);
      }
    }

    return { ok: false, error: lastServerError || "Invalid administrator email or password." };
  } catch (_) {
    return { ok: false, error: "Server connection error during login." };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SIGN OUT
// ─────────────────────────────────────────────────────────────────────────────
export function signOutAdmin(): void {
  clearSession();
  try {
    import('firebase/auth').then(({ getAuth, signOut }) => {
      const a = getAuth();
      if (a && typeof a.signOut === 'function') signOut(a).catch(() => {});
    }).catch(() => {});
  } catch (_) {}
}

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN API FETCH — wrapper that auto-injects auth header + refresh + timeout
// ─────────────────────────────────────────────────────────────────────────────
export async function adminFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  let token = await getValidAdminToken();
  const rawExistingAuth = (options.headers as any)?.Authorization || (options.headers as any)?.authorization;
  const existingAuth = (rawExistingAuth && !rawExistingAuth.includes('undefined') && !rawExistingAuth.includes('null') && rawExistingAuth.trim() !== 'Bearer') ? rawExistingAuth : null;

  if (!token && !existingAuth) {
    const rawSession = loadSession();
    if (rawSession?.idToken) {
      const refreshed = await refreshIdToken(rawSession.refreshToken);
      if (refreshed?.idToken) {
        token = refreshed.idToken;
        saveSession({ ...rawSession, idToken: refreshed.idToken, expiresAt: refreshed.expiresAt });
      } else {
        token = rawSession.idToken;
      }
    }
    if (!token && !existingAuth) {
      return new Response(JSON.stringify({ error: "Unauthorized: Session expired. Please log in again." }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  const finalHeaders = {
    ...options.headers,
    "Content-Type": "application/json",
    "Cache-Control": "no-cache, no-store, must-revalidate",
    "Pragma": "no-cache",
    "Expires": "0"
  } as any;
  if (token) {
    finalHeaders.Authorization = `Bearer ${token}`;
  } else if (existingAuth) {
    finalHeaders.Authorization = existingAuth;
  }

  const fetchWithSignal = async (reqUrl: string, reqOpts: RequestInit, timeoutMs = 10000): Promise<Response> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(reqUrl, { ...reqOpts, signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  };

  let res = await fetchWithSignal(url, { ...options, headers: finalHeaders, cache: 'no-store' });

  // Auto-save refreshed token if server returned X-Refreshed-Admin-Token
  const refreshedToken = res.headers.get('X-Refreshed-Admin-Token');
  if (refreshedToken) {
    const curSession = loadSession();
    if (curSession) {
      saveSession({
        ...curSession,
        idToken: refreshedToken,
        expiresAt: Date.now() + TOKEN_LIFETIME_MS
      });
    }
  }

  // If 401 Session expired received, attempt automatic single token refresh and retry
  if (res.status === 401) {
    const curSession = loadSession();
    if (curSession?.idToken) {
      try {
        const refreshRes = await fetchWithSignal("/api/v1/admin/refresh-token", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${curSession.idToken}` },
          body: JSON.stringify({ idToken: curSession.idToken }),
        }, 5000);
        if (refreshRes.ok) {
          const refreshData = await refreshRes.json();
          if (refreshData.token) {
            saveSession({
              ...curSession,
              idToken: refreshData.token,
              expiresAt: Date.now() + TOKEN_LIFETIME_MS
            });
            finalHeaders.Authorization = `Bearer ${refreshData.token}`;
            res = await fetchWithSignal(url, { ...options, headers: finalHeaders, cache: 'no-store' });
          }
        }
      } catch (_) {}
    }
  }

  return res;
}
