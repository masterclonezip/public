import type { HardEnvObj, SoftEnvObj } from './gateConfig';

/**
 * Deterministic canonical JSON serializer (sorted keys, no whitespace).
 * Matches §5.3 of MORE_INFO_SECURITY_ARCHITECTURE.md v11.1.
 */
export function canonical(o: unknown): string {
  if (Array.isArray(o)) {
    return '[' + o.map(canonical).join(',') + ']';
  }
  if (o && typeof o === 'object') {
    return (
      '{' +
      Object.keys(o as object)
        .sort()
        .map((k) => JSON.stringify(k) + ':' + canonical((o as Record<string, unknown>)[k]))
        .join(',') +
      '}'
    );
  }
  return JSON.stringify(o ?? null);
}

/**
 * Computes lowercase hex SHA-256 of an exact UTF-8 string via Web Crypto.
 */
export async function sha256hex(s: string): Promise<string> {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Measures sub-pixel text layout and font fallback physics in an off-screen container (§5.3).
 * Returns [height, width(system-ui), width(sans-serif), width(monospace), width('Roboto',monospace), width('-apple-system',monospace)]
 * rounded to 0.01 px.
 */
export function textPhysics(): [number, number, number, number, number, number] {
  if (typeof document === 'undefined' || !document.body) {
    return [0, 0, 0, 0, 0, 0];
  }
  try {
    const wrap = document.createElement('div');
    wrap.setAttribute('lang', 'en');
    wrap.style.cssText =
      'position:fixed;left:-9999px;top:-9999px;width:120px;hyphens:auto;font-size:16px;line-height:1.25;visibility:hidden;pointer-events:none;z-index:-1;';
    wrap.textContent =
      'Electroencephalographically internationalization counterrevolutionaries disproportionateness';
    document.body.appendChild(wrap);
    const height = round2(wrap.getBoundingClientRect().height);

    const fonts = [
      'system-ui',
      'sans-serif',
      'monospace',
      '"Roboto", monospace',
      '"-apple-system", monospace',
    ];
    const widths: number[] = [];

    for (const font of fonts) {
      const span = document.createElement('span');
      span.style.cssText = `font-family:${font};font-size:16px;white-space:nowrap;display:inline-block;`;
      span.textContent = 'mmmmmmmmmmlliWW1234567890';
      wrap.appendChild(span);
      widths.push(round2(span.getBoundingClientRect().width));
    }

    document.body.removeChild(wrap);
    return [
      height,
      widths[0] ?? 0,
      widths[1] ?? 0,
      widths[2] ?? 0,
      widths[3] ?? 0,
      widths[4] ?? 0,
    ];
  } catch {
    return [0, 0, 0, 0, 0, 0];
  }
}

export interface ClientMobileGateResult {
  failed: boolean;
  wb: 0 | 1;
  hl: 0 | 1;
  dk: 0 | 1;
}

/**
 * Client mobile gate (§5.3) — UX shortcut for immediate disguised 404 on desktop / webdriver / software GPU.
 * The server re-verifies all signals independently.
 */
export function inspectClientMobileGate(gpuRenderer = ''): ClientMobileGateResult {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return { failed: true, wb: 0, hl: 1, dk: 1 };
  }

  let wb: 0 | 1 = 0;
  let hl: 0 | 1 = 0;
  let dk: 0 | 1 = 0;

  try {
    if (navigator.webdriver === true) {
      wb = 1;
    }
    const proto = Object.getPrototypeOf(navigator);
    const protoDesc = proto ? Object.getOwnPropertyDescriptor(proto, 'webdriver') : undefined;
    const ownDesc = Object.getOwnPropertyDescriptor(navigator, 'webdriver');
    if (ownDesc && (ownDesc.value === true || typeof ownDesc.get === 'function')) {
      wb = 1;
    }
  } catch {
    // Do not set wb=1 on descriptor inspection exception unless navigator.webdriver is truthy
  }

  const w = window as unknown as Record<string, unknown>;
  if (
    w._phantom ||
    w.__nightmare ||
    w.callPhantom ||
    w.__playwright ||
    w.__pw_manual ||
    w.domAutomation ||
    w.domAutomationController
  ) {
    hl = 1;
  }

  const ua = navigator.userAgent || '';
  if (/HeadlessChrome|PhantomJS|Playwright|Puppeteer|Selenium|Cypress|Electron/i.test(ua)) {
    hl = 1;
  }

  const plat = navigator.platform || '';
  const maxTouchPoints = Number(navigator.maxTouchPoints ?? 0);
  const isCoarse =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(pointer: coarse)').matches;
  const isAnyCoarse =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(any-pointer: coarse)').matches;
  const hasTouch =
    maxTouchPoints >= 1 ||
    isCoarse ||
    isAnyCoarse ||
    (typeof window !== 'undefined' && 'ontouchstart' in window) ||
    typeof TouchEvent !== 'undefined';

  // Comprehensive mobile operating system / browser / silicon detection
  const navData = (navigator as unknown as { userAgentData?: { platform?: string; mobile?: boolean } })
    .userAgentData;
  const isMobileGpu = Boolean(
    gpuRenderer &&
      /Xclipse|Samsung|Adreno|Mali|Immortalis|Apple|PowerVR|RDNA|Qualcomm|Exynos|MediaTek|Vivante|Tegra/i.test(
        gpuRenderer
      )
  );
  const isAndroidDevice =
    /Android/i.test(ua) ||
    /Android/i.test(plat) ||
    navData?.platform === 'Android' ||
    navData?.mobile === true ||
    (hasTouch && isMobileGpu);

  // On iPadOS, Apple serves desktop UA with platform 'MacIntel' but has touch
  const isAppleTouchDevice =
    /iPhone|iPad|iPod/i.test(ua) ||
    ((plat === 'MacIntel' || /Macintosh/i.test(ua)) && hasTouch);

  const isMobileDevice =
    isAndroidDevice ||
    isAppleTouchDevice ||
    (/Mobile|Tablet/i.test(ua) && hasTouch);

  // Desktop OS detection (Windows, ChromeOS, or non-Android Desktop Linux without mobile GPU)
  const isWindowsOrCrOs =
    /Windows NT|CrOS/i.test(ua) || /^(Win|CrOS)/i.test(plat);
  const isDesktopLinux =
    (/X11; Linux (x86_64|i686)/i.test(ua) || /^Linux (x86|i[3-6]86)/i.test(plat)) &&
    !isAndroidDevice &&
    !isMobileGpu;

  if (isWindowsOrCrOs || isDesktopLinux || (!isMobileDevice && !hasTouch)) {
    dk = 1;
  }

  if (gpuRenderer) {
    if (/SwiftShader|llvmpipe|softpipe|VirtualBox|VMware/i.test(gpuRenderer)) {
      hl = 1;
    }

    // Flag desktop GPUs unconditionally even if UA or touch was spoofed via DevTools/Playwright
    if (/GeForce|RTX|GTX|Intel\(R\) (UHD|Iris|HD Graphics)/i.test(gpuRenderer)) {
      dk = 1;
    }
    if (!isMobileGpu && /Radeon/i.test(gpuRenderer)) {
      dk = 1;
    }
  }

  return {
    failed: wb === 1 || hl === 1 || dk === 1,
    wb,
    hl,
    dk,
  };
}

