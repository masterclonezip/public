import express from 'express';
import {
  handleSessionInit,
  handleSessionClearance,
  type GateRequestContext,
} from '../security/gateCore.js';
import { HARD_RESPONSE_STATUS, HARD_RESPONSE_BODY } from '../../lib/gateConfig.js';

export const securityRouter = express.Router();

function buildExpressGateContext(req: express.Request): GateRequestContext {
  const headers: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(req.headers)) {
    headers[k.toLowerCase()] = Array.isArray(v) ? v.join(', ') : v;
  }
  const rawBody =
    typeof req.body === 'string'
      ? req.body
      : req.body && typeof req.body === 'object'
        ? JSON.stringify(req.body)
        : '';
  const forwarded = (headers['cf-connecting-ip'] || headers['x-forwarded-for'] || '').split(',')[0].trim();
  const ip = forwarded || req.ip || req.socket?.remoteAddress || '0.0.0.0';

  return {
    method: req.method,
    path: req.path,
    headers,
    rawBody,
    ip,
    adapter: 'express',
    env: process.env as Record<string, string | undefined>,
  };
}

securityRouter.all('/api/v1/app/session-init', async (req, res) => {
  const result = await handleSessionInit(buildExpressGateContext(req));
  res.status(result.status).set(result.headers).send(result.body);
});

securityRouter.all('/api/v1/app/session-clearance', async (req, res) => {
  const result = await handleSessionClearance(buildExpressGateContext(req));
  res.status(result.status).set(result.headers).send(result.body);
});

// Return identical 404 Not Found for removed legacy routes
securityRouter.all(
  [
    '/api/v1/public/secure-link',
    '/api/v1/public/resolve-link',
    '/api/v1/public/get-link',
    '/api/v1/app/*',
  ],
  (_req, res) => {
    res
      .status(HARD_RESPONSE_STATUS)
      .set({
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store, no-cache, must-revalidate, private, max-age=0',
        'Referrer-Policy': 'no-referrer',
        'X-Robots-Tag': 'noindex, nofollow, noarchive, nosnippet',
      })
      .send(HARD_RESPONSE_BODY);
  }
);
