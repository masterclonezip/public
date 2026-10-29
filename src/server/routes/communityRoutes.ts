import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import {
  normalizeAdminReviewRecord,
  resolveCanonicalAppMeta,
  formatReviewDate,
  AdminReviewItem
} from '../../lib/communityFirebase';
import {
  testGeminiConnection,
  executeGeminiWithRetry,
  isValidGeminiApiKey,
  maskGeminiApiKey,
  normalizeGeminiModelId
} from '../services/geminiServerService';

export const communityRouter = Router();

// ============================================================================
// 1. AI REVIEW STUDIO BRAIN & DIRECTIVES SERVER PERSISTENCE
// ============================================================================

let inMemoryAiStudioBrain: any = null;

const DATA_DIR = path.join(process.cwd(), '.data');
const PERSISTENT_BRAIN_FILE = path.join(DATA_DIR, 'aiStudioBrain.json');
const SEED_BRAIN_FILE = path.join(process.cwd(), 'src', 'lib', 'aiStudioBrain.json');

const PERSISTENT_LEDGER_FILE = path.join(DATA_DIR, 'communityReviewsLedger.json');
const STATIC_REVIEWS_FILE = path.join(process.cwd(), 'src', 'lib', 'communityStaticReviews.json');
const CATALOG_STATS_FILE = path.join(process.cwd(), 'src', 'lib', 'communityCatalogStats.json');
const STATIC_DATA_FILE = path.join(process.cwd(), 'src', 'lib', 'staticData.json');

function ensureBrainLoaded(): any {
  if (!inMemoryAiStudioBrain) {
    try {
      if (fs.existsSync(PERSISTENT_BRAIN_FILE)) {
        inMemoryAiStudioBrain = JSON.parse(fs.readFileSync(PERSISTENT_BRAIN_FILE, 'utf8'));
      } else if (fs.existsSync(SEED_BRAIN_FILE)) {
        inMemoryAiStudioBrain = JSON.parse(fs.readFileSync(SEED_BRAIN_FILE, 'utf8'));
      }
    } catch (_) {
      inMemoryAiStudioBrain = {};
    }
  }
  return inMemoryAiStudioBrain || {};
}

function persistBrainToDisk(brainObj: any) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(PERSISTENT_BRAIN_FILE, JSON.stringify(brainObj, null, 2), 'utf8');
  } catch (_) {}
}

// ============================================================================
// 2. SERVER-SIDE UNIFIED COMMUNITY REVIEWS LEDGER (PERSISTENT & ZERO-QUOTA)
// ============================================================================

let serverReviewsMap: Map<string, AdminReviewItem> | null = null;

function getServerCatalogApps(): any[] {
  try {
    if (fs.existsSync(STATIC_DATA_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(STATIC_DATA_FILE, 'utf8'));
      return Array.isArray(parsed?.apps) ? parsed.apps : (parsed?.mockApps || []);
    }
  } catch (_) {}
  return [];
}

function ensureServerLedgerLoaded(): Map<string, AdminReviewItem> {
  if (serverReviewsMap) return serverReviewsMap;
  serverReviewsMap = new Map<string, AdminReviewItem>();
  const catalogApps = getServerCatalogApps();

  // 1. Load from persistent ledger file (.data/communityReviewsLedger.json)
  try {
    if (fs.existsSync(PERSISTENT_LEDGER_FILE)) {
      const raw = JSON.parse(fs.readFileSync(PERSISTENT_LEDGER_FILE, 'utf8'));
      if (Array.isArray(raw)) {
        for (const item of raw) {
          if (item && item.id) {
            const norm = normalizeAdminReviewRecord(item, catalogApps);
            serverReviewsMap.set(norm.id, norm);
          }
        }
      }
    }
  } catch (_) {}

  // 2. Merge any seed reviews from src/lib/communityStaticReviews.json
  try {
    if (fs.existsSync(STATIC_REVIEWS_FILE)) {
      const staticBundle = JSON.parse(fs.readFileSync(STATIC_REVIEWS_FILE, 'utf8'));
      if (staticBundle && typeof staticBundle === 'object') {
        for (const list of Object.values(staticBundle)) {
          if (Array.isArray(list)) {
            for (const item of list) {
              if (item && item.id && !serverReviewsMap.has(item.id)) {
                const norm = normalizeAdminReviewRecord(item, catalogApps);
                serverReviewsMap.set(norm.id, norm);
              }
            }
          }
        }
      }
    }
  } catch (_) {}

  return serverReviewsMap;
}

