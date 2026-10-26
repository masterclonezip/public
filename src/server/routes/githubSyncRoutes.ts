import { Router } from 'express';
import fs from 'fs';
import path from 'path';

export const githubSyncRouter = Router();

// In-memory runtime cache for git config if Firestore/local unavailable
let cachedGitConfig: any = null;

// GET /api/github-sync/public-core-files
githubSyncRouter.get('/api/github-sync/public-core-files', (req, res) => {
  try {
    const files: Record<string, string> = {};
    const rootDir = process.cwd();
    const candidateFiles = [
      'index.html',
      'src/main.tsx',
      'src/lib/gateConfig.ts',
      'src/lib/deviceProbe.ts',
      'src/lib/cryptoUtils.ts',
      'src/lib/secureVault.ts',
      'src/lib/lazyWithRetry.ts',
      'src/lib/safeHtmlPublic.ts',
      'src/lib/newsUtils.ts',
      'src/lib/seoUtils.ts',
      'src/lib/sitemapGenerator.ts',
      'src/lib/firebaseConfig.ts',
      'src/lib/communityFirebase.ts',
      'src/lib/githubSync.ts',
      'src/server/crypto.ts',
      'src/server/services/linkService.ts',
      'src/server/security/gateCore.ts',
      'src/server/routes/securityRoutes.ts',
      'src/server/routes/seoRoutes.ts',
      'src/components/GlobalErrorBoundary.tsx',
      'src/components/Meta.tsx',
      'src/components/ClearanceButton.tsx',
      'src/components/ReportAppModal.tsx',
      'src/components/Ticker.tsx',
      'src/components/WebsiteTitleHero.tsx',
      'src/components/LightSearch.tsx',
      'src/components/MobileMenuModal.tsx',
      'src/components/UserReviews.tsx',
      'src/components/playstore/AppListItems.tsx',
      'src/components/playstore/FeaturedBanner.tsx',
      'src/components/playstore/PlayStoreTabs.tsx',
      'src/components/public/PublicFooter.tsx',
      'src/components/public/PublicHeader.tsx',
      'src/components/public/HomeFilterBar.tsx',
      'src/components/public/HomeFaqSection.tsx',
      'src/components/public/NewAdditions.tsx',
      'src/components/public/AppHeader.tsx',
      'src/components/public/AppActionButtons.tsx',
      'src/components/public/AppScreenshots.tsx',
      'src/components/public/AppAboutSection.tsx',
      'src/components/public/AppFaqSection.tsx',
      'src/components/public/AppSpecsBar.tsx',
      'src/components/public/AppSafetyBoxes.tsx',
      'src/components/public/AppDetailsSkeleton.tsx',
      'src/components/public/ReviewForm.tsx',
      'src/components/public/ReviewItem.tsx',
      'src/components/public/ReviewScoreSummary.tsx',
      'src/components/public/appDetails/AppSimilarCarousel.tsx',
      'src/components/public/appDetails/AppDetailsNavigation.tsx',
      'src/components/public/appDetails/AppNotFound.tsx',
      'src/components/public/appDetails/appDetailsSchemas.ts',
      'src/components/public/news/newsUtils.ts',
      'src/components/public/news/NewsCard.tsx',
      'src/components/public/newsDetails/NewsArticleHeader.tsx',
      'src/components/public/newsDetails/NewsRelatedAppBox.tsx',
      'src/contexts/DataContextPublic.tsx',
      'src/hooks/useReviews.ts',
      'src/hooks/useTurnstileVerification.ts',
      'src/hooks/useClearanceDispatch.ts',
      'src/pages/Home.tsx',
      'src/pages/NewsDetailPage.tsx',
      'src/pages/NewsPage.tsx',
      'src/pages/AppDetails.tsx',
      'src/pages/GatewayPage.tsx',
      'src/pages/VideosPage.tsx',
      'src/pages/VideoDetailPage.tsx',
      'src/pages/Developers.tsx',
      'src/pages/About.tsx',
      'src/pages/Contact.tsx',
      'src/pages/Terms.tsx',
      'src/pages/Privacy.tsx',
      'src/pages/Disclaimer.tsx',
      'src/pages/Ethics.tsx',
      'src/pages/Notice.tsx',
      'src/pages/Responsibility.tsx',
      'src/pages/ReportRemoval.tsx',
      'src/pages/FaqPage.tsx',
      'src/pages/SafetyStatus.tsx',
      'src/seoHelper.ts',
      'src/seo/utils.ts',
      'src/seo/sync.ts',
      'src/seo/firebaseConfig.ts',
      'src/seo/preRenderEngine.ts',
      'src/seo/criticalCss.ts',
      'src/seo/initialDataOptimizer.ts',
      'src/seo/metaBuilder.ts',
      'src/seo/schemaBuilder.ts',
      'src/seo/reviewFallback.ts',
      'src/seo/renderers/common.ts',
      'src/seo/renderers/newsRenderer.ts',
      'src/seo/renderers/appDetailsRenderer.ts',
      'src/seo/renderers/homeRenderer.ts',
      'src/seo/renderers/staticPageRenderer.ts',
      'src/seo/renderers/videoRenderer.ts',
      'src/seo/renderers/gatewayRenderer.ts',
      'functions/api/[[catchall]].js',
      'api/index.js',
      'public/robots.txt',
      'public/_redirects',
      'public/_headers',
      'vercel.json',
      'scripts/prerender.ts',
      'scripts/build-api.js',
      'scripts/compress-dist.ts'
    ];

    candidateFiles.forEach(f => {
      const fullPath = path.join(rootDir, f);
      if (fs.existsSync(fullPath)) {
        files[f] = fs.readFileSync(fullPath, 'utf8');
      }
    });

    // In the public Dex repository, src/App.tsx must be the isolated AppPublic.tsx (never the local dev proxy that imports AppAdmin)
    const appPublicPath = path.join(rootDir, 'src/AppPublic.tsx');
    if (fs.existsSync(appPublicPath)) {
      files['src/App.tsx'] = fs.readFileSync(appPublicPath, 'utf8');
    }

    res.json({ success: true, files });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

// GET /api/github-sync/config
githubSyncRouter.get('/api/github-sync/config', (req, res) => {
  try {
    const envOwner = process.env.GITHUB_OWNER || process.env.VITE_GITHUB_OWNER || '';
    const envRepo = process.env.GITHUB_PUBLIC_REPO || process.env.VITE_GITHUB_PUBLIC_REPO || process.env.GITHUB_REPO || process.env.VITE_GITHUB_REPO || '';
    const envBranch = process.env.GITHUB_BRANCH || process.env.VITE_GITHUB_BRANCH || 'main';
    const envToken = process.env.GITHUB_TOKEN || process.env.GITHUB_PAT || '';

    const config = cachedGitConfig || {
      owner: envOwner || '',
      repo: envRepo || '',
      branch: envBranch || 'main',
      token: envToken || '',
      autoSync: false
    };

    res.json({ success: true, config });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

// POST /api/github-sync/config
githubSyncRouter.post('/api/github-sync/config', (req, res) => {
  try {
    const newConfig = req.body;
    if (newConfig && typeof newConfig === 'object') {
      cachedGitConfig = {
        owner: String(newConfig.owner || '').trim(),
        repo: String(newConfig.repo || '').trim(),
        branch: String(newConfig.branch || 'main').trim(),
        token: String(newConfig.token || '').trim(),
        autoSync: Boolean(newConfig.autoSync)
      };
    }
    res.json({ success: true, message: 'GitHub configuration saved' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

// POST /api/github-sync/test
githubSyncRouter.post('/api/github-sync/test', async (req, res) => {
  try {
    const { owner, repo, branch = 'main', token } = req.body || {};
    const cleanOwner = String(owner || '').trim();
    const cleanRepo = String(repo || '').trim();
    const cleanToken = String(token || '').trim();
    const cleanBranch = String(branch || 'main').trim();

    if (!cleanOwner || !cleanRepo) {
      return res.status(400).json({ success: false, message: 'Owner and Repo are required' });
    }
    if (!cleanToken) {
      return res.status(400).json({ success: false, message: 'Personal Access Token (PAT) is required' });
    }

    const authHeader = cleanToken.toLowerCase().startsWith('ghp_')
      ? `token ${cleanToken}`
      : `Bearer ${cleanToken}`;

    const ghRes = await fetch(`https://api.github.com/repos/${encodeURIComponent(cleanOwner)}/${encodeURIComponent(cleanRepo)}`, {
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Master-Sync-Backend/1.0'
      }
    });

    if (!ghRes.ok) {
      const errJson = await ghRes.json().catch(() => ({}));
      const msg = errJson.message || ghRes.statusText;
      return res.status(ghRes.status).json({ success: false, message: `GitHub API error (${ghRes.status}): ${msg}` });
    }

    const repoData: any = await ghRes.json();
    return res.json({
      success: true,
      message: `Successfully connected to repository "${repoData.full_name}" (branch: ${cleanBranch})`,
      permissions: repoData.permissions || { push: true, pull: true, admin: false },
      defaultBranch: repoData.default_branch
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err?.message || 'Server proxy test error' });
  }
});

// POST /api/github-sync/create-blob
githubSyncRouter.post('/api/github-sync/create-blob', async (req, res) => {
  try {
    const { owner, repo, token, path: filePath, content } = req.body || {};
    const cleanOwner = String(owner || '').trim();
    const cleanRepo = String(repo || '').trim();
    const cleanToken = String(token || '').trim();

    if (!cleanOwner || !cleanRepo || !cleanToken) {
      return res.status(400).json({ success: false, error: 'Owner, Repo and Token are required' });
    }

    const authHeader = cleanToken.toLowerCase().startsWith('ghp_')
      ? `token ${cleanToken}`
      : `Bearer ${cleanToken}`;

    // Use base64 encoding to support all characters and avoid utf8 decoding errors on GitHub
    const b64 = Buffer.from(content || '', 'utf8').toString('base64');

    const ghRes = await fetch(
      `https://api.github.com/repos/${encodeURIComponent(cleanOwner)}/${encodeURIComponent(cleanRepo)}/git/blobs`,
      {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Master-Sync-Backend/1.0'
        },
        body: JSON.stringify({
          content: b64,
          encoding: 'base64'
        })
      }
    );

    if (!ghRes.ok) {
      const errJson = await ghRes.json().catch(() => ({}));
      return res.status(ghRes.status).json({
        success: false,
        error: `GitHub rejected blob for ${filePath}: ${errJson.message || ghRes.statusText}`
      });
    }

    const data: any = await ghRes.json();
    return res.json({ success: true, sha: data.sha, path: filePath });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Blob creation proxy error' });
  }
});

// POST /api/github-sync/commit-tree
githubSyncRouter.post('/api/github-sync/commit-tree', async (req, res) => {
  try {
    const { owner, repo, token, branch = 'main', tree, message } = req.body || {};
    const cleanOwner = String(owner || '').trim();
    const cleanRepo = String(repo || '').trim();
    const cleanToken = String(token || '').trim();
    const cleanBranch = String(branch || 'main').replace(/^refs\/heads\//, '').trim() || 'main';

    if (!cleanOwner || !cleanRepo || !cleanToken) {
      return res.status(400).json({ success: false, error: 'Owner, Repo and Token are required' });
    }

    const authHeader = cleanToken.toLowerCase().startsWith('ghp_')
      ? `token ${cleanToken}`
      : `Bearer ${cleanToken}`;

    // Step A: Find parent commit
    let parentCommitSha = '';
    const refRes = await fetch(
      `https://api.github.com/repos/${encodeURIComponent(cleanOwner)}/${encodeURIComponent(cleanRepo)}/git/ref/heads/${encodeURIComponent(cleanBranch)}`,
      {
        headers: {
          'Authorization': authHeader,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Master-Sync-Backend/1.0'
        }
      }
    );

    if (refRes.ok) {
      const refData: any = await refRes.json();
      parentCommitSha = refData.object?.sha || '';
    }

    if (!parentCommitSha) {
      const branchRes = await fetch(
        `https://api.github.com/repos/${encodeURIComponent(cleanOwner)}/${encodeURIComponent(cleanRepo)}/branches/${encodeURIComponent(cleanBranch)}`,
        {
          headers: {
            'Authorization': authHeader,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'Master-Sync-Backend/1.0'
          }
        }
      );
      if (branchRes.ok) {
        const branchData: any = await branchRes.json();
        parentCommitSha = branchData.commit?.sha || '';
      }
    }

    if (!parentCommitSha) {
      return res.status(404).json({
        success: false,
        error: `Could not find latest commit SHA for branch "${cleanBranch}" on ${cleanOwner}/${cleanRepo}.`
      });
    }

    // Step B: Get parent commit tree
    const parentCommitRes = await fetch(
      `https://api.github.com/repos/${encodeURIComponent(cleanOwner)}/${encodeURIComponent(cleanRepo)}/git/commits/${parentCommitSha}`,
      {
        headers: {
          'Authorization': authHeader,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Master-Sync-Backend/1.0'
        }
      }
    );

    if (!parentCommitRes.ok) {
      return res.status(500).json({ success: false, error: `Failed to read parent commit ${parentCommitSha}` });
    }

    const parentCommitData: any = await parentCommitRes.json();
    const baseTreeSha = parentCommitData.tree?.sha;

    // Step C: Format tree entries
    const treeEntries = (tree || []).map((entry: any) => ({
      path: String(entry.path).replace(/^\/+/g, ''),
      mode: entry.mode || '100644',
      type: 'blob',
      sha: entry.sha
    }));

    // Step D: Create tree
    const treeRes = await fetch(
      `https://api.github.com/repos/${encodeURIComponent(cleanOwner)}/${encodeURIComponent(cleanRepo)}/git/trees`,
      {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Master-Sync-Backend/1.0'
        },
        body: JSON.stringify({
          base_tree: baseTreeSha,
          tree: treeEntries
        })
      }
    );

    if (!treeRes.ok) {
      const errJson = await treeRes.json().catch(() => ({}));
      return res.status(treeRes.status).json({
        success: false,
        error: `Failed to create git tree: ${errJson.message || treeRes.statusText}`
      });
    }

    const newTreeData: any = await treeRes.json();
    const newTreeSha = newTreeData.sha;

    // Step E: Create commit
    const commitRes = await fetch(
      `https://api.github.com/repos/${encodeURIComponent(cleanOwner)}/${encodeURIComponent(cleanRepo)}/git/commits`,
      {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Master-Sync-Backend/1.0'
        },
        body: JSON.stringify({
          message: message || 'Public Release Sync',
          tree: newTreeSha,
          parents: [parentCommitSha]
        })
      }
    );

    if (!commitRes.ok) {
      const errJson = await commitRes.json().catch(() => ({}));
      return res.status(commitRes.status).json({
        success: false,
        error: `Failed to create commit: ${errJson.message || commitRes.statusText}`
      });
    }

    const newCommitData: any = await commitRes.json();
    const newCommitSha = newCommitData.sha;

    // Step F: Update branch ref
    const updateRefRes = await fetch(
      `https://api.github.com/repos/${encodeURIComponent(cleanOwner)}/${encodeURIComponent(cleanRepo)}/git/refs/heads/${encodeURIComponent(cleanBranch)}`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Master-Sync-Backend/1.0'
        },
        body: JSON.stringify({
          sha: newCommitSha,
          force: true
        })
      }
    );

    if (!updateRefRes.ok) {
      const errJson = await updateRefRes.json().catch(() => ({}));
      return res.status(updateRefRes.status).json({
        success: false,
        error: `Failed to update branch ref: ${errJson.message || updateRefRes.statusText}`
      });
    }

    return res.json({
      success: true,
      commitSha: newCommitSha,
      treeSha: newTreeSha,
      message: `Successfully created atomic commit ${newCommitSha.substring(0, 7)}`
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Commit tree proxy error' });
  }
});
