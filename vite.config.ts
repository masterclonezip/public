import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {defineConfig, loadEnv} from 'vite';

function adminAuthDevPlugin(env: Record<string, string>) {
  return {
    name: 'admin-auth-dev-api',
    configureServer(server: any) {
      server.middlewares.use((req: any, res: any, next: any) => {
        if (req.method === 'POST' && req.url === '/api/v1/admin/login') {
          let body = '';
          req.on('data', (chunk: any) => { body += chunk; });
          req.on('end', () => {
            try {
              const { email, password } = JSON.parse(body || '{}');
              const cfgEmail = (env.ADMIN_EMAIL || env.VITE_ADMIN_EMAIL || process.env.ADMIN_EMAIL || process.env.VITE_ADMIN_EMAIL || '').toLowerCase().trim();
              const cfgPass = (env.ADMIN_PASSWORD || env.VITE_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || process.env.VITE_ADMIN_PASSWORD || '').trim();
              const inputEmail = String(email || '').toLowerCase().trim();
              const inputPass = String(password || '').trim();

              if (cfgEmail && inputEmail === cfgEmail && cfgPass && inputPass === cfgPass) {
                const token = 'adm_dev_' + Buffer.from(inputEmail + ':' + Date.now()).toString('base64');
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                  ok: true,
                  success: true,
                  token,
                  session: {
                    idToken: token,
                    refreshToken: 'DEV_SESSION',
                    email: inputEmail,
                    expiresAt: Date.now() + 55 * 60 * 1000
                  }
                }));
                return;
              }
              res.writeHead(401, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ ok: false, error: 'INVALID_CREDENTIALS' }));
              return;
            } catch (e) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ ok: false, error: 'BAD_REQUEST' }));
              return;
            }
          });
          return;
        }

        if (req.url === '/api/v1/admin/verify' || req.url === '/api/v1/admin/verify-session') {
          const authHeader = req.headers['authorization'] || '';
          const token = authHeader.replace(/^Bearer\s+/i, '').trim();
          if (token && (token.startsWith('adm_dev_') || token.startsWith('eyJ') || token.length > 20)) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ authorized: true, valid: true, authenticated: true, role: 'admin' }));
          } else {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ authorized: false, valid: false, error: 'UNAUTHORIZED' }));
          }
          return;
        }

        if (req.url && req.url.startsWith('/api/v1/admin/community/app-counts')) {
          const isForce = req.url.includes('force=true');
          const fetchFirestore = async () => {
            const apiKey = env.VITE_COMMUNITY_FIREBASE_API_KEY || process.env.VITE_COMMUNITY_FIREBASE_API_KEY || '';
            const projectId = env.VITE_COMMUNITY_FIREBASE_PROJECT_ID || process.env.VITE_COMMUNITY_FIREBASE_PROJECT_ID || '';
            if (!apiKey || !projectId) {
              return null;
            }
            const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/community_store/catalog_stats?key=${apiKey}`;
            const fRes = await fetch(url);
            if (fRes.ok) {
              const j: any = await fRes.json();
              if (j && j.fields) {
                const parseField = (f: any): any => {
                  if (!f) return null;
                  if ('stringValue' in f) return f.stringValue;
                  if ('integerValue' in f) return parseInt(f.integerValue, 10);
                  if ('doubleValue' in f) return parseFloat(f.doubleValue);
                  if ('booleanValue' in f) return f.booleanValue;
                  if ('mapValue' in f) {
                    const resMap: any = {};
                    for (const [k, v] of Object.entries(f.mapValue?.fields || {})) {
                      resMap[k] = parseField(v);
                    }
                    return resMap;
                  }
                  return null;
                };
                const parsed: any = {};
                for (const [k, v] of Object.entries(j.fields)) {
                  parsed[k] = parseField(v);
                }
                return {
                  globalStats: {
                    total: parsed.totalReviews || 0,
                    published: parsed.publishedReviews || 0,
                    pending: parsed.pendingReviews || 0,
                    rejected: parsed.rejectedReviews || 0,
                    flagged: parsed.flaggedReviews || 0,
                    averageRating: parsed.averageRating || 0
                  },
                  appCounts: parsed.appCounts || {}
                };
              }
            }
            throw new Error('Fallback');
          };

          if (isForce) {
            fetchFirestore().then(data => {
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify(data));
            }).catch(() => {
              const statsPath = path.resolve(__dirname, 'src/lib/communityCatalogStats.json');
              const data = fs.existsSync(statsPath) ? JSON.parse(fs.readFileSync(statsPath, 'utf8')) : {};
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ globalStats: data, appCounts: data.appCounts || {} }));
            });
            return;
          }

          try {
            const statsPath = path.resolve(__dirname, 'src/lib/communityCatalogStats.json');
            const data = fs.existsSync(statsPath) ? JSON.parse(fs.readFileSync(statsPath, 'utf8')) : {};
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ globalStats: data, appCounts: data.appCounts || {} }));
            return;
          } catch(e) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ globalStats: {}, appCounts: {} }));
            return;
          }
        }

        if (req.url && req.url.startsWith('/api/v1/public/community/stats')) {
          try {
            const parts = req.url.split('?')[0].split('/');
            const appId = decodeURIComponent(parts[parts.length - 1] || '').toLowerCase().trim();
            const statsPath = path.resolve(__dirname, 'src/lib/communityCatalogStats.json');
            const data = fs.existsSync(statsPath) ? JSON.parse(fs.readFileSync(statsPath, 'utf8')) : {};
            const appCounts = data.appCounts || {};
            const stat = appCounts[appId] || Object.entries(appCounts).find(([k]) => k.toLowerCase() === appId)?.[1];

            if (stat) {
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                success: true,
                stats: {
                  totalReviews: Number((stat as any).total ?? (stat as any).published ?? 0),
                  averageRating: Number((stat as any).avgRating ?? 4.5),
                  starCounts: (stat as any).starCounts || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
                }
              }));
              return;
            }

            // Fallback: check static reviews
            const revsPath = path.resolve(__dirname, 'src/lib/communityStaticReviews.json');
            const revsData = fs.existsSync(revsPath) ? JSON.parse(fs.readFileSync(revsPath, 'utf8')) : {};
            const revs = revsData[appId] || [];
            const count = Array.isArray(revs) ? revs.length : 0;
            let sum = 0;
            if (Array.isArray(revs)) {
              revs.forEach((r: any) => { sum += Number(r.rating) || 5; });
            }
            const avg = count > 0 ? Math.round((sum / count) * 10) / 10 : 4.5;

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              success: true,
              stats: {
                totalReviews: count,
                averageRating: avg,
                starCounts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
              }
            }));
            return;
          } catch (_) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, stats: { totalReviews: 0, averageRating: 4.5 } }));
            return;
          }
        }

        if (req.url && req.url.startsWith('/api/v1/public/')) {
          const staticPath = path.resolve(__dirname, 'src/lib/staticData.json');
          const staticData = fs.existsSync(staticPath) ? JSON.parse(fs.readFileSync(staticPath, 'utf8')) : {};

          if (req.url.startsWith('/api/v1/public/news/')) {
            const slug = decodeURIComponent(req.url.replace('/api/v1/public/news/', '').split('?')[0] || '').toLowerCase().trim();
            const newsList = staticData.news || [];
            const found = newsList.find((n: any) => {
              const s = String(n.slug || n.id || '').toLowerCase().trim();
              return s === slug || String(n.id || '').toLowerCase().trim() === slug;
            });
            res.writeHead(found ? 200 : 404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(found ? { status: 'OK', news: found } : { status: 'NOT_FOUND', error: 'News not found' }));
            return;
          }

          if (req.url === '/api/v1/public/news' || req.url.startsWith('/api/v1/public/news?')) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'OK', news: staticData.news || [] }));
            return;
          }

          if (req.url.startsWith('/api/v1/public/app/')) {
            const slug = decodeURIComponent(req.url.replace('/api/v1/public/app/', '').split('?')[0] || '').toLowerCase().trim();
            const appsList = staticData.apps || [];
            const found = appsList.find((a: any) => {
              const s = String(a.slug || a.id || '').toLowerCase().trim();
              return s === slug || String(a.id || '').toLowerCase().trim() === slug;
            });
            res.writeHead(found ? 200 : 404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(found ? { status: 'OK', app: found } : { status: 'NOT_FOUND', error: 'App not found' }));
            return;
          }

          if (req.url === '/api/v1/public/settings' || req.url.startsWith('/api/v1/public/settings?')) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'OK', settings: staticData.settings || {} }));
            return;
          }

          if (req.url === '/api/v1/public/videos' || req.url.startsWith('/api/v1/public/videos?')) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'OK', videos: staticData.videos || [] }));
            return;
          }

          if (req.url === '/api/v1/public/developers' || req.url.startsWith('/api/v1/public/developers?')) {
            const developers = staticData.settings?.developers || staticData.developers || [];
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'OK', developers }));
            return;
          }

          if (req.url === '/api/v1/public/faqs' || req.url.startsWith('/api/v1/public/faqs?')) {
            const faqs = staticData.settings?.website_faqs || [];
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'OK', faqs }));
            return;
          }

          if (req.url.startsWith('/api/v1/public/backup-data')) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(staticData));
            return;
          }
        }

        if (req.url && (req.url.startsWith('/sitemap') || req.url === '/robots.txt')) {
          const staticPath = path.resolve(__dirname, 'src/lib/staticData.json');
          const staticData = fs.existsSync(staticPath) ? JSON.parse(fs.readFileSync(staticPath, 'utf8')) : {};
          const HOST = (env.PUBLIC_DOMAIN || env.VITE_PUBLIC_DOMAIN || process.env.PUBLIC_DOMAIN || process.env.VITE_PUBLIC_DOMAIN || '').trim().replace(/\/+$/, '');

          if (req.url === '/robots.txt') {
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end(`User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /masterworld\nDisallow: /moreinfo/\n${HOST ? `\nSitemap: ${HOST}/sitemap.xml\nSitemap: ${HOST}/sitemap-news.xml\nSitemap: ${HOST}/sitemap-apps.xml\n` : ''}`);
            return;
          }

          if (req.url === '/sitemap.xml' || req.url === '/sitemap_index.xml') {
            import('./src/lib/sitemapGenerator').then(({ generateMasterSitemapXml }) => {
              res.writeHead(200, { 'Content-Type': 'application/xml' });
              res.end(generateMasterSitemapXml(staticData.apps || [], staticData.news || [], staticData.videos || [], HOST));
            });
            return;
          }

          if (req.url === '/sitemap-news.xml' || req.url === '/sitemap_news.xml') {
            import('./src/lib/sitemapGenerator').then(({ generateNewsSitemapXml }) => {
              res.writeHead(200, { 'Content-Type': 'application/xml' });
              res.end(generateNewsSitemapXml(staticData.news || [], HOST));
            });
            return;
          }

          if (req.url === '/sitemap-apps.xml' || req.url === '/sitemap_apps.xml') {
            import('./src/lib/sitemapGenerator').then(({ generateAppsSitemapXml }) => {
              res.writeHead(200, { 'Content-Type': 'application/xml' });
              res.end(generateAppsSitemapXml(staticData.apps || [], HOST));
            });
            return;
          }

          if (req.url === '/sitemap-static.xml' || req.url === '/sitemap_static.xml') {
            import('./src/lib/sitemapGenerator').then(({ generateStaticSitemapXml }) => {
              res.writeHead(200, { 'Content-Type': 'application/xml' });
              res.end(generateStaticSitemapXml(HOST));
            });
            return;
          }

          if (req.url === '/sitemap-videos.xml' || req.url === '/sitemap_videos.xml') {
            import('./src/lib/sitemapGenerator').then(({ generateVideosSitemapXml }) => {
              res.writeHead(200, { 'Content-Type': 'application/xml' });
              res.end(generateVideosSitemapXml(staticData.videos || [], HOST));
            });
            return;
          }

          if (req.url === '/sitemap-developers.xml' || req.url === '/sitemap_developers.xml') {
            import('./src/lib/sitemapGenerator').then(({ generateDevelopersSitemapXml }) => {
              res.writeHead(200, { 'Content-Type': 'application/xml' });
              res.end(generateDevelopersSitemapXml(HOST));
            });
            return;
          }
        }

        if (req.url && req.url.startsWith('/api/v1/admin/community/aistudio-settings')) {
          const dataDir = path.resolve(__dirname, '.data');
          const persistentBrainPath = path.join(dataDir, 'aiStudioBrain.json');
          const seedBrainPath = path.resolve(__dirname, 'src/lib/aiStudioBrain.json');

          if (req.method === 'POST') {
            let body = '';
            req.on('data', (chunk: any) => { body += chunk; });
            req.on('end', () => {
              try {
                const payload = JSON.parse(body || '{}');
                let existing = {};
                if (fs.existsSync(persistentBrainPath)) {
                  try { existing = JSON.parse(fs.readFileSync(persistentBrainPath, 'utf8')); } catch (_) {}
                } else if (fs.existsSync(seedBrainPath)) {
                  try { existing = JSON.parse(fs.readFileSync(seedBrainPath, 'utf8')); } catch (_) {}
                }
                const merged = { ...existing, ...payload, updatedAt: new Date().toISOString() };
                if (!fs.existsSync(dataDir)) {
                  fs.mkdirSync(dataDir, { recursive: true });
                }
                fs.writeFileSync(persistentBrainPath, JSON.stringify(merged, null, 2), 'utf8');
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, message: 'Settings saved permanently.' }));
              } catch (e: any) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: e?.message }));
              }
            });
            return;
          }

          if (req.method === 'GET') {
            try {
              if (fs.existsSync(persistentBrainPath)) {
                const data = JSON.parse(fs.readFileSync(persistentBrainPath, 'utf8'));
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, data }));
                return;
              }
              if (fs.existsSync(seedBrainPath)) {
                const data = JSON.parse(fs.readFileSync(seedBrainPath, 'utf8'));
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, data }));
                return;
              }
            } catch (_) {}
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, data: null }));
            return;
          }
        }

        if (req.url && req.url.startsWith('/api/v1/admin/upload/signature')) {
          const authHeader = req.headers['authorization'] || '';
          if (!authHeader.includes('Bearer')) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'ERROR', error: 'UNAUTHORIZED' }));
            return;
          }
          const timestamp = Math.round(Date.now() / 1000);
          const cloudName = (env.CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME || '').trim();
          const apiKey = (env.CLOUDINARY_API_KEY || process.env.CLOUDINARY_API_KEY || '').trim();
          const apiSecret = (env.CLOUDINARY_API_SECRET || process.env.CLOUDINARY_API_SECRET || '').trim();

          if (!cloudName || !apiKey || !apiSecret) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'ERROR', error: 'Cloudinary environment variables not configured' }));
            return;
          }

          const folder = (env.CLOUDINARY_FOLDER || process.env.CLOUDINARY_FOLDER || 'app_uploads').trim();
          const strToSign = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
          const signature = crypto.createHash('sha1').update(strToSign).digest('hex');

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            status: 'OK',
            success: true,
            cloud_name: cloudName,
            api_key: apiKey,
            timestamp,
            signature,
            folder
          }));
          return;
        }

        if (req.method === 'POST' && req.url === '/api/v1/admin/upload') {
          const authHeader = req.headers['authorization'] || '';
          if (!authHeader.includes('Bearer')) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'ERROR', error: 'UNAUTHORIZED' }));
            return;
          }
          let body = '';
          req.on('data', (chunk: any) => { body += chunk; });
          req.on('end', async () => {
            try {
              const parsed = JSON.parse(body || '{}');
              const imagePayload = parsed.image_base64 || parsed.file || parsed.image_url || parsed.url;
              if (!imagePayload) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ status: 'ERROR', error: 'Missing image payload' }));
                return;
              }

              const timestamp = Math.round(Date.now() / 1000);
              const cloudName = (env.CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME || '').trim();
              const apiKey = (env.CLOUDINARY_API_KEY || process.env.CLOUDINARY_API_KEY || '').trim();
              const apiSecret = (env.CLOUDINARY_API_SECRET || process.env.CLOUDINARY_API_SECRET || '').trim();

              if (!cloudName || !apiKey || !apiSecret) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ status: 'ERROR', error: 'Cloudinary credentials not configured' }));
                return;
              }

              const folder = (env.CLOUDINARY_FOLDER || process.env.CLOUDINARY_FOLDER || 'app_uploads').trim();
              const strToSign = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
              const signature = crypto.createHash('sha1').update(strToSign).digest('hex');

              let fileBlob: Blob;
              let fileName = `upload_${Date.now()}`;

              if (typeof imagePayload === 'string' && imagePayload.startsWith('data:image/')) {
                const match = imagePayload.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
                if (match) {
                  const mimeType = match[1];
                  const buffer = Buffer.from(match[2], 'base64');
                  fileBlob = new Blob([buffer], { type: `image/${mimeType}` });
                  fileName = `upload_${Date.now()}.${mimeType === 'jpeg' ? 'jpg' : mimeType}`;
                } else {
                  fileBlob = new Blob([Buffer.from(imagePayload)], { type: 'image/png' });
                }
              } else if (typeof imagePayload === 'string' && imagePayload.startsWith('http')) {
                const formData = new FormData();
                formData.append('file', imagePayload);
                formData.append('api_key', apiKey);
                formData.append('timestamp', String(timestamp));
                formData.append('signature', signature);
                formData.append('folder', folder);

                const cRes = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image/upload`, {
                  method: 'POST',
                  body: formData
                });
                const cData: any = await cRes.json();
                if (!cRes.ok || !cData.secure_url) {
                  res.writeHead(cRes.status || 500, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ status: 'ERROR', error: cData.error?.message || 'Upload failed' }));
                  return;
                }
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ status: 'OK', success: true, secure_url: cData.secure_url, url: cData.secure_url, width: cData.width, height: cData.height }));
                return;
              } else {
                fileBlob = new Blob([Buffer.from(String(imagePayload))], { type: 'image/png' });
              }

              const formData = new FormData();
              formData.append('file', fileBlob, fileName);
              formData.append('api_key', apiKey);
              formData.append('timestamp', String(timestamp));
              formData.append('signature', signature);
              formData.append('folder', folder);

              const cRes = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image/upload`, {
                method: 'POST',
                body: formData
              });
              const cData: any = await cRes.json();
              if (!cRes.ok || !cData.secure_url) {
                res.writeHead(cRes.status || 500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ status: 'ERROR', error: cData.error?.message || 'Upload failed' }));
                return;
              }

              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                status: 'OK',
                success: true,
                secure_url: cData.secure_url,
                url: cData.secure_url,
                width: cData.width,
                height: cData.height,
                format: cData.format,
                bytes: cData.bytes
              }));
              return;
            } catch (err: any) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ status: 'ERROR', error: err.message || 'Server error' }));
              return;
            }
          });
          return;
        }

        next();
      });
    },
    async transformIndexHtml(html: string) {
      // Return pristine html; server.ts handles all route-isolated SEO injection cleanly via injectSeoTags
      return html;
    }
  };
}

export default defineConfig(({mode}) => {
  if (mode === 'production') {
    process.env.NODE_ENV = 'production';
  }
  const env = loadEnv(mode, '.', '');

  return {
    plugins: [react(), tailwindcss(), adminAuthDevPlugin(env)],
    envPrefix: ['VITE_'],
    define: {
      __ADMIN_ENABLED__: true,
      'process.env.NODE_ENV': JSON.stringify(mode === 'production' ? 'production' : (process.env.NODE_ENV || 'development')),
      'process.env.ADMIN_PATH': JSON.stringify(env.ADMIN_PATH || env.VITE_ADMIN_PATH || 'admin'),
      'process.env.VITE_ADMIN_PATH': JSON.stringify(env.VITE_ADMIN_PATH || env.ADMIN_PATH || 'admin'),
      'process.env.FIREBASE_PROJECT_ID': JSON.stringify(env.VITE_FIREBASE_PROJECT_ID || env.FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || ''),
      'process.env.FIREBASE_APP_ID': JSON.stringify(env.VITE_FIREBASE_APP_ID || env.FIREBASE_APP_ID || process.env.FIREBASE_APP_ID || ''),
      'process.env.FIREBASE_API_KEY': JSON.stringify(env.VITE_FIREBASE_API_KEY || env.FIREBASE_API_KEY || process.env.FIREBASE_API_KEY || ''),
      'process.env.FIREBASE_AUTH_DOMAIN': JSON.stringify(env.VITE_FIREBASE_AUTH_DOMAIN || env.FIREBASE_AUTH_DOMAIN || process.env.FIREBASE_AUTH_DOMAIN || ''),
      'process.env.FIREBASE_DATABASE_ID': JSON.stringify(env.VITE_FIREBASE_DATABASE_ID || env.FIREBASE_DATABASE_ID || process.env.FIREBASE_DATABASE_ID || '(default)'),
      'process.env.FIREBASE_STORAGE_BUCKET': JSON.stringify(env.VITE_FIREBASE_STORAGE_BUCKET || env.FIREBASE_STORAGE_BUCKET || process.env.FIREBASE_STORAGE_BUCKET || ''),
      'process.env.FIREBASE_MESSAGING_ID': JSON.stringify(env.VITE_FIREBASE_MESSAGING_SENDER_ID || env.FIREBASE_MESSAGING_ID || process.env.FIREBASE_MESSAGING_ID || '')
    },

    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-dom/client',
        'react/jsx-runtime',
        'react/jsx-dev-runtime',
        'react-router-dom',
        'clsx',
        'tailwind-merge',
        'lucide-react',
        'crypto-js',
        'dompurify',
        'lenis',
        'otpauth',
        'framer-motion',
        'react-markdown'
      ],
      force: false
    },

    resolve: {
      dedupe: ['react', 'react-dom', 'react-is'],
      alias: [
        { find: /^react$/, replacement: path.resolve(__dirname, 'node_modules/react') },
        { find: /^react-dom$/, replacement: path.resolve(__dirname, 'node_modules/react-dom') },
        { find: /^react-dom\/client$/, replacement: path.resolve(__dirname, 'node_modules/react-dom/client') },
        { find: /^react\/jsx-runtime$/, replacement: path.resolve(__dirname, 'node_modules/react/jsx-runtime') },
        { find: /^react\/jsx-dev-runtime$/, replacement: path.resolve(__dirname, 'node_modules/react/jsx-dev-runtime') },
        { find: '@', replacement: path.resolve(__dirname, '.') },
        { find: 'react-helmet-async', replacement: path.resolve(__dirname, 'src/lib/react-helmet-async-shim.tsx') },
        { find: 'react-i18next', replacement: path.resolve(__dirname, 'src/i18n.ts') },

        // Fallback aliases for Dex or Masterworld repositories where certain files are removed
        { 
          find: /.*\/seo\/renderers(?:\/index)?$/, 
          replacement: fs.existsSync(path.resolve(__dirname, 'src/seo/renderers/index.ts')) 
            ? path.resolve(__dirname, 'src/seo/renderers/index.ts') 
            : path.resolve(__dirname, 'src/lib/dummyRenderers.ts') 
        },
        { 
          find: /.*\/pages\/AdminDashboard$/, 
          replacement: fs.existsSync(path.resolve(__dirname, 'src/pages/AdminDashboard.tsx')) 
            ? path.resolve(__dirname, 'src/pages/AdminDashboard.tsx') 
            : path.resolve(__dirname, 'src/lib/dummyComponent.tsx') 
        },
        { 
          find: /.*\/pages\/AdminLogin$/, 
          replacement: fs.existsSync(path.resolve(__dirname, 'src/pages/AdminLogin.tsx')) 
            ? path.resolve(__dirname, 'src/pages/AdminLogin.tsx') 
            : path.resolve(__dirname, 'src/lib/dummyComponent.tsx') 
        },
        { 
          find: /.*\/AppAdmin$/, 
          replacement: fs.existsSync(path.resolve(__dirname, 'src/AppAdmin.tsx')) 
            ? path.resolve(__dirname, 'src/AppAdmin.tsx') 
            : path.resolve(__dirname, 'src/lib/dummyComponent.tsx') 
        },
        { 
          find: /.*\/AppPublic$/, 
          replacement: fs.existsSync(path.resolve(__dirname, 'src/AppPublic.tsx')) 
            ? path.resolve(__dirname, 'src/AppPublic.tsx') 
            : path.resolve(__dirname, 'src/lib/dummyComponent.tsx') 
        },
        { 
          find: /.*\/pages\/Home$/, 
          replacement: fs.existsSync(path.resolve(__dirname, 'src/pages/Home.tsx')) 
            ? path.resolve(__dirname, 'src/pages/Home.tsx') 
            : path.resolve(__dirname, 'src/lib/dummyComponent.tsx') 
        },
        { 
          find: /.*\/pages\/NewsPage$/, 
          replacement: fs.existsSync(path.resolve(__dirname, 'src/pages/NewsPage.tsx')) 
            ? path.resolve(__dirname, 'src/pages/NewsPage.tsx') 
            : path.resolve(__dirname, 'src/lib/dummyComponent.tsx') 
        },
        { 
          find: /.*\/pages\/NewsDetailPage$/, 
          replacement: fs.existsSync(path.resolve(__dirname, 'src/pages/NewsDetailPage.tsx')) 
            ? path.resolve(__dirname, 'src/pages/NewsDetailPage.tsx') 
            : path.resolve(__dirname, 'src/lib/dummyComponent.tsx') 
        },
        { 
          find: /.*\/pages\/VideosPage$/, 
          replacement: fs.existsSync(path.resolve(__dirname, 'src/pages/VideosPage.tsx')) 
            ? path.resolve(__dirname, 'src/pages/VideosPage.tsx') 
            : path.resolve(__dirname, 'src/lib/dummyComponent.tsx') 
        },
        { 
          find: /.*\/pages\/VideoDetailPage$/, 
          replacement: fs.existsSync(path.resolve(__dirname, 'src/pages/VideoDetailPage.tsx')) 
            ? path.resolve(__dirname, 'src/pages/VideoDetailPage.tsx') 
            : path.resolve(__dirname, 'src/lib/dummyComponent.tsx') 
        },
        { 
          find: /.*\/pages\/Developers$/, 
          replacement: fs.existsSync(path.resolve(__dirname, 'src/pages/Developers.tsx')) 
            ? path.resolve(__dirname, 'src/pages/Developers.tsx') 
            : path.resolve(__dirname, 'src/lib/dummyComponent.tsx') 
        },
        { 
          find: /.*\/pages\/About$/, 
          replacement: fs.existsSync(path.resolve(__dirname, 'src/pages/About.tsx')) 
            ? path.resolve(__dirname, 'src/pages/About.tsx') 
            : path.resolve(__dirname, 'src/lib/dummyComponent.tsx') 
        },
        { 
          find: /.*\/pages\/Contact$/, 
          replacement: fs.existsSync(path.resolve(__dirname, 'src/pages/Contact.tsx')) 
            ? path.resolve(__dirname, 'src/pages/Contact.tsx') 
            : path.resolve(__dirname, 'src/lib/dummyComponent.tsx') 
        },
        { 
          find: /.*\/pages\/Privacy$/, 
          replacement: fs.existsSync(path.resolve(__dirname, 'src/pages/Privacy.tsx')) 
            ? path.resolve(__dirname, 'src/pages/Privacy.tsx') 
            : path.resolve(__dirname, 'src/lib/dummyComponent.tsx') 
        },
        { 
          find: /.*\/pages\/Terms$/, 
          replacement: fs.existsSync(path.resolve(__dirname, 'src/pages/Terms.tsx')) 
            ? path.resolve(__dirname, 'src/pages/Terms.tsx') 
            : path.resolve(__dirname, 'src/lib/dummyComponent.tsx') 
        },
        { 
          find: /.*\/pages\/Responsibility$/, 
          replacement: fs.existsSync(path.resolve(__dirname, 'src/pages/Responsibility.tsx')) 
            ? path.resolve(__dirname, 'src/pages/Responsibility.tsx') 
            : path.resolve(__dirname, 'src/lib/dummyComponent.tsx') 
        },
        { 
          find: /.*\/pages\/Notice$/, 
          replacement: fs.existsSync(path.resolve(__dirname, 'src/pages/Notice.tsx')) 
            ? path.resolve(__dirname, 'src/pages/Notice.tsx') 
            : path.resolve(__dirname, 'src/lib/dummyComponent.tsx') 
        },
        { 
          find: /.*\/pages\/Ethics$/, 
          replacement: fs.existsSync(path.resolve(__dirname, 'src/pages/Ethics.tsx')) 
            ? path.resolve(__dirname, 'src/pages/Ethics.tsx') 
            : path.resolve(__dirname, 'src/lib/dummyComponent.tsx') 
        },
        { 
          find: /.*\/pages\/Disclaimer$/, 
          replacement: fs.existsSync(path.resolve(__dirname, 'src/pages/Disclaimer.tsx')) 
            ? path.resolve(__dirname, 'src/pages/Disclaimer.tsx') 
            : path.resolve(__dirname, 'src/lib/dummyComponent.tsx') 
        },
        { 
          find: /.*\/pages\/ReportRemoval$/, 
          replacement: fs.existsSync(path.resolve(__dirname, 'src/pages/ReportRemoval.tsx')) 
            ? path.resolve(__dirname, 'src/pages/ReportRemoval.tsx') 
            : path.resolve(__dirname, 'src/lib/dummyComponent.tsx') 
        },
        { 
          find: /.*\/pages\/SafetyStatus$/, 
          replacement: fs.existsSync(path.resolve(__dirname, 'src/pages/SafetyStatus.tsx')) 
            ? path.resolve(__dirname, 'src/pages/SafetyStatus.tsx') 
            : path.resolve(__dirname, 'src/lib/dummyComponent.tsx') 
        },
        { 
          find: /.*\/pages\/FaqPage$/, 
          replacement: fs.existsSync(path.resolve(__dirname, 'src/pages/FaqPage.tsx')) 
            ? path.resolve(__dirname, 'src/pages/FaqPage.tsx') 
            : path.resolve(__dirname, 'src/lib/dummyComponent.tsx') 
        },
        { 
          find: /.*\/pages\/AppDetails$/, 
          replacement: fs.existsSync(path.resolve(__dirname, 'src/pages/AppDetails.tsx')) 
            ? path.resolve(__dirname, 'src/pages/AppDetails.tsx') 
            : path.resolve(__dirname, 'src/lib/dummyComponent.tsx') 
        },
        { 
          find: /.*\/pages\/GatewayPage$/, 
          replacement: fs.existsSync(path.resolve(__dirname, 'src/pages/GatewayPage.tsx')) 
            ? path.resolve(__dirname, 'src/pages/GatewayPage.tsx') 
            : path.resolve(__dirname, 'src/lib/dummyComponent.tsx') 
        },
        { 
          find: /.*\/components\/AdminLogin$/, 
          replacement: fs.existsSync(path.resolve(__dirname, 'src/components/AdminLogin.tsx')) 
            ? path.resolve(__dirname, 'src/components/AdminLogin.tsx') 
            : path.resolve(__dirname, 'src/lib/dummyComponent.tsx') 
        },
        { 
          find: /.*\/components\/NewsTab$/, 
          replacement: fs.existsSync(path.resolve(__dirname, 'src/components/NewsTab.tsx')) 
            ? path.resolve(__dirname, 'src/components/NewsTab.tsx') 
            : path.resolve(__dirname, 'src/lib/dummyComponent.tsx') 
        },
        { 
          find: /.*\/components\/SecurityTab$/, 
          replacement: fs.existsSync(path.resolve(__dirname, 'src/components/SecurityTab.tsx')) 
            ? path.resolve(__dirname, 'src/components/SecurityTab.tsx') 
            : path.resolve(__dirname, 'src/lib/dummyComponent.tsx') 
        },
        { 
          find: /.*\/components\/FirebaseStatusPanel$/, 
          replacement: fs.existsSync(path.resolve(__dirname, 'src/components/FirebaseStatusPanel.tsx')) 
            ? path.resolve(__dirname, 'src/components/FirebaseStatusPanel.tsx') 
            : path.resolve(__dirname, 'src/lib/dummyComponent.tsx') 
        },
        { 
          find: /.*\/components\/AppsTab$/, 
          replacement: fs.existsSync(path.resolve(__dirname, 'src/components/AppsTab.tsx')) 
            ? path.resolve(__dirname, 'src/components/AppsTab.tsx') 
            : path.resolve(__dirname, 'src/lib/dummyComponent.tsx') 
        },
        { 
          find: /.*\/components\/UserReviews$/, 
          replacement: fs.existsSync(path.resolve(__dirname, 'src/components/UserReviews.tsx')) 
            ? path.resolve(__dirname, 'src/components/UserReviews.tsx') 
            : path.resolve(__dirname, 'src/lib/dummyComponent.tsx') 
        },
        { 
          find: /.*\/components\/ReportAppModal$/, 
          replacement: fs.existsSync(path.resolve(__dirname, 'src/components/ReportAppModal.tsx')) 
            ? path.resolve(__dirname, 'src/components/ReportAppModal.tsx') 
            : path.resolve(__dirname, 'src/lib/dummyComponent.tsx') 
        },
        { 
          find: /.*\/services\/adminAuthService$/, 
          replacement: fs.existsSync(path.resolve(__dirname, 'src/services/adminAuthService.ts')) 
            ? path.resolve(__dirname, 'src/services/adminAuthService.ts') 
            : path.resolve(__dirname, 'src/lib/dummyAdmin.ts') 
        },
        { 
          find: /.*\/lib\/githubSync$/, 
          replacement: fs.existsSync(path.resolve(__dirname, 'src/lib/githubSync.ts')) 
            ? path.resolve(__dirname, 'src/lib/githubSync.ts') 
            : path.resolve(__dirname, 'src/lib/dummyAdmin.ts') 
        },
        { 
          find: /.*\/lib\/secureStorage$/, 
          replacement: fs.existsSync(path.resolve(__dirname, 'src/lib/secureStorage.ts')) 
            ? path.resolve(__dirname, 'src/lib/secureStorage.ts') 
            : path.resolve(__dirname, 'src/lib/dummyAdmin.ts') 
        },
        { 
          find: /.*\/lib\/totp$/, 
          replacement: fs.existsSync(path.resolve(__dirname, 'src/lib/totp.ts')) 
            ? path.resolve(__dirname, 'src/lib/totp.ts') 
            : path.resolve(__dirname, 'src/lib/dummyAdmin.ts') 
        },
        { 
          find: /.*\/lib\/cryptoUtils(\.ts)?$/, 
          replacement: fs.existsSync(path.resolve(__dirname, 'src/lib/cryptoUtils.ts')) 
            ? path.resolve(__dirname, 'src/lib/cryptoUtils.ts') 
            : path.resolve(__dirname, 'src/lib/secureVault.ts') 
        },
        { 
          find: /.*\/lib\/secureVault$/, 
          replacement: fs.existsSync(path.resolve(__dirname, 'src/lib/secureVault.ts')) 
            ? path.resolve(__dirname, 'src/lib/secureVault.ts') 
            : path.resolve(__dirname, 'src/lib/dummyAdmin.ts') 
        },
        { 
          find: /.*\/components\/ClearanceButton$/, 
          replacement: fs.existsSync(path.resolve(__dirname, 'src/components/ClearanceButton.tsx')) 
            ? path.resolve(__dirname, 'src/components/ClearanceButton.tsx') 
            : path.resolve(__dirname, 'src/lib/dummyComponent.tsx') 
        },
        { 
          find: /.*\/lib\/lightFallback$/, 
          replacement: path.resolve(__dirname, 'src/lib/lightFallback.ts')
        },
        { 
          find: /.*\/lib\/adminCommunityFirebase$/, 
          replacement: fs.existsSync(path.resolve(__dirname, 'src/lib/adminCommunityFirebase.ts')) 
            ? path.resolve(__dirname, 'src/lib/adminCommunityFirebase.ts') 
            : path.resolve(__dirname, 'src/lib/communityFirebase.ts') 
        }
      ],
    },

    esbuild: {
      drop: mode === 'production' ? ['debugger', 'console'] : [],
      legalComments: 'none',
    },

    build: {
      chunkSizeWarningLimit: 2500,
      target: 'es2022',
      minify: 'esbuild',
      cssMinify: true,
      sourcemap: false,
      cssCodeSplit: true,
      modulePreload: {
        polyfill: false
      },
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('staticData')) {
              return 'catalog-data';
            }
            if (id.includes('node_modules')) {
              // Group heavy animation and firebase into async standalone chunks
              if (id.includes('firebase')) {
                return 'vendor-firebase';
              }
              if (id.includes('framer-motion') || id.includes('motion')) {
                return 'vendor-motion';
              }
              if (id.includes('lucide-react')) {
                return 'vendor-icons';
              }
              // Group core app runtime together so browser executes in 1 parallel network request
              if (
                /\bnode_modules\/(react|react-dom|scheduler|react-router|@remix-run)\//.test(id)
              ) {
                return 'vendor-core';
              }
            }
          }
        }
      }
    },
    server: {
      watch: {
        ignored: [
          '**/.data/**',
          '**/aiStudioBrain.json',
          '**/*.log',
          '**/server_requests.log'
        ]
      }
    },
  };
});
