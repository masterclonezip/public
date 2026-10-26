import DOMPurify from 'dompurify';

function serverSanitize(html: string): string {
  if (!html || typeof html !== 'string') return '';
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
    .replace(/on\w+\s*=\s*(["'][^"']*["']|[^\s>]+)/gi, '')
    .replace(/javascript:/gi, '');
}

export function structureHtmlFragment(rawHtml: string): string {
  if (!rawHtml || typeof rawHtml !== 'string') return '';
  let str = rawHtml.trim();

  // 1. Strip document wrappers if present
  str = str.replace(/<!DOCTYPE[^>]*>/gi, '')
           .replace(/<\/?(html|head|body)[^>]*>/gi, '')
           .replace(/<title>[^<]*<\/title>/gi, '')
           .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
           .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
           .trim();

  // 2. Convert <h1> tags to <h2>
  str = str.replace(/<h1([^>]*)>/gi, '<h2$1>').replace(/<\/h1>/gi, '</h2>');

  // 3. Convert markdown headers if present
  str = str.replace(/(?:^|\n)\s*####\s+(.*?)(?=\n|<|$)/gi, '\n<h3>$1</h3>')
           .replace(/(?:^|\n)\s*###\s+(.*?)(?=\n|<|$)/gi, '\n<h3>$1</h3>')
           .replace(/(?:^|\n)\s*##\s+(.*?)(?=\n|<|$)/gi, '\n<h2>$1</h2>')
           .replace(/(?:^|\n)\s*#\s+(.*?)(?=\n|<|$)/gi, '\n<h2>$1</h2>');

  // If input ALREADY has structured HTML block tags (p, h2, h3, ul, ol, li, div, section, article, table, figure, blockquote)
  const hasStructuredTags = /<(p|h[23456]|ul|ol|li|div|section|article|table|figure|blockquote)\b/i.test(str);

  if (hasStructuredTags) {
    let clean = str;

    // Remove any <p> that wraps block elements like <ul>, <ol>, <h2>, <h3>, <li>, <div>, <section>, <table>, <figure>, <blockquote>
    clean = clean.replace(/<p\b[^>]*>\s*(<(?:ul|ol|h[23456]|li|div|section|article|table|figure|blockquote)[^>]*>)/gi, '$1')
                 .replace(/(<\/(?:ul|ol|h[23456]|li|div|section|article|table|figure|blockquote)>)\s*<\/p>/gi, '$1');

    // Auto-bold Topic: inside <p> or <li> if not already bolded
    clean = clean.replace(/<(p|li)([^>]*)>\s*([A-Z0-9][A-Za-z0-9\s&—–-]{2,50}):\s+/g, (match, tag, attrs, title) => {
      if (title.toLowerCase().startsWith('http') || title.toLowerCase().startsWith('www')) return match;
      return `<${tag}${attrs}><strong>${title}:</strong> `;
    });

    // Ensure consecutive <h2> tags convert second to <h3>
    clean = clean.replace(/(<\/h2>\s*)<h2([^>]*)>(.*?)<\/h2>/gi, '$1<h3$2>$3</h3>');

    // Clean up empty tags like <p></p>, <h3></h3>, <h2></h2>, <ul></ul>
    clean = clean.replace(/<p\b[^>]*>\s*<\/p>/gi, '')
                 .replace(/<h[23456]\b[^>]*>\s*<\/h[23456]>/gi, '')
                 .replace(/<ul\b[^>]*>\s*<\/ul>/gi, '')
                 .replace(/<ol\b[^>]*>\s*<\/ol>/gi, '');

    return clean.trim();
  }

  // Otherwise, if raw text/markdown without HTML block structure, build paragraphs & lists cleanly
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
    if (/^<(h[23]|p|ul|ol|li)\b[^>]*>[\s\S]*<\/(h[23]|p|ul|ol|li)>$/i.test(line) || /^<\/?(ul|ol|li|h[23]|p|div)\b/i.test(line)) {
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
    const isFeatureTopicBullet = /^<strong>([A-Z0-9][A-Za-z0-9\s&—–-]{2,50}):<\/strong>\s+/.test(line) ||
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
      let subTitle = line.replace(/<\/?strong>/gi, '').replace(/<\/?b>/gi, '').trim();
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

  // Convert consecutive h2 tags to h3
  result = result.replace(/(<\/h2>\s*)<h2([^>]*)>(.*?)<\/h2>/gi, '$1<h3$2>$3</h3>');

  // Clean empty tags
  result = result.replace(/<p\b[^>]*>\s*<\/p>/gi, '')
                 .replace(/<h[23456]\b[^>]*>\s*<\/h[23456]>/gi, '')
                 .replace(/<ul\b[^>]*>\s*<\/ul>/gi, '');

  return result.trim();
}

export function enhanceAndCleanHtml(rawHtml: string): string {
  if (!rawHtml || typeof rawHtml !== 'string') return rawHtml || '';
  return structureHtmlFragment(rawHtml);
}

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

  const enhancedStr = enhanceAndCleanHtml(rawStr);

  try {
    if (typeof window !== 'undefined' && DOMPurify && typeof DOMPurify.sanitize === 'function') {
      return DOMPurify.sanitize(enhancedStr, { ADD_ATTR: ["target", "rel", "data-discover"] });
    }
    return serverSanitize(enhancedStr);
  } catch (err) {
    return serverSanitize(enhancedStr);
  }
}