export interface FrozenEnvProbe {
  readonly hardStr: string;
  readonly softStr: string;
  readonly hw: string;
  readonly hard: Readonly<HardEnvObj>;
  readonly soft: Readonly<SoftEnvObj>;
  readonly gate: Readonly<ClientMobileGateResult>;
}

let cachedEnvPromise: Promise<FrozenEnvProbe> | null = null;

/**
 * Collects HARD and SOFT device probes per page lifecycle, freezes the result,
 * and computes hw = sha256hex(hardStr).slice(0, 24) per §5.3.
 * If gate.failed is true, does not permanently cache the promise so transient
 * WebView initialization states cannot lock out the session.
 */
export function collectEnv(): Promise<FrozenEnvProbe> {
  if (cachedEnvPromise) {
    return cachedEnvPromise;
  }

  const p = (async (): Promise<FrozenEnvProbe> => {
    const n = (typeof navigator !== 'undefined' ? navigator : {}) as Record<string, any>;
    const hi =
      n.userAgentData && typeof n.userAgentData.getHighEntropyValues === 'function'
        ? await n.userAgentData
            .getHighEntropyValues(['platform', 'architecture', 'model'])
            .catch(() => null)
        : null;

    let gl: WebGLRenderingContext | null = null;
    try {
      if (typeof document !== 'undefined') {
        const canvas = document.createElement('canvas');
        gl =
          (canvas.getContext('webgl') as WebGLRenderingContext | null) ||
          (canvas.getContext('experimental-webgl') as WebGLRenderingContext | null);
      }
    } catch {
      gl = null;
    }

    const dbg = gl ? gl.getExtension('WEBGL_debug_renderer_info') : null;
    const mpFormat = gl
      ? gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.MEDIUM_FLOAT)
      : null;
    const ext = gl ? gl.getSupportedExtensions() ?? [] : [];
    const gpu = dbg && gl ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) ?? '') : '';

    const hard: HardEnvObj = Object.freeze({
      plat: String(n.platform ?? ''),
      vend: String(n.vendor ?? ''),
      ud: n.userAgentData ? 1 : 0,
      udp: String(hi?.platform ?? ''),
      arch: String(hi?.architecture ?? ''),
      dm: 'deviceMemory' in n ? 1 : 0,
      sa: 'standalone' in n ? 1 : 0,
      wc: typeof window !== 'undefined' && (window as any).chrome ? 1 : 0,
    });

    const mpTuple: [number, number, number] | null = mpFormat
      ? [mpFormat.rangeMin, mpFormat.rangeMax, mpFormat.precision]
      : null;
    const txTuple: [0 | 1, 0 | 1] = [
      ext.includes('WEBGL_compressed_texture_astc') ? 1 : 0,
      ext.includes('WEBGL_compressed_texture_etc') ? 1 : 0,
    ];

    const soft: SoftEnvObj = Object.freeze({
      gl: (gl ? 1 : 0) as 0 | 1,
      mdl: (hi?.model ? 1 : 0) as 0 | 1,
      gpu,
      mp: mpTuple,
      tx: txTuple,
      tp: textPhysics(),
    });

    const hardStr = canonical(hard);
    const softStr = canonical(soft);
    const hw = (await sha256hex(hardStr)).slice(0, 24);
    const gate = Object.freeze(inspectClientMobileGate(gpu));

    if (gate.failed) {
      cachedEnvPromise = null;
    }

    return Object.freeze({
      hardStr,
      softStr,
      hw,
      hard,
      soft,
      gate,
    });
  })();

  cachedEnvPromise = p;
  return p;
}
