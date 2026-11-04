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

export function extractPrimaryCategory(rawCategory?: any): string {
  const catStr = typeof rawCategory === 'string'
    ? rawCategory
    : String(rawCategory?.stringValue ?? '');
  if (!catStr) return 'All Apps';
  const parts = catStr.split(',').map((c) => c.trim()).filter(Boolean);
  const nonGeneric = parts.filter((c) => {
    const lower = c.toLowerCase();
    return lower !== 'all apps' && lower !== 'all' && lower !== 'apps' && lower !== 'general';
  });
  return nonGeneric.length > 0 ? nonGeneric[0] : 'All Apps';
}

export function checkAppIsNew(item: any): boolean {
  if (!item || typeof item !== 'object') return false;
  if (item.is_new === true || item.is_new === 'true' || item.is_new === 1) return true;
  if (item.isNew === true || item.isNew === 'true' || item.isNew === 1) return true;
  const rawField = getFieldSafe(item, 'is_new');
  if (rawField === true || rawField === 'true' || rawField === 1 || rawField?.booleanValue === true) return true;
  const isNewStr = String(rawField?.stringValue ?? rawField ?? '').trim().toLowerCase();
  if (isNewStr === 'true' || isNewStr === '1') return true;
  const rawBadge = getFieldSafe(item, 'badge');
  const badge = String(rawBadge?.stringValue ?? rawBadge ?? '').trim().toLowerCase();
  if (badge === 'new' || badge.includes('new')) return true;
  const tags = Array.isArray(item.tags) ? item.tags : [];
  return tags.some((t: any) => String(t || '').toLowerCase().trim() === 'new');
}

export function checkAppIsHot(item: any): boolean {
  if (!item || typeof item !== 'object') return false;
  if (item.is_hot === true || item.is_hot === 'true' || item.is_hot === 1) return true;
  if (item.isHot === true || item.isHot === 'true' || item.isHot === 1) return true;
  const rawField = getFieldSafe(item, 'is_hot');
  if (rawField === true || rawField === 'true' || rawField === 1 || rawField?.booleanValue === true) return true;
  const isHotStr = String(rawField?.stringValue ?? rawField ?? '').trim().toLowerCase();
  if (isHotStr === 'true' || isHotStr === '1') return true;
  const rawBadge = getFieldSafe(item, 'badge');
  const badge = String(rawBadge?.stringValue ?? rawBadge ?? '').trim().toLowerCase();
  return badge === 'hot' || badge.includes('hot');
}

function getSerialForSort(item: any): number {
  const raw = getFieldSafe(item, 'serial_number');
  const num = Number(raw?.integerValue ?? raw?.doubleValue ?? raw);
  return !isNaN(num) && num > 0 ? num : 999999;
}

function getCanonicalSortKey(item: any): string {
  const s = getFieldSafe(item, 'slug');
  const id = getFieldSafe(item, 'id');
  return String(s?.stringValue ?? s ?? id?.stringValue ?? id ?? '').toLowerCase().trim();
}

function sortAppsDeterministically(a: any, b: any): number {
  const sa = getSerialForSort(a);
  const sb = getSerialForSort(b);
  if (sa !== sb) return sa - sb;
  return getCanonicalSortKey(a).localeCompare(getCanonicalSortKey(b));
}

/**
 * Deterministic Similar Applications Engine (1:1 identical across SSR, initialDataOptimizer, and React client).
 * Guarantees up to maxCount (16) similar apps are selected without dropping remaining new apps when regularApps is empty.
 */
