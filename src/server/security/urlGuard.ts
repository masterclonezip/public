/**
 * Shared outbound URL safety guard for server-side image/icon fetchers and upload proxies.
 * Blocks non-HTTP(S) schemes, embedded credentials, loopback, link-local / cloud metadata,
 * private RFC1918 / ULA networks, IPv4-mapped IPv6 addresses, and internal hostnames.
 */
export function isSafeExternalHttpUrl(rawUrl: string): boolean {
  if (!rawUrl || typeof rawUrl !== 'string') return false;
  try {
    const parsed = new URL(rawUrl.trim());
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false;
    if (parsed.username || parsed.password) return false;

    const rawHost = parsed.hostname.toLowerCase().trim();
    if (!rawHost) return false;

    // Strip IPv6 brackets if present
    const host = rawHost.startsWith('[') && rawHost.endsWith(']')
      ? rawHost.slice(1, -1)
      : rawHost;

    // Block loopback & well-known internal domains
    if (
      host === 'localhost' ||
      host === '0.0.0.0' ||
      host === '::' ||
      host === '::1' ||
      host === '0:0:0:0:0:0:0:1' ||
      host.endsWith('.localhost') ||
      host.endsWith('.local') ||
      host.endsWith('.internal') ||
      host.endsWith('.lan') ||
      host.endsWith('.home.arpa') ||
      host === 'metadata.google.internal' ||
      host === 'metadata'
    ) {
      return false;
    }

    // Block IPv4-mapped IPv6 (e.g. ::ffff:127.0.0.1 or ::ffff:169.254.169.254) and private/link-local IPv6
    if (host.includes(':')) {
      if (
        host.startsWith('::ffff:') ||
        host.startsWith('fe80:') ||
        host.startsWith('fe9') ||
        host.startsWith('fea') ||
        host.startsWith('feb') ||
        host.startsWith('fc') ||
        host.startsWith('fd') ||
        host.startsWith('ff')
      ) {
        return false;
      }
      // Disallow any bare IPv6 literal for outbound media fetches
      return false;
    }

    // Block numeric/decimal/octal/hex IPv4 representations (e.g. 2130706433, 0x7f000001)
    if (/^\d+$/.test(host) || /^0x[0-9a-f]+$/i.test(host)) {
      return false;
    }

    // Parse dotted IPv4 addresses and reject private/loopback/link-local/CGNAT ranges
    const ipv4Match = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (ipv4Match) {
      const a = Number(ipv4Match[1]);
      const b = Number(ipv4Match[2]);
      const c = Number(ipv4Match[3]);
      const d = Number(ipv4Match[4]);
      if (a > 255 || b > 255 || c > 255 || d > 255) return false;

      if (
        a === 0 ||                               // 0.0.0.0/8
        a === 10 ||                              // 10.0.0.0/8
        a === 127 ||                             // 127.0.0.0/8 (loopback)
        (a === 100 && b >= 64 && b <= 127) ||    // 100.64.0.0/10 (CGNAT)
        (a === 169 && b === 254) ||              // 169.254.0.0/16 (link-local & cloud metadata)
        (a === 172 && b >= 16 && b <= 31) ||     // 172.16.0.0/12
        (a === 192 && b === 168) ||              // 192.168.0.0/16
        (a === 192 && b === 0 && c === 0) ||     // 192.0.0.0/24
        (a === 192 && b === 0 && c === 2) ||     // 192.0.2.0/24
        (a === 198 && (b === 18 || b === 19)) || // 198.18.0.0/15
        a >= 224                                 // multicast & reserved
      ) {
        return false;
      }
    }

    // Require at least one dot for standard public hostnames
    if (!host.includes('.')) return false;

    return true;
  } catch {
    return false;
  }
}
