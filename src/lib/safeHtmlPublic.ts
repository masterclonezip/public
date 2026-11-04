import DOMPurify from 'dompurify';

function sanitizeScopedStyleContent(css: string): string {
  if (!css || typeof css !== 'string') return '';
  return css
    .replace(/<\/style/gi, '')
    .replace(/@import\b[^;]*;?/gi, '')
    .replace(/expression\s*\([^)]*\)/gi, '')
    .replace(/javascript\s*:/gi, 'blocked:')
    .replace(/vbscript\s*:/gi, 'blocked:')
    .replace(/-moz-binding\s*:[^;\}]+/gi, '')
    // Prevent embedded global html/body selectors from overriding site theme background
    .replace(/(^|\}|\s)(html|body)\s*\{[^}]*\}/gi, '$1');
}

function normalizeEmbeddedHtmlHygiene(html: string): string {
  if (!html || typeof html !== 'string') return '';
  return html
    // Sanitize dangerous tokens inside inline style="..." while preserving layout/visual styles
    .replace(/\sstyle\s*=\s*(["'])([\s\S]*?)\1/gi, (_match, quote, styleContent) => {
      const cleanStyle = String(styleContent)
        .replace(/expression\s*\([^)]*\)/gi, '')
        .replace(/javascript\s*:/gi, '')
        .replace(/vbscript\s*:/gi, '')
        .replace(/position\s*:\s*fixed/gi, 'position:relative')
        .trim();
      return cleanStyle ? ` style=${quote}${cleanStyle}${quote}` : '';
    })
    .replace(/<\/?font\b[^>]*>/gi, '')
    // Convert any embedded <h1> to <h2> for strict single-H1 SEO compliance
    .replace(/<h1(\b[^>]*)?>/gi, '<h2$1>')
    .replace(/<\/h1>/gi, '</h2>')
    // Automatically optimize embedded Cloudinary images inside rich HTML content
    .replace(
      /(<img\b[^>]*src=["'])(https?:\/\/res\.cloudinary\.com\/[^"'\s]+\/image\/upload\/)(?!f_auto)([^"']+)(["'][^>]*>)/gi,
      '$1$2f_auto,q_auto,w_800/$3$4'
    )
    // Ensure embedded images have lazy loading and async decoding if not explicitly set
    .replace(/<img\b([^>]*)>/gi, (match, attrs) => {
      let updatedAttrs = String(attrs || '');
      if (!/\bloading\s*=/i.test(updatedAttrs)) {
        updatedAttrs += ' loading="lazy"';
      }
      if (!/\bdecoding\s*=/i.test(updatedAttrs)) {
        updatedAttrs += ' decoding="async"';
      }
      return `<img${updatedAttrs}>`;
    })
    // Normalize internal route links to clean root-relative paths and ensure external links open safely in a new tab
    .replace(/<a\b([^>]*)>/gi, (match, attrs) => {
      const attrStr = String(attrs || '');
      const hrefMatch = attrStr.match(/\bhref\s*=\s*(["'])(.*?)\1/i);
      if (!hrefMatch) return match;
      const quote = hrefMatch[1];
      const href = hrefMatch[2].trim();

      // Check if an absolute URL points to one of our internal platform routes
      const internalPathMatch = href.match(
        /^https?:\/\/(?:www\.)?[a-z0-9.-]+\/(app|news|category|categories|new-apps|videos|developers|about|contact|privacy|terms|disclaimer|ethics|notice|responsibility|report-removal|faq|safety)(\/[^\s"'?#]*)?(\?[^\s"'#]*)?(#[^\s"']*)?$/i
      );

      if (internalPathMatch) {
        const rawPath = `/${internalPathMatch[1]}${internalPathMatch[2] || ''}`.replace(/\/+$/, '') || '/';
        const cleanInternalHref = `${rawPath}${internalPathMatch[3] || ''}${internalPathMatch[4] || ''}`;
        const newAttrs = attrStr
          .replace(/\bhref\s*=\s*(["'])(.*?)\1/i, `href=${quote}${cleanInternalHref}${quote}`)
          .replace(/\s*\btarget\s*=\s*(["'])_blank\1/gi, '');
        return `<a${newAttrs}>`;
      }

      if (href.startsWith('/') && !href.startsWith('//')) {
        const cleanRelHref = href.length > 1 ? href.replace(/\/+(?=[?#]|$)/, '') : href;
        const newAttrs = attrStr
          .replace(/\bhref\s*=\s*(["'])(.*?)\1/i, `href=${quote}${cleanRelHref}${quote}`)
          .replace(/\s*\btarget\s*=\s*(["'])_blank\1/gi, '');
        return `<a${newAttrs}>`;
      }

      if (/^https?:\/\//i.test(href)) {
        let newAttrs = attrStr;
        if (!/\btarget\s*=/i.test(newAttrs)) {
          newAttrs += ' target="_blank"';
        }
        if (!/\brel\s*=/i.test(newAttrs)) {
          newAttrs += ' rel="noopener"';
        }
        return `<a${newAttrs}>`;
      }
      return match;
    });
}

function serverSanitize(html: string): string {
  if (!html || typeof html !== 'string') return '';
  return normalizeEmbeddedHtmlHygiene(html)
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b([^>]*)>([\s\S]*?)<\/style>/gi, (_m, _attrs, css) => {
      const safeCss = sanitizeScopedStyleContent(css);
      return safeCss ? `<style>${safeCss}</style>` : '';
    })
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
    .replace(/<applet\b[^<]*(?:(?!<\/applet>)<[^<]*)*<\/applet>/gi, '')
    .replace(/<form\b[^<]*(?:(?!<\/form>)<[^<]*)*<\/form>/gi, '')
    .replace(/\son\w+\s*=\s*(["'][^"']*["']|[^\s>]+)/gi, '')
    .replace(/javascript:/gi, 'blocked-scheme:')
    .replace(/vbscript:/gi, 'blocked-scheme:')
    .replace(/data:\s*text\/html/gi, 'blocked-data:');
}

const STRUCTURE_CACHE = new Map<string, string>();
const SAFE_HTML_CACHE = new Map<string, string>();
const MAX_HTML_CACHE_SIZE = 250;

export function structureHtmlFragment(rawHtml: string): string {
  if (!rawHtml || typeof rawHtml !== 'string') return '';
  const cached = STRUCTURE_CACHE.get(rawHtml);
  if (cached !== undefined) return cached;

  let str = rawHtml.trim();

  // Extract any <style> blocks inside <head> before stripping <head> wrapper
  const extractedHeadStyles: string[] = [];
  str = str.replace(/<head\b[^>]*>([\s\S]*?)<\/head>/gi, (_match, headInner) => {
    String(headInner || '').replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gi, (_sm, cssContent) => {
      const cleaned = sanitizeScopedStyleContent(cssContent);
      if (cleaned.trim()) extractedHeadStyles.push(`<style>${cleaned}</style>`);
      return '';
    });
    return '';
  });

  // 1. Strip document wrappers while preserving SVGs, links, images, and safe <style> blocks
  str = str
    .replace(/<!DOCTYPE[^>]*>/gi, '')
    .replace(/<\/?(html|head|body)[^>]*>/gi, '')
    .replace(/<title>[^<]*<\/title>/gi, '')
    .replace(/<(meta|link)\b[^>]*>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gi, (_m, cssContent) => {
      const cleaned = sanitizeScopedStyleContent(cssContent);
      return cleaned.trim() ? `<style>${cleaned}</style>` : '';
    })
    .replace(/<div\b[^>]*class=["'][^"']*rd-news-meta[^"']*["'][^>]*>[\s\S]*?<\/div>/gi, '')
    .trim();

  if (extractedHeadStyles.length > 0) {
    str = `${extractedHeadStyles.join('\n')}\n${str}`;
  }

  // 2. Enforce content hygiene: demote embedded <h1> to <h2>, sanitize inline styles, optimize Cloudinary images & external links
  str = normalizeEmbeddedHtmlHygiene(str);

  // 3. Convert markdown headers if present at line start
  str = str
    .replace(/(?:^|\n)\s*####\s+(.*?)(?=\n|<|$)/gi, '\n<h4>$1</h4>')
    .replace(/(?:^|\n)\s*###\s+(.*?)(?=\n|<|$)/gi, '\n<h3>$1</h3>')
    .replace(/(?:^|\n)\s*##\s+(.*?)(?=\n|<|$)/gi, '\n<h2>$1</h2>')
    .replace(/(?:^|\n)\s*#\s+(.*?)(?=\n|<|$)/gi, '\n<h2>$1</h2>');

  // If input ALREADY has structured HTML tags (including svg, a, img, div, section, table, style, details, etc.)
  const hasStructuredTags = /<(p|h[1-6]|ul|ol|li|div|section|article|header|footer|aside|main|nav|table|thead|tbody|tfoot|tr|td|th|figure|figcaption|blockquote|details|summary|dl|dt|dd|svg|img|picture|video|audio|a|style|hr|pre|code|callout|span)\b/i.test(str);

  if (hasStructuredTags) {
    let clean = str;

    // Remove any <p> that directly wraps block elements
    clean = clean
      .replace(/<p\b[^>]*>\s*(<(?:ul|ol|h[23456]|div|section|article|table|figure|blockquote|details)[^>]*>)/gi, '$1')
      .replace(/(<\/(?:ul|ol|h[23456]|div|section|article|table|figure|blockquote|details)>)\s*<\/p>/gi, '$1');

    // Clean up strictly empty text tags (that do not contain svg/img/br/hr)
    clean = clean
      .replace(/<p\b[^>]*>\s*<\/p>/gi, '')
      .replace(/<h[23456]\b[^>]*>\s*<\/h[23456]>/gi, '')
      .replace(/<ul\b[^>]*>\s*<\/ul>/gi, '')
      .replace(/<ol\b[^>]*>\s*<\/ol>/gi, '');

    const finalClean = clean.trim();
    if (STRUCTURE_CACHE.size >= MAX_HTML_CACHE_SIZE) STRUCTURE_CACHE.clear();
    STRUCTURE_CACHE.set(rawHtml, finalClean);
    return finalClean;
  }

  // Otherwise, if raw text/markdown without HTML structure, build paragraphs & lists cleanly
  str = str.replace(/<br\s*\/?>/gi, '\n');

  const rawLines = str.split(/\n+/).map(l => l.trim()).filter(Boolean);
  if (rawLines.length === 0) return '';

  const output: string[] = [];
  let currentList: string[] = [];
  let hasH2 = false;

  const flushList = () => {
    if (currentList.length > 0) {
      output.push(`<ul>\n${currentList.join('\n')}\n</ul>`);
      currentList = [];
    }
  };

  for (let i = 0; i < rawLines.length; i++) {
    let line = rawLines[i];

    // Check if line is already an HTML tag or starts with <
    if (/^<(h[23456]|p|ul|ol|li)\b[^>]*>[\s\S]*<\/(h[23456]|p|ul|ol|li)>$/i.test(line) || /^<\/?(ul|ol|li|h[23456]|p|div)\b/i.test(line)) {
      flushList();
      if (/^<h2/i.test(line)) hasH2 = true;
      output.push(line);
      continue;
    }

    // Strip outer p tag if present
    line = line.replace(/^<p\b[^>]*>/i, '').replace(/<\/p>$/i, '').trim();
    if (!line) continue;

    // Check Major Section Heading
    const isPartHeading = /^(?:<strong>)?\s*(Part\s+\d+:?|Section\s+\d+:?|Chapter\s+\d+:?|Overview|Key Features|Core Mechanics|User Experience|Technical Architecture|Monetization|Data Safety|Conclusion|Verdict|FAQ|Frequently Asked Questions)/i.test(line);

    if (isPartHeading) {
      flushList();
      hasH2 = true;
      let title = line.replace(/<\/?strong>/gi, '').replace(/<\/?b>/gi, '').trim();
      title = title.replace(/^[:\s-]+/, '').trim();
      output.push(`<h2>${title}</h2>`);
      continue;
    }

    // Check Bullet Item
    const isExplicitBullet = /^[-*•]\s*/.test(line);
    const isFeatureTopicBullet =
      /^<strong>([A-Z0-9][A-Za-z0-9\s&—–-]{2,50}):<\/strong>\s+/.test(line) ||
      (/^([A-Z0-9][A-Za-z0-9\s&—–-]{2,50}):\s+[A-Z]/.test(line) && line.length > 35 && !/[.!?]$/.test(line.split(':')[0]));

    if (isExplicitBullet || isFeatureTopicBullet) {
      let itemText = line.replace(/^[-*•]\s*/, '');
      if (!itemText.includes('<strong>') && !itemText.includes('<b>') && /^([A-Z0-9][A-Za-z0-9\s&—–-]{2,50}):\s+/.test(itemText)) {
        itemText = itemText.replace(/^([A-Z0-9][A-Za-z0-9\s&—–-]{2,50}):\s+/, '<strong>$1:</strong> ');
      }
      currentList.push(`  <li>${itemText}</li>`);
      continue;
    }

    // Check Sub-heading (H3): short text (<75 chars), no ending punctuation, doesn't contain HTML tags except strong
    const isSubHead = line.length < 75 && !/[.!?:;]$/.test(line) && !line.startsWith('<ul') && !line.startsWith('<ol') && !line.startsWith('<li');
    if (isSubHead) {
      flushList();
      const subTitle = line.replace(/<\/?strong>/gi, '').replace(/<\/?b>/gi, '').trim();
      if (!hasH2) {
        hasH2 = true;
        output.push(`<h2>${subTitle}</h2>`);
      } else {
        output.push(`<h3>${subTitle}</h3>`);
      }
      continue;
    }

    // Regular paragraph
    flushList();
    let pText = line;
    if (!pText.includes('<strong>') && !pText.includes('<b>') && /^([A-Z0-9][A-Za-z0-9\s&—–-]{2,50}):\s+/.test(pText)) {
      pText = pText.replace(/^([A-Z0-9][A-Za-z0-9\s&—–-]{2,50}):\s+/, '<strong>$1:</strong> ');
    }
    output.push(`<p>${pText}</p>`);
  }

  flushList();

  let result = output.join('\n\n');

  // Clean empty tags
  result = result
    .replace(/<p\b[^>]*>\s*<\/p>/gi, '')
    .replace(/<h[23456]\b[^>]*>\s*<\/h[23456]>/gi, '')
    .replace(/<ul\b[^>]*>\s*<\/ul>/gi, '');

  const finalResult = result.trim();
  if (STRUCTURE_CACHE.size >= MAX_HTML_CACHE_SIZE) STRUCTURE_CACHE.clear();
  STRUCTURE_CACHE.set(rawHtml, finalResult);
  return finalResult;
}

export function enhanceAndCleanHtml(rawHtml: string): string {
  if (!rawHtml || typeof rawHtml !== 'string') return rawHtml || '';
  return structureHtmlFragment(rawHtml);
}

const DOMPURIFY_OPTIONS = {
  FORCE_BODY: true,
  ALLOW_DATA_ATTR: true,
  ADD_TAGS: [
    'style', 'svg', 'path', 'circle', 'rect', 'line', 'polyline', 'polygon',
    'g', 'defs', 'linearGradient', 'radialGradient', 'stop', 'use', 'symbol',
    'clipPath', 'mask', 'pattern', 'text', 'tspan', 'desc', 'title',
    'figure', 'figcaption', 'details', 'summary', 'mark', 'kbd', 'sub', 'sup',
    'hr', 'br', 'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
    'caption', 'colgroup', 'col', 'img', 'picture', 'source', 'video', 'audio',
    'section', 'article', 'header', 'footer', 'aside', 'nav', 'main', 'callout'
  ],
  ADD_ATTR: [
    'target', 'rel', 'data-discover', 'style', 'class', 'id', 'title', 'alt',
    'href', 'src', 'srcset', 'sizes', 'width', 'height', 'loading', 'decoding',
    'fetchpriority', 'referrerpolicy', 'open', 'colspan', 'rowspan', 'scope',
    'role', 'aria-label', 'aria-hidden', 'aria-expanded', 'aria-labelledby',
    'viewBox', 'viewbox', 'xmlns', 'xmlns:xlink', 'xlink:href', 'preserveAspectRatio',
    'fill', 'fill-rule', 'fill-opacity', 'stroke', 'stroke-width', 'stroke-linecap',
    'stroke-linejoin', 'stroke-dasharray', 'stroke-dashoffset', 'stroke-miterlimit',
    'stroke-opacity', 'd', 'cx', 'cy', 'r', 'rx', 'ry', 'x', 'y', 'x1', 'y1',
    'x2', 'y2', 'points', 'transform', 'opacity', 'clip-path', 'clip-rule',
    'mask', 'filter', 'offset', 'stop-color', 'stop-opacity', 'gradientUnits',
    'gradientTransform', 'patternUnits', 'patternTransform', 'text-anchor',
    'dominant-baseline', 'font-family', 'font-size', 'font-weight', 'letter-spacing',
    'color', 'vector-effect'
  ]
};

export function safeHtml(val: any, fallback: string = ''): string {
  if (!val) return fallback;

  let rawStr = '';
  if (typeof val === 'string') {
    rawStr = val;
  } else if (typeof val === 'object' && 'stringValue' in val) {
    rawStr = val.stringValue || fallback;
  } else {
    rawStr = String(val);
  }

  if (!rawStr) return fallback;

  const cached = SAFE_HTML_CACHE.get(rawStr);
  if (cached !== undefined) return cached;

  const enhancedStr = enhanceAndCleanHtml(rawStr);

  let sanitized = '';
  try {
    if (typeof window !== 'undefined' && DOMPurify && typeof DOMPurify.sanitize === 'function') {
      sanitized = DOMPurify.sanitize(enhancedStr, DOMPURIFY_OPTIONS);
    } else {
      sanitized = serverSanitize(enhancedStr);
    }
  } catch (_err) {
    sanitized = serverSanitize(enhancedStr);
  }

  if (SAFE_HTML_CACHE.size >= MAX_HTML_CACHE_SIZE) SAFE_HTML_CACHE.clear();
  SAFE_HTML_CACHE.set(rawStr, sanitized);
  return sanitized;
}



