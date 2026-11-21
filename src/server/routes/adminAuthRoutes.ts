import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { verifyTOTPToken } from '../../lib/totp';
import { safeDecrypt, getAesSecret } from '../../lib/cryptoUtils';

export const adminAuthRouter = Router();

// Per-process ephemeral fallback secret (never hardcoded in source)
const EPHEMERAL_SESSION_SECRET = crypto.randomBytes(32).toString('hex');

// Short-TTL in-memory cache for server-verified Firebase ID tokens (keyed by SHA-256 hash)
const verifiedFirebaseTokenCache = new Map<string, { email: string; expiresAt: number }>();

function safeEqualString(a: string, b: string): boolean {
  const hashA = crypto.createHash('sha256').update(a).digest();
  const hashB = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

// Helper to resolve configured admin credentials
function getAdminConfig() {
  const configuredEmail = (
    process.env.ADMIN_EMAIL ||
    process.env.VITE_ADMIN_EMAIL ||
    ''
  ).toLowerCase().trim();

  const configuredPassword = (
    process.env.ADMIN_PASSWORD ||
    process.env.VITE_ADMIN_PASSWORD ||
    ''
  ).trim();

  const sessionSecret = (
    process.env.JWT_SECRET ||
    process.env.ADMIN_SESSION_SECRET ||
    process.env.SESSION_SECRET ||
    (configuredPassword
      ? crypto.createHash('sha256').update(configuredPassword + '_salt_admin').digest('hex')
      : EPHEMERAL_SESSION_SECRET)
  );

  const totpSecret = process.env.ADMIN_TOTP_SECRET || process.env.TOTP_SECRET || '';
  const firebaseApiKey = (
    process.env.FIREBASE_API_KEY ||
    process.env.VITE_FIREBASE_API_KEY ||
    ''
  ).replace(/^["']|["']$/g, '').trim();

  return { configuredEmail, configuredPassword, sessionSecret, totpSecret, firebaseApiKey };
}

// Generates a cryptographically signed HMAC-SHA256 session token
function generateToken(email: string): string {
  const { sessionSecret } = getAdminConfig();
  const payload = {
    email,
    role: 'admin',
    iat: Date.now(),
    exp: Date.now() + 55 * 60 * 1000 // 55 minutes
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', sessionSecret).update(payloadB64).digest('base64url');
  return `adm_v1.${payloadB64}.${signature}`;
}

// Verifies a Firebase ID token against Google Identity Toolkit server-side
async function verifyFirebaseIdToken(idToken: string): Promise<{ valid: boolean; email?: string }> {
  if (!idToken || !idToken.startsWith('eyJ') || idToken.split('.').length !== 3) {
    return { valid: false };
  }
  const { firebaseApiKey, configuredEmail } = getAdminConfig();
  if (!firebaseApiKey) {
    return { valid: false };
  }

  const cacheKey = crypto.createHash('sha256').update(idToken).digest('hex');
  const cached = verifiedFirebaseTokenCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    if (!configuredEmail || cached.email === configuredEmail) {
      return { valid: true, email: cached.email };
    }
    return { valid: false };
  }

  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(firebaseApiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
        signal: AbortSignal.timeout(5000)
      }
    );
    if (!res.ok) return { valid: false };
    const data: any = await res.json().catch(() => null);
    const user = Array.isArray(data?.users) ? data.users[0] : null;
    const verifiedEmail = String(user?.email || '').toLowerCase().trim();
    if (!verifiedEmail || user?.disabled === true) {
      return { valid: false };
    }

    if (verifiedFirebaseTokenCache.size > 100) verifiedFirebaseTokenCache.clear();
    verifiedFirebaseTokenCache.set(cacheKey, {
      email: verifiedEmail,
      expiresAt: Date.now() + 2 * 60 * 1000
    });

    if (!configuredEmail || verifiedEmail === configuredEmail) {
      return { valid: true, email: verifiedEmail };
    }
  } catch (_) {}

  return { valid: false };
}

// Synchronous check for server-signed adm_v1 HMAC tokens and AES-encrypted offline session tokens
function verifyLocalAdminToken(token: string): { valid: boolean; email?: string } {
  if (!token || typeof token !== 'string') return { valid: false };
  try {
    const raw = token.startsWith('Bearer ') ? token.slice(7).trim() : token.trim();
    if (!raw) return { valid: false };
    const { sessionSecret, configuredEmail } = getAdminConfig();

    // 1. Verify v1 signed HMAC-SHA256 token
    if (raw.startsWith('adm_v1.')) {
      const parts = raw.split('.');
      if (parts.length === 3) {
        const [, payloadB64, sig] = parts;
        const expectedSig = crypto.createHmac('sha256', sessionSecret).update(payloadB64).digest('base64url');

        const sigBuf = Buffer.from(sig);
        const expSigBuf = Buffer.from(expectedSig);
        if (sigBuf.length === expSigBuf.length && crypto.timingSafeEqual(sigBuf, expSigBuf)) {
          const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf-8'));
          const payloadEmail = String(payload?.email || '').toLowerCase().trim();
          if (payload && Number(payload.exp) > Date.now() && payload.role === 'admin' && payloadEmail) {
            if (!configuredEmail || payloadEmail === configuredEmail) {
              return { valid: true, email: payloadEmail };
            }
          }
        }
      }
      return { valid: false };
    }

    // 2. Verify AES-encrypted offline session token ONLY if AES_SECRET decrypts a valid structured payload
    if (raw.startsWith('U2FsdGVkX1')) {
      const configuredAesSecret = String(
        process.env.AES_SECRET || process.env.VITE_AES_SECRET || process.env.VAULT_SECRET_KEY || ''
      ).trim();
      if (!configuredAesSecret) return { valid: false };
      const decrypted = safeDecrypt(raw, configuredAesSecret || getAesSecret());
      if (decrypted && decrypted.startsWith('{')) {
        const payload = JSON.parse(decrypted);
        const payloadEmail = String(payload?.email || '').toLowerCase().trim();
        if (
          payload &&
          Number(payload.exp) > Date.now() &&
          (payload.role === 'admin' || payload.admin === true) &&
          payloadEmail
        ) {
          if (!configuredEmail || payloadEmail === configuredEmail) {
            return { valid: true, email: payloadEmail };
          }
        }
      }
      return { valid: false };
    }
  } catch (_) {}
  return { valid: false };
}

export async function verifyAdminTokenAsync(token: string): Promise<{ valid: boolean; email?: string }> {
  if (!token || typeof token !== 'string') return { valid: false };
  const raw = token.startsWith('Bearer ') ? token.slice(7).trim() : token.trim();
  if (!raw) return { valid: false };

  const localCheck = verifyLocalAdminToken(raw);
  if (localCheck.valid) return localCheck;

  if (raw.startsWith('eyJ')) {
    return verifyFirebaseIdToken(raw);
  }

  return { valid: false };
}

// Public auth-lifecycle paths that handle their own authentication or return public Firebase client config
const ADMIN_AUTH_EXEMPT_PATHS = new Set([
  '/api/v1/admin/login',
  '/api/v1/admin/auth/login',
  '/api/v1/admin/google-login',
  '/api/v1/admin/verify',
  '/api/v1/admin/verify-session',
  '/api/v1/admin/auth/me',
  '/api/v1/admin/auth/check-session',
  '/api/v1/admin/refresh-token',
  '/api/v1/admin/logout',
  '/api/v1/admin/auth/logout',
  '/api/v1/admin/runtime-config'
]);

/**
 * Express middleware protecting all /api/v1/admin/* and /api/github-sync/* routes.
 * Requires a cryptographically valid signed session token or server-verified Firebase ID token.
 */
export async function requireAdminAuth(req: Request, res: Response, next: NextFunction) {
  if (req.method === 'OPTIONS') {
    return next();
  }
  const fullPath = `${req.baseUrl || ''}${req.path || ''}`.replace(/\/+$/, '') || '/';
  if (ADMIN_AUTH_EXEMPT_PATHS.has(fullPath)) {
    return next();
  }

  const authHeader = String(req.headers.authorization || '');
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (!token) {
    return res.status(401).json({
      ok: false,
      authorized: false,
      error: 'Administrator authentication required.'
    });
  }

  const verified = await verifyAdminTokenAsync(token);
  if (!verified.valid) {
    return res.status(401).json({
      ok: false,
      authorized: false,
      error: 'Invalid or expired administrator session.'
    });
  }

  (req as any).adminEmail = verified.email;
  return next();
}

// ─────────────────────────────────────────────────────────────────────────────
// LOGIN ENDPOINTS (Supports both /api/v1/admin/login and /api/v1/admin/auth/login)
// ─────────────────────────────────────────────────────────────────────────────
const handleLogin = (req: any, res: any) => {
  const { email, password, code } = req.body || {};
  const { configuredEmail, configuredPassword, totpSecret } = getAdminConfig();

  if (!email || !password) {
    return res.status(400).json({ ok: false, error: 'Email and password are required.' });
  }

  const normalizedEmail = String(email).toLowerCase().trim();
  const inputPass = String(password).trim();

  // If running in local preview container without ADMIN_EMAIL/ADMIN_PASSWORD set, allow preview admin login
  const isLocalPreview = process.env.NODE_ENV !== 'production' && !configuredEmail && !configuredPassword;
  if (!isLocalPreview) {
    // 1. Verify Email
    if (!configuredEmail) {
      return res.status(500).json({
        ok: false,
        error: 'ADMIN_EMAIL environment variable is not configured. Please set ADMIN_EMAIL.'
      });
    }

    if (!safeEqualString(normalizedEmail, configuredEmail)) {
      return res.status(401).json({ ok: false, error: 'Invalid administrator email address.' });
    }

    // 2. Verify Password (constant-time)
    if (!configuredPassword) {
      return res.status(500).json({
        ok: false,
        error: 'ADMIN_PASSWORD environment variable is not configured. Please set ADMIN_PASSWORD.'
      });
    }

    const inputHash = crypto.createHash('sha256').update(inputPass).digest('hex');
    const isDirectMatch = safeEqualString(inputPass, configuredPassword);
    const isHashMatch = safeEqualString(inputHash, configuredPassword.toLowerCase());

    if (!isDirectMatch && !isHashMatch) {
      return res.status(401).json({ ok: false, error: 'Incorrect administrator password.' });
    }
  }

  // 3. Verify TOTP / 2FA (if configured)
  if (totpSecret) {
    if (!code) {
      return res.json({ ok: true, mfaRequired: true });
    }
    const isValidTotp = verifyTOTPToken(String(code).trim(), totpSecret);
    if (!isValidTotp) {
      return res.status(401).json({ ok: false, error: 'Invalid 2FA verification code.' });
    }
  }

  const token = generateToken(normalizedEmail);
  return res.json({
    ok: true,
    success: true,
    token,
    session: {
      idToken: token,
      refreshToken: 'SERVER_SESSION',
      email: normalizedEmail,
      expiresAt: Date.now() + 55 * 60 * 1000
    }
  });
};

adminAuthRouter.post('/api/v1/admin/login', handleLogin);
adminAuthRouter.post('/api/v1/admin/auth/login', handleLogin);

// ─────────────────────────────────────────────────────────────────────────────
// VERIFY ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────
const handleVerify = async (req: any, res: any) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace(/^Bearer\s+/i, '') || req.body?.idToken || req.body?.token;
  const { valid, email } = await verifyAdminTokenAsync(token);

  if (valid) {
    return res.json({ authorized: true, valid: true, authenticated: true, role: 'admin', email });
  }

  return res.status(401).json({ authorized: false, valid: false, error: 'Unauthorized session.' });
};