function persistServerLedgerAndStaticBundles() {
  const map = ensureServerLedgerLoaded();
  const catalogApps = getServerCatalogApps();
  const allReviews = Array.from(map.values()).map(r => normalizeAdminReviewRecord(r, catalogApps));

  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(PERSISTENT_LEDGER_FILE, JSON.stringify(allReviews, null, 2), 'utf8');
  } catch (_) {}

  // Build static reviews bundle (published only, grouped by canonical slug and id)
  const staticBundle: Record<string, any[]> = {};
  const reviewsByCanonical = new Map<string, AdminReviewItem[]>();
  const metaByCanonical = new Map<string, ReturnType<typeof resolveCanonicalAppMeta>>();

  for (const app of catalogApps) {
    if (!app) continue;
    const meta = resolveCanonicalAppMeta(app.id, app.slug, app.name, catalogApps);
    if (meta.canonicalKey && !metaByCanonical.has(meta.canonicalKey)) {
      metaByCanonical.set(meta.canonicalKey, meta);
      reviewsByCanonical.set(meta.canonicalKey, []);
    }
  }

  const validAllReviews: AdminReviewItem[] = [];
  for (const rev of allReviews) {
    const meta = resolveCanonicalAppMeta(rev.appId, rev.appSlug, rev.appName, catalogApps);
    const cKey = meta.canonicalKey || String(rev.appSlug || rev.appId || '').toLowerCase().trim();
    if (!cKey || !metaByCanonical.has(cKey)) continue;
    validAllReviews.push(rev);
    const arr = reviewsByCanonical.get(cKey) || [];
    arr.push(rev);
    reviewsByCanonical.set(cKey, arr);
  }

  const appCounts: Record<string, any> = {};
  let totalGlobal = 0;
  let publishedGlobal = 0;
  let pendingGlobal = 0;
  let rejectedGlobal = 0;
  let flaggedGlobal = 0;
  let globalRatingSum = 0;
  let appCoverageCount = 0;
  const ratingDistribution: Record<string, number> = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };

  for (const [cKey, meta] of metaByCanonical.entries()) {
    const idKey = String(meta.id || '').toLowerCase().trim();
    const slugKey = String(meta.slug || '').toLowerCase().trim();
    const appRevs = reviewsByCanonical.get(cKey) || [];

    const publishedForApp: any[] = [];
    let pubCount = 0;
    let pendCount = 0;
    let rejCount = 0;
    let flagCount = 0;
    let ratingSum = 0;
    const starCounts: Record<string, number> = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };

    for (const r of appRevs) {
      const st = String(r.status || 'published').toLowerCase();
      if (st === 'published') {
        pubCount++;
        publishedForApp.push({
          id: r.id,
          appId: meta.id || r.appId,
          appSlug: meta.slug || r.appSlug || '',
          appName: meta.name || r.appName || '',
          userName: r.userName || r.username || 'Player',
          rating: Number(r.rating) || 5,
          reviewText: r.reviewText || r.comment || '',
          timestamp: r.timestamp || new Date().toISOString(),
          helpful_count: Number(r.helpful_count) || 0,
          isPinned: Boolean(r.isPinned),
          adminReply: r.adminReply || null
        });
      } else if (st === 'pending') {
        pendCount++;
      } else if (st === 'rejected') {
        rejCount++;
      }

      if (r.reported) flagCount++;

      const star = Math.max(1, Math.min(5, Math.round(Number(r.rating) || 5)));
      starCounts[String(star)] = (starCounts[String(star)] || 0) + 1;
      ratingDistribution[String(star)] = (ratingDistribution[String(star)] || 0) + 1;
      ratingSum += star;
    }

    publishedForApp.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime();
    });

    if (publishedForApp.length > 0) {
      if (slugKey) staticBundle[slugKey] = publishedForApp;
      if (idKey && idKey !== slugKey) staticBundle[idKey] = publishedForApp;
    }

    const total = appRevs.length;
    const avg = total > 0 ? Math.round((ratingSum / total) * 10) / 10 : meta.defaultRating;

    const statObj = {
      total,
      published: pubCount,
      pending: pendCount,
      rejected: rejCount,
      flagged: flagCount,
      ratingSum,
      avgRating: avg,
      starCounts,
      canonicalKey: cKey
    };

    if (idKey) appCounts[idKey] = statObj;
    if (slugKey) appCounts[slugKey] = statObj;
    if (cKey) appCounts[cKey] = statObj;

    if (total > 0) {
      appCoverageCount++;
      totalGlobal += total;
      publishedGlobal += pubCount;
      pendingGlobal += pendCount;
      rejectedGlobal += rejCount;
      flaggedGlobal += flagCount;
      globalRatingSum += ratingSum;
    }
  }

  const globalAvg = totalGlobal > 0 ? Math.round((globalRatingSum / totalGlobal) * 10) / 10 : 0;

  const catalogStatsPayload = {
    generatedAt: new Date().toISOString(),
    totalReviews: totalGlobal,
    publishedReviews: publishedGlobal,
    pendingReviews: pendingGlobal,
    rejectedReviews: rejectedGlobal,
    flaggedReviews: flaggedGlobal,
    appCoverageCount,
    averageRating: globalAvg,
    ratingDistribution,
    appCounts
  };

  try {
    fs.writeFileSync(STATIC_REVIEWS_FILE, JSON.stringify(staticBundle), 'utf8');
  } catch (_) {}

  try {
    fs.writeFileSync(CATALOG_STATS_FILE, JSON.stringify(catalogStatsPayload, null, 2), 'utf8');
  } catch (_) {}

  return { allReviews: validAllReviews, staticBundle, catalogStatsPayload };
}

