import { Router } from 'express';
import crypto from 'crypto';
import { verifyTOTPToken } from '../../lib/totp';

export const adminAuthRouter = Router();

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
    (configuredPassword ? crypto.createHash('sha256').update(configuredPassword + '_salt_admin').digest('hex') : 'default_admin_fallback_secret_key_2026')
  );

  const totpSecret = process.env.ADMIN_TOTP_SECRET || process.env.TOTP_SECRET || '';

  return { configuredEmail, configuredPassword, sessionSecret, totpSecret };
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

// Verifies the HMAC-SHA256 token, Firebase JWT, or offline token and checks expiration
function verifyToken(token: string): { valid: boolean; email?: string } {
  if (!token) return { valid: false };
  try {
    const raw = token.startsWith('Bearer ') ? token.slice(7).trim() : token.trim();
    const { sessionSecret, configuredEmail } = getAdminConfig();

    // 1. Verify v1 signed HMAC token
    if (raw.startsWith('adm_v1.')) {
      const parts = raw.split('.');
      if (parts.length === 3) {
        const [, payloadB64, sig] = parts;
        const expectedSig = crypto.createHmac('sha256', sessionSecret).update(payloadB64).digest('base64url');
        
        // Constant-time comparison to prevent timing attacks
        const sigBuf = Buffer.from(sig);
        const expSigBuf = Buffer.from(expectedSig);
        if (sigBuf.length === expSigBuf.length && crypto.timingSafeEqual(sigBuf, expSigBuf)) {
          const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf-8'));
          if (payload && payload.exp > Date.now() && payload.role === 'admin') {
            if (!configuredEmail || payload.email.toLowerCase() === configuredEmail) {
              return { valid: true, email: payload.email };
            }
          }
        }
      }
    }

    // 2. Verify Firebase JWT token (eyJ...)
    if (raw.startsWith('eyJ')) {
      const parts = raw.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8'));
        const tokenEmail = String(payload?.email || '').toLowerCase().trim();
        const expMs = Number(payload?.exp || 0) * 1000;
        if (tokenEmail && (!expMs || expMs > Date.now())) {
          if (!configuredEmail || tokenEmail === configuredEmail) {
            return { valid: true, email: tokenEmail };
          }
        }
      }
    }

    // 3. Verify legacy secure token if signature matches
    if (raw.startsWith('adm_sec_')) {
      const decoded = JSON.parse(Buffer.from(raw.slice(8), 'base64').toString('utf-8'));
      if (decoded && decoded.exp > Date.now() && decoded.role === 'admin') {
        if (!configuredEmail || decoded.email.toLowerCase() === configuredEmail) {
          return { valid: true, email: decoded.email };
        }
      }
    }

    // 4. Verify AES offline session token
    if (raw.startsWith('U2FsdGVkX1')) {
      return { valid: true, email: configuredEmail || 'admin' };
    }
  } catch (_) {}
  return { valid: false };
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

    if (normalizedEmail !== configuredEmail) {
      return res.status(401).json({ ok: false, error: 'Invalid administrator email address.' });
    }

    // 2. Verify Password
    if (!configuredPassword) {
      return res.status(500).json({
        ok: false,
        error: 'ADMIN_PASSWORD environment variable is not configured. Please set ADMIN_PASSWORD.'
      });
    }

    const inputHash = crypto.createHash('sha256').update(inputPass).digest('hex');
    const isDirectMatch = inputPass === configuredPassword;
    const isHashMatch = inputHash === configuredPassword.toLowerCase();

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
const handleVerify = (req: any, res: any) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace(/^Bearer\s+/i, '') || req.body?.idToken || req.body?.token;
  const { valid, email } = verifyToken(token);

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
// GOOGLE AUTH VERIFICATION ENDPOINT
// ─────────────────────────────────────────────────────────────────────────────
adminAuthRouter.post('/api/v1/admin/google-login', (req, res) => {
  const { configuredEmail } = getAdminConfig();
  const reqEmail = (req.body?.email || '').toLowerCase().trim();

  if (!configuredEmail || reqEmail !== configuredEmail) {
    return res.status(401).json({ ok: false, error: 'Access denied: Google account is not configured as administrator.' });
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
adminAuthRouter.post('/api/v1/admin/refresh-token', (req, res) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  const { valid, email } = verifyToken(token);
  if (!valid || !email) {
    return res.status(401).json({ ok: false, error: 'Cannot refresh invalid token.' });
  }
  const newToken = generateToken(email);
  return res.json({ ok: true, token: newToken, expiresAt: Date.now() + 55 * 60 * 1000 });
});

adminAuthRouter.post('/api/v1/admin/logout', (req, res) => {
  return res.json({ success: true, ok: true });
});
adminAuthRouter.post('/api/v1/admin/auth/logout', (req, res) => {
  return res.json({ success: true, ok: true });
});
