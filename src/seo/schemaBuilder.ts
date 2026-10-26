import { getField, stripHtml, optimizeImageUrl, normalizeSchemaCategory, getYoutubeThumbnail, normalizeIsoDate, cleanFaqQuestion } from './utils';
import { fetchSEOReviewsForApp } from './reviewFallback';
import { formatPageTitle } from '../lib/seoUtils';

export interface BuildSchemaParams {
  pageType: 'home' | 'app' | 'news' | 'video' | 'static' | 'collection' | 'gateway' | '404';
  title: string;
  description: string;
  url: string;
  logoUrl: string;
  siteTitle: string;
  app?: any;
  newsItem?: any;
  videoItem?: any;
  settings?: any;
  collectionItems?: Array<{ name: string; url: string; image?: string; description?: string }>;
  breadcrumbItems?: Array<{ name: string; url: string }>;
}

function cleanSeoDescription(desc: string): string {
  if (!desc) return '';
  const trimmed = desc.trim();
  if (trimmed.startsWith('<') || trimmed.includes('<meta ')) {
    const metaMatch = trimmed.match(/<meta\s+name=["']description["']\s+content=["'](.*?)["']/i);
    if (metaMatch && metaMatch[1]) return metaMatch[1].trim();
    const ogMatch = trimmed.match(/<meta\s+property=["']og:description["']\s+content=["'](.*?)["']/i);
    if (ogMatch && ogMatch[1]) return ogMatch[1].trim();
    return stripHtml(trimmed);
  }
  return trimmed;
}

export async function buildJsonLdSchema(params: BuildSchemaParams): Promise<string> {
  if (params.pageType === 'gateway' || params.pageType === '404') {
    return '';
  }

  const schemas: any[] = [];
  let defaultHostOrigin = '';
  if (typeof process !== 'undefined' && process.env) {
    defaultHostOrigin = (process.env.PUBLIC_DOMAIN || process.env.VITE_PUBLIC_DOMAIN || '').trim().replace(/\/+$/, '');
  }
  let hostOrigin = defaultHostOrigin;
  if (params.url) {
    try {
      hostOrigin = new URL(params.url).origin;
    } catch {
      hostOrigin = defaultHostOrigin;
    }
  }

  if (params.pageType === 'app' && params.app) {
    const app = params.app;
    const name = getField(app, 'name');
    const category = normalizeSchemaCategory(getField(app, 'category'));
    const rawRating = getField(app, 'rating');
    const configuredRating = parseFloat(rawRating);
    const rawCount = getField(app, 'review_count') || getField(app, 'reviews') || '';
    const configuredCount = parseInt(String(rawCount).replace(/[^0-9]/g, ''), 10) || 0;
    
    // Align live rating and count with community reviews and AppDetails
    const appIdentifier = getField(app, 'slug') || getField(app, 'id');
    const seoFeed = await fetchSEOReviewsForApp(appIdentifier, getField(app, 'slug'), !isNaN(configuredRating) && configuredRating > 0 ? configuredRating : 4.5, name);
    const liveStats = seoFeed?.stats || null;
    
    const hasLiveReviews = Boolean(liveStats && Number(liveStats.totalReviews) > 0);
    const finalRating = hasLiveReviews
      ? Math.max(1.0, Math.min(5.0, Number(liveStats.averageRating)))
      : (!isNaN(configuredRating) && configuredRating > 0 ? Math.max(1.0, Math.min(5.0, configuredRating)) : 4.5);
    const clampedRating = Math.max(1.0, Math.min(5.0, finalRating));

    // Strictly real count of reviews present in Firebase / catalog
    const finalCount = hasLiveReviews 
      ? Number(liveStats.totalReviews) 
      : (configuredCount > 0 ? configuredCount : 0);

    const appRawIcon = getField(app, 'icon_url') || getField(app, 'og_image_url') || params.logoUrl;
    const appSquareIcon = optimizeImageUrl(appRawIcon, 512) || appRawIcon;
    const desc = cleanSeoDescription(getField(app, 'seo_description') || getField(app, 'meta_description') || stripHtml(getField(app, 'description_html')).substring(0, 160) || params.description);

    const rawCat = getField(app, 'category');
    const specificCat = rawCat ? rawCat.split(',').map((c: string) => c.trim()).filter((c: string) => c && c.toLowerCase() !== 'all apps' && c.toLowerCase() !== 'all' && c.toLowerCase() !== 'apps' && c.toLowerCase() !== 'general')[0] : '';
    const developer = getField(app, 'developer') || name || 'Official';
    const fileSize = getField(app, 'file_size') || '45 MB';
    const version = getField(app, 'version') || '1.0';

    const appPageUrl = params.url || `${hostOrigin}/app/${getField(app, 'slug')}`;
    const ratingValue = parseFloat(clampedRating.toFixed(1));

    // Sample reviews for Rich Snippet compliance
    let validReviews: any[] = [];
    try {
      const feed = seoFeed || await fetchSEOReviewsForApp(appIdentifier, getField(app, 'slug'), clampedRating, name);
      if (feed && Array.isArray(feed.reviews) && feed.reviews.length > 0) {
        validReviews = feed.reviews
          .filter((rev: any) => rev && stripHtml(rev.reviewText || '').trim().length >= 3)
          .slice(0, 10)
          .map((rev: any) => ({
            "@type": "Review",
            "author": {
              "@type": "Person",
              "name": rev.userName ? String(rev.userName).trim() : 'Verified Player'
            },
            "datePublished": (rev.timestamp ? new Date(rev.timestamp).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]),
            "reviewBody": stripHtml(rev.reviewText || '').trim(),
            "reviewRating": {
              "@type": "Rating",
              "ratingValue": Math.max(1, Math.min(5, Number(rev.rating) || 5)),
              "bestRating": 5,
              "worstRating": 1
            }
          }));
      }
    } catch (_) {}

    const validCount = Math.round(Math.max(finalCount, validReviews.length));

    // 1. Clean SoftwareApplication Schema (Google Software App Rich Results compliant, zero Merchant Listing / Product bloat)
    const softwareAppSchema: any = {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "@id": `${appPageUrl}#software`,
      "name": name,
      "url": appPageUrl,
      "operatingSystem": "Android",
      "applicationCategory": category,
      "image": appSquareIcon,
      "description": desc,
      "fileSize": fileSize,
      "softwareVersion": version,
      "author": {
        "@type": "Organization",
        "name": developer
      },
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "INR"
      }
    };

    if (validCount > 0) {
      softwareAppSchema["aggregateRating"] = {
        "@type": "AggregateRating",
        "ratingValue": ratingValue,
        "ratingCount": validCount,
        "bestRating": 5,
        "worstRating": 1
      };
    }

    if (validReviews.length > 0) {
      softwareAppSchema["review"] = validReviews;
    }

    const appScreenshots = getField(app, 'screenshots');
    if (Array.isArray(appScreenshots) && appScreenshots.length > 0) {
      softwareAppSchema["screenshot"] = appScreenshots.map((s: string) => optimizeImageUrl(s, 1024) || s);
    }

    schemas.push(softwareAppSchema);

    // 2. WebPage schema referencing the primary SoftwareApplication entity via @id
    schemas.push({
      "@context": "https://schema.org",
      "@type": "WebPage",
      "@id": `${appPageUrl}#webpage`,
      "url": appPageUrl,
      "name": params.title,
      "headline": params.title,
      "description": desc,
      "inLanguage": "en",
      "mainEntity": {
        "@id": `${appPageUrl}#software`
      }
    });

    // 3. BreadcrumbList navigation schema
    const breadcrumbs: any[] = [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": hostOrigin
      }
    ];

    if (specificCat) {
      breadcrumbs.push({
        "@type": "ListItem",
        "position": 2,
        "name": specificCat,
        "item": `${hostOrigin}/category/${encodeURIComponent(specificCat.toLowerCase().replace(/\s+/g, '-'))}`
      });
      breadcrumbs.push({
        "@type": "ListItem",
        "position": 3,
        "name": name,
        "item": `${hostOrigin}/app/${getField(app, 'slug')}`
      });
    } else {
      breadcrumbs.push({
        "@type": "ListItem",
        "position": 2,
        "name": name,
        "item": `${hostOrigin}/app/${getField(app, 'slug')}`
      });
    }

    schemas.push({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": breadcrumbs
    });

    // 4. FAQPage Schema when app has 1 or more valid Q&A items
    const rawFaqs = Array.isArray(app.faqs) ? app.faqs : [];
    const validFaqs = rawFaqs.filter((f: any) => f && f.question && f.answer && stripHtml(f.question).length > 0 && stripHtml(f.answer).length > 0);
    if (validFaqs.length > 0) {
      schemas.push({
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": validFaqs.map((faq: any) => ({
          "@type": "Question",
          "name": cleanFaqQuestion(stripHtml(faq.question)) || stripHtml(faq.question),
          "acceptedAnswer": {
            "@type": "Answer",
            "text": stripHtml(faq.answer)
          }
        }))
      });
    }
  } else if (params.pageType === 'news' && params.newsItem) {
    const item = params.newsItem;
    const rawHeading = getField(item, 'title');
    const exactTitle = formatPageTitle(params.title || getField(item, 'seo_title') || getField(item, 'meta_title') || rawHeading, rawHeading);
    const desc = cleanSeoDescription(
      getField(item, 'seo_description') || 
      getField(item, 'meta_description') || 
      getField(item, 'description') || 
      params.description
    );
    const rawDatePublished = getField(item, 'published_at') || getField(item, 'publish_date') || getField(item, 'created_at') || getField(item, 'date') || '2026-09-01T00:00:00.000Z';
    const datePublished = normalizeIsoDate(rawDatePublished);
    const dateModified = normalizeIsoDate(getField(item, 'updated_at') || rawDatePublished, datePublished);
    const authorName = getField(item, 'author') || getField(item, 'ceo_name') || 'Editorial Team';

    const rawNewsImg = getField(item, 'og_image_url') || getField(item, 'image_url') || getField(item, 'logo_url') || params.logoUrl;
    const newsImg = optimizeImageUrl(rawNewsImg, 1200) || rawNewsImg;

    const newsSlugStr = getField(item, 'slug') || getField(item, 'id');
    const canonicalPageUrl = params.url || `${hostOrigin}/news/${newsSlugStr}`;
    const rawArticleBody = stripHtml(getField(item, 'content') || getField(item, 'description_html') || desc);

    schemas.push({
      "@context": "https://schema.org",
      "@type": ["NewsArticle", "Article"],
      "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": canonicalPageUrl
      },
      "name": exactTitle,
      "headline": exactTitle,
      "description": desc,
      "articleBody": rawArticleBody,
      "image": [newsImg],
      "datePublished": datePublished,
      "dateModified": dateModified,
      "articleSection": getField(item, 'category') || 'General',
      "inLanguage": "en",
      "isAccessibleForFree": true,
      "author": {
        "@type": "Person",
        "name": authorName
      },
      "publisher": {
        "@type": "Organization",
        "name": params.siteTitle,
        "url": hostOrigin,
        "logo": {
          "@type": "ImageObject",
          "url": params.logoUrl,
          "width": 512,
          "height": 512
        }
      }
    });

    schemas.push({
      "@context": "https://schema.org",
      "@type": "WebPage",
      "@id": `${canonicalPageUrl}#webpage`,
      "url": canonicalPageUrl,
      "name": exactTitle,
      "headline": exactTitle,
      "description": desc,
      "inLanguage": "en"
    });

    schemas.push({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Home",
          "item": hostOrigin
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": "News",
          "item": `${hostOrigin}/news`
        },
        {
          "@type": "ListItem",
          "position": 3,
          "name": rawHeading || exactTitle,
          "item": canonicalPageUrl
        }
      ]
    });
  } else if (params.pageType === 'video' && params.videoItem) {
    const v = params.videoItem;
    const youtubeUrl = getField(v, 'youtube_url') || getField(v, 'video_url') || getField(v, 'url');
    const uploadDate = normalizeIsoDate(getField(v, 'updated_at') || getField(v, 'created_at') || getField(v, 'published_at') || getField(v, 'date'));
    schemas.push({
      "@context": "https://schema.org",
      "@type": "VideoObject",
      "name": getField(v, 'title'),
      "description": getField(v, 'description') || getField(v, 'title'),
      "thumbnailUrl": getYoutubeThumbnail(youtubeUrl) || params.logoUrl,
      "uploadDate": uploadDate,
      "contentUrl": youtubeUrl
    });
    schemas.push({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Home",
          "item": hostOrigin
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": "Videos",
          "item": `${hostOrigin}/videos`
        },
        {
          "@type": "ListItem",
          "position": 3,
          "name": getField(v, 'title'),
          "item": `${hostOrigin}/videos/${getField(v, 'slug')}`
        }
      ]
    });
  } else if (params.pageType === 'collection') {
    const collectionSchema: any = {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      "name": params.title,
      "description": params.description,
      "url": params.url
    };

    if (params.collectionItems && params.collectionItems.length > 0) {
      const itemListObj = {
        "@type": "ItemList",
        "@id": `${params.url}#itemlist`,
        "name": params.title,
        "itemListElement": params.collectionItems.map((item, idx) => ({
          "@type": "ListItem",
          "position": idx + 1,
          "name": item.name,
          "url": item.url,
          ...(item.image ? { "image": item.image } : {}),
          ...(item.description ? { "description": item.description } : {})
        }))
      };
      collectionSchema.mainEntity = itemListObj;
    }
    schemas.push(collectionSchema);

    if (params.breadcrumbItems && params.breadcrumbItems.length > 0) {
      schemas.push({
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": params.breadcrumbItems.map((b, idx) => ({
          "@type": "ListItem",
          "position": idx + 1,
          "name": b.name,
          "item": b.url
        }))
      });
    }
  } else if (params.pageType === 'home') {
    schemas.push({
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": `${hostOrigin}/#website`,
      "url": hostOrigin,
      "name": params.siteTitle,
      "description": params.description,
      "potentialAction": {
        "@type": "SearchAction",
        "target": `${hostOrigin}/?q={search_term_string}`,
        "query-input": "required name=search_term_string"
      },
      "publisher": {
        "@type": "Organization",
        "@id": `${hostOrigin}/#organization`,
        "name": params.siteTitle,
        "url": hostOrigin,
        "logo": {
          "@type": "ImageObject",
          "url": params.logoUrl,
          "width": 512,
          "height": 512
        }
      }
    });

    // Dedicated top-level Organization schema
    schemas.push({
      "@context": "https://schema.org",
      "@type": "Organization",
      "@id": `${hostOrigin}/#organization`,
      "name": params.siteTitle || '',
      "url": hostOrigin,
      "image": params.logoUrl || `${hostOrigin}/logo.png`,
      "logo": {
        "@type": "ImageObject",
        "url": params.logoUrl || `${hostOrigin}/logo.png`,
        "width": 512,
        "height": 512
      },
      "description": params.description || ''
    });
  } else {
    // Static pages (/about, /contact, /terms, /privacy, /faq, /developers, /videos, etc.):
    // Emit WebPage schema with exact page title/headline
    schemas.push({
      "@context": "https://schema.org",
      "@type": "WebPage",
      "@id": `${params.url}#webpage`,
      "url": params.url,
      "name": params.title,
      "headline": params.title,
      "description": params.description,
      "inLanguage": "en"
    });

    // On /about, also emit the Organization schema for brand verification
    if (params.url && /\/about\/?$/i.test(params.url)) {
      schemas.push({
        "@context": "https://schema.org",
        "@type": "Organization",
        "@id": `${hostOrigin}/#organization`,
        "name": params.siteTitle || '',
        "url": hostOrigin,
        "image": params.logoUrl || `${hostOrigin}/logo.png`,
        "logo": {
          "@type": "ImageObject",
          "url": params.logoUrl || `${hostOrigin}/logo.png`,
          "width": 512,
          "height": 512
        },
        "description": params.description || ''
      });
    }
  }

  return schemas.map(s => `<script type="application/ld+json" data-rh="true">${JSON.stringify(s).replace(/</g, '\\u003c')}</script>`).join('\n');
}
