import { Router } from 'express';
import { fetchAdminReportsList, submitLiveReport } from '../../lib/communityFirebase';

export const reportRouter = Router();

reportRouter.post('/api/v1/public/reports', async (req, res) => {
  try {
    const success = await submitLiveReport(req.body);
    res.json({ success });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e?.message });
  }
});

reportRouter.get('/api/v1/admin/reports', async (req, res) => {
  try {
    const result = await fetchAdminReportsList({
      status: req.query.status as string,
      type: req.query.type as string,
      appId: req.query.appId as string,
      search: req.query.search as string,
      limit: Number(req.query.limit) || 20
    });
    res.json(result);
  } catch (e: any) {
    res.json({ reports: [], totalCount: 0 });
  }
});
