import { Router } from 'express';
import { fetchAdminReportsList, submitLiveReport } from '../../lib/communityFirebase';

export const reportRouter = Router();

reportRouter.post('/api/v1/public/reports', async (req, res) => {
  try {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const targetId = String(body.targetId || body.appId || body.reviewId || '').trim().slice(0, 140);
    const reason = String(body.reason || body.category || '').trim().slice(0, 200);
    if (!targetId || !reason) {
      return res.status(400).json({ success: false, error: 'Target ID and reason are required.' });
    }
    const cleanPayload = {
      type: body.type === 'review_flag' ? 'review_flag' : 'app_flag',
      targetId,
      appId: String(body.appId || targetId).trim().slice(0, 140),
      appName: String(body.appName || '').trim().slice(0, 160),
      reviewId: body.reviewId ? String(body.reviewId).trim().slice(0, 140) : undefined,
      reason,
      details: String(body.details || body.description || '').trim().slice(0, 1500),
      reporterEmail: body.reporterEmail ? String(body.reporterEmail).trim().slice(0, 160) : undefined
    };
    const success = await submitLiveReport(cleanPayload as any);
    res.json({ success });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e?.message || 'Error submitting report' });
  }
});

reportRouter.get('/api/v1/admin/reports', async (req, res) => {
  try {
    const result = await fetchAdminReportsList({
      status: req.query.status as string,
      type: req.query.type as string,
      appId: req.query.appId as string,
      search: req.query.search as string,
      limit: Math.min(100, Math.max(1, Number(req.query.limit) || 20))
    });
    res.json(result);
  } catch (_e: any) {
    res.json({ reports: [], totalCount: 0 });
  }
});
