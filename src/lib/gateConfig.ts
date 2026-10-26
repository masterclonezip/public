/**
 * More Info (/moreinfo) Gateway — Global Security Constants (Version 11.1)
 * Single source of truth mirroring §3 of MORE_INFO_SECURITY_ARCHITECTURE.md.
 * Never duplicate or hardcode these values elsewhere.
 */

export const TURNSTILE_ACTION = 'mobile_clearance' as const;
export const TOKEN_V = 12 as const;

export const NONCE_TTL_MS = 120000 as const;
export const NONCE_REFRESH_MS = 90000 as const;
export const NONCE_BURN_TTL_S = 150 as const;

export const CLIENT_TAP_HOLD_MS = 1000 as const;
export const DWELL_HARD_BELOW_MS = 150 as const;
export const MIN_SERVER_DWELL_MS = 500 as const;
export const DWELL_NV0_MIN_MS = 1000 as const;

export const TOUCH_MIN_MS = 12 as const;
export const TOUCH_MAX_MS = 2000 as const;
export const TOUCH_REQUIRED_EVENTS = ['ts', 'te', 'ck'] as const;

export const INIT_RATE_DEVICE = { limit: 60, windowS: 60 } as const;
export const INIT_RATE_NET = { limit: 600, windowS: 60 } as const;

export const CLEARANCE_BURST = {
  hardCount: 12,
  hardWindowMs: 2000,
  softCount: 15,
  softWindowS: 10,
} as const;

export const QUARANTINE_HARD_S = 1800 as const;

export const NET_FLOOD_HARD = {
  limit: 40,
  windowS: 60,
} as const;
export const NET_COOLDOWN_S = 60 as const;

export const SOFT_STRIKES_DEVICE = {
  limit: 25,
  windowS: 600,
  cooldownS: 30,
} as const;

export const SOFT_STRIKES_NET = {
  limit: 200,
  windowS: 600,
  cooldownS: 30,
} as const;

export const SITEVERIFY_TIMEOUT_MS = 4000 as const;
export const TURNSTILE_UI_TIMEOUT_MS = 15000 as const;
export const SESSION_RETRY_MAX = 2 as const;
export const REQUEST_BODY_MAX_BYTES = 8192 as const;
export const HARD_PAD_MS = [60, 120] as const;

export const APP_DAILY_ISSUE_CAP_DEFAULT = 0 as const;

export const DID_COOKIE = '__Host-rd_did' as const;
export const DID_COOKIE_MAX_AGE_S = 31536000 as const;

export const DEFAULT_ALLOWED_HOSTNAMES: readonly string[] = [];

export const NAV_BREADCRUMB_TTL_MS = 1800000 as const;

export const HOSTING_ASNS: ReadonlySet<number> = new Set([
  16509,  // AWS
  14618,  // AWS
  396982, // GCP Compute
  8075,   // Azure
  14061,  // DigitalOcean
  24940,  // Hetzner
  16276,  // OVH
  63949,  // Linode / Akamai Cloud
  20473,  // Vultr / Choopa
  12876,  // Scaleway
  31898,  // Oracle Cloud
]);

export const HOSTING_ORG_KEYWORDS = [
  'amazon',
  'aws',
  'google cloud',
  'microsoft',
  'azure',
  'digitalocean',
  'hetzner',
  'ovh',
  'linode',
  'vultr',
  'choopa',
  'scaleway',
  'oracle',
  'contabo',
  'leaseweb',
  'alibaba',
  'tencent',
] as const;

export const NEVER_BLOCK_ASNS: ReadonlySet<number> = new Set([
  13335,  // Cloudflare (iCloud Private Relay / WARP)
  20940,  // Akamai (iCloud Private Relay)
  54113,  // Fastly (iCloud Private Relay)
  15169,  // Google LLC (Android Private Compute / Pixel VPN / Chrome Mobile Proxy)
  55836,  // Reliance Jio Infocomm Ltd (Mobile 4G/5G & JioFiber)
  133982, // Reliance Jio Infocomm Ltd
  132717, // Reliance Jio Infocomm Ltd
  45609,  // Bharti Airtel Ltd (Mobile 4G/5G & Xstream)
  24560,  // Bharti Airtel Ltd
  9498,   // Bharti Airtel Ltd
  134898, // Bharti Airtel Ltd
  132165, // Bharti Airtel Ltd
  45271,  // Vodafone Idea Limited (Vi Mobile 4G)
  9829,   // BSNL (Bharat Sanchar Nigam Ltd Mobile & Fiber)
  18101,  // Reliance Communications
  45820,  // Tata Teleservices / Tata Play Fiber
  4758,   // Tata Communications
  24309,  // Atria Convergence Technologies (ACT Fibernet)
  17488,  // Hathway Cable and Datacom
  45117,  // RailTel Corporation of India (RailWire)
  133203, // Excitel Broadband
  136154, // Kerala Vision Broadband
  58674,  // GTPL Hathway
  134888, // Alliance Broadband
]);

export const TEXT_PHYSICS_DENYLIST: ReadonlySet<string> = new Set([
  // Exact canonical JSON arrays of tp measured from known Linux/FreeType headless bot stacks
  '[96,58.42,58.42,66.01,66.01,66.01]',
  '[95,58,58,66,66,66]',
  '[0,0,0,0,0,0]',
]);

export type SignalMode = 'enforce' | 'shadow';

export const DEFAULT_SIGNAL_MODES: Record<string, SignalMode> = {
  'G4-A-strict': 'enforce',
  'G4-A-tolerated': 'shadow',
  'G4-B': 'shadow',
  'G4-C': 'shadow',
  'G4-D': 'shadow',
  'G5-extras': 'shadow',
  'navProof': 'enforce',
};

export const HARD_RESPONSE_STATUS = 404 as const;
export const HARD_RESPONSE_BODY = '{"error":"Not Found","status":404}' as const;

export type BrowserFamily =
  | 'ios-safari'
  | 'ios-chrome'
  | 'ios-firefox'
  | 'ios-inapp'
  | 'android-samsung'
  | 'android-edge'
  | 'android-firefox'
  | 'android-webview'
  | 'android-chrome'
  | 'android-other';

export const STRICT_FAMILIES: ReadonlySet<BrowserFamily> = new Set([
  'ios-safari',
  'ios-chrome',
  'ios-firefox',
  'ios-inapp',
  'android-chrome',
  'android-samsung',
  'android-edge',
  'android-firefox',
]);

export interface HardEnvObj {
  plat: string;
  vend: string;
  ud: 0 | 1;
  udp: string;
  arch: string;
  dm: 0 | 1;
  sa: 0 | 1;
  wc: 0 | 1;
}

export interface SoftEnvObj {
  gl: 0 | 1;
  mdl: 0 | 1;
  gpu: string;
  mp: [number, number, number] | null;
  tx: [0 | 1, 0 | 1];
  tp: [number, number, number, number, number, number];
}

export interface TapObj {
  pt: string;
  mtp: number;
  coarse: 0 | 1;
  rx: number;
  ry: number;
  pr: number;
  x: number;
  y: number;
  d: number;
  gap: number;
  ev: string;
}

export interface TokenFlagsObj {
  wb: 0 | 1;
  hl: 0 | 1;
  dk: 0 | 1;
  cb: 0 | 1;
  tr: 0 | 1;
}

export interface TokenV12 {
  v: number;
  id: string;
  nonce: string;
  nv: 0 | 1;
  hard: string;
  soft: string;
  tap: TapObj;
  f: TokenFlagsObj;
}
