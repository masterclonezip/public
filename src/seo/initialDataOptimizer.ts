import { getField } from './utils';
import { structureHtmlFragment } from '../lib/safeHtmlPublic';
import { getNextNewsChain } from '../lib/newsUtils';

export function optimizeInitialDataForRoute(
  data: any,
  cleanPathLower: string,
  targetApp: any,
  targetNews: any,
  targetVideo: any,
  seoReviewsFeed?: any
): any {
  if (!data) return {};

  const isAppDetailPage = cleanPathLower.startsWith('/app/');
  const isGatewayPage =
    cleanPathLower.startsWith('/moreinfo/') ||
    cleanPathLower.startsWith('/gateway/') ||
    cleanPathLower.startsWith('/info/') ||
    cleanPathLower.startsWith('/moredetail/') ||
    cleanPathLower.startsWith('/download/');
  const isNewsDetailPage = cleanPathLower.startsWith('/news/') && cleanPathLower !== '/news';
  const isNewsIndexPage = cleanPathLower === '/news';
  const isHomePage = cleanPathLower === '/' || cleanPathLower === '';

  const isAdminPath = cleanPathLower.startsWith('/admin') || cleanPathLower.startsWith('/masterworld') || cleanPathLower === '/login' || cleanPathLower.startsWith('/login/');
  const baseApps = Array.isArray(data.apps) ? data.apps : (Array.isArray(data.mockApps) ? data.mockApps : []);

  if (isAdminPath) {
    return {
      apps: baseApps,
      settings: data.settings || {},
      news: data.news || [],
      videos: data.videos || [],
      developers: data.developers || data.settings?.developers || []
    };
  }

  // Ultra-lean single-app payload for /moreinfo/:slug gateway pages (~95% payload reduction)
  if (isGatewayPage) {
    const rawSettings = data.settings || {};
    const gatewayApps = targetApp
      ? [
          {
            id: targetApp.id,
            name: targetApp.name,
            slug: targetApp.slug,
            icon_url: targetApp.icon_url || '',
            category: targetApp.category || '',
            rating: Number(targetApp.rating) || 4.5,
            version: targetApp.version || '1.0',
            file_size: targetApp.file_size || '45 MB',
            safety_status: targetApp.safety_status || 'Verified',
            developer: targetApp.developer || '',
            serial_number: targetApp.serial_number ?? undefined,
            is_coming_soon: Boolean(targetApp.is_coming_soon),
            has_secure_link: Boolean(
              targetApp.has_secure_link ||
                targetApp.link_configured ||
                targetApp.more_information_url ||
                targetApp.encrypted_link ||
                targetApp.download_url
            ),
            link_configured: Boolean(
              targetApp.has_secure_link ||
                targetApp.link_configured ||
                targetApp.more_information_url ||
                targetApp.encrypted_link ||
                targetApp.download_url
            ),
          },
        ]
      : [];

    return {
      apps: gatewayApps,
      settings: {
        site_title: rawSettings.site_title || '',
        logo_url: rawSettings.logo_url || '',
        favicon_url: rawSettings.favicon_url || '',
        turnstile_site_key: rawSettings.turnstile_site_key || '',
        helpline_whatsapp: rawSettings.helpline_whatsapp || '',
        helpline_telegram: rawSettings.helpline_telegram || '',
        social_links: Array.isArray(rawSettings.social_links) ? rawSettings.social_links : [],
        categories: Array.isArray(rawSettings.categories) ? rawSettings.categories : [],
      },
      news: [],
      videos: [],
      developers: [],
    };
  }

  const targetAppSlug = targetApp ? (getField(targetApp, 'slug') || getField(targetApp, 'id'))?.toLowerCase().trim() : null;
  const targetAppId = targetApp ? String(getField(targetApp, 'id') || '').toLowerCase().trim() : '';
  const targetNewsSlug = targetNews ? (getField(targetNews, 'slug') || getField(targetNews, 'id'))?.toLowerCase().trim() : null;

function getSimilarAppsForApp(targetApp: any, baseApps: any[]): any[] {
  const checkAppIsNew = (item: any): boolean => {
    if (!item) return false;
    if (item.is_new === true || item.is_new === 'true' || item.is_new === 1) return true;
    if (item.isNew === true || item.isNew === 'true' || item.isNew === 1) return true;
    const isNewVal = String(getField(item, 'is_new', '')).trim().toLowerCase();
    if (isNewVal === 'true' || isNewVal === '1') return true;
    const badge = String(getField(item, 'badge', '')).trim().toLowerCase();
    return badge === 'new' || badge === 'hot';
  };

  const targetAppSlug = (getField(targetApp, 'slug') || getField(targetApp, 'id') || '').toLowerCase().trim();
  const targetAppId = String(getField(targetApp, 'id') || '').toLowerCase().trim();
  const rawCat = getField(targetApp, 'category', 'Card Game');
  const specificCategory = rawCat ? rawCat.split(',')[0]?.trim() || '' : '';
  const currentCatLower = (specificCategory && !['all apps', 'all', 'apps', 'general'].includes(specificCategory.toLowerCase()))
    ? specificCategory.toLowerCase()
    : 'all apps';
  const isAll = currentCatLower === 'all apps';

  const newApps: any[] = [];
  const regularApps: any[] = [];

  for (let i = 0; i < baseApps.length; i++) {
    const a = baseApps[i];
    if (!a || a.sync_to_public === false || a.is_Safety_alert === true || a.status === 'flagged') continue;

    const aSlug = (getField(a, 'slug') || '').toLowerCase().trim();
    const aId = String(getField(a, 'id') || '').toLowerCase().trim();
    const isCurrent = (targetAppSlug && (aSlug === targetAppSlug || aId === targetAppSlug)) ||
                      (targetAppId && (aId === targetAppId || aSlug === targetAppId));
    if (isCurrent) continue;

    const aCat = (getField(a, 'category', '') || '').toLowerCase();
    const matchesCategory = isAll || aCat.includes(currentCatLower) || currentCatLower.includes(aCat);

    if (matchesCategory) {
      if (checkAppIsNew(a)) {
        newApps.push(a);
      } else {
        regularApps.push(a);
      }
    }
  }

  newApps.sort((a: any, b: any) => (Number(getField(a, 'serial_number')) || 999999) - (Number(getField(b, 'serial_number')) || 999999));
  regularApps.sort((a: any, b: any) => (Number(getField(a, 'serial_number')) || 999999) - (Number(getField(b, 'serial_number')) || 999999));

  const maxCount = 16;
  const strSeed = String(targetAppSlug || targetAppId || '');
  let seedHash = 0;
  for (let i = 0; i < strSeed.length; i++) seedHash = ((seedHash << 5) - seedHash) + strSeed.charCodeAt(i);
  const absSeed = Math.abs(seedHash);

  const maxNewSlots = Math.min(newApps.length, 6);
  const pinnedNew: any[] = [];
  if (maxNewSlots > 0 && newApps.length > 0) {
    const newStart = absSeed % newApps.length;
    for (let s = 0; s < maxNewSlots; s++) {
      pinnedNew.push(newApps[(newStart + s) % newApps.length]);
    }
  }
  const remainingSlots = maxCount - pinnedNew.length;

  const pickedRegular: any[] = [];
  if (remainingSlots > 0 && regularApps.length > 0) {
    let startIndex = absSeed % regularApps.length;
    const currSerial = Number(getField(targetApp, 'serial_number'));
    if (!isNaN(currSerial) && currSerial > 0) {
      const nextIdx = regularApps.findIndex((a: any) => (Number(getField(a, 'serial_number')) || 0) > currSerial);
      if (nextIdx !== -1) startIndex = nextIdx;
    }

    const countToPick = Math.min(remainingSlots, regularApps.length);
    for (let step = 0; step < countToPick; step++) {
      pickedRegular.push(regularApps[(startIndex + step) % regularApps.length]);
    }
  }

  return [...pinnedNew, ...pickedRegular];
}

  // Optimized Apps Payload:
  // - If on an App Details page (/app/:slug): Include ONLY the 1 target app (_isFullApp: true) plus the up to 16 similar apps (_isTrimmed: true) rendered in the carousel (max 17 apps total).
  // - On News Detail or News Index pages: Carry ultra-lean card fields.
  // - On Home, Categories, and other routes: Structured catalog card fields for instant 0ms browsing.
  // - Zero download links (more_information_url / encrypted_link) are ever exposed in window.__INITIAL_DATA__.
  let optimizedApps: any[] = [];

  if (isAppDetailPage && targetApp) {
    const similarAppsList = getSimilarAppsForApp(targetApp, baseApps);

    const structuredFaqs = Array.isArray(targetApp.faqs)
      ? targetApp.faqs.map((f: any) => f && typeof f === 'object' ? {
          ...f,
          answer: f.answer ? structureHtmlFragment(String(f.answer)) : ''
        } : f)
      : [];

    const realRating = (seoReviewsFeed?.stats && Number(seoReviewsFeed.stats.totalReviews) > 0)
      ? Number(seoReviewsFeed.stats.averageRating)
      : (Number(targetApp.rating) || 4.5);
    const realReviews = (seoReviewsFeed?.stats && Number(seoReviewsFeed.stats.totalReviews) > 0)
      ? Number(seoReviewsFeed.stats.totalReviews)
      : (typeof targetApp.reviews === 'number' ? targetApp.reviews : Number(targetApp.review_count) || 0);

    const hasTargetSecureLink = Boolean(
      targetApp.has_secure_link ||
      targetApp.link_configured ||
      targetApp.more_information_url ||
      targetApp.encrypted_link ||
      targetApp.download_url
    );

    const fullTargetApp = {
      id: targetApp.id,
      name: targetApp.name,
      slug: targetApp.slug,
      icon_url: targetApp.icon_url || '',
      category: targetApp.category || '',
      rating: realRating,
      version: targetApp.version || '1.0',
      file_size: targetApp.file_size || '45 MB',
      safety_status: targetApp.safety_status || 'Verified',
      developer: targetApp.developer || '',
      review_count: realReviews,
      reviews: realReviews,
      short_description: targetApp.short_description || '',
      seo_title: targetApp.seo_title || '',
      seo_description: targetApp.seo_description || '',
      meta_description: targetApp.meta_description || '',
      og_image_url: targetApp.og_image_url || '',
      canonical_url: targetApp.canonical_url || '',
      description_html: targetApp.description_html ? structureHtmlFragment(String(targetApp.description_html)) : '',
      features_html: targetApp.features_html ? structureHtmlFragment(String(targetApp.features_html)) : '',
      screenshots: Array.isArray(targetApp.screenshots) ? targetApp.screenshots : [],
      faqs: structuredFaqs,
      custom_admin_box_html: targetApp.custom_admin_box_html ? structureHtmlFragment(String(targetApp.custom_admin_box_html)) : '',
      custom_admin_box_heading: targetApp.custom_admin_box_heading || '',
      yellow_box_msg: targetApp.yellow_box_msg || '',
      red_box_msg: targetApp.red_box_msg || '',
      idea_box_msg: targetApp.idea_box_msg || '',
      release_notes: targetApp.release_notes || '',
      video_url: targetApp.video_url || '',
      serial_number: targetApp.serial_number !== undefined ? Number(targetApp.serial_number) : 0,
      is_featured: Boolean(targetApp.is_featured),
      is_new: Boolean(targetApp.is_new),
      is_hot: Boolean(targetApp.is_hot),
      is_top_chart: Boolean(targetApp.is_top_chart),
      top_chart_category: targetApp.top_chart_category || '',
      publish_date: targetApp.publish_date || '',
      updated_at: targetApp.updated_at || '',
      created_at: targetApp.created_at || '',
      has_secure_link: hasTargetSecureLink,
      link_configured: hasTargetSecureLink,
      _isFullApp: true
    };

    const trimmedSimilar = similarAppsList.map((app: any) => {
      const hasSimSecureLink = Boolean(
        app.has_secure_link ||
        app.link_configured ||
        app.more_information_url ||
        app.encrypted_link ||
        app.download_url
      );
      return {
        id: app.id,
        name: app.name,
        slug: app.slug,
        icon_url: app.icon_url || '',
        category: app.category || '',
        developer: app.developer || '',
        version: app.version || '1.0',
        file_size: app.file_size || '45 MB',
        rating: Number(app.rating) || 4.5,
        serial_number: app.serial_number !== undefined ? Number(app.serial_number) : 0,
        is_new: Boolean(app.is_new),
        is_hot: Boolean(app.is_hot),
        popular: Boolean(app.popular),
        active: app.active !== false,
        has_secure_link: hasSimSecureLink,
        link_configured: hasSimSecureLink,
        _isTrimmed: true
      };
    });

    optimizedApps = [fullTargetApp, ...trimmedSimilar];
  } else if (isNewsDetailPage && targetNews) {
    let newsRelatedApp: any = null;
    const relId = getField(targetNews, 'related_app_id');
    if (relId && Array.isArray(baseApps)) {
      newsRelatedApp = baseApps.find((a: any) => (getField(a, 'id') || '').toLowerCase() === String(relId).toLowerCase() || (getField(a, 'slug') || '').toLowerCase() === String(relId).toLowerCase());
    }
    if (!newsRelatedApp && getField(targetNews, 'link') && Array.isArray(baseApps)) {
      const linkSlug = getField(targetNews, 'link').replace(/^.*\/app\//, '').replace(/\/$/, '').split(/[?#]/)[0].toLowerCase();
      if (linkSlug) {
        newsRelatedApp = baseApps.find((a: any) => (getField(a, 'slug') || '').toLowerCase() === linkSlug || (getField(a, 'id') || '').toLowerCase() === linkSlug);
      }
    }

    const anchorApp = newsRelatedApp || baseApps.find((a: any) => {
      const cat = (getField(a, 'category', '') || '').toLowerCase();
      const newsCat = (getField(targetNews, 'category', '') || 'all apps').toLowerCase();
      return cat.includes(newsCat) || newsCat.includes(cat);
    }) || baseApps[0];

    const similarAppsList = anchorApp ? getSimilarAppsForApp(anchorApp, baseApps) : [];

    const trimNewsApp = (app: any) => {
      if (!app) return null;
      const hasSimSecureLink = Boolean(
        app.has_secure_link ||
        app.link_configured ||
        app.more_information_url ||
        app.encrypted_link ||
        app.download_url
      );
      return {
        id: app.id,
        name: app.name,
        slug: app.slug,
        icon_url: app.icon_url || '',
        category: app.category || '',
        developer: app.developer || '',
        version: app.version || '1.0',
        file_size: app.file_size || '45 MB',
        rating: Number(app.rating) || 4.5,
        serial_number: app.serial_number !== undefined ? Number(app.serial_number) : 0,
        is_new: Boolean(app.is_new),
        is_hot: Boolean(app.is_hot),
        popular: Boolean(app.popular),
        active: app.active !== false,
        has_secure_link: hasSimSecureLink,
        link_configured: hasSimSecureLink,
        _isTrimmed: true
      };
    };

    const newsAppsToInclude: any[] = [];
    if (newsRelatedApp) {
      newsAppsToInclude.push(trimNewsApp(newsRelatedApp));
    }
    for (const sim of similarAppsList) {
      if (newsRelatedApp && (String(sim.id || '') === String(newsRelatedApp.id || '') || String(sim.slug || '').toLowerCase() === String(newsRelatedApp.slug || '').toLowerCase())) continue;
      newsAppsToInclude.push(trimNewsApp(sim));
    }

    optimizedApps = newsAppsToInclude.filter(Boolean);
  } else {
    optimizedApps = baseApps.map((app: any) => {
      if (!app || app.sync_to_public === false) return null;
      const s = (getField(app, 'slug') || '').toLowerCase().trim();
      const id = String(getField(app, 'id') || '').toLowerCase().trim();
      const isTarget = Boolean(targetApp) && (
        (targetAppSlug && (s === targetAppSlug || id === targetAppSlug)) ||
        (targetAppId && (id === targetAppId || s === targetAppId))
      );
      const hasSecureLink = Boolean(
        app.has_secure_link ||
        app.link_configured ||
        app.more_information_url ||
        app.encrypted_link ||
        app.download_url
      );

      if (isTarget) {
        const structuredFaqs = Array.isArray(app.faqs)
          ? app.faqs.map((f: any) => f && typeof f === 'object' ? {
              ...f,
              answer: f.answer ? structureHtmlFragment(String(f.answer)) : ''
            } : f)
          : [];

        return {
          id: app.id,
          name: app.name,
          slug: app.slug,
          icon_url: app.icon_url || '',
          category: app.category || '',
          rating: Number(app.rating) || 4.5,
          version: app.version || '1.0',
          file_size: app.file_size || '45 MB',
          safety_status: app.safety_status || 'Verified',
          developer: app.developer || '',
          review_count: Number(app.review_count) || (typeof app.reviews === 'number' ? app.reviews : 0),
          reviews: typeof app.reviews === 'number' ? app.reviews : Number(app.review_count) || 0,
          short_description: app.short_description || '',
          seo_title: app.seo_title || '',
          seo_description: app.seo_description || '',
          meta_description: app.meta_description || '',
          og_image_url: app.og_image_url || '',
          canonical_url: app.canonical_url || '',
          description_html: app.description_html ? structureHtmlFragment(String(app.description_html)) : '',
          features_html: app.features_html ? structureHtmlFragment(String(app.features_html)) : '',
          screenshots: Array.isArray(app.screenshots) ? app.screenshots : [],
          faqs: structuredFaqs,
          custom_admin_box_html: app.custom_admin_box_html ? structureHtmlFragment(String(app.custom_admin_box_html)) : '',
          custom_admin_box_heading: app.custom_admin_box_heading || '',
          yellow_box_msg: app.yellow_box_msg || '',
          red_box_msg: app.red_box_msg || '',
          idea_box_msg: app.idea_box_msg || '',
          release_notes: app.release_notes || '',
          video_url: app.video_url || '',
          serial_number: app.serial_number !== undefined ? Number(app.serial_number) : 0,
          is_featured: Boolean(app.is_featured),
          is_new: Boolean(app.is_new),
          is_hot: Boolean(app.is_hot),
          is_top_chart: Boolean(app.is_top_chart),
          top_chart_category: app.top_chart_category || '',
          publish_date: app.publish_date || '',
          updated_at: app.updated_at || '',
          created_at: app.created_at || '',
          has_secure_link: hasSecureLink,
          link_configured: hasSecureLink,
          _isFullApp: true
        };
      }

      if (isNewsDetailPage || isNewsIndexPage) {
        return {
          id: app.id,
          name: app.name,
          slug: app.slug,
          icon_url: app.icon_url || '',
          category: app.category || '',
          developer: app.developer || '',
          version: app.version || '1.0',
          file_size: app.file_size || '45 MB',
          rating: Number(app.rating) || 4.5,
          serial_number: app.serial_number !== undefined ? Number(app.serial_number) : 0,
          is_new: Boolean(app.is_new),
          is_hot: Boolean(app.is_hot),
          popular: Boolean(app.popular),
          active: app.active !== false,
          has_secure_link: hasSecureLink,
          link_configured: hasSecureLink,
          _isTrimmed: true
        };
      }

      return {
        id: app.id,
        name: app.name,
        slug: app.slug,
        icon_url: app.icon_url || '',
        category: app.category || '',
        rating: Number(app.rating) || 4.5,
        version: app.version || '1.0',
        file_size: app.file_size || '45 MB',
        safety_status: app.safety_status || 'Verified',
        developer: app.developer || '',
        review_count: Number(app.review_count) || (typeof app.reviews === 'number' ? app.reviews : 0),
        reviews: typeof app.reviews === 'number' ? app.reviews : Number(app.review_count) || 0,
        serial_number: app.serial_number !== undefined ? Number(app.serial_number) : 0,
        is_featured: Boolean(app.is_featured),
        is_new: Boolean(app.is_new),
        is_hot: Boolean(app.is_hot),
        popular: Boolean(app.popular),
        active: app.active !== false,
        tags: Array.isArray(app.tags) ? app.tags : [],
        is_top_chart: Boolean(app.is_top_chart),
        top_chart_category: app.top_chart_category || '',
        publish_date: app.publish_date || '',
        created_at: app.created_at || '',
        updated_at: app.updated_at || '',
        short_description: typeof app.short_description === 'string' ? app.short_description.slice(0, 150) : '',
        seo_title: app.seo_title || '',
        seo_description: app.seo_description || '',
        canonical_url: app.canonical_url || '',
        has_secure_link: hasSecureLink,
        link_configured: hasSecureLink,
        _isTrimmed: true
      };
    }).filter(Boolean);
  }

  // Optimized News:
  // - On /news/:slug (News Detail): Send ONLY the 1 active target news article with full pre-structured content!
  // - On /news (News Index): Send card summaries for all articles (stripping heavy HTML content bodies).
  // - On / (Home): Send top 8 news card summaries (stripping heavy HTML content bodies).
  // - On /app/:slug: Send only lightweight stubs matching targetApp for relatedNewsCount.
  const rawNews = (Array.isArray(data.news) ? data.news : (Array.isArray(data.mockNews) ? data.mockNews : []))
    .filter((item: any) => item && item.sync_to_public !== false);

  let optimizedNews: any[] = [];
  if (isNewsDetailPage) {
    const matchedNews = rawNews.filter((item: any) => {
      const itemSlug = (item.slug || item.id || '').toLowerCase().trim();
      const itemId = String(item.id || '').toLowerCase().trim();
      return Boolean(targetNewsSlug) && (itemSlug === targetNewsSlug || itemId === targetNewsSlug);
    });
    const sourceList = matchedNews.length > 0 ? matchedNews : (targetNews ? [targetNews] : []);

    const targetKey = (targetNewsSlug || (targetNews ? (getField(targetNews, 'slug') || getField(targetNews, 'id')) : '') || '').toLowerCase().trim();
    const recentNewsItems = getNextNewsChain(targetKey, rawNews, 6);

    const trimmedRecent = recentNewsItems.map((item: any) => ({
      id: item.id,
      slug: item.slug,
      title: item.title,
      logo_url: item.logo_url || item.image_url || '',
      image_url: item.image_url || item.logo_url || '',
      description: item.description || '',
      content: '',
      description_html: '',
      author: item.author || item.ceo_name || 'Admin Team',
      category: item.category || 'General',
      published_at: item.published_at || item.created_at || item.date || '',
      date: item.date || item.published_at || item.created_at || '',
      read_time: item.read_time || '3 min read',
      is_pinned: Boolean(item.is_pinned),
      seo_title: item.seo_title || '',
      related_app_id: item.related_app_id || '',
      _isTrimmed: true
    }));

    const fullArticleList = sourceList.map((item: any) => {
      const rawBody = item.content || item.description_html || item.description || '';
      const structuredBody = rawBody ? structureHtmlFragment(String(rawBody)) : '';
      return {
        id: item.id,
        slug: item.slug,
        title: item.title,
        logo_url: item.logo_url || item.image_url || '',
        image_url: item.image_url || item.logo_url || '',
        description: item.description || '',
        content: structuredBody,
        description_html: '',
        ceo_name: item.ceo_name || item.author || 'Admin Team',
        ceo_description: item.ceo_description || 'Transparency & Security Analyst',
        author: item.author || item.ceo_name || 'Admin Team',
        category: item.category || 'General',
        published_at: item.published_at || item.created_at || item.date || '',
        date: item.date || item.published_at || item.created_at || '',
        read_time: item.read_time || '3 min read',
        is_breaking: Boolean(item.is_breaking),
        is_new: Boolean(item.is_new),
        is_pinned: Boolean(item.is_pinned),
        seo_title: item.seo_title || '',
        seo_description: item.seo_description || '',
        seo_keywords: item.seo_keywords || '',
        og_image_url: item.og_image_url || '',
        canonical_url: item.canonical_url || '',
        target_region: item.target_region || 'India',
        link: item.link || '',
        tags: Array.isArray(item.tags) ? item.tags : [],
        related_app_id: item.related_app_id || '',
        created_at: item.created_at || item.date || '',
        updated_at: item.updated_at || item.date || '',
        _isFullArticle: true
      };
    });

    optimizedNews = [...fullArticleList, ...trimmedRecent];
  } else if (isNewsIndexPage || isHomePage) {
    const sliceLimit = isHomePage ? 8 : rawNews.length;
    optimizedNews = rawNews.slice(0, sliceLimit).map((item: any) => ({
      id: item.id,
      slug: item.slug,
      title: item.title,
      logo_url: item.logo_url || item.image_url || '',
      image_url: item.image_url || item.logo_url || '',
      description: item.description || '',
      content: '',
      description_html: '',
      ceo_name: item.ceo_name || item.author || 'Admin Team',
      author: item.author || item.ceo_name || 'Admin Team',
      category: item.category || 'General',
      published_at: item.published_at || item.created_at || item.date || '',
      date: item.date || item.published_at || item.created_at || '',
      read_time: item.read_time || '3 min read',
      is_breaking: Boolean(item.is_breaking),
      is_new: Boolean(item.is_new),
      is_pinned: Boolean(item.is_pinned),
      link: item.link || '',
      tags: Array.isArray(item.tags) ? item.tags : [],
      related_app_id: item.related_app_id || '',
      created_at: item.created_at || item.date || '',
      updated_at: item.updated_at || item.date || ''
    }));
  } else if (isAppDetailPage && targetApp) {
    const appNameLower = String(getField(targetApp, 'name') || '').toLowerCase().trim();
    const appIdStr = String(getField(targetApp, 'id') || '');
    optimizedNews = rawNews
      .filter((n: any) => {
        if (appIdStr && n.related_app_id === appIdStr) return true;
        if (!appNameLower) return false;
        return (
          n.title?.toLowerCase().includes(appNameLower) ||
          n.description?.toLowerCase().includes(appNameLower) ||
          (Array.isArray(n.tags) && n.tags.some((t: string) => String(t).toLowerCase() === appNameLower))
        );
      })
      .map((item: any) => ({
        id: item.id,
        slug: item.slug,
        title: item.title,
        related_app_id: item.related_app_id || '',
        tags: Array.isArray(item.tags) ? item.tags : []
      }));
  }

  // Optimized Videos: Omit on App Details and News Detail pages to keep initial HTML and JSON.parse ultra-light
  const rawVideos = (isAppDetailPage || isNewsDetailPage)
    ? []
    : (Array.isArray(data.videos) ? data.videos : (Array.isArray(data.mockVideos) ? data.mockVideos : []));
  const optimizedVideos: any[] = rawVideos.map((item: any) => {
    if (!item) return null;
    return {
      id: item.id,
      slug: item.slug,
      title: item.title,
      seo_title: item.seo_title || '',
      seo_description: item.seo_description || '',
      meta_description: item.meta_description || '',
      og_image_url: item.og_image_url || '',
      thumbnail_url: item.thumbnail_url || '',
      video_url: item.video_url || '',
      duration: item.duration || '',
      category: item.category || ''
    };
  }).filter(Boolean);

  // Public Settings: On App Details & News Detail pages, omit heavy legal HTML blobs, website_faqs, banners, and developers
  const rawSettings = data.settings || data.mockSettings || {};
  const optimizedSettings: any = {};
  const detailPageKeys = [
    'site_title', 'logo_url', 'favicon_url', 'seo_title', 'seo_description', 'seo_keywords',
    'meta_title', 'meta_description', 'social_links', 'categories', 'trending_searches',
    'ticker_text', 'support_email', 'last_updated', 'animations_enabled',
    'quick_links', 'turnstile_site_key', 'helpline_whatsapp', 'helpline_telegram',
    'news_meta_title', 'news_meta_description'
  ];
  const fullAllowedKeys = [
    ...detailPageKeys,
    'hero_title_text', 'hero_title_subtitle', 'hero_title_color', 'hero_title_animation',
    'hero_title_visible', 'hero_title_style', 'portal_heading', 'secure_index_title',
    'secure_index_subtitle', 'banners',
    'about_meta_title', 'about_meta_description', 'about_content', 'about_us',
    'contact_meta_title', 'contact_meta_description', 'contact_content',
    'privacy_meta_title', 'privacy_meta_description', 'privacy_content',
    'terms_meta_title', 'terms_meta_description', 'terms_content',
    'responsibility_meta_title', 'responsibility_meta_description', 'responsibility_content',
    'report_removal_meta_title', 'report_removal_meta_description', 'report_removal_content',
    'notice_meta_title', 'notice_meta_description', 'important_notice', 'important_notice_heading',
    'ethics_meta_title', 'ethics_meta_description', 'ethics_discrimination_text', 'ethics_heading',
    'disclaimer_meta_title', 'disclaimer_meta_description', 'disclaimer_text', 'disclaimer_heading',
    'developers_meta_title', 'developers_meta_description', 'developers',
    'website_faqs', 'faq_meta_title', 'faq_meta_description',
    'videos_meta_title', 'videos_meta_description',
    'new_apps_meta_title', 'new_apps_meta_description',
    'categories_meta_title', 'categories_meta_description',
    'safety_meta_title', 'safety_meta_description'
  ];

  const allowedKeys = (isAppDetailPage || isNewsDetailPage) ? detailPageKeys : fullAllowedKeys;

  const htmlContentKeys = new Set([
    'about_content', 'about_us', 'contact_content', 'privacy_content', 'terms_content',
    'responsibility_content', 'report_removal_content', 'important_notice',
    'ethics_discrimination_text', 'disclaimer_text'
  ]);

  for (const k of allowedKeys) {
    if (rawSettings[k] !== undefined) {
      const val = rawSettings[k];
      if (htmlContentKeys.has(k) && typeof val === 'string' && val.length > 0) {
        optimizedSettings[k] = val
          .replace(/<!DOCTYPE[^>]*>/gi, '')
          .replace(/<head\b[^>]*>[\s\S]*?<\/head>/gi, '')
          .replace(/<\/?(html|head|body)[^>]*>/gi, '')
          .replace(/<(meta|link)\b[^>]*>/gi, '')
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
          .replace(/<svg[^>]*>[\s\S]*?<\/svg>/gi, '')
          .trim();
      } else {
        optimizedSettings[k] = val;
      }
    }
  }

  // Ensure developers array is available when not on detail pages
  if (!isAppDetailPage && !isNewsDetailPage && !optimizedSettings.developers && Array.isArray(data.developers)) {
    optimizedSettings.developers = data.developers;
  }

  let appReviewsData: any = null;
  if (seoReviewsFeed && (targetAppSlug || targetAppId)) {
    const revList = Array.isArray(seoReviewsFeed.reviews) ? seoReviewsFeed.reviews : [];
    const totalCount = Number(seoReviewsFeed.stats?.totalReviews) || revList.length;
    appReviewsData = {
      appId: targetAppId,
      appSlug: targetAppSlug,
      reviews: revList.slice(0, 5),
      stats: seoReviewsFeed.stats || null,
      hasMore: totalCount > 5
    };
  }

  // Strict Action 2: Before serializing window.__INITIAL_DATA__ on /app/:slug, if appReviews.stats.totalReviews > 0,
  // overwrite rating, review_count, and reviews on the target app inside window.__INITIAL_DATA__.apps to avoid hydration mismatches
  if (isAppDetailPage && appReviewsData?.stats && Number(appReviewsData.stats.totalReviews) > 0) {
    const targetIdx = optimizedApps.findIndex((a: any) => a && a._isFullApp);
    if (targetIdx !== -1) {
      optimizedApps[targetIdx].rating = Number(appReviewsData.stats.averageRating) || optimizedApps[targetIdx].rating;
      optimizedApps[targetIdx].review_count = Number(appReviewsData.stats.totalReviews);
      optimizedApps[targetIdx].reviews = Number(appReviewsData.stats.totalReviews);
    }
  }

  return {
    apps: optimizedApps,
    news: optimizedNews,
    videos: optimizedVideos,
    settings: optimizedSettings,
    ...(appReviewsData ? { appReviews: appReviewsData } : {})
  };
}


