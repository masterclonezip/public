/**
 * Yono Transparency - Device Fingerprinting Utility
 * Generates a unique cross-browser signal for security verification.
 */

export const generateFingerprint = async (): Promise<string> => {
  const signals = [
    navigator.userAgent,
    navigator.language,
    new Date().getTimezoneOffset().toString(),
    screen.colorDepth.toString(),
    screen.width + 'x' + screen.height,
    (window.devicePixelRatio || 1).toString(),
    // Hardware concurrency might be blocked in some iframes, handle gracefully
    (() => { try { return navigator.hardwareConcurrency?.toString() || '0'; } catch(e) { return '0'; } })(),
  ];

  const msg = signals.join('|');
  const encoder = new TextEncoder();
  const data = encoder.encode(msg);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

/**
 * Simple quick hash for non-sensitive identification
 */
export const quickHash = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
};
