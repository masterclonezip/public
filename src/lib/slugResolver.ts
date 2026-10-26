/**
 * Lightweight, zero-dependency slug resolver utility.
 * Safe for both client-side React bundle and server-side execution.
 */

// Keep SLUG_ALIAS_MAP empty so apps are never cross-hijacked or mismatched
export const SLUG_ALIAS_MAP: Record<string, string> = {};

function getFieldSafe(obj: any, field: string): any {
  if (!obj || typeof obj !== 'object') return '';
  return obj[field] !== undefined ? obj[field] : (obj.fields && obj.fields[field] ? obj.fields[field] : '');
}

export function resolveAppSlug(rawSlug: string, appsList: any[]): any | null {
  if (!rawSlug || !Array.isArray(appsList) || appsList.length === 0) return null;
  let clean = decodeURIComponent(rawSlug).replace(/^\/+|\/+$/g, '').toLowerCase().trim();
  clean = clean.replace(/[-_]+$/g, ''); // Strip trailing hyphens like "uno-" -> "uno"

  if (!clean) return null;

  // 1. Direct exact slug match
  let matched = appsList.find((a: any) => getFieldSafe(a, 'slug')?.toLowerCase() === clean);
  if (matched) return matched;

  // 2. Direct exact ID match
  matched = appsList.find((a: any) => getFieldSafe(a, 'id')?.toLowerCase() === clean);
  if (matched) return matched;

  // 2b. Direct serial number match (e.g. numeric ID "45" or 45)
  matched = appsList.find((a: any) => {
    const sn = getFieldSafe(a, 'serial_number');
    return sn !== undefined && sn !== null && String(sn).trim() === clean;
  });
  if (matched) return matched;

  // 3. Exact alias match
  const aliasTarget = SLUG_ALIAS_MAP[clean];
  if (aliasTarget) {
    matched = appsList.find((a: any) => getFieldSafe(a, 'slug')?.toLowerCase() === aliasTarget);
    if (matched) return matched;
  }

  // 4. Normalized exact match (hyphens/underscores/spaces standardized)
  const normalizedClean = clean.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  if (normalizedClean) {
    matched = appsList.find((a: any) => {
      const s = getFieldSafe(a, 'slug')?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      return s === normalizedClean;
    });
    if (matched) return matched;
  }

  // 5. Normalized ID match
  if (normalizedClean) {
    matched = appsList.find((a: any) => {
      const s = getFieldSafe(a, 'id')?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      return s === normalizedClean;
    });
    if (matched) return matched;
  }

  // 6. Name match
  matched = appsList.find((a: any) => {
    const n = getFieldSafe(a, 'name')?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    return n && n === normalizedClean;
  });
  if (matched) return matched;

  return null;
}