// ============================================================================
// 3. AI STUDIO GEMINI SETTINGS & EXECUTION ENDPOINTS
// ============================================================================

communityRouter.get('/api/v1/admin/community/aistudio-settings', async (_req, res) => {
  try {
    const brainData = ensureBrainLoaded();
    const rawEnvKey = (process.env.GEMINI_API_KEY || '').trim();
    const hasServerEnvKey = isValidGeminiApiKey(rawEnvKey);
    const savedCustomKey = (brainData?.config?.apiKey || '').trim();
    const hasCustomKey = isValidGeminiApiKey(savedCustomKey);

    const responseConfig = brainData?.config && Object.keys(brainData.config).length > 0
      ? {
          ...brainData.config,
          model: brainData.config.model ? normalizeGeminiModelId(brainData.config.model) : undefined,
          apiKey: hasCustomKey ? savedCustomKey : undefined
        }
      : null;

    return res.json({
      success: true,
      hasServerEnvKey,
      serverEnvKeyMask: hasServerEnvKey ? maskGeminiApiKey(rawEnvKey) : '',
      activeKeySource: hasCustomKey ? 'custom' : hasServerEnvKey ? 'server_env' : 'none',
      activeKeyMask: hasCustomKey ? maskGeminiApiKey(savedCustomKey) : hasServerEnvKey ? maskGeminiApiKey(rawEnvKey) : '',
      data: {
        ...brainData,
        config: responseConfig
      }
    });
  } catch (err: any) {
    res.json({ success: true, data: inMemoryAiStudioBrain || null });
  }
});

