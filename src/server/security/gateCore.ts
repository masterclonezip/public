import {
  TURNSTILE_ACTION,
  TOKEN_V,
  NONCE_TTL_MS,
  NONCE_BURN_TTL_S,
  DWELL_HARD_BELOW_MS,
  MIN_SERVER_DWELL_MS,
  DWELL_NV0_MIN_MS,
  TOUCH_MIN_MS,
  TOUCH_MAX_MS,
  INIT_RATE_DEVICE,
  INIT_RATE_NET,
  CLEARANCE_BURST,
  QUARANTINE_HARD_S,
  NET_FLOOD_HARD,
  NET_COOLDOWN_S,
  SOFT_STRIKES_DEVICE,
  SOFT_STRIKES_NET,
  SITEVERIFY_TIMEOUT_MS,
  REQUEST_BODY_MAX_BYTES,
  HARD_PAD_MS,
  APP_DAILY_ISSUE_CAP_DEFAULT,
  DID_COOKIE,
  DID_COOKIE_MAX_AGE_S,
  DEFAULT_ALLOWED_HOSTNAMES,
  HOSTING_ASNS,
  HOSTING_ORG_KEYWORDS,
  NEVER_BLOCK_ASNS,
  TEXT_PHYSICS_DENYLIST,
  DEFAULT_SIGNAL_MODES,
  HARD_RESPONSE_STATUS,
  HARD_RESPONSE_BODY,
  STRICT_FAMILIES,
  type BrowserFamily,
  type SignalMode,
  type TokenV12,
} from '../../lib/gateConfig.js';
import {
  resolveDestinationUrl,
  getCandidateTurnstileSecrets,
} from '../services/linkService.js';

export interface GateRequestContext {
  method: string;
  path: string;
  headers: Record<string, string | undefined>;
  rawBody: string;
  ip: string;
  cf?: {
    asn?: number;
    asOrganization?: string;
    httpProtocol?: string;
    tlsVersion?: string;
  };
  adapter: 'cloudflare' | 'express' | 'vercel';
  env: Record<string, string | undefined>;
}

export interface GateResponse {
  status: number;
  headers: Record<string, string>;
  body: string;
}

// ============================================================================
// Isolate / In-Memory Fast Caches & Local Dev Redis Fallback
// ============================================================================

const isolateQuarantineCache = new Map<string, number>(); // did -> expiresAtMs
let cachedSignalModes: { modes: Record<string, SignalMode>; expiresAt: number } | null = null;

interface LocalMemEntry {
  val: string;
  expiresAt: number;
}
const localMemRedis = new Map<string, LocalMemEntry>();

function cleanLocalKey(key: string): LocalMemEntry | undefined {
  const entry = localMemRedis.get(key);
  if (entry && entry.expiresAt > 0 && Date.now() > entry.expiresAt) {
    localMemRedis.delete(key);
    return undefined;
  }
  return entry;
}

function execLocalCommand(cmd: (string | number)[]): unknown {
  const op = String(cmd[0] || '').toUpperCase();
  const key = String(cmd[1] || '');
  const now = Date.now();

  if (op === 'GET') {
    const e = cleanLocalKey(key);
    return e ? e.val : null;
  }
  if (op === 'SET') {
    const val = String(cmd[2] ?? '');
    let ttlMs = 0;
    let nx = false;
    for (let i = 3; i < cmd.length; i++) {
      const token = String(cmd[i]).toUpperCase();
      if (token === 'EX' && cmd[i + 1] !== undefined) {
        ttlMs = Number(cmd[i + 1]) * 1000;
        i++;
      } else if (token === 'PX' && cmd[i + 1] !== undefined) {
        ttlMs = Number(cmd[i + 1]);
        i++;
      } else if (token === 'NX') {
        nx = true;
      }
    }
    const existing = cleanLocalKey(key);
    if (nx && existing) {
      return null;
    }
    localMemRedis.set(key, {
      val,
      expiresAt: ttlMs > 0 ? now + ttlMs : 0,
    });
    return 'OK';
  }
  if (op === 'INCR' || op === 'INCRBY') {
    const delta = op === 'INCRBY' ? Number(cmd[2] ?? 1) : 1;
    const existing = cleanLocalKey(key);
    const nextVal = (existing ? Number(existing.val) || 0 : 0) + delta;
    localMemRedis.set(key, {
      val: String(nextVal),
      expiresAt: existing ? existing.expiresAt : 0,
    });
    return nextVal;
  }
  if (op === 'EXPIRE') {
    const seconds = Number(cmd[2] ?? 0);
    const nxt = String(cmd[3] ?? '').toUpperCase();
    const existing = cleanLocalKey(key);
    if (!existing) return 0;
    if (nxt === 'NX' && existing.expiresAt > 0) return 0;
    existing.expiresAt = now + seconds * 1000;
    return 1;
  }
  if (op === 'PEXPIRE') {
    const ms = Number(cmd[2] ?? 0);
    const nxt = String(cmd[3] ?? '').toUpperCase();
    const existing = cleanLocalKey(key);
    if (!existing) return 0;
    if (nxt === 'NX' && existing.expiresAt > 0) return 0;
    existing.expiresAt = now + ms;
    return 1;
  }
  if (op === 'DEL') {
    let deleted = 0;
    for (let i = 1; i < cmd.length; i++) {
      if (localMemRedis.delete(String(cmd[i] || ''))) deleted++;
    }
    return deleted;
  }
  return null;
}

async function runRedisPipeline(
  commands: (string | number)[][],
  env: Record<string, string | undefined>
): Promise<{ ok: boolean; results: unknown[] }> {
  const url = (env.UPSTASH_REDIS_REST_URL || '').trim();
  const token = (env.UPSTASH_REDIS_REST_TOKEN || '').trim();

  if (!url || !token) {
    // Fallback to in-memory Redis when Upstash env vars are not configured
    const results = commands.map((c) => execLocalCommand(c));
    return { ok: true, results };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 1500);
  try {
    const endpoint = url.endsWith('/') ? `${url}pipeline` : `${url}/pipeline`;
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(commands),
      signal: controller.signal,
    });
    if (!res.ok) {
      return { ok: false, results: [] };
    }
    const data = (await res.json()) as Array<{ result?: unknown; error?: string }>;
    if (!Array.isArray(data) || data.some((d) => d && typeof d.error === 'string')) {
      return { ok: false, results: [] };
    }
    return { ok: true, results: data.map((d) => d.result) };
  } catch {
    return { ok: false, results: [] };
  } finally {
    clearTimeout(timer);
  }
}

// ============================================================================
// Web Crypto Primitives (Zero Node-specific dependencies)
// ============================================================================

const textEncoder = new TextEncoder();

function bytesToHex(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i++) {
    out += bytes[i].toString(16).padStart(2, '0');
  }
  return out;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const b64 =
    typeof btoa === 'function'
      ? btoa(binary)
      : Buffer.from(bytes).toString('base64');
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlToUtf8(input: string): string | null {
  try {
    const trimmed = input.trim();
    if (trimmed.startsWith('{')) return trimmed;
    const b64 = trimmed.replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
    if (typeof atob === 'function') {
      const bin = atob(padded);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return new TextDecoder().decode(bytes);
    }
    return Buffer.from(padded, 'base64').toString('utf-8');
  } catch {
    return null;
  }
}

export async function sha256HexServer(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', textEncoder.encode(input));
  return bytesToHex(new Uint8Array(buf));
}

async function hmacSha256Truncated16B64Url(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    textEncoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, textEncoder.encode(message));
  return bytesToBase64Url(new Uint8Array(sig).slice(0, 16));
}

export function timingSafeEqualStr(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const aBytes = textEncoder.encode(a);
  const bBytes = textEncoder.encode(b);
  if (aBytes.length !== bBytes.length) return false;
  let diff = 0;
  for (let i = 0; i < aBytes.length; i++) {
    diff |= aBytes[i] ^ bBytes[i];
  }
  return diff === 0;
}

function randomHex16Bytes(): string {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return bytesToHex(arr);
}

// ============================================================================
// Standard Envelopes, Headers & Counter Helpers
// ============================================================================

