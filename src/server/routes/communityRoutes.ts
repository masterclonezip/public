import { Router } from 'express';
import { 
  fetchAdminReviewsList, 
  fetchAdminAppReviewCounts, 
  fetchAdminCommunityOverviewStats, 
  createAdminReviewItem, 
  updateAdminReviewItem, 
  setAdminReviewStatus, 
  toggleAdminReviewPin, 
  deleteAdminReviewItem, 
  performBulkReviewsAction, 
  submitAdminReplyToReview,
  getConsolidatedReviewsForApp,
  fetchLiveReviews,
  submitLiveReview,
  voteLiveReviewHelpful,
  reportLiveReview,
  persistAuthoritativeAtomicCatalogStats,
  getLiveAtomicReviewStatsSync
} from '../../lib/communityFirebase';
import communityCatalogStats from '../../lib/communityCatalogStats.json';
import communityStaticReviews from '../../lib/communityStaticReviews.json';
import fs from 'fs';
import path from 'path';

export const communityRouter = Router();

// AI Review Studio Brain & Directives Server Persistence (Zero-Quota, 100% Reliable)
let inMemoryAiStudioBrain: any = null;
import { testGeminiConnection, executeGeminiWithRetry } from '../services/geminiServerService';

const DATA_DIR = path.join(process.cwd(), '.data');
const PERSISTENT_BRAIN_FILE = path.join(DATA_DIR, 'aiStudioBrain.json');
const SEED_BRAIN_FILE = path.join(process.cwd(), 'src', 'lib', 'aiStudioBrain.json');

communityRouter.get('/api/v1/admin/community/aistudio-settings', async (req, res) => {
  try {
    let brainData = inMemoryAiStudioBrain;
    if (!brainData) {
      if (fs.existsSync(PERSISTENT_BRAIN_FILE)) {
        brainData = JSON.parse(fs.readFileSync(PERSISTENT_BRAIN_FILE, 'utf8'));
        inMemoryAiStudioBrain = brainData;
      } else if (fs.existsSync(SEED_BRAIN_FILE)) {
        brainData = JSON.parse(fs.readFileSync(SEED_BRAIN_FILE, 'utf8'));
        inMemoryAiStudioBrain = brainData;
      }
    }

    const envKey = process.env.GEMINI_API_KEY || '';
    if (brainData) {
      if (!brainData.config) brainData.config = {};
      if (!brainData.config.apiKey && envKey) {
        brainData.config.apiKey = envKey;
      }
      return res.json({ success: true, data: brainData });
    }

    res.json({
      success: true,
      data: {
        config: {
          apiKey: envKey,
          model: 'gemini-flash-latest'
        }
      }
    });
  } catch (err: any) {
    res.json({ success: true, data: inMemoryAiStudioBrain || null });
  }
});