export function computeSimilarApps(
  targetApp: any,
  catalogApps: any[],
  maxCount: number = 16
): { similarApps: any[]; totalCategoryCount: number; specificCategory: string } {
  const specificCategory = extractPrimaryCategory(getFieldSafe(targetApp, 'category'));
  if (!targetApp || !Array.isArray(catalogApps) || catalogApps.length === 0) {
    return { similarApps: [], totalCategoryCount: 0, specificCategory };
  }

  const targetSlug = String(getFieldSafe(targetApp, 'slug') || '').toLowerCase().trim();
  const targetId = String(getFieldSafe(targetApp, 'id') || '').toLowerCase().trim();
  const currentCatLower = specificCategory.toLowerCase().trim();
  const isAll = currentCatLower === 'all apps' || currentCatLower === 'all';

  const newApps: any[] = [];
  const regularApps: any[] = [];
  const otherCatApps: any[] = [];
  let totalCategoryCount = 0;

  const seenKeys = new Set<string>();

  for (let i = 0; i < catalogApps.length; i++) {
    const a = catalogApps[i];
    if (!a || a.sync_to_public === false || a.is_Safety_alert === true || a.status === 'flagged') continue;

    const aSlug = String(getFieldSafe(a, 'slug') || '').toLowerCase().trim();
    const aId = String(getFieldSafe(a, 'id') || '').toLowerCase().trim();
    const uniqueKey = aSlug || aId || `idx_${i}`;
    if (seenKeys.has(uniqueKey)) continue;
    seenKeys.add(uniqueKey);

    const isCurrent =
      (targetSlug && (aSlug === targetSlug || aId === targetSlug)) ||
      (targetId && (aId === targetId || aSlug === targetId));

    const rawACat = String(getFieldSafe(a, 'category') || '').toLowerCase().trim();
    const matchesCategory =
      isAll ||
      !rawACat ||
      rawACat.includes(currentCatLower) ||
      currentCatLower.includes(rawACat);

    if (matchesCategory) {
      totalCategoryCount++;
      if (!isCurrent) {
        if (checkAppIsNew(a)) {
          newApps.push(a);
        } else {
          regularApps.push(a);
        }
      }
    } else if (!isCurrent) {
      otherCatApps.push(a);
    }
  }

  newApps.sort(sortAppsDeterministically);
  regularApps.sort(sortAppsDeterministically);
  otherCatApps.sort(sortAppsDeterministically);

  const strSeed = String(targetSlug || targetId || '');
  let seedHash = 0;
  for (let i = 0; i < strSeed.length; i++) {
    seedHash = ((seedHash << 5) - seedHash) + strSeed.charCodeAt(i);
  }
  const absSeed = Math.abs(seedHash);

  // 1. Pick up to 6 initial New apps circularly
  const initialNewCap = Math.min(newApps.length, 6);
  const pinnedNew: any[] = [];
  const newStart = newApps.length > 0 ? (absSeed % newApps.length) : 0;
  for (let s = 0; s < initialNewCap; s++) {
    pinnedNew.push(newApps[(newStart + s) % newApps.length]);
  }

  // 2. Pick Regular apps circularly starting right after targetApp's serial_number
  const remainingAfterInitialNew = maxCount - pinnedNew.length;
  const pickedRegular: any[] = [];
  if (remainingAfterInitialNew > 0 && regularApps.length > 0) {
    let startIndex = absSeed % regularApps.length;
    const currSerial = getSerialForSort(targetApp);
    if (currSerial < 999999 && currSerial > 0) {
      const nextIdx = regularApps.findIndex((a: any) => getSerialForSort(a) > currSerial);
      if (nextIdx !== -1) startIndex = nextIdx;
    }

    const countToPick = Math.min(remainingAfterInitialNew, regularApps.length);
    for (let step = 0; step < countToPick; step++) {
      pickedRegular.push(regularApps[(startIndex + step) % regularApps.length]);
    }
  }

  // 3. If slots remain open (e.g. when most/all apps in category are marked NEW), fill with remaining New apps in category
  const extraNew: any[] = [];
  const openAfterRegular = maxCount - (pinnedNew.length + pickedRegular.length);
  if (openAfterRegular > 0 && newApps.length > pinnedNew.length) {
    const extraCount = Math.min(openAfterRegular, newApps.length - pinnedNew.length);
    for (let s = 0; s < extraCount; s++) {
      extraNew.push(newApps[(newStart + pinnedNew.length + s) % newApps.length]);
    }
  }

  // 4. If category has fewer than maxCount apps and other categories have apps, backfill so the 4x2 grid is always complete
  const fallbackOther: any[] = [];
  const openAfterCategory = maxCount - (pinnedNew.length + pickedRegular.length + extraNew.length);
  if (openAfterCategory > 0 && otherCatApps.length > 0) {
    const otherStart = absSeed % otherCatApps.length;
    const otherCount = Math.min(openAfterCategory, otherCatApps.length);
    for (let s = 0; s < otherCount; s++) {
      fallbackOther.push(otherCatApps[(otherStart + s) % otherCatApps.length]);
    }
  }

  const similarApps = [...pinnedNew, ...pickedRegular, ...extraNew, ...fallbackOther].slice(0, maxCount);
  const precomputedTotal = Number((targetApp as any)._totalCategoryCount) || 0;
  const finalTotalCategoryCount = Math.max(totalCategoryCount, precomputedTotal, similarApps.length + 1);

  return {
    similarApps,
    totalCategoryCount: finalTotalCategoryCount,
    specificCategory
  };
}