function baseSecurityHeaders(setCookie?: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store, no-cache, must-revalidate, private, max-age=0',
    'CDN-Cache-Control': 'no-store, private',
    'Cloudflare-CDN-Cache-Control': 'no-store, private',
    Pragma: 'no-cache',
    Expires: '0',
    'Referrer-Policy': 'no-referrer',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-Robots-Tag': 'noindex, nofollow, noarchive, nosnippet',
  };
  if (setCookie) {
    headers['Set-Cookie'] = setCookie;
  }
  return headers;
}

function hard404Response(): GateResponse {
  return {
    status: HARD_RESPONSE_STATUS,
    headers: baseSecurityHeaders(),
    body: HARD_RESPONSE_BODY,
  };
}

async function paddedHard404Response(): Promise<GateResponse> {
  const [minMs, maxMs] = HARD_PAD_MS;
  const delay = minMs + Math.floor(Math.random() * (maxMs - minMs + 1));
  await new Promise((r) => setTimeout(r, delay));
  return hard404Response();
}

function softRetryResponse(opts?: { reload?: 1; setCookie?: string }): GateResponse {
  const payload = opts?.reload === 1 ? { status: 'retry', reload: 1 } : { status: 'retry' };
  return {
    status: 200,
    headers: baseSecurityHeaders(opts?.setCookie),
    body: JSON.stringify(payload),
  };
}

function getUtcDateStamp(): string {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

function emitGateCounter(
  env: Record<string, string | undefined>,
  gate: string,
  signal: string,
  outcome: 'pass' | 'fail',
  family: string
): void {
  // Sample pass counters 1-in-10 (increment by 10); always record fail counters (§5.7)
  if (outcome === 'pass' && Math.random() >= 0.1) return;
  const inc = outcome === 'pass' ? 10 : 1;
  const dateStr = getUtcDateStamp();
  const key = `gate:${gate}:${signal}:${outcome}:${dateStr}:${family || 'unknown'}`;
  const ttlS = 14 * 86400;
  void runRedisPipeline(
    [
      ['INCRBY', key, inc],
      ['EXPIRE', key, ttlS, 'NX'],
    ],
    env
  );
}

// ============================================================================
// Derived Keys & Cookie Helpers (§3.1 & §5.4)
// ============================================================================

export function computeIpKey(rawIp: string): string {
  const ip = (rawIp || '0.0.0.0').trim();
  if (ip.includes(':')) {
    const parts = ip.split(':');
    return parts.slice(0, 4).join(':') + '::/64';
  }
  return ip;
}

export async function computeNetKey(
  rawIp: string,
  ua: string,
  acceptLang: string
): Promise<string> {
  const ipKey = computeIpKey(rawIp);
  const h = await sha256HexServer(`${ipKey} ${ua} ${acceptLang}`);
  return h.slice(0, 32);
}

function getDidSecret(env: Record<string, string | undefined>): string {
  const s = (
    env.DID_HMAC_SECRET ||
    env.GATE_SIGNING_SECRET ||
    env.NONCE_HMAC_SECRET ||
    env.AES_KEY ||
    env.AES_SECRET ||
    ''
  ).trim();
  if (s) return s;
  return 'default-v12-did-hmac-fallback-secret-32-bytes';
}

function getNonceSecrets(env: Record<string, string | undefined>): string[] {
  const out: string[] = [];
  if (env.NONCE_HMAC_SECRET?.trim()) out.push(env.NONCE_HMAC_SECRET.trim());
  if (env.GATE_SIGNING_SECRET?.trim()) out.push(env.GATE_SIGNING_SECRET.trim());
  if (env.NONCE_HMAC_SECRET_PREVIOUS?.trim()) out.push(env.NONCE_HMAC_SECRET_PREVIOUS.trim());
  if (env.DID_HMAC_SECRET?.trim()) out.push(env.DID_HMAC_SECRET.trim());
  if (env.AES_KEY?.trim()) out.push(env.AES_KEY.trim());
  if (out.length === 0) {
    out.push('default-v12-nonce-hmac-fallback-secret-32-bytes');
  }
  return out;
}

function parseCookies(cookieHeader?: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!cookieHeader) return out;
  for (const pair of cookieHeader.split(';')) {
    const idx = pair.indexOf('=');
    if (idx > 0) {
      const k = pair.slice(0, idx).trim();
      const v = pair.slice(idx + 1).trim();
      out[k] = v;
    }
  }
  return out;
}

export async function verifyDidCookie(
  cookieHeader: string | undefined,
  env: Record<string, string | undefined>
): Promise<string | null> {
  const secret = getDidSecret(env);
  if (!secret) return null;
  const cookies = parseCookies(cookieHeader);
  const raw = cookies[DID_COOKIE] || (env.NODE_ENV !== 'production' ? cookies['rd_did'] : undefined);
  if (!raw) return null;
  const dotIdx = raw.indexOf('.');
  if (dotIdx !== 32) return null;
  const hex = raw.slice(0, 32);
  const sig = raw.slice(33);
  if (!/^[0-9a-f]{32}$/.test(hex) || !sig) return null;
  const expected = await hmacSha256Truncated16B64Url(secret, hex);
  if (!timingSafeEqualStr(sig, expected)) return null;
  return hex;
}

export async function mintDidCookie(
  env: Record<string, string | undefined>
): Promise<{ did: string; setCookie: string } | null> {
  const secret = getDidSecret(env);
  if (!secret) return null;
  const did = randomHex16Bytes();
  const sig = await hmacSha256Truncated16B64Url(secret, did);
  const val = `${did}.${sig}`;
  const setCookie = `${DID_COOKIE}=${val}; Secure; HttpOnly; SameSite=Lax; Path=/; Max-Age=${DID_COOKIE_MAX_AGE_S}`;
  return { did, setCookie };
}

export async function issueStatelessNonce(
  appId: string,
  env: Record<string, string | undefined>,
  explicitSecret?: string
): Promise<string | null> {
  const secrets = explicitSecret ? [explicitSecret] : getNonceSecrets(env);
  const primary = secrets[0];
  if (!primary) return null;
  const nid = randomHex16Bytes();
  const issuedAtMs = String(Date.now());
  const sig = await hmacSha256Truncated16B64Url(primary, `${nid}|${issuedAtMs}|${appId}`);
  return `${nid}.${issuedAtMs}.${sig}`;
}

export async function verifyStatelessNonce(
  nonce: string,
  appId: string,
  env: Record<string, string | undefined>
): Promise<{ valid: true; nid: string; issuedAtMs: number } | { valid: false }> {
  if (!nonce || typeof nonce !== 'string') return { valid: false };
  const parts = nonce.split('.');
  if (parts.length !== 3) return { valid: false };
  const [nid, issuedStr, sig] = parts;
  if (!/^[0-9a-f]{32}$/.test(nid) || !/^\d{10,15}$/.test(issuedStr) || !sig) {
    return { valid: false };
  }
  const issuedAtMs = Number(issuedStr);
  if (!Number.isFinite(issuedAtMs) || issuedAtMs <= 0) return { valid: false };

  const secrets = getNonceSecrets(env);
  for (const secret of secrets) {
    const expected = await hmacSha256Truncated16B64Url(secret, `${nid}|${issuedStr}|${appId}`);
    if (timingSafeEqualStr(sig, expected)) {
      return { valid: true, nid, issuedAtMs };
    }
  }
  return { valid: false };
}

// ============================================================================
// Gate G1 — Edge, ASN, Transport, OS & Header Coherence (§5.7)
// ============================================================================

const UA_BLACKLIST_TOKENS = [
  'curl/',
  'wget/',
  'python',
  'urllib',
  'requests',
  'httpx',
  'aiohttp',
  'scrapy',
  'axios',
  'httpclient',
  'go-http-client',
  'okhttp',
  'guzzle',
  'node-fetch',
  'postman',
  'insomnia',
  'headlesschrome',
  'puppeteer',
  'playwright',
  'selenium',
  'phantomjs',
  'webdriver',
  'cypress',
  'crawler',
  'spider',
  'scraper',
  'ahrefsbot',
  'semrushbot',
  'dotbot',
  'mj12bot',
  'petalbot',
  'bytespider',
  'gptbot',
  'claudebot',
  'perplexitybot',
  'googlebot',
  'bingbot',
  'yandexbot',
  'baiduspider',
];

