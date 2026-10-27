import React, { useEffect } from 'react';
import { useData } from '../contexts/DataContextPublic';
import { getCleanCanonicalUrl, formatPageTitle } from '../lib/seoUtils';
import { getOgImageUrl, getOptimizedImageUrl, getAllSiteIconUrls } from '../seo/utils';

interface MetaProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article' | 'profile';
  publishedTime?: string;
  modifiedTime?: string;
  author?: string;
  section?: string;
  tags?: string[];
  canonical?: string;
  schema?: any;
  breadcrumbSchema?: any;
  videoSchema?: any;
  noindex?: boolean;
}

const Meta: React.FC<MetaProps> = ({
  title,
  description,
  keywords,
  image,
  url,
  type = 'website',
  publishedTime,
  modifiedTime,
  author,
  section,
  tags,
  canonical,
  schema,
  breadcrumbSchema,
  videoSchema,
  noindex = false
}) => {
  const { settings } = useData();
  const siteTitle = settings?.site_title || '';
  const fullTitle = formatPageTitle(title, '', siteTitle);
  const metaDescription = description || settings?.meta_description || '';
  const metaKeywords = keywords || settings?.seo_keywords || '';
  
  const origin = typeof window !== 'undefined' ? window.location.origin : ((import.meta as any).env?.VITE_PUBLIC_DOMAIN || '');
  const iconSet = getAllSiteIconUrls(settings, origin);
  const rawImage = image || iconSet.masterLogo || iconSet.masterFavicon || '';
  const metaImage = getOgImageUrl(rawImage, origin);
  const rawSquareThumb = rawImage ? (rawImage.startsWith('http') ? rawImage : `${origin}${rawImage.startsWith('/') ? '' : '/'}${rawImage}`) : '';
  const squareThumbnail = rawSquareThumb ? getOptimizedImageUrl(rawSquareThumb, 512) : iconSet.searchLogo512;
  
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/';
  const canonicalUrl = getCleanCanonicalUrl(canonical || url, currentPath);
  const metaUrl = getCleanCanonicalUrl(url || canonical, currentPath);

  const cleanPathLower = currentPath.toLowerCase().replace(/\/+$/, '') || '/';
  const isDisallowedPrefix = 
    cleanPathLower.startsWith('/s/') ||
    cleanPathLower.startsWith('/dl/') ||
    cleanPathLower.startsWith('/out/') ||
    cleanPathLower.startsWith('/gateway/') ||
    cleanPathLower.startsWith('/info/') ||
    cleanPathLower.startsWith('/moreinfo/') ||
    cleanPathLower.startsWith('/moredetail/') ||
    cleanPathLower.startsWith('/download/') ||
    cleanPathLower.startsWith('/admin') ||
    cleanPathLower.startsWith('/login') ||
    cleanPathLower.startsWith('/masterworld');

  const isIndexable = !noindex && !isDisallowedPrefix;
  const robotsDirective = isIndexable 
    ? "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" 
    : "noindex, nofollow, noarchive, nosnippet, noimageindex, notranslate";

  useEffect(() => {
    if (typeof document === 'undefined') return;

    // 1. Update document title and purge any duplicate title elements
    document.title = fullTitle;
    const extraTitles = document.head.querySelectorAll('title');
    extraTitles.forEach((titleEl, idx) => {
      if (idx > 0) titleEl.remove();
    });

    // Helper to update exactly ONE meta tag in document.head and purge any duplicates (checking both name and property)
    const setMetaTag = (attrName: 'name' | 'property', attrVal: string, contentVal: string) => {
      // Find all matches across name, property, or case variations
      const allMatches = document.head.querySelectorAll(
        `meta[${attrName}="${attrVal}" i], meta[${attrName === 'name' ? 'property' : 'name'}="${attrVal}" i]`
      );
      let primaryMeta: HTMLMetaElement | null = null;
      
      allMatches.forEach((el, index) => {
        if (index === 0) {
          primaryMeta = el as HTMLMetaElement;
        } else {
          el.remove(); // Purge duplicate copies
        }
      });

      if (!primaryMeta) {
        primaryMeta = document.createElement('meta');
        document.head.appendChild(primaryMeta);
      }
      (primaryMeta as HTMLMetaElement).setAttribute(attrName, attrVal);
      (primaryMeta as HTMLMetaElement).setAttribute('content', contentVal || '');
    };

    // 2. Standard Meta Tags
    setMetaTag('name', 'description', metaDescription);
    if (metaKeywords) {
      setMetaTag('name', 'keywords', metaKeywords);
    } else {
      // Cleanly remove any keywords from previous pages if this page specifies none
      document.head.querySelectorAll('meta[name="keywords" i], meta[property="keywords" i]').forEach(el => el.remove());
    }
    setMetaTag('name', 'robots', robotsDirective);
    setMetaTag('name', 'googlebot', robotsDirective);
    setMetaTag('name', 'bingbot', robotsDirective);

    // 2b. Synchronize Favicon, Apple Touch Icon, and Google Search Result Multi-Size Icons in <head>
    if (iconSet.masterFavicon || iconSet.masterLogo) {
      const upsertIconLink = (rel: string, sizes: string | null, type: string | null, href: string) => {
        if (!href) return;
        const selector = sizes
          ? `link[rel="${rel}"][sizes="${sizes}"]`
          : `link[rel="${rel}"]:not([sizes])`;
        let linkEl = document.head.querySelector(selector) as HTMLLinkElement | null;
        if (!linkEl) {
          linkEl = document.createElement('link');
          linkEl.setAttribute('rel', rel);
          if (sizes) linkEl.setAttribute('sizes', sizes);
          if (type) linkEl.setAttribute('type', type);
          document.head.appendChild(linkEl);
        }
        linkEl.setAttribute('href', href);
      };
      upsertIconLink('icon', null, 'image/x-icon', iconSet.faviconIco);
      upsertIconLink('shortcut icon', null, null, iconSet.faviconIco);
      upsertIconLink('icon', '48x48', 'image/png', iconSet.favicon48);
      upsertIconLink('icon', '96x96', 'image/png', iconSet.favicon96);
      upsertIconLink('icon', '144x144', 'image/png', iconSet.favicon144);
      upsertIconLink('icon', '192x192', 'image/png', iconSet.pwa192);
      upsertIconLink('icon', '512x512', 'image/png', iconSet.pwa512);
      upsertIconLink('icon', '32x32', 'image/png', iconSet.favicon32);
      upsertIconLink('icon', '16x16', 'image/png', iconSet.favicon16);
      upsertIconLink('apple-touch-icon', '180x180', null, iconSet.appleTouch180);
    }

    if (!isIndexable) {
      setMetaTag('name', 'slurp', robotsDirective);
      setMetaTag('name', 'baiduspider', robotsDirective);
      setMetaTag('name', 'yandex', robotsDirective);
      setMetaTag('name', 'duckduckbot', robotsDirective);
      setMetaTag('name', 'gptbot', robotsDirective);
      setMetaTag('name', 'claudebot', robotsDirective);
      setMetaTag('name', 'perplexitybot', robotsDirective);
      setMetaTag('name', 'referrer', 'no-referrer');

      // Purge all SEO, Canonical, OpenGraph, Twitter, and Schema.org JSON-LD tags on gateway/noindex routes
      document.head.querySelectorAll('link[rel="canonical" i], link[rel="image_src" i]').forEach(el => el.remove());
      document.head.querySelectorAll('meta[property^="og:" i], meta[property^="article:" i], meta[name^="twitter:" i], meta[name="thumbnail" i], meta[itemprop]').forEach(el => el.remove());
      document.head.querySelectorAll('script[type="application/ld+json"]').forEach(el => el.remove());
      return;
    }

    // 3. Strict Single Canonical Tag Enforcement in <head>
    const allCanonicals = document.head.querySelectorAll('link[rel="canonical" i]');
    let headCanonical: HTMLLinkElement | null = null;
    allCanonicals.forEach((linkEl, index) => {
      if (index === 0) {
        headCanonical = linkEl as HTMLLinkElement;
      } else {
        linkEl.remove();
      }
    });

    if (headCanonical) {
      (headCanonical as HTMLLinkElement).setAttribute('href', canonicalUrl);
    } else {
      const link = document.createElement('link');
      link.setAttribute('rel', 'canonical');
      link.setAttribute('href', canonicalUrl);
      document.head.appendChild(link);
    }

    // 4. Strict Single Image Source Link Tag Enforcement
    const allImageLinks = document.head.querySelectorAll('link[rel="image_src" i]');
    let headImageLink: HTMLLinkElement | null = null;
    allImageLinks.forEach((linkEl, index) => {
      if (index === 0) {
        headImageLink = linkEl as HTMLLinkElement;
      } else {
        linkEl.remove();
      }
    });
    const isAppPage = currentPath.startsWith('/app/');
    const resolvedSiteName = siteTitle || '';

    if (squareThumbnail) {
      if (headImageLink) {
        (headImageLink as HTMLLinkElement).setAttribute('href', squareThumbnail);
      } else {
        const link = document.createElement('link');
        link.setAttribute('rel', 'image_src');
        link.setAttribute('href', squareThumbnail);
        document.head.appendChild(link);
      }
    } else if (headImageLink) {
      (headImageLink as HTMLLinkElement).remove();
    }

    // 5. OpenGraph Tags
    setMetaTag('property', 'og:type', type);
    setMetaTag('property', 'og:url', metaUrl);
    setMetaTag('property', 'og:title', fullTitle);
    setMetaTag('property', 'og:description', metaDescription);
    setMetaTag('property', 'og:image', metaImage);
    setMetaTag('property', 'og:image:secure_url', metaImage);
    setMetaTag('property', 'og:image:type', metaImage.includes('.jpg') || metaImage.includes('f_jpg') ? 'image/jpeg' : 'image/png');
    const ogWidth = metaImage.includes('w_600') ? '600' : '1200';
    const ogHeight = metaImage.includes('w_600') ? '600' : '630';
    setMetaTag('property', 'og:image:width', ogWidth);
    setMetaTag('property', 'og:image:height', ogHeight);
    if (cleanPathLower === '/') {
      setMetaTag('property', 'og:site_name', resolvedSiteName);
      setMetaTag('name', 'application-name', resolvedSiteName);
    } else {
      document.head.querySelectorAll('meta[property="og:site_name" i], meta[name="og:site_name" i], meta[name="application-name" i], meta[property="application-name" i]').forEach(el => el.remove());
    }
    setMetaTag('property', 'og:locale', 'en_IN');

    // 6. Article Metadata vs General Website Isolation
    if (type === 'article') {
      if (publishedTime) setMetaTag('property', 'article:published_time', publishedTime);
      if (modifiedTime) setMetaTag('property', 'article:modified_time', modifiedTime);
      if (author) setMetaTag('property', 'article:author', author);
      if (section) setMetaTag('property', 'article:section', section);
      
      // Purge old article:tag elements before re-injecting fresh ones
      document.head.querySelectorAll('meta[property="article:tag" i]').forEach(el => el.remove());
      if (tags && tags.length > 0) {
        tags.forEach(t => {
          if (t && t.trim()) {
            const m = document.createElement('meta');
            m.setAttribute('property', 'article:tag');
            m.setAttribute('content', t.trim());
            document.head.appendChild(m);
          }
        });
      }
    } else {
      // Purge all article:* metadata so article tags never leak into app or store catalog pages
      document.head.querySelectorAll('meta[property^="article:" i]').forEach(el => el.remove());
    }

    // 7. Twitter Card & Search Thumbnail Tags
    setMetaTag('name', 'twitter:card', 'summary_large_image');
    document.head.querySelectorAll('meta[name="twitter:site" i], meta[name="twitter:creator" i]').forEach(el => el.remove());
    setMetaTag('name', 'twitter:url', metaUrl);
    setMetaTag('name', 'twitter:title', fullTitle);
    setMetaTag('name', 'twitter:description', metaDescription);
    setMetaTag('name', 'twitter:image', metaImage);
    setMetaTag('name', 'thumbnail', squareThumbnail);
    setMetaTag('itemprop' as any, 'image', squareThumbnail);
    setMetaTag('itemprop' as any, 'thumbnailUrl', squareThumbnail);

    // 8. Schema.org JSON-LD Structured Data in <head>
    const schemasToInject: any[] = [];
    if (schema) {
      if (Array.isArray(schema)) schemasToInject.push(...schema);
      else schemasToInject.push(schema);
    }
    if (breadcrumbSchema) schemasToInject.push(breadcrumbSchema);
    if (videoSchema) schemasToInject.push(videoSchema);

    if (currentPath === '/' && !schema) {
      schemasToInject.push({
        "@context": "https://schema.org",
        "@type": "WebSite",
        "@id": `${origin}/#website`,
        "name": siteTitle,
        "url": origin,
        "description": metaDescription,
        "potentialAction": {
          "@type": "SearchAction",
          "target": `${origin}/?q={search_term_string}`,
          "query-input": "required name=search_term_string"
        },
        "publisher": {
          "@type": "Organization",
          "@id": `${origin}/#organization`,
          "name": siteTitle,
          "url": origin,
          "logo": {
            "@type": "ImageObject",
            "url": iconSet.searchLogo512,
            "width": 512,
            "height": 512
          }
        }
      });
      schemasToInject.push({
        "@context": "https://schema.org",
        "@type": "Organization",
        "@id": `${origin}/#organization`,
        "name": siteTitle,
        "url": origin,
        "image": iconSet.searchLogo512,
        "logo": {
          "@type": "ImageObject",
          "url": iconSet.searchLogo512,
          "width": 512,
          "height": 512
        },
        "description": metaDescription
      });
    }

    // Update schema scripts when new schemas are provided, or purge stale SPA route schemas
    if (schemasToInject.length > 0) {
      const existingServerSchemas = document.head.querySelectorAll('script[type="application/ld+json"][data-rh="true"]');
      const hasDynamicSchemas = document.head.querySelectorAll('script[type="application/ld+json"][data-dynamic-schema="true"]').length > 0;

      // Non-destructive initial hydration check:
      // If server pre-rendered schemas (data-rh="true") are present, no SPA transition has occurred yet,
      // and the server schema already contains the exact canonical URL for this route, keep the server's rich JSON-LD intact.
      let keepServerSchemas = false;
      if (existingServerSchemas.length > 0 && !hasDynamicSchemas) {
        const combinedServerJson = Array.from(existingServerSchemas).map(s => s.textContent || '').join(' ');
        if (combinedServerJson.includes(canonicalUrl)) {
          keepServerSchemas = true;
        }
      }

      if (!keepServerSchemas) {
        const allSchemaScripts = document.head.querySelectorAll('script[type="application/ld+json"]');
        allSchemaScripts.forEach((s) => s.remove());

        schemasToInject.forEach((s) => {
          const script = document.createElement('script');
          script.type = 'application/ld+json';
          script.setAttribute('data-dynamic-schema', 'true');
          script.textContent = JSON.stringify(s);
          document.head.appendChild(script);
        });
      }
    } else {
      // On SPA navigation to routes without explicit component-level schema props,
      // preserve SSR schemas only if they match the current canonicalUrl; remove stale route-specific schemas.
      const allSchemaScripts = document.head.querySelectorAll('script[type="application/ld+json"]');
      allSchemaScripts.forEach((s) => {
        const text = s.textContent || '';
        const isServerSchemaForCurrentRoute = s.hasAttribute('data-rh') && text.includes(canonicalUrl);
        if (!isServerSchemaForCurrentRoute) {
          s.remove();
        }
      });
    }
  }, [
    fullTitle, 
    metaDescription, 
    metaKeywords, 
    robotsDirective, 
    canonicalUrl, 
    metaUrl, 
    type, 
    publishedTime, 
    modifiedTime, 
    author, 
    section, 
    tags, 
    metaImage, 
    siteTitle, 
    schema, 
    breadcrumbSchema, 
    videoSchema, 
    currentPath, 
    origin
  ]);

  return null;
};

export default Meta;