adminAuthRouter.get('/api/v1/admin/verify', handleVerify);
adminAuthRouter.post('/api/v1/admin/verify', handleVerify);
adminAuthRouter.post('/api/v1/admin/verify-session', handleVerify);
adminAuthRouter.get('/api/v1/admin/auth/me', handleVerify);
adminAuthRouter.get('/api/v1/admin/auth/check-session', handleVerify);

// ─────────────────────────────────────────────────────────────────────────────
// GOOGLE AUTH VERIFICATION ENDPOINT (Server-side Firebase ID token check)
// ─────────────────────────────────────────────────────────────────────────────
adminAuthRouter.post('/api/v1/admin/google-login', async (req, res) => {
  const { configuredEmail } = getAdminConfig();
  const authHeader = String(req.headers.authorization || '');
  const idToken = String(req.body?.idToken || authHeader.replace(/^Bearer\s+/i, '') || '').trim();

  if (!configuredEmail) {
    return res.status(401).json({ ok: false, error: 'Administrator email is not configured on the server.' });
  }

  if (!idToken) {
    return res.status(401).json({ ok: false, error: 'A verified Google sign-in token is required.' });
  }

  const verified = await verifyFirebaseIdToken(idToken);
  if (!verified.valid || !verified.email || !safeEqualString(verified.email, configuredEmail)) {
    return res.status(401).json({ ok: false, error: 'Access denied: Google account could not be verified as administrator.' });
  }

  const token = generateToken(configuredEmail);
  return res.json({
    ok: true,
    success: true,
    token,
    email: configuredEmail
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// REFRESH & LOGOUT
// ─────────────────────────────────────────────────────────────────────────────
adminAuthRouter.post('/api/v1/admin/refresh-token', async (req, res) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace(/^Bearer\s+/i, '') || req.body?.idToken || req.body?.token;
  const { valid, email } = await verifyAdminTokenAsync(token);
  if (!valid || !email) {
    return res.status(401).json({ ok: false, error: 'Cannot refresh invalid token.' });
  }
  const newToken = generateToken(email);
  return res.json({ ok: true, token: newToken, expiresAt: Date.now() + 55 * 60 * 1000 });
});

adminAuthRouter.post('/api/v1/admin/logout', (_req, res) => {
  return res.json({ success: true, ok: true });
});
adminAuthRouter.post('/api/v1/admin/auth/logout', (_req, res) => {
  return res.json({ success: true, ok: true });
});