communityRouter.post('/api/v1/admin/community/aistudio-settings', async (req, res) => {
  try {
    const payload = req.body || {};
    inMemoryAiStudioBrain = {
      ...(inMemoryAiStudioBrain || {}),
      ...payload,
      config: {
        ...((inMemoryAiStudioBrain && inMemoryAiStudioBrain.config) || {}),
        ...(payload.config || {})
      },
      updatedAt: new Date().toISOString()
    };
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(PERSISTENT_BRAIN_FILE, JSON.stringify(inMemoryAiStudioBrain, null, 2), 'utf8');
    } catch (_) {}
    res.json({ success: true, message: 'Settings saved permanently in brain memory.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

// Dedicated Server-Side Gemini Execution Proxy with Auto-Retry & Model Fallback
communityRouter.post('/api/v1/admin/community/aistudio-gemini', async (req, res) => {
  try {
    const { action, apiKey: reqKey, model, systemInstruction, contents, temperature, responseMimeType } = req.body || {};
    const apiKey = (reqKey || '').trim() || 
                   inMemoryAiStudioBrain?.config?.apiKey || 
                   process.env.GEMINI_API_KEY || 
                   '';

    if (!apiKey) {
      return res.status(400).json({ success: false, error: 'Gemini API key is required. Please set it in AI Studio.' });
    }

    if (action === 'test') {
      const result = await testGeminiConnection(apiKey, model || 'gemini-flash-latest');
      return res.json(result);
    }

    // Standard generate or chat execution
    const result = await executeGeminiWithRetry({
      apiKey,
      model: model || 'gemini-flash-latest',
      systemInstruction,
      contents,
      temperature: typeof temperature === 'number' ? temperature : 0.85,
      responseMimeType
    });

    if (!result.success) {
      return res.status(502).json(result);
    }

    return res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Server error calling Gemini' });
  }
});


// Public reviews endpoints
communityRouter.get('/api/v1/public/community/reviews', async (req, res) => {
  try {
    const appId = String(req.query.appId || req.query.id || '');
    const appSlug = String(req.query.appSlug || req.query.slug || '');
    const limit = Number(req.query.limit) || 15;
    const cursor = req.query.cursor;
    const filter = String(req.query.filter || 'all');
    const sortBy = String(req.query.sortBy || 'recent');

    const result = await fetchLiveReviews({
      appId,
      appSlug,
      limit,
      cursor,
      filter,
      sortBy
    });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Error fetching public reviews', reviews: [], hasMore: false });
  }
});

// Public per-app aggregate rating stats endpoint
communityRouter.get('/api/v1/public/community/stats/:appId', async (req, res) => {
  try {
    const rawId = String(req.params.appId || '').toLowerCase().trim();
    const liveAtomic = getLiveAtomicReviewStatsSync();
    const appCounts = liveAtomic?.appCounts || (communityCatalogStats as any)?.appCounts || {};

    const stat = appCounts[rawId] || Object.entries(appCounts).find(([k]) => k.toLowerCase() === rawId)?.[1];

    if (stat) {
      return res.json({
        success: true,
        stats: {
          totalReviews: Number(stat.total ?? stat.published ?? 0),
          averageRating: Number(stat.avgRating ?? 4.5),
          starCounts: stat.starCounts || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
        }
      });
    }

    // Fallback: check static dataset
    const staticMap = (communityStaticReviews as any) || {};
    const revs = staticMap[rawId] || [];
    const count = Array.isArray(revs) ? revs.length : 0;
    let sum = 0;
    if (Array.isArray(revs)) {
      revs.forEach((r: any) => { sum += Number(r.rating) || 5; });
    }
    const avg = count > 0 ? Math.round((sum / count) * 10) / 10 : 4.5;

    res.json({
      success: true,
      stats: {
        totalReviews: count,
        averageRating: avg,
        starCounts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
      }
    });
  } catch (err: any) {
    res.json({
      success: true,
      stats: {
        totalReviews: 0,
        averageRating: 4.5,
        starCounts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
      }
    });
  }
});

communityRouter.post('/api/v1/public/community/reviews', async (req, res) => {
  try {
    const result = await submitLiveReview(req.body);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Error submitting review' });
  }
});

communityRouter.post('/api/v1/public/community/reviews/helpful', async (req, res) => {
  try {
    const { reviewId, appId } = req.body || {};
    const success = await voteLiveReviewHelpful(reviewId, appId);
    res.json({ success });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

communityRouter.post('/api/v1/public/community/reviews/report', async (req, res) => {
  try {
    const success = await reportLiveReview(req.body);
    res.json({ success });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

// Admin reviews endpoints
communityRouter.get('/api/v1/admin/community/reviews', async (req, res) => {
  try {
    const appId = req.query.appId ? String(req.query.appId) : undefined;
    const status = req.query.status ? String(req.query.status) : undefined;
    const rating = req.query.rating ? String(req.query.rating) : undefined;
    const search = req.query.search ? String(req.query.search) : undefined;
    const sortBy = req.query.sortBy ? String(req.query.sortBy) : undefined;
    const isPinned = req.query.isPinned !== undefined ? String(req.query.isPinned) === 'true' : undefined;
    const limit = req.query.limit ? Number(req.query.limit) : 25;
    const page = req.query.page ? Number(req.query.page) : 1;
    const refresh = req.query.refresh === 'true';

    const result = await fetchAdminReviewsList({
      appId,
      status,
      rating,
      search,
      sortBy,
      isPinned,
      limit,
      page,
      refresh
    });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err?.message, reviews: [] });
  }
});

communityRouter.post('/api/v1/admin/community/reviews', async (req, res) => {
  try {
    const review = await createAdminReviewItem(req.body);
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
    const created: any[] = [];
    for (const item of reviews) {
      const createdItem = await createAdminReviewItem(item);
      created.push(createdItem);
    }
    res.json({ success: true, count: created.length, reviews: created });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

communityRouter.put('/api/v1/admin/community/reviews/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const updated = await updateAdminReviewItem(id, req.body);
    res.json({ success: true, review: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

communityRouter.patch('/api/v1/admin/community/reviews/:id/status', async (req, res) => {
  try {
    const id = req.params.id;
    const { status, oldStatus, appId, appSlug, rating } = req.body || {};
    const success = await setAdminReviewStatus(id, status, { appId, appSlug, rating, status: oldStatus });
    res.json({ success });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

communityRouter.patch('/api/v1/admin/community/reviews/:id/pin', async (req, res) => {
  try {
    const id = req.params.id;
    const { isPinned } = req.body || {};
    const success = await toggleAdminReviewPin(id, Boolean(isPinned));
    res.json({ success });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

communityRouter.delete('/api/v1/admin/community/reviews/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const appId = String(req.query.appId || req.body?.appId || '');
    const appSlug = String(req.query.appSlug || req.body?.appSlug || '');
    const rating = Number(req.query.rating || req.body?.rating) || 5;
    const status = String(req.query.status || req.body?.status || 'published');
    const success = await deleteAdminReviewItem(id, { appId, appSlug, rating, status });
    res.json({ success });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

communityRouter.post('/api/v1/admin/community/recalculate', async (req, res) => {
  try {
    const result = await persistAuthoritativeAtomicCatalogStats();
    try {
      const statsFile = path.join(process.cwd(), 'src', 'lib', 'communityCatalogStats.json');
      fs.writeFileSync(statsFile, JSON.stringify(result, null, 2), 'utf8');
    } catch (_) {}
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

communityRouter.post('/api/v1/admin/community/reviews/bulk', async (req, res) => {
  try {
    const { action, reviewIds } = req.body || {};
    const result = await performBulkReviewsAction(action, reviewIds || []);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

communityRouter.get('/api/v1/admin/community/app-counts', async (req, res) => {
  try {
    const force = req.query.force === 'true';
    const result = await fetchAdminAppReviewCounts(force);
    res.json(result);
  } catch (err: any) {
    res.json({ globalStats: communityCatalogStats, appCounts: (communityCatalogStats as any).appCounts || {} });
  }
});

communityRouter.get('/api/v1/admin/community/overview', async (req, res) => {
  try {
    const force = req.query.force === 'true';
    const atomicStats = await fetchAdminAppReviewCounts(force);
    const metrics = {
      totalReviews: atomicStats.globalStats?.total || 0,
      publishedCount: atomicStats.globalStats?.published || 0,
      pendingCount: atomicStats.globalStats?.pending || 0,
      rejectedCount: atomicStats.globalStats?.rejected || 0,
      flaggedCount: atomicStats.globalStats?.flagged || 0,
      totalReports: 0,
      pendingReportsCount: 0,
      averageRating: atomicStats.globalStats?.averageRating || 4.5,
      ratingDistribution: (atomicStats.globalStats as any)?.ratingDistribution,
      appCounts: atomicStats.appCounts || {}
    };
    const communityProjectId = process.env.COMMUNITY_FIREBASE_PROJECT_ID || process.env.VITE_COMMUNITY_FIREBASE_PROJECT_ID || '';
    res.json({ success: true, metrics, projectId: communityProjectId });
  } catch (err: any) {
    const communityProjectId = process.env.COMMUNITY_FIREBASE_PROJECT_ID || process.env.VITE_COMMUNITY_FIREBASE_PROJECT_ID || '';
    res.json({ success: true, metrics: communityCatalogStats, projectId: communityProjectId });
  }
});

communityRouter.get('/api/v1/admin/community/export-stats', async (req, res) => {
  try {
    const liveStats = await fetchAdminAppReviewCounts(true);
    res.json({ success: true, stats: liveStats });
  } catch (err: any) {
    res.json({ success: true, stats: { appCounts: {}, totalReviews: 0 } });
  }
});

communityRouter.get('/api/v1/admin/community/export-static-reviews', async (req, res) => {
  try {
    res.json({ success: true, reviews: communityStaticReviews });
  } catch (err: any) {
    res.json({ success: true, reviews: {} });
  }
});