communityRouter.post('/api/v1/admin/community/aistudio-settings', async (req, res) => {
  try {
    const payload = req.body || {};
    const existing = ensureBrainLoaded();
    const incomingConfig = payload.config || {};
    const mergedConfig: any = {
      ...(existing.config || {}),
      ...incomingConfig,
      updatedAt: incomingConfig.updatedAt || Date.now()
    };

    if (incomingConfig.model) {
      mergedConfig.model = normalizeGeminiModelId(incomingConfig.model);
    }
    if (typeof incomingConfig.apiKey === 'string') {
      mergedConfig.apiKey = incomingConfig.apiKey.trim();
    }

    inMemoryAiStudioBrain = {
      ...existing,
      ...payload,
      config: mergedConfig,
      updatedAt: new Date().toISOString()
    };
    persistBrainToDisk(inMemoryAiStudioBrain);
    res.json({
      success: true,
      message: 'Settings saved permanently in brain memory.',
      config: mergedConfig
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

communityRouter.post('/api/v1/admin/community/aistudio-gemini', async (req, res) => {
  try {
    const {
      action,
      apiKey: reqKey,
      clearKey,
      deepPing,
      model,
      systemInstruction,
      contents,
      temperature,
      responseMimeType,
      strictModel
    } = req.body || {};

    const brainData = ensureBrainLoaded();
    const cleanReqKey = (reqKey || '').trim();
    const savedBrainKey = clearKey ? '' : (brainData?.config?.apiKey || '').trim();
    const envKey = (process.env.GEMINI_API_KEY || '').trim();

    let resolvedKey = '';
    let keySource: 'custom' | 'saved_studio' | 'server_env' | 'none' = 'none';

    if (isValidGeminiApiKey(cleanReqKey)) {
      resolvedKey = cleanReqKey;
      keySource = 'custom';
    } else if (isValidGeminiApiKey(savedBrainKey)) {
      resolvedKey = savedBrainKey;
      keySource = 'saved_studio';
    } else if (isValidGeminiApiKey(envKey)) {
      resolvedKey = envKey;
      keySource = 'server_env';
    }

    const normalizedModel = normalizeGeminiModelId(
      model || brainData?.config?.model || 'gemini-2.5-flash'
    );

    if (clearKey || isValidGeminiApiKey(cleanReqKey) || model) {
      inMemoryAiStudioBrain = {
        ...brainData,
        config: {
          ...(brainData.config || {}),
          ...(clearKey ? { apiKey: '' } : isValidGeminiApiKey(cleanReqKey) ? { apiKey: cleanReqKey } : {}),
          ...(model ? { model: normalizedModel } : {}),
          updatedAt: Date.now()
        },
        updatedAt: new Date().toISOString()
      };
      persistBrainToDisk(inMemoryAiStudioBrain);
    }

    if (!resolvedKey) {
      return res.status(400).json({
        success: false,
        keySource: 'none',
        model: normalizedModel,
        error: 'No valid Gemini API key found. Click "API Key & Model" in the top bar to paste your Google AI Studio key.'
      });
    }

    if (action === 'test') {
      const result = await testGeminiConnection(resolvedKey, normalizedModel, Boolean(deepPing));
      return res.json({
        ...result,
        keySource,
        keyMask: maskGeminiApiKey(resolvedKey)
      });
    }

    const result = await executeGeminiWithRetry({
      apiKey: resolvedKey,
      model: normalizedModel,
      systemInstruction,
      contents,
      temperature: typeof temperature === 'number' ? temperature : 0.88,
      responseMimeType,
      strictModel: Boolean(strictModel)
    });

    if (!result.success) {
      return res.status(502).json({
        ...result,
        keySource,
        keyMask: maskGeminiApiKey(resolvedKey)
      });
    }

    return res.json({
      ...result,
      keySource,
      keyMask: maskGeminiApiKey(resolvedKey)
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Server error calling Gemini' });
  }
});

// ============================================================================
// 4. PUBLIC COMMUNITY REVIEWS & STATS ENDPOINTS
// ============================================================================

communityRouter.get('/api/v1/public/community/reviews', async (req, res) => {
  try {
    const appId = String(req.query.appId || req.query.id || '').trim();
    const appSlug = String(req.query.appSlug || req.query.slug || '').trim();
    const limit = Math.max(1, Number(req.query.limit) || 15);
    const cursor = req.query.cursor ? parseInt(String(req.query.cursor), 10) || 0 : 0;
    const filter = String(req.query.filter || 'all').toLowerCase();
    const sortBy = String(req.query.sortBy || 'recent').toLowerCase();

    const catalogApps = getServerCatalogApps();
    const meta = resolveCanonicalAppMeta(appId, appSlug, '', catalogApps);
    const ledger = ensureServerLedgerLoaded();

    let matching = Array.from(ledger.values()).filter(r => {
      if (String(r.status || 'published').toLowerCase() !== 'published') return false;
      const rMeta = resolveCanonicalAppMeta(r.appId, r.appSlug, r.appName, catalogApps);
      return (
        (meta.canonicalKey && rMeta.canonicalKey === meta.canonicalKey) ||
        (meta.id && rMeta.id.toLowerCase() === meta.id.toLowerCase()) ||
        (meta.slug && rMeta.slug.toLowerCase() === meta.slug.toLowerCase())
      );
    });

    if (filter === 'positive') {
      matching = matching.filter(r => Number(r.rating) >= 4);
    } else if (filter === 'critical') {
      matching = matching.filter(r => Number(r.rating) <= 3);
    }

    matching.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      if (sortBy === 'helpful') {
        return (Number(b.helpful_count) || 0) - (Number(a.helpful_count) || 0);
      }
      return new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime();
    });

    const pageItems = matching.slice(cursor, cursor + limit);
    const hasMore = cursor + limit < matching.length;
    const nextCursor = hasMore ? String(cursor + limit) : null;

    res.json({
      reviews: pageItems.map(r => ({
        ...r,
        app_id: r.appId,
        username: r.userName,
        comment: r.reviewText,
        created_at: formatReviewDate(r.timestamp)
      })),
      hasMore,
      nextCursor
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Error fetching public reviews', reviews: [], hasMore: false });
  }
});

communityRouter.get('/api/v1/public/community/stats/:appId', async (req, res) => {
  try {
    const rawId = String(req.params.appId || '').trim();
    const { catalogStatsPayload } = persistServerLedgerAndStaticBundles();
    const catalogApps = getServerCatalogApps();
    const meta = resolveCanonicalAppMeta(rawId, rawId, '', catalogApps);
    const stat =
      catalogStatsPayload.appCounts[meta.canonicalKey] ||
      catalogStatsPayload.appCounts[meta.slug.toLowerCase()] ||
      catalogStatsPayload.appCounts[meta.id.toLowerCase()];

    if (stat) {
      return res.json({
        success: true,
        stats: {
          totalReviews: Number(stat.published ?? stat.total ?? 0),
          averageRating: Number(stat.avgRating ?? 4.6),
          starCounts: stat.starCounts || { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 }
        }
      });
    }

    res.json({
      success: true,
      stats: {
        totalReviews: 0,
        averageRating: meta.defaultRating || 4.6,
        starCounts: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 }
      }
    });
  } catch (_) {
    res.json({
      success: true,
      stats: {
        totalReviews: 0,
        averageRating: 4.6,
        starCounts: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 }
      }
    });
  }
});

communityRouter.post('/api/v1/public/community/reviews', async (req, res) => {
  try {
    const catalogApps = getServerCatalogApps();
    const ledger = ensureServerLedgerLoaded();
    const record = normalizeAdminReviewRecord({
      ...req.body,
      status: 'published',
      source: 'community',
      timestamp: new Date().toISOString()
    }, catalogApps);
    ledger.set(record.id, record);
    persistServerLedgerAndStaticBundles();
    res.json({ success: true, review: record });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Error submitting review' });
  }
});

communityRouter.post('/api/v1/public/community/reviews/helpful', async (req, res) => {
  try {
    const { reviewId } = req.body || {};
    const ledger = ensureServerLedgerLoaded();
    const existing = ledger.get(String(reviewId || ''));
    if (existing) {
      existing.helpful_count = (Number(existing.helpful_count) || 0) + 1;
      ledger.set(existing.id, existing);
      persistServerLedgerAndStaticBundles();
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

communityRouter.post('/api/v1/public/community/reviews/report', async (req, res) => {
  try {
    const { reviewId } = req.body || {};
    const ledger = ensureServerLedgerLoaded();
    const existing = ledger.get(String(reviewId || ''));
    if (existing) {
      existing.reported = true;
      existing.report_count = (Number(existing.report_count) || 0) + 1;
      ledger.set(existing.id, existing);
      persistServerLedgerAndStaticBundles();
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

// ============================================================================
// 5. ADMIN COMMUNITY REVIEWS LEDGER & CRUD ENDPOINTS
// ============================================================================

communityRouter.get('/api/v1/admin/community/ledger', async (_req, res) => {
  try {
    const { allReviews, catalogStatsPayload } = persistServerLedgerAndStaticBundles();
    res.json({
      success: true,
      reviews: allReviews,
      stats: catalogStatsPayload
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message, reviews: [] });
  }
});

communityRouter.get('/api/v1/admin/community/reviews', async (req, res) => {
  try {
    const appIdParam = req.query.appId ? String(req.query.appId).trim() : 'all';
    const status = req.query.status ? String(req.query.status).trim().toLowerCase() : 'all';
    const rating = req.query.rating ? String(req.query.rating).trim() : 'all';
    const search = req.query.search ? String(req.query.search).trim().toLowerCase() : '';
    const sortBy = req.query.sortBy ? String(req.query.sortBy).trim() : 'newest';
    const isPinned = req.query.isPinned !== undefined ? String(req.query.isPinned) : undefined;
    const limit = Math.max(1, Number(req.query.limit) || 25);
    const page = Math.max(1, Number(req.query.page) || 1);

    const catalogApps = getServerCatalogApps();
    const { allReviews, catalogStatsPayload } = persistServerLedgerAndStaticBundles();

    const isAll = !appIdParam || appIdParam.toLowerCase() === 'all';
    const targetMeta = !isAll ? resolveCanonicalAppMeta(appIdParam, appIdParam, '', catalogApps) : null;

    let scoped = isAll
      ? [...allReviews]
      : allReviews.filter(r => {
          const rMeta = resolveCanonicalAppMeta(r.appId, r.appSlug, r.appName, catalogApps);
          return (
            (targetMeta?.canonicalKey && rMeta.canonicalKey === targetMeta.canonicalKey) ||
            (targetMeta?.id && rMeta.id.toLowerCase() === targetMeta.id.toLowerCase()) ||
            (targetMeta?.slug && rMeta.slug.toLowerCase() === targetMeta.slug.toLowerCase())
          );
        });

    if (status && status !== 'all') {
      if (status === 'flagged') {
        scoped = scoped.filter(r => Boolean(r.reported));
      } else {
        scoped = scoped.filter(r => String(r.status || 'published').toLowerCase() === status);
      }
    }

    if (rating && rating !== 'all') {
      const rNum = Number(rating);
      scoped = scoped.filter(r => Math.round(Number(r.rating) || 5) === rNum);
    }

    if (search) {
      scoped = scoped.filter(r =>
        (r.userName && r.userName.toLowerCase().includes(search)) ||
        (r.reviewText && r.reviewText.toLowerCase().includes(search)) ||
        (r.appName && r.appName.toLowerCase().includes(search)) ||
        (r.appSlug && r.appSlug.toLowerCase().includes(search))
      );
    }

    if (isPinned === 'true' || isPinned === 'false') {
      const wantPin = isPinned === 'true';
      scoped = scoped.filter(r => Boolean(r.isPinned) === wantPin);
    }

    scoped.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      if (sortBy === 'highest') return Number(b.rating || 5) - Number(a.rating || 5);
      if (sortBy === 'lowest') return Number(a.rating || 5) - Number(b.rating || 5);
      if (sortBy === 'oldest') return new Date(a.timestamp || 0).getTime() - new Date(b.timestamp || 0).getTime();
      if (sortBy === 'helpful') return (Number(b.helpful_count) || 0) - (Number(a.helpful_count) || 0);
      return new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime();
    });

    const totalCount = scoped.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / limit));
    const startIdx = (page - 1) * limit;
    const paged = scoped.slice(startIdx, startIdx + limit);

    res.json({
      reviews: paged,
      totalCount,
      total: totalCount,
      page,
      totalPages,
      globalStats: {
        total: catalogStatsPayload.totalReviews,
        published: catalogStatsPayload.publishedReviews,
        pending: catalogStatsPayload.pendingReviews,
        rejected: catalogStatsPayload.rejectedReviews,
        flagged: catalogStatsPayload.flaggedReviews,
        averageRating: catalogStatsPayload.averageRating,
        ratingDistribution: catalogStatsPayload.ratingDistribution,
        appCoverageCount: catalogStatsPayload.appCoverageCount
      },
      appCounts: catalogStatsPayload.appCounts
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message, reviews: [] });
  }
});

communityRouter.post('/api/v1/admin/community/reviews', async (req, res) => {
  try {
    const catalogApps = getServerCatalogApps();
    const ledger = ensureServerLedgerLoaded();
    const review = normalizeAdminReviewRecord(req.body || {}, catalogApps);
    ledger.set(review.id, review);
    persistServerLedgerAndStaticBundles();
    res.json({ success: true, review });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

communityRouter.post('/api/v1/admin/community/reviews/batch-create', async (req, res) => {
  try {
    const { reviews } = req.body || {};
    if (!Array.isArray(reviews) || reviews.length === 0) {
      return res.status(400).json({ success: false, error: 'No reviews array provided' });
    }
    const catalogApps = getServerCatalogApps();
    const ledger = ensureServerLedgerLoaded();
    const created: AdminReviewItem[] = [];

    for (const item of reviews) {
      const norm = normalizeAdminReviewRecord(item, catalogApps);
      ledger.set(norm.id, norm);
      created.push(norm);
    }
    persistServerLedgerAndStaticBundles();
    res.json({ success: true, count: created.length, reviews: created });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

communityRouter.put('/api/v1/admin/community/reviews/:id', async (req, res) => {
  try {
    const id = String(req.params.id || '').trim();
    const catalogApps = getServerCatalogApps();
    const ledger = ensureServerLedgerLoaded();
    const existing = ledger.get(id) || ({ id } as any);
    const updated = normalizeAdminReviewRecord(
      { ...existing, ...(req.body || {}), id, updated_at: new Date().toISOString() },
      catalogApps
    );
    ledger.set(id, updated);
    persistServerLedgerAndStaticBundles();
    res.json({ success: true, review: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

communityRouter.patch('/api/v1/admin/community/reviews/:id/status', async (req, res) => {
  try {
    const id = String(req.params.id || '').trim();
    const { status } = req.body || {};
    const ledger = ensureServerLedgerLoaded();
    const existing = ledger.get(id);
    if (existing && status) {
      existing.status = status;
      existing.updated_at = new Date().toISOString();
      ledger.set(id, existing);
      persistServerLedgerAndStaticBundles();
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

communityRouter.patch('/api/v1/admin/community/reviews/:id/pin', async (req, res) => {
  try {
    const id = String(req.params.id || '').trim();
    const { isPinned } = req.body || {};
    const ledger = ensureServerLedgerLoaded();
    const existing = ledger.get(id);
    if (existing) {
      existing.isPinned = Boolean(isPinned);
      existing.updated_at = new Date().toISOString();
      ledger.set(id, existing);
      persistServerLedgerAndStaticBundles();
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

communityRouter.delete('/api/v1/admin/community/reviews/:id', async (req, res) => {
  try {
    const id = String(req.params.id || '').trim();
    const ledger = ensureServerLedgerLoaded();
    ledger.delete(id);
    persistServerLedgerAndStaticBundles();
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

communityRouter.post('/api/v1/admin/community/reviews/bulk', async (req, res) => {
  try {
    const { action, reviewIds } = req.body || {};
    const ids: string[] = Array.isArray(reviewIds) ? reviewIds : [];
    const ledger = ensureServerLedgerLoaded();

    for (const id of ids) {
      if (!id) continue;
      if (action === 'delete') {
        ledger.delete(id);
      } else {
        const existing = ledger.get(id);
        if (!existing) continue;
        if (action === 'pin' || action === 'unpin') {
          existing.isPinned = action === 'pin';
        } else if (action === 'publish') {
          existing.status = 'published';
        } else if (action === 'pending') {
          existing.status = 'pending';
        } else if (action === 'reject') {
          existing.status = 'rejected';
        }
        existing.updated_at = new Date().toISOString();
        ledger.set(id, existing);
      }
    }

    persistServerLedgerAndStaticBundles();
    res.json({ success: true, count: ids.length });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

communityRouter.post('/api/v1/admin/community/recalculate', async (_req, res) => {
  try {
    const { catalogStatsPayload } = persistServerLedgerAndStaticBundles();
    res.json({
      globalStats: {
        total: catalogStatsPayload.totalReviews,
        published: catalogStatsPayload.publishedReviews,
        pending: catalogStatsPayload.pendingReviews,
        rejected: catalogStatsPayload.rejectedReviews,
        flagged: catalogStatsPayload.flaggedReviews,
        averageRating: catalogStatsPayload.averageRating,
        ratingDistribution: catalogStatsPayload.ratingDistribution,
        appCoverageCount: catalogStatsPayload.appCoverageCount
      },
      appCounts: catalogStatsPayload.appCounts
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

communityRouter.get('/api/v1/admin/community/app-counts', async (_req, res) => {
  try {
    const { catalogStatsPayload } = persistServerLedgerAndStaticBundles();
    res.json({
      globalStats: {
        total: catalogStatsPayload.totalReviews,
        published: catalogStatsPayload.publishedReviews,
        pending: catalogStatsPayload.pendingReviews,
        rejected: catalogStatsPayload.rejectedReviews,
        flagged: catalogStatsPayload.flaggedReviews,
        averageRating: catalogStatsPayload.averageRating,
        ratingDistribution: catalogStatsPayload.ratingDistribution,
        appCoverageCount: catalogStatsPayload.appCoverageCount
      },
      appCounts: catalogStatsPayload.appCounts
    });
  } catch (_) {
    res.json({ globalStats: { total: 0, published: 0, pending: 0, rejected: 0, flagged: 0, averageRating: 4.7 }, appCounts: {} });
  }
});

communityRouter.get('/api/v1/admin/community/overview', async (_req, res) => {
  try {
    const { catalogStatsPayload } = persistServerLedgerAndStaticBundles();
    const communityProjectId = process.env.COMMUNITY_FIREBASE_PROJECT_ID || process.env.VITE_COMMUNITY_FIREBASE_PROJECT_ID || '';
    res.json({
      success: true,
      projectId: communityProjectId,
      metrics: {
        totalReviews: catalogStatsPayload.totalReviews,
        publishedCount: catalogStatsPayload.publishedReviews,
        pendingCount: catalogStatsPayload.pendingReviews,
        rejectedCount: catalogStatsPayload.rejectedReviews,
        flaggedCount: catalogStatsPayload.flaggedReviews,
        totalReports: 0,
        pendingReportsCount: 0,
        averageRating: catalogStatsPayload.averageRating,
        ratingDistribution: catalogStatsPayload.ratingDistribution,
        appCoverageCount: catalogStatsPayload.appCoverageCount,
        appCounts: catalogStatsPayload.appCounts
      }
    });
  } catch (_) {
    const communityProjectId = process.env.COMMUNITY_FIREBASE_PROJECT_ID || process.env.VITE_COMMUNITY_FIREBASE_PROJECT_ID || '';
    res.json({ success: true, metrics: { totalReviews: 0, appCounts: {} }, projectId: communityProjectId });
  }
});

communityRouter.get('/api/v1/admin/community/export-stats', async (_req, res) => {
  try {
    const { catalogStatsPayload } = persistServerLedgerAndStaticBundles();
    res.json({ success: true, stats: catalogStatsPayload });
  } catch (_) {
    res.json({ success: true, stats: { appCounts: {}, totalReviews: 0 } });
  }
});

communityRouter.get('/api/v1/admin/community/export-static-reviews', async (_req, res) => {
  try {
    const { staticBundle } = persistServerLedgerAndStaticBundles();
    res.json({ success: true, reviews: staticBundle });
  } catch (_) {
    res.json({ success: true, reviews: {} });
  }
});