export function classifyUA(ua: string): BrowserFamily {
  const isIpadDesktopMode = /Macintosh/.test(ua) && /Mobile\//.test(ua) && /Safari\//.test(ua);
  if (/iPhone|iPad|iPod/.test(ua) || isIpadDesktopMode) {
    if (/CriOS\//.test(ua)) return 'ios-chrome';
    if (/FxiOS\//.test(ua)) return 'ios-firefox';
    if ((/Version\//.test(ua) || isIpadDesktopMode) && /Safari\//.test(ua) && !/EdgiOS\/|OPiOS\//.test(ua)) {
      return 'ios-safari';
    }
    return 'ios-inapp';
  }
  if (/; wv\)/.test(ua)) return 'android-webview';
  if (/SamsungBrowser\//.test(ua)) return 'android-samsung';
  if (/EdgA\//.test(ua)) return 'android-edge';
  if (/Firefox\//.test(ua)) return 'android-firefox';
  if (
    /Chrome\//.test(ua) &&
    !/SamsungBrowser|EdgA|OPR\/|OPT\/|UCBrowser|MiuiBrowser|HeyTapBrowser|Vivaldi|YaBrowser|; wv\)/.test(
      ua
    )
  ) {
    return 'android-chrome';
  }
  return 'android-other';
}

function getAllowedHostnames(env: Record<string, string | undefined>): Set<string> {
  const raw = env.ALLOWED_HOSTNAMES || DEFAULT_ALLOWED_HOSTNAMES.join(',');
  const set = new Set<string>(
    raw
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
  );
  const pubDomain = (env.PUBLIC_DOMAIN || env.VITE_PUBLIC_DOMAIN || '').trim();
  if (pubDomain) {
    try {
      const parsedHost = new URL(pubDomain.startsWith('http') ? pubDomain : `https://${pubDomain}`).hostname.toLowerCase();
      const bare = parsedHost.replace(/^www\./, '');
      set.add(bare);
      set.add(`www.${bare}`);
    } catch {
      // ignore invalid URL
    }
  }
  if (env.NODE_ENV !== 'production' && env.STRICT_HOST_CHECK !== '1') {
    set.add('localhost');
    set.add('127.0.0.1');
  }
  return set;
}

function isIosBelow16_4(ua: string): boolean {
  const m = ua.match(/OS (\d+)_(\d+)/);
  if (!m) return false;
  const major = Number(m[1]);
  const minor = Number(m[2]);
  return major < 16 || (major === 16 && minor < 4);
}

export function evaluateGateG1(
  ctx: GateRequestContext
): { pass: true; family: BrowserFamily } | { pass: false; reason: string; family: string } {
  const h = ctx.headers;
  const env = ctx.env;

  // 1. Host Allowlist & Preview Detection
  const rawHost = (h['x-forwarded-host'] || h['host'] || '').split(',')[0].trim().toLowerCase();
  const hostname = rawHost.split(':')[0];
  if (!hostname) {
    return { pass: false, reason: 'bad_host', family: 'unknown' };
  }
  if (
    env.STRICT_HOST_CHECK === '1' &&
    (hostname.endsWith('.pages.dev') || hostname.endsWith('.vercel.app'))
  ) {
    return { pass: false, reason: 'bad_host', family: 'unknown' };
  }
  const allowedHosts = getAllowedHostnames(env);
  const isPreviewHost =
    env.STRICT_HOST_CHECK !== '1' &&
    (allowedHosts.size === 0 ||
      hostname.endsWith('.run.app') ||
      hostname.endsWith('.pages.dev') ||
      hostname.endsWith('.vercel.app') ||
      hostname === 'localhost' ||
      hostname === '127.0.0.1');
  if (!allowedHosts.has(hostname) && !isPreviewHost) {
    return { pass: false, reason: 'bad_host', family: 'unknown' };
  }

  // 2. Origin Auth (X-CF-Auth on Express/Vercel adapters)
  const expectedCfAuth = (env.X_CF_AUTH_SECRET || '').trim();
  const providedCfAuth = h['x-cf-auth'];
  let trustedForwardedCf = false;

  if (ctx.adapter !== 'cloudflare') {
    if (expectedCfAuth) {
      // On direct AI Studio Cloud Run / preview domains without Cloudflare in front,
      // only enforce X-CF-Auth if explicitly provided or STRICT_ORIGIN_AUTH=1.
      if (!isPreviewHost || providedCfAuth !== undefined || env.STRICT_ORIGIN_AUTH === '1') {
        if (!providedCfAuth || !timingSafeEqualStr(providedCfAuth, expectedCfAuth)) {
          return { pass: false, reason: 'origin_auth', family: 'unknown' };
        }
        trustedForwardedCf = true;
      }
    } else if (providedCfAuth !== undefined) {
      // Explicit X-CF-Auth test probe without valid secret
      return { pass: false, reason: 'origin_auth', family: 'unknown' };
    }
  } else {
    trustedForwardedCf = true;
  }

  // 3. UA Blacklist & Floor
  const ua = (h['user-agent'] || '').trim();
  if (ua.length < 10) {
    return { pass: false, reason: 'ua_short', family: 'unknown' };
  }
  const uaLower = ua.toLowerCase();
  for (const token of UA_BLACKLIST_TOKENS) {
    if (uaLower.includes(token)) {
      return { pass: false, reason: 'ua_blacklist', family: 'unknown' };
    }
  }

  // 4. Mobile OS & Client-Hints Desktop Contradiction (supports iPadOS 13+ Mobile Safari)
  const isIpadDesktopMode = /Macintosh/.test(ua) && /Mobile\//.test(ua) && /Safari\//.test(ua);
  const hasAndroidToken = /Android/i.test(ua);
  if (!/Android|iPhone|iPad|iPod/i.test(ua) && !isIpadDesktopMode) {
    return { pass: false, reason: 'non_mobile_ua', family: 'unknown' };
  }
  if (
    /Windows|CrOS/.test(ua) ||
    (/X11/.test(ua) && !hasAndroidToken) ||
    (/Macintosh/.test(ua) && !isIpadDesktopMode)
  ) {
    return { pass: false, reason: 'desktop_ua_token', family: 'unknown' };
  }

  const chMobile = (h['sec-ch-ua-mobile'] || '').trim();
  if (chMobile === '?0') {
    return { pass: false, reason: 'ch_mobile_0', family: 'unknown' };
  }
  const chPlatRaw = (h['sec-ch-ua-platform'] || '').trim().replace(/^"|"$/g, '');
  if (
    /^(Windows|macOS|Chrome OS|Chromium OS)$/i.test(chPlatRaw) ||
    (chPlatRaw.toLowerCase() === 'linux' && !/Android/i.test(ua))
  ) {
    return { pass: false, reason: 'ch_desktop_platform', family: 'unknown' };
  }

  // 5. ASN & Hosting Organization
  const asn =
    ctx.cf?.asn ??
    (trustedForwardedCf && h['x-cf-asn'] ? Number(h['x-cf-asn']) : undefined);
  const asOrg = (
    ctx.cf?.asOrganization ||
    (trustedForwardedCf ? h['x-cf-as-org'] : '') ||
    ''
  ).toLowerCase();

  if (asn && Number.isFinite(asn) && !NEVER_BLOCK_ASNS.has(asn)) {
    if (HOSTING_ASNS.has(asn)) {
      return { pass: false, reason: 'hosting_asn', family: 'unknown' };
    }
    if (asOrg && HOSTING_ORG_KEYWORDS.some((kw) => asOrg.includes(kw))) {
      return { pass: false, reason: 'hosting_org', family: 'unknown' };
    }
  }

  // 6. Browser Family
  const family = classifyUA(ua);

  // 7. Header Coherence per Family
  // Detect explicit desktop contradictions rather than dropping privacy-hardened mobile browsers
  if (chMobile === '?0') {
    return { pass: false, reason: 'ch_mobile_0', family };
  }
  if (
    /^(Windows|macOS|Chrome OS|Chromium OS)$/i.test(chPlatRaw) ||
    (chPlatRaw.toLowerCase() === 'linux' && !/Android/i.test(ua))
  ) {
    return { pass: false, reason: 'ch_desktop_platform', family };
  }

  const secFetchSite = (h['sec-fetch-site'] || '').trim().toLowerCase();
  const secFetchMode = (h['sec-fetch-mode'] || '').trim().toLowerCase();

  if (secFetchSite && !['same-origin', 'same-site', 'none', 'cross-site'].includes(secFetchSite)) {
    return { pass: false, reason: 'sec_fetch_mismatch', family };
  }
  if (secFetchMode && !['cors', 'navigate', 'same-origin', 'no-cors'].includes(secFetchMode)) {
    return { pass: false, reason: 'sec_fetch_mismatch', family };
  }

  // 8. Transport Floor (Allow HTTP/1.1, HTTP/2, HTTP/3 for Indian cellular tower handovers)
  const httpProto =
    ctx.cf?.httpProtocol || (trustedForwardedCf ? h['x-cf-http-proto'] : undefined);
  if (httpProto && !/^(HTTP\/1\.1|HTTP\/2|HTTP\/3|h2|h3)$/i.test(httpProto.trim())) {
    return { pass: false, reason: 'http_proto_floor', family };
  }

  const tlsVer = ctx.cf?.tlsVersion || (trustedForwardedCf ? h['x-cf-tls'] : undefined);
  if (tlsVer && !/^(TLSv1\.2|TLSv1\.3)$/i.test(tlsVer.trim())) {
    return { pass: false, reason: 'tls_floor', family };
  }

  return { pass: true, family };
}

// ============================================================================
// Quarantine, Net Flood & Soft Strikes Helpers (G2 & Failure Recording)
// ============================================================================

async function recordHardFailure(
  did: string | null,
  netKey: string,
  env: Record<string, string | undefined>,
  quarantineDevice: boolean
): Promise<void> {
  const cmds: (string | number)[][] = [];
  if (quarantineDevice && did) {
    isolateQuarantineCache.set(did, Date.now() + QUARANTINE_HARD_S * 1000);
    cmds.push(['SET', `quarantine:${did}`, '1', 'EX', QUARANTINE_HARD_S, 'NX']);
  }
  if (!did) {
    // Only cookie-less requests count toward NET_FLOOD_HARD (§3.1)
    cmds.push(['INCR', `netflood:${netKey}`]);
    cmds.push(['EXPIRE', `netflood:${netKey}`, NET_FLOOD_HARD.windowS, 'NX']);
  }
  if (cmds.length === 0) return;

  const pipe = await runRedisPipeline(cmds, env);
  if (!did && pipe.ok) {
    const floodCount = Number(pipe.results[pipe.results.length - 2] ?? 0);
    if (floodCount >= NET_FLOOD_HARD.limit) {
      await runRedisPipeline(
        [['SET', `netcool:${netKey}`, '1', 'EX', NET_COOLDOWN_S, 'NX']],
        env
      );
    }
  }
}

async function recordSoftStrike(
  did: string | null,
  netKey: string,
  env: Record<string, string | undefined>
): Promise<void> {
  if (did) {
    const pipe = await runRedisPipeline(
      [
        ['INCR', `softstrike:did:${did}`],
        ['EXPIRE', `softstrike:did:${did}`, SOFT_STRIKES_DEVICE.windowS, 'NX'],
      ],
      env
    );
    if (pipe.ok && Number(pipe.results[0] ?? 0) >= SOFT_STRIKES_DEVICE.limit) {
      await runRedisPipeline(
        [['SET', `softcool:did:${did}`, '1', 'EX', SOFT_STRIKES_DEVICE.cooldownS, 'NX']],
        env
      );
    }
  } else {
    const pipe = await runRedisPipeline(
      [
        ['INCR', `softstrike:net:${netKey}`],
        ['EXPIRE', `softstrike:net:${netKey}`, SOFT_STRIKES_NET.windowS, 'NX'],
      ],
      env
    );
    if (pipe.ok && Number(pipe.results[0] ?? 0) >= SOFT_STRIKES_NET.limit) {
      await runRedisPipeline(
        [['SET', `netcool:${netKey}`, '1', 'EX', SOFT_STRIKES_NET.cooldownS, 'NX']],
        env
      );
    }
  }
}

async function getSignalModes(
  env: Record<string, string | undefined>
): Promise<Record<string, SignalMode>> {
  const now = Date.now();
  if (cachedSignalModes && now < cachedSignalModes.expiresAt) {
    return cachedSignalModes.modes;
  }
  const modes = { ...DEFAULT_SIGNAL_MODES };
  const pipe = await runRedisPipeline([['GET', 'cfg:signal_modes']], env);
  if (pipe.ok && typeof pipe.results[0] === 'string' && pipe.results[0]) {
    try {
      const parsed = JSON.parse(pipe.results[0]);
      if (parsed && typeof parsed === 'object') {
        for (const [k, v] of Object.entries(parsed)) {
          if (v === 'enforce' || v === 'shadow') {
            modes[k] = v;
          }
        }
      }
    } catch {
      // Keep default signal modes
    }
  }
  cachedSignalModes = { modes, expiresAt: now + 30000 };
  return modes;
}

// ============================================================================
// Step 5.4 — POST /api/v1/app/session-init (G1 + G2 -> Nonce + Cookie)
// ============================================================================

export async function handleSessionInit(ctx: GateRequestContext): Promise<GateResponse> {
  if (ctx.method.toUpperCase() !== 'POST') {
    return hard404Response();
  }

  const ua = (ctx.headers['user-agent'] || '').trim();
  const acceptLang = (ctx.headers['accept-language'] || '').trim();
  const netKey = await computeNetKey(ctx.ip, ua, acceptLang);

  // Gate G1
  const g1 = evaluateGateG1(ctx);
  if (g1.pass === false) {
    emitGateCounter(ctx.env, 'G1', g1.reason, 'fail', g1.family);
    await recordHardFailure(null, netKey, ctx.env, false);
    return hard404Response();
  }
  const family = g1.family;
  emitGateCounter(ctx.env, 'G1', 'edge', 'pass', family);

  // Body size & appId schema check
  if (textEncoder.encode(ctx.rawBody || '').byteLength > REQUEST_BODY_MAX_BYTES) {
    await recordHardFailure(null, netKey, ctx.env, false);
    return hard404Response();
  }

  let appId = '';
  try {
    const parsed = JSON.parse(ctx.rawBody || '{}');
    appId = typeof parsed?.appId === 'string' ? parsed.appId.trim() : '';
  } catch {
    await recordHardFailure(null, netKey, ctx.env, false);
    return hard404Response();
  }

  if (!/^[a-zA-Z0-9\-_]{1,64}$/.test(appId)) {
    await recordHardFailure(null, netKey, ctx.env, false);
    return hard404Response();
  }

  // Gate G2 — Read or mint __Host-rd_did, check per-device quarantine & init rates
  const isMobileFamily = family.startsWith('android-') || family.startsWith('ios-');
  let did = await verifyDidCookie(ctx.headers['cookie'], ctx.env);
  let setCookieHeader: string | undefined;

  // Always mint a per-device cookie on first visit so rate limits and quarantine are strictly isolated per phone,
  // never shared across carrier CGNAT or Wi-Fi netKey.
  if (!did) {
    const minted = await mintDidCookie(ctx.env);
    if (minted) {
      did = minted.did;
      setCookieHeader = minted.setCookie;
    }
  }

  if (did) {
    const memExp = isolateQuarantineCache.get(did);
    if (memExp && Date.now() < memExp) {
      if (isMobileFamily) {
        // Never permanently lock out a real mobile browser on session-init; rotate to a fresh device session
        isolateQuarantineCache.delete(did);
        const reminted = await mintDidCookie(ctx.env);
        if (reminted) {
          did = reminted.did;
          setCookieHeader = reminted.setCookie;
        }
      } else {
        emitGateCounter(ctx.env, 'G2', 'quarantine', 'fail', family);
        return hard404Response();
      }
    }
  }

  if (did) {
    const g2Pipe = await runRedisPipeline(
      [
        ['GET', `quarantine:${did}`],
        ['GET', `softcool:did:${did}`],
        ['INCR', `init:did:${did}`],
        ['EXPIRE', `init:did:${did}`, INIT_RATE_DEVICE.windowS, 'NX'],
      ],
      ctx.env
    );
    if (!g2Pipe.ok) {
      emitGateCounter(ctx.env, 'G2', 'redis_error', 'fail', family);
      return softRetryResponse({ setCookie: setCookieHeader });
    }
    const [isQuarantined, isSoftCool, didInitCount] = g2Pipe.results;
    if (isQuarantined) {
      if (isMobileFamily) {
        await runRedisPipeline([['DEL', `quarantine:${did}`]], ctx.env);
        isolateQuarantineCache.delete(did);
      } else {
        isolateQuarantineCache.set(did, Date.now() + 60000);
        emitGateCounter(ctx.env, 'G2', 'quarantine', 'fail', family);
        return hard404Response();
      }
    }
    if (
      isSoftCool ||
      Number(didInitCount ?? 0) > INIT_RATE_DEVICE.limit
    ) {
      emitGateCounter(ctx.env, 'G2', 'init_rate', 'fail', family);
      return softRetryResponse({ setCookie: setCookieHeader });
    }
  }

  const nonce = await issueStatelessNonce(appId, ctx.env);
  if (!nonce) {
    emitGateCounter(ctx.env, 'G3', 'nonce_secret_missing', 'fail', family);
    return softRetryResponse({ setCookie: setCookieHeader });
  }

  emitGateCounter(ctx.env, 'G2', 'init', 'pass', family);
  return {
    status: 200,
    headers: baseSecurityHeaders(setCookieHeader),
    body: JSON.stringify({ nonce }),
  };
}

// ============================================================================
// Step 5.7 — POST /api/v1/app/session-clearance (7 Sequential Gates)
// ============================================================================

export async function handleSessionClearance(ctx: GateRequestContext): Promise<GateResponse> {
  if (ctx.method.toUpperCase() !== 'POST') {
    return hard404Response();
  }

  const ua = (ctx.headers['user-agent'] || '').trim();
  const acceptLang = (ctx.headers['accept-language'] || '').trim();
  const netKey = await computeNetKey(ctx.ip, ua, acceptLang);

  // --------------------------------------------------------------------------
  // Gate G1 — Edge, ASN, Transport, OS & Header Coherence (< 0.1 ms, HARD)
  // --------------------------------------------------------------------------
  const g1 = evaluateGateG1(ctx);
  if (g1.pass === false) {
    emitGateCounter(ctx.env, 'G1', g1.reason, 'fail', g1.family);
    await recordHardFailure(null, netKey, ctx.env, false);
    return hard404Response();
  }
  const family = g1.family;
  const isMobileFamily = family.startsWith('android-') || family.startsWith('ios-');
  emitGateCounter(ctx.env, 'G1', 'edge', 'pass', family);

  // --------------------------------------------------------------------------
  // Gate G2 — Per-Device Quarantine & Burst (< 1 ms)
  // --------------------------------------------------------------------------
  let did = await verifyDidCookie(ctx.headers['cookie'], ctx.env);
  let setCookieHeader: string | undefined;

  if (!did && isMobileFamily) {
    const minted = await mintDidCookie(ctx.env);
    if (minted) {
      did = minted.did;
      setCookieHeader = minted.setCookie;
    }
  }

  if (did) {
    const memExp = isolateQuarantineCache.get(did);
    if (memExp && Date.now() < memExp && !isMobileFamily) {
      emitGateCounter(ctx.env, 'G2', 'quarantine', 'fail', family);
      return hard404Response();
    }

    const g2Pipe = await runRedisPipeline(
      [
        ['GET', `quarantine:${did}`],
        ['GET', `softcool:did:${did}`],
        ['INCR', `burst2s:did:${did}`],
        ['PEXPIRE', `burst2s:did:${did}`, CLEARANCE_BURST.hardWindowMs, 'NX'],
        ['INCR', `burst10s:did:${did}`],
        ['EXPIRE', `burst10s:did:${did}`, CLEARANCE_BURST.softWindowS, 'NX'],
      ],
      ctx.env
    );
    if (!g2Pipe.ok) {
      emitGateCounter(ctx.env, 'G2', 'redis_error', 'fail', family);
      return softRetryResponse({ setCookie: setCookieHeader });
    }
    const [isQuarantined, isSoftCool, burst2s, , burst10s] = g2Pipe.results;
    if (isQuarantined && !isMobileFamily) {
      isolateQuarantineCache.set(did, Date.now() + 60000);
      emitGateCounter(ctx.env, 'G2', 'quarantine', 'fail', family);
      return hard404Response();
    }
    if (Number(burst2s ?? 0) >= CLEARANCE_BURST.hardCount) {
      emitGateCounter(ctx.env, 'G2', 'burst_hard', 'fail', family);
      if (isMobileFamily) {
        return softRetryResponse({ setCookie: setCookieHeader });
      }
      await recordHardFailure(did, netKey, ctx.env, true);
      return hard404Response();
    }
    if (isSoftCool || Number(burst10s ?? 0) > CLEARANCE_BURST.softCount) {
      emitGateCounter(ctx.env, 'G2', 'burst_soft', 'fail', family);
      await recordSoftStrike(did, netKey, ctx.env);
      return softRetryResponse({ setCookie: setCookieHeader });
    }
  } else {
    // Cookie-less client: governed by net burst ceiling (never block shared mobile CGNAT via netcool)
    const g2Pipe = await runRedisPipeline(
      [
        ['GET', `netcool:${netKey}`],
        ['INCR', `burst2s:net:${netKey}`],
        ['PEXPIRE', `burst2s:net:${netKey}`, CLEARANCE_BURST.hardWindowMs, 'NX'],
        ['INCR', `burst10s:net:${netKey}`],
        ['EXPIRE', `burst10s:net:${netKey}`, CLEARANCE_BURST.softWindowS, 'NX'],
      ],
      ctx.env
    );
    if (!g2Pipe.ok) {
      emitGateCounter(ctx.env, 'G2', 'redis_error', 'fail', family);
      return softRetryResponse();
    }
    const [isNetCool, burst2s, , burst10s] = g2Pipe.results;
    if (isNetCool && !isMobileFamily) {
      emitGateCounter(ctx.env, 'G2', 'netcool', 'fail', family);
      return hard404Response();
    }
    if (Number(burst2s ?? 0) >= CLEARANCE_BURST.hardCount * 4) {
      emitGateCounter(ctx.env, 'G2', 'burst_net_hard', 'fail', family);
      if (isMobileFamily) {
        return softRetryResponse();
      }
      await recordHardFailure(null, netKey, ctx.env, false);
      return hard404Response();
    }
    if (Number(burst10s ?? 0) > CLEARANCE_BURST.softCount * 4) {
      emitGateCounter(ctx.env, 'G2', 'burst_net_soft', 'fail', family);
      await recordSoftStrike(null, netKey, ctx.env);
      return softRetryResponse();
    }
  }
  emitGateCounter(ctx.env, 'G2', 'burst', 'pass', family);

  // --------------------------------------------------------------------------
  // Gate G3 — Token, Nonce & Server Dwell (< 1 ms)
  // --------------------------------------------------------------------------
  if (
    !ctx.rawBody ||
    textEncoder.encode(ctx.rawBody).byteLength > REQUEST_BODY_MAX_BYTES
  ) {
    emitGateCounter(ctx.env, 'G3', 'body_size', 'fail', family);
    await recordHardFailure(did, netKey, ctx.env, false);
    return paddedHard404Response();
  }

  let bodyObj: { token?: unknown; cf?: unknown };
  try {
    bodyObj = JSON.parse(ctx.rawBody);
  } catch {
    emitGateCounter(ctx.env, 'G3', 'body_json', 'fail', family);
    await recordHardFailure(did, netKey, ctx.env, false);
    return paddedHard404Response();
  }

  if (
    !bodyObj ||
    typeof bodyObj.token !== 'string' ||
    !bodyObj.token.trim() ||
    typeof bodyObj.cf !== 'string' ||
    !bodyObj.cf.trim()
  ) {
    emitGateCounter(ctx.env, 'G3', 'missing_fields', 'fail', family);
    await recordHardFailure(did, netKey, ctx.env, false);
    return paddedHard404Response();
  }

  const cfToken = bodyObj.cf.trim();
  const decodedTokenStr = base64UrlToUtf8(bodyObj.token);
  if (!decodedTokenStr) {
    emitGateCounter(ctx.env, 'G3', 'token_b64', 'fail', family);
    await recordHardFailure(did, netKey, ctx.env, false);
    return paddedHard404Response();
  }

  let token: Partial<TokenV12> & Record<string, any>;
  try {
    token = JSON.parse(decodedTokenStr);
  } catch {
    emitGateCounter(ctx.env, 'G3', 'token_json', 'fail', family);
    await recordHardFailure(did, netKey, ctx.env, false);
    return paddedHard404Response();
  }

  if (!token || typeof token !== 'object' || typeof token.v !== 'number') {
    emitGateCounter(ctx.env, 'G3', 'token_schema', 'fail', family);
    await recordHardFailure(did, netKey, ctx.env, false);
    return paddedHard404Response();
  }

  // 2. Version check: v !== TOKEN_V => SOFT with reload: 1 (no quarantine)
  if (token.v !== TOKEN_V) {
    emitGateCounter(ctx.env, 'G3', 'token_version', 'fail', family);
    await recordSoftStrike(did, netKey, ctx.env);
    return softRetryResponse({ reload: 1 });
  }

  // Strict schema check on all TokenV12 fields
  const appId = typeof token.id === 'string' ? token.id.trim() : '';
  const nonceStr = typeof token.nonce === 'string' ? token.nonce.trim() : '';
  const nv = token.nv;
  const hardRaw = token.hard;
  const softRaw = token.soft;
  const tap = token.tap;
  const flags = token.f;

  if (
    !/^[a-zA-Z0-9\-_]{1,64}$/.test(appId) ||
    !nonceStr ||
    (nv !== 0 && nv !== 1) ||
    typeof hardRaw !== 'string' ||
    !hardRaw ||
    typeof softRaw !== 'string' ||
    !softRaw ||
    !tap ||
    typeof tap !== 'object' ||
    !flags ||
    typeof flags !== 'object'
  ) {
    emitGateCounter(ctx.env, 'G3', 'token_schema_fields', 'fail', family);
    await recordHardFailure(did, netKey, ctx.env, false);
    return paddedHard404Response();
  }

  // 3. Verify nonce HMAC in constant time (supports rotation via NONCE_HMAC_SECRET_PREVIOUS)
  const nonceCheck = await verifyStatelessNonce(nonceStr, appId, ctx.env);
  if (!nonceCheck.valid) {
    emitGateCounter(ctx.env, 'G3', 'nonce_hmac', 'fail', family);
    await recordHardFailure(did, netKey, ctx.env, false);
    return paddedHard404Response();
  }
  const { nid, issuedAtMs } = nonceCheck;

  // 4. Server-measured dwell time
  const dwell = Date.now() - issuedAtMs;
  if (dwell < 0 || dwell < DWELL_HARD_BELOW_MS) {
    emitGateCounter(ctx.env, 'G3', 'dwell_hard', 'fail', family);
    await recordHardFailure(did, netKey, ctx.env, false);
    return paddedHard404Response();
  }
  if (dwell > NONCE_TTL_MS) {
    emitGateCounter(ctx.env, 'G3', 'nonce_expired', 'fail', family);
    await recordSoftStrike(did, netKey, ctx.env);
    return softRetryResponse({ setCookie: setCookieHeader });
  }
  if (dwell < MIN_SERVER_DWELL_MS) {
    emitGateCounter(ctx.env, 'G3', 'dwell_soft', 'fail', family);
    await recordSoftStrike(did, netKey, ctx.env);
    return softRetryResponse({ setCookie: setCookieHeader });
  }
  if (nv === 0 && dwell < DWELL_NV0_MIN_MS) {
    emitGateCounter(ctx.env, 'G3', 'dwell_nv0', 'fail', family);
    await recordSoftStrike(did, netKey, ctx.env);
    return softRetryResponse({ setCookie: setCookieHeader });
  }

  // 5. Flags check: wb=0, hl=0, dk=0, cb=0, tr=1
  if (
    flags.wb !== 0 ||
    flags.hl !== 0 ||
    flags.dk !== 0 ||
    flags.cb !== 0 ||
    flags.tr !== 1
  ) {
    emitGateCounter(ctx.env, 'G3', 'flags', 'fail', family);
    // Genuine bot/headless/desktop flags strictly quarantine that specific device
    await recordHardFailure(did, netKey, ctx.env, true);
    return paddedHard404Response();
  }
  emitGateCounter(ctx.env, 'G3', 'token', 'pass', family);

  // --------------------------------------------------------------------------
  // Gate G4 — Device Truth (< 1 ms)
  // --------------------------------------------------------------------------
  let hardObj: Record<string, any>;
  let softObj: Record<string, any>;
  try {
    hardObj = JSON.parse(hardRaw);
    softObj = JSON.parse(softRaw);
  } catch {
    emitGateCounter(ctx.env, 'G4', 'env_json', 'fail', family);
    await recordHardFailure(did, netKey, ctx.env, false);
    return paddedHard404Response();
  }

  const expectedHardKeys = ['arch', 'dm', 'plat', 'sa', 'ud', 'udp', 'vend', 'wc'];
  const expectedSoftKeys = ['gl', 'gpu', 'mdl', 'mp', 'tp', 'tx'];
  if (
    !hardObj ||
    typeof hardObj !== 'object' ||
    !expectedHardKeys.every((k) => k in hardObj) ||
    !softObj ||
    typeof softObj !== 'object' ||
    !expectedSoftKeys.every((k) => k in softObj)
  ) {
    emitGateCounter(ctx.env, 'G4', 'env_keys', 'fail', family);
    await recordHardFailure(did, netKey, ctx.env, false);
    return paddedHard404Response();
  }

  const signalModes = await getSignalModes(ctx.env);

  // G4-A Base Rule (All families, always enforce)
  const plat = String(hardObj.plat ?? '');
  const arch = String(hardObj.arch ?? '');
  const gpu = String(softObj.gpu ?? '');

  // Samsung Galaxy S22 (Exynos 2200) and S24 (Exynos 2400) use Samsung Xclipse (powered by AMD RDNA/Radeon).
  // Qualcomm Adreno, ARM Mali/Immortalis, Imagination PowerVR, and Apple GPUs are genuine mobile silicon.
  const isMobileGpu =
    /Xclipse|Samsung|Adreno|Mali|Immortalis|Apple|PowerVR|RDNA|Qualcomm|Exynos|MediaTek|Vivante|Tegra/i.test(
      gpu
    );
  const isDesktopRadeon = !isMobileGpu && /Radeon/i.test(gpu);
  const isDesktopAppleM = /Apple M[1-4]/i.test(gpu) && !family.startsWith('ios-');
  const isDesktopIntel = /Intel\(R\) (UHD|Iris|HD Graphics)/i.test(gpu);
  const isDesktopDedicatedGpu = /GeForce|RTX|GTX/i.test(gpu);
  const isSoftwareRenderer = /SwiftShader|llvmpipe|softpipe|VirtualBox|VMware/i.test(gpu);
  const isDesktopLinuxPlat = /^Linux (x86|i[3-6]86)/i.test(plat) && !isMobileGpu;
  const isDesktopX86Arch = /^x86/i.test(arch) && !isMobileGpu;

  if (
    /^(Win|CrOS)/i.test(plat) ||
    isDesktopLinuxPlat ||
    (/^Mac/i.test(plat) && !family.startsWith('ios-')) ||
    isDesktopX86Arch ||
    isSoftwareRenderer ||
    isDesktopDedicatedGpu ||
    isDesktopRadeon ||
    isDesktopAppleM ||
    isDesktopIntel
  ) {
    emitGateCounter(ctx.env, 'G4', 'G4-A-base', 'fail', family);
    await recordHardFailure(did, netKey, ctx.env, true);
    return paddedHard404Response();
  }

  // G4-A Family-Specific Rules
  const isStrict = STRICT_FAMILIES.has(family);
  const g4aMode = isStrict ? 'enforce' : signalModes['G4-A-tolerated'] || 'shadow';

  if (family.startsWith('ios-')) {
    const isIpadDesktopMode = /Macintosh/.test(ua) && /Mobile\//.test(ua) && /Safari\//.test(ua);
    const isApplePlat =
      plat === '' ||
      plat === 'iPhone' ||
      plat === 'iPad' ||
      plat === 'iPod' ||
      (plat === 'MacIntel' && (ua.includes('iPad') || ua.includes('iPhone') || isIpadDesktopMode));
    const isAppleVend =
      hardObj.vend === 'Apple Computer, Inc.' ||
      hardObj.vend === 'Google Inc.' ||
      hardObj.vend === '';
    // Genuine iOS WebKit never exposes navigator.deviceMemory (dm=0) or navigator.userAgentData (ud=0)
    const iosCoreOk = isApplePlat && isAppleVend && hardObj.dm === 0 && hardObj.ud === 0;
    if (!iosCoreOk) {
      emitGateCounter(ctx.env, 'G4', 'G4-A-ios', 'fail', family);
      await recordHardFailure(did, netKey, ctx.env, false);
      return paddedHard404Response();
    }
    // Shadow: sa = 1, wc = 0
    const iosShadowOk = hardObj.sa === 1 && hardObj.wc === 0;
    emitGateCounter(ctx.env, 'G4', 'G4-A-ios-shadow', iosShadowOk ? 'pass' : 'fail', family);
  } else if (
    family === 'android-chrome' ||
    family === 'android-samsung' ||
    family === 'android-edge'
  ) {
    const isAndroidPlat = plat === '' || /^(Linux|Android)/i.test(plat) || isMobileGpu;
    const isAndroidUdp =
      !hardObj.udp ||
      /^(Android|Linux|Unknown)$/i.test(String(hardObj.udp).trim()) ||
      isMobileGpu;
    const androidStrictOk = isAndroidPlat && isAndroidUdp;
    if (!androidStrictOk) {
      emitGateCounter(ctx.env, 'G4', 'G4-A-android-strict', 'fail', family);
      await recordHardFailure(did, netKey, ctx.env, false);
      return paddedHard404Response();
    }
    emitGateCounter(
      ctx.env,
      'G4',
      'G4-A-mdl-shadow',
      softObj.mdl === 1 ? 'pass' : 'fail',
      family
    );
  } else if (family === 'android-firefox') {
    const isFirefoxPlatOk = plat === '' || /^(Linux|Android)/i.test(plat) || isMobileGpu;
    if (!isFirefoxPlatOk) {
      emitGateCounter(ctx.env, 'G4', 'G4-A-android-ff', 'fail', family);
      await recordHardFailure(did, netKey, ctx.env, false);
      return paddedHard404Response();
    }
  } else {
    // Tolerated family (Mi Browser, Vivo Browser, HeyTap Browser, UC, Opera, In-app WebViews)
    const toleratedArmOk = plat === '' || /^(Linux|Android)/i.test(plat) || isMobileGpu;
    emitGateCounter(
      ctx.env,
      'G4',
      'G4-A-tolerated',
      toleratedArmOk ? 'pass' : 'fail',
      family
    );
    if (!toleratedArmOk && g4aMode === 'enforce') {
      await recordHardFailure(did, netKey, ctx.env, false);
      return paddedHard404Response();
    }
  }

  // G4-B & G4-C (Skipped when soft.gl === 0, e.g., iOS Lockdown Mode)
  if (softObj.gl === 0) {
    emitGateCounter(ctx.env, 'G4', 'nogl', 'pass', family);
  } else {
    // G4-B: MEDIUM_FLOAT precision <= 23 (Samsung Xclipse 920, Adreno 7xx, Apple GPU report 16 or 23)
    const mp = softObj.mp;
    const g4bOk =
      Array.isArray(mp) &&
      mp.length === 3 &&
      typeof mp[2] === 'number' &&
      mp[2] > 0 &&
      mp[2] <= 23;
    emitGateCounter(ctx.env, 'G4', 'G4-B', g4bOk ? 'pass' : 'fail', family);
    if (!g4bOk && signalModes['G4-B'] === 'enforce') {
      await recordHardFailure(did, netKey, ctx.env, false);
      return paddedHard404Response();
    }

    // G4-C: ASTC or ETC2 texture compression present
    const tx = softObj.tx;
    const g4cOk = Array.isArray(tx) && tx.length === 2 && (tx[0] === 1 || tx[1] === 1);
    emitGateCounter(ctx.env, 'G4', 'G4-C', g4cOk ? 'pass' : 'fail', family);
    if (!g4cOk && signalModes['G4-C'] === 'enforce') {
      await recordHardFailure(did, netKey, ctx.env, false);
      return paddedHard404Response();
    }
  }

  // G4-D: Text physics (denylist form only)
  const tpSerialized = JSON.stringify(softObj.tp ?? []);
  const g4dOk = !TEXT_PHYSICS_DENYLIST.has(tpSerialized);
  emitGateCounter(ctx.env, 'G4', 'G4-D', g4dOk ? 'pass' : 'fail', family);
  if (!g4dOk && signalModes['G4-D'] === 'enforce') {
    await recordHardFailure(did, netKey, ctx.env, false);
    return paddedHard404Response();
  }

  // G4-E: Hardware commitment hash computed on raw hard string as received
  const hw = (await sha256HexServer(hardRaw)).slice(0, 24);
  emitGateCounter(ctx.env, 'G4', 'device_truth', 'pass', family);

  // --------------------------------------------------------------------------
  // Gate G5 — Touch Invariants (Enforce core; shadow extras)
  // --------------------------------------------------------------------------
  const evList = typeof tap.ev === 'string' ? tap.ev.split(',').map((s: string) => s.trim()) : [];
  const idxTs = evList.indexOf('ts');
  const idxTe = evList.indexOf('te');
  const idxPd = evList.indexOf('pd');
  const idxPu = evList.indexOf('pu');
  const idxCk = evList.indexOf('ck');
  const hasTsTeCk = idxTs !== -1 && idxTe !== -1 && idxCk !== -1 && idxTs < idxTe && idxTe < idxCk;
  const hasPdPuCk = idxPd !== -1 && idxPu !== -1 && idxCk !== -1 && idxPd < idxPu && idxPu <= idxCk;
  const hasTouchGesture = (idxTs !== -1 || idxPd !== -1) && idxCk !== -1;
  const causalEventsOk = hasTsTeCk || hasPdPuCk || hasTouchGesture;

  const duration = Number(tap.d);
  const coordX = Number(tap.x);
  const coordY = Number(tap.y);
  const mtpCount = Number(tap.mtp);

  const g5CoreOk =
    tap.pt !== 'mouse' &&
    mtpCount >= 1 &&
    (tap.coarse === 1 || mtpCount >= 1) &&
    causalEventsOk &&
    Number.isFinite(duration) &&
    duration >= 0 &&
    duration <= TOUCH_MAX_MS &&
    ((Number.isFinite(coordX) && coordX > 0) || (Number.isFinite(coordY) && coordY > 0));

  if (!g5CoreOk) {
    emitGateCounter(ctx.env, 'G5', 'touch_core', 'fail', family);
    // Desktop mouse pointer or zero touch points => immediate Hard 404
    if (tap.pt === 'mouse' || mtpCount < 1) {
      await recordHardFailure(did, netKey, ctx.env, !isMobileFamily);
      return paddedHard404Response();
    }
    // Real touch hardware with transient event/duration anomaly => Soft retry with strike
    await recordSoftStrike(did, netKey, ctx.env);
    return softRetryResponse({ setCookie: setCookieHeader });
  }

  // G5 Shadow extras (counters only)
  const g5ExtrasOk =
    (Number(tap.rx) > 0 || Number(tap.ry) > 0) &&
    Number(tap.gap) >= 0 &&
    Number(tap.gap) <= 250 &&
    evList.includes('pd') &&
    evList.includes('pu');
  emitGateCounter(ctx.env, 'G5', 'touch_extras', g5ExtrasOk ? 'pass' : 'fail', family);
  emitGateCounter(ctx.env, 'G5', 'touch_core', 'pass', family);

  // --------------------------------------------------------------------------
  // Gate G6 — Nonce Burn FIRST, Then Turnstile siteverify
  // --------------------------------------------------------------------------
  // 1. Burn nonce in Upstash Redis: SET nonce:<nid> 1 EX 150 NX
  const burnPipe = await runRedisPipeline(
    [['SET', `nonce:${nid}`, '1', 'EX', NONCE_BURN_TTL_S, 'NX']],
    ctx.env
  );
  if (!burnPipe.ok) {
    emitGateCounter(ctx.env, 'G6', 'redis_burn_error', 'fail', family);
    return softRetryResponse();
  }
  if (burnPipe.results[0] !== 'OK') {
    // Nonce already burned => Replay (§8 Test #5: second replay must return 404)
    emitGateCounter(ctx.env, 'G6', 'nonce_replay', 'fail', family);
    await recordHardFailure(did, netKey, ctx.env, false);
    return paddedHard404Response();
  }

  // 2. Turnstile siteverify (supports sealed ENCRYPTED_TURNSTILE_SECRET, local backup, and env TURNSTILE_SECRET_KEY)
  const rawHost = (ctx.headers['x-forwarded-host'] || ctx.headers['host'] || '')
    .split(',')[0]
    .trim()
    .toLowerCase()
    .split(':')[0];
  const pubDomain = (ctx.env.PUBLIC_DOMAIN || ctx.env.VITE_PUBLIC_DOMAIN || '').trim();
  let configuredBareHost = '';
  if (pubDomain) {
    try {
      configuredBareHost = new URL(pubDomain.startsWith('http') ? pubDomain : `https://${pubDomain}`).hostname.toLowerCase().replace(/^www\./, '');
    } catch {
      // ignore
    }
  }
  const isProdDomain =
    (Boolean(configuredBareHost) &&
      (rawHost === configuredBareHost ||
        rawHost === `www.${configuredBareHost}` ||
        rawHost.endsWith(`.${configuredBareHost}`))) ||
    rawHost.endsWith('.pages.dev');

  const rawSecrets = await getCandidateTurnstileSecrets(ctx.env);
  const isNonProdDummyToken =
    !isProdDomain &&
    !ctx.env.TURNSTILE_SITEVERIFY_URL &&
    cfToken.includes('DUMMY.TOKEN');

  if (isNonProdDummyToken) {
    rawSecrets.unshift('1x0000000000000000000000000000000AA');
  }

  // Filter out dummy test keys on production domains
  const validSecrets = rawSecrets.filter(
    (s) => s && !(isProdDomain && s.startsWith('1x00000000000000000000'))
  );

  // Secret missing or dummy test key on production domain => fail closed (SOFT + alert)
  if (validSecrets.length === 0) {
    emitGateCounter(ctx.env, 'G6', 'secret-missing', 'fail', family);
    await recordSoftStrike(did, netKey, ctx.env);
    return softRetryResponse();
  }

  const svEndpoint =
    ctx.env.TURNSTILE_SITEVERIFY_URL ||
    'https://challenges.cloudflare.com/turnstile/v0/siteverify';

  let svData: {
    success?: boolean;
    action?: string;
    hostname?: string;
    cdata?: string;
    'error-codes'?: string[];
  } | null = null;
  let sawSoftTokenError = false;

  for (let i = 0; i < validSecrets.length; i++) {
    const candidateSecret = validSecrets[i];
    const svController = new AbortController();
    const svTimer = setTimeout(() => svController.abort(), SITEVERIFY_TIMEOUT_MS);
    try {
      const svRes = await fetch(svEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secret: candidateSecret,
          response: cfToken,
          remoteip: ctx.ip,
        }),
        signal: svController.signal,
      });
      if (svRes.status >= 500) {
        emitGateCounter(ctx.env, 'G6', 'siteverify_5xx', 'fail', family);
        await recordSoftStrike(did, netKey, ctx.env);
        return softRetryResponse();
      }
      svData = (await svRes.json()) as typeof svData;
      if (svData?.success === true) {
        break;
      }
      const codes = Array.isArray(svData?.['error-codes']) ? svData!['error-codes']! : [];
      if (
        codes.includes('timeout-or-duplicate') ||
        codes.includes('internal-error') ||
        codes.includes('invalid-input-response') ||
        codes.includes('invalid-input-secret')
      ) {
        sawSoftTokenError = true;
      }
    } catch {
      emitGateCounter(ctx.env, 'G6', 'siteverify_network', 'fail', family);
      await recordSoftStrike(did, netKey, ctx.env);
      return softRetryResponse();
    } finally {
      clearTimeout(svTimer);
    }
  }

  if (!svData || svData.success !== true) {
    // Nonce is already burned in Step 1 above. For verified mobile devices that passed G1..G5,
    // issue a soft retry so expired tokens or Turnstile key rotation never cause false 404 lockouts.
    if (isMobileFamily || sawSoftTokenError) {
      emitGateCounter(ctx.env, 'G6', 'siteverify_soft_err', 'fail', family);
      await recordSoftStrike(did, netKey, ctx.env);
      return softRetryResponse({ setCookie: setCookieHeader });
    }
    emitGateCounter(ctx.env, 'G6', 'siteverify_invalid', 'fail', family);
    await recordHardFailure(did, netKey, ctx.env, true);
    return paddedHard404Response();
  }

  // Verify action, hostname, and cData commitment (parsed from the END: _<nid 32>_<hw 24>)
  const svAction = String(svData.action || '');
  const svHostname = String(svData.hostname || '').toLowerCase();
  const svCdata = String(svData.cdata || '');
  const allowedHosts = getAllowedHostnames(ctx.env);
  const hostAllowed =
    allowedHosts.has(svHostname) ||
    (ctx.env.STRICT_HOST_CHECK !== '1' &&
      (svHostname.endsWith('.run.app') ||
        svHostname.endsWith('.pages.dev') ||
        svHostname.endsWith('.vercel.app'))) ||
    (isNonProdDummyToken && svHostname === 'example.com');

  let cdataValid = false;
  if (svCdata.length >= 58) {
    const cdataHw = svCdata.slice(-24);
    const sep2 = svCdata.slice(-25, -24);
    const cdataNid = svCdata.slice(-57, -25);
    const sep1 = svCdata.slice(-58, -57);
    const cdataAppId = svCdata.slice(0, -58);
    if (
      sep1 === '_' &&
      sep2 === '_' &&
      cdataAppId === appId &&
      timingSafeEqualStr(cdataNid, nid) &&
      timingSafeEqualStr(cdataHw, hw)
    ) {
      cdataValid = true;
    }
  } else if (isNonProdDummyToken && !svCdata && !svAction) {
    // Cloudflare's dummy test key (1x0000000000000000000000000000000AA) used only on non-prod preview
    // returns { success: true, hostname: "example.com" } without echoing custom action/cdata.
    cdataValid = true;
  }

  const actionValid = svAction === TURNSTILE_ACTION || (isNonProdDummyToken && !svAction);

  if (!actionValid || !hostAllowed || !cdataValid) {
    emitGateCounter(ctx.env, 'G6', 'cdata_binding', 'fail', family);
    await recordHardFailure(did, netKey, ctx.env, false);
    return paddedHard404Response();
  }
  emitGateCounter(ctx.env, 'G6', 'turnstile', 'pass', family);

  // --------------------------------------------------------------------------
  // Gate G7 — Late Decrypt & Dispatch (< 0.5 ms)
  // --------------------------------------------------------------------------
  const dateStamp = getUtcDateStamp();
  const dailyCap = Number(ctx.env.APP_DAILY_ISSUE_CAP ?? APP_DAILY_ISSUE_CAP_DEFAULT);

  const g7Check = await runRedisPipeline(
    [
      ['GET', `paused:${appId}`],
      ['GET', `issued:${appId}:${dateStamp}`],
    ],
    ctx.env
  );
  if (g7Check.ok) {
    const [isPaused, issuedToday] = g7Check.results;
    if (
      isPaused === '1' ||
      isPaused === 'true' ||
      (dailyCap > 0 && Number(issuedToday ?? 0) >= dailyCap)
    ) {
      emitGateCounter(ctx.env, 'G7', 'paused_or_capped', 'fail', family);
      return {
        status: 200,
        headers: baseSecurityHeaders(setCookieHeader),
        body: JSON.stringify({
          status: 'unavailable',
          message:
            'The package link is currently not available. It will be updated soon by the admin.',
        }),
      };
    }
  }

  const resolved = await resolveDestinationUrl(appId, ctx.env);
  if (!resolved.url) {
    emitGateCounter(ctx.env, 'G7', 'unavailable', 'fail', family);
    return {
      status: 200,
      headers: baseSecurityHeaders(setCookieHeader),
      body: JSON.stringify({
        status: 'unavailable',
        message:
          'The package link is currently not available. It will be updated soon by the admin.',
      }),
    };
  }

  void runRedisPipeline(
    [
      ['INCR', `issued:${appId}:${dateStamp}`],
      ['EXPIRE', `issued:${appId}:${dateStamp}`, 172800, 'NX'],
    ],
    ctx.env
  );
  emitGateCounter(ctx.env, 'G7', 'issued', 'pass', family);

  return {
    status: 200,
    headers: baseSecurityHeaders(setCookieHeader),
    body: JSON.stringify({
      status: 'available',
      url: resolved.url,
    }),
  };
}
