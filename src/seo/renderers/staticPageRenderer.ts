import { getField, optimizeImageUrl } from '../utils';
import {
  DEFAULT_DISCLAIMER_HTML,
  DEFAULT_ETHICS_HTML,
  DEFAULT_PRIVACY_HTML,
  DEFAULT_TERMS_HTML,
  DEFAULT_RESPONSIBILITY_HTML,
  DEFAULT_REPORT_REMOVAL_HTML,
  DEFAULT_NOTICE_HTML,
  DEFAULT_ABOUT_HTML
} from '../../lib/defaultLegalContent';
import { escapeHtml, sanitizeHtml } from './common';

export function renderCategoriesList(categoriesList: Array<{ name: string; slug: string; count: number }>, settings: any): string {
  const siteTitle = getField(settings, 'site_title') || '';
  
  let catsHtml = '';
  categoriesList.forEach(cat => {
    catsHtml += `
      <a href="/category/${encodeURIComponent(cat.slug)}" class="p-6 bg-white dark:bg-zinc-900 border border-black/5 hover:border-blue-500/30 rounded-3xl transition text-left flex items-center justify-between group shadow-2xs">
        <div>
          <h2 class="font-bold text-lg text-zinc-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">${escapeHtml(cat.name)}</h2>
          <p class="text-xs text-zinc-500 dark:text-zinc-400 mt-1">${cat.count} Verified Application${cat.count === 1 ? '' : 's'}</p>
        </div>
        <span class="text-blue-600 dark:text-blue-400 font-bold text-sm group-hover:translate-x-1 transition-transform">Explore →</span>
      </a>
    `;
  });

  return `
    <div class="max-w-4xl mx-auto py-6 px-2 sm:px-4">
      <nav aria-label="Breadcrumb" class="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 mb-6 text-left">
        <a href="/" class="hover:text-blue-600">Home</a>
        <span>/</span>
        <span class="font-bold text-zinc-800 dark:text-zinc-200">Categories</span>
      </nav>
      <div class="text-center py-8 mb-6 bg-white dark:bg-zinc-900 rounded-[28px] border border-black/5 p-6 shadow-sm">
        <h1 class="text-3xl sm:text-4xl font-extrabold text-zinc-900 dark:text-white mb-2">Application Categories</h1>
        <p class="text-sm text-zinc-500 dark:text-zinc-400 max-w-2xl mx-auto">Browse apps by category${siteTitle ? ` on ${escapeHtml(siteTitle)}` : ''}.</p>
      </div>
      <div class="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
        ${catsHtml || '<p class="text-center text-zinc-400 py-10 col-span-full">No categories available.</p>'}
      </div>
    </div>
  `;
}

export function renderDevelopersList(developers: any[], settings: any): string {
  const siteTitle = getField(settings, 'site_title') || '';
  const devList = (Array.isArray(developers) && developers.length > 0)
    ? developers
    : (Array.isArray(settings?.developers) ? settings.developers : []);

  if (devList.length === 0) {
    return `
      <div class="animate-fade-in">
        <div class="min-h-screen pt-32 px-4 pb-20 flex flex-col items-center justify-center text-center">
          <div class="bg-white/50 dark:bg-zinc-900/50 border border-black/5 dark:border-white/5 p-12 rounded-[3rem] max-w-lg mx-auto shadow-2xl">
            <h1 class="text-3xl font-black mb-4 dark:text-white uppercase tracking-tight italic">Our Developers</h1>
            <p class="text-slate-600 dark:text-slate-400 font-medium">Information about our developers is not available at this moment. Please check back later.</p>
          </div>
        </div>
      </div>
    `;
  }

  let cards = '';
  devList.forEach(d => {
    const name = getField(d, 'name') || getField(d, 'title') || 'Developer';
    const logo = getField(d, 'image_url') || getField(d, 'logo_url') || getField(d, 'icon_url');
    const optimizedLogo = logo ? optimizeImageUrl(logo, 256) : `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`;
    const bio = getField(d, 'bio') || getField(d, 'description') || '';
    const role = getField(d, 'role') || 'Verified Developer';
    const github = getField(d, 'github') || '';
    const twitter = getField(d, 'twitter') || '';

    cards += `
      <div class="bg-white/70 dark:bg-zinc-900/70 border border-black/5 dark:border-white/5 rounded-[2rem] p-8 shadow-lg transition-all flex flex-col items-center text-center group animate-fade-in">
        <div class="w-32 h-32 rounded-full overflow-hidden mb-6 border-4 border-white dark:border-zinc-800 shadow-xl">
          <img src="${escapeHtml(optimizedLogo)}" alt="${escapeHtml(name)}" loading="lazy" decoding="async" width="128" height="128" class="w-full h-full object-cover" referrerpolicy="no-referrer"/>
        </div>
        <h3 class="text-2xl font-black text-zinc-900 dark:text-white mb-2 tracking-tight">${escapeHtml(name)}</h3>
        <div class="bg-pink-500/10 text-pink-600 dark:text-pink-400 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest mb-4">${escapeHtml(role)}</div>
        ${bio ? `<p class="text-slate-600 dark:text-slate-400 mb-8 flex-grow font-medium text-sm leading-relaxed">${escapeHtml(bio)}</p>` : ''}
        <div class="flex gap-4 mt-auto pt-6 border-t border-black/5 dark:border-white/5 w-full justify-center">
          ${github ? `<a href="${escapeHtml(github)}" target="_blank" rel="noopener noreferrer" class="p-3 bg-black/5 dark:bg-white/5 rounded-xl text-zinc-700 dark:text-zinc-300" aria-label="${escapeHtml(name)} GitHub Profile">GitHub</a>` : ''}
          ${twitter ? `<a href="${escapeHtml(twitter)}" target="_blank" rel="noopener noreferrer" class="p-3 bg-black/5 dark:bg-white/5 rounded-xl text-zinc-700 dark:text-zinc-300" aria-label="${escapeHtml(name)} Twitter Profile">Twitter</a>` : ''}
        </div>
      </div>
    `;
  });

  return `
    <div class="animate-fade-in">
      <div class="min-h-screen pt-32 px-4 pb-20">
        <div class="max-w-6xl mx-auto">
          <div class="text-center mb-16 animate-fade-in">
            <h1 class="text-4xl md:text-6xl font-black mb-6 bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-violet-500 dark:from-pink-400 dark:to-violet-400 tracking-tighter italic">Meet Our Team</h1>
            <p class="text-lg md:text-xl text-slate-600 dark:text-slate-400 font-medium max-w-2xl mx-auto">The creative minds and technical experts building our platform${siteTitle ? ` at ${escapeHtml(siteTitle)}` : ''}.</p>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">${cards}</div>
        </div>
      </div>
    </div>
  `;
}

function renderStandardLegalLayout(heading: string, statusLabel: string, statusValue: string, emailLabel: string, supportEmail: string, contentHtml: string): string {
  return `
    <div class="max-w-[1000px] mx-auto px-4 sm:px-6 md:px-8 py-12 animate-fade-in pb-20 min-h-[70vh] text-left">
      <div class="mb-10">
        <a href="/" class="inline-flex items-center gap-1 text-sm font-medium text-zinc-500 hover:text-blue-600 transition-colors">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 12H5M12 19l-7-7 7-7"></path></svg>
          Home
        </a>
      </div>
      <div class="animate-fade-in">
        <h1 class="text-3xl sm:text-5xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 mb-6 border-b border-zinc-200 dark:border-zinc-800 pb-4">${escapeHtml(heading)}</h1>
        <div class="flex flex-wrap gap-x-6 gap-y-2 text-sm text-zinc-500 dark:text-zinc-400 mb-10">
          <div><span class="font-semibold">${escapeHtml(statusLabel)}:</span> ${escapeHtml(statusValue)}</div>
          ${supportEmail ? `<div><span class="font-semibold">${escapeHtml(emailLabel)}:</span> ${escapeHtml(supportEmail)}</div>` : ''}
        </div>
        <div class="prose prose-zinc dark:prose-invert max-w-none text-zinc-700 dark:text-zinc-300 font-medium leading-relaxed">
          <div>${contentHtml}</div>
        </div>
      </div>
    </div>
  `;
}

export function renderAbout(settings: any): string {
  const content = sanitizeHtml(getField(settings, 'about_content') || DEFAULT_ABOUT_HTML);
  const email = getField(settings, 'support_email') || '';
  return renderStandardLegalLayout('About Us', 'Platform', 'Verifiable & Transparent', 'Inquiries', email, content);
}

export function renderContact(settings: any): string {
  const content = sanitizeHtml(getField(settings, 'contact_content') || '');
  const email = getField(settings, 'support_email', '');
  return `
    <div class="max-w-7xl mx-auto py-16 px-6 sm:px-10 animate-fade-in pb-20 min-h-[70vh] text-left">
      <div class="mb-10">
        <a href="/" class="inline-flex items-center gap-2 text-sm font-medium text-blue-500 hover:text-blue-600 transition-colors group">
          <div class="p-1.5 rounded-full bg-blue-50 dark:bg-blue-900/20">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 12H5M12 19l-7-7 7-7"></path></svg>
          </div>
          Home
        </a>
      </div>
      <div class="grid lg:grid-cols-12 gap-12 lg:gap-16 items-start">
        <div class="lg:col-span-12 xl:col-span-5 space-y-8">
          <div>
            <h1 class="text-4xl sm:text-5xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100 mb-6">Contact Us</h1>
            <div class="markdown-body text-lg text-zinc-600 dark:text-zinc-400 leading-relaxed font-medium">${content}</div>
          </div>
          <div class="space-y-6">
            <div class="flex items-start gap-4 p-6 bg-white dark:bg-zinc-900 rounded-[24px] border border-black/5 dark:border-white/5 shadow-sm">
              <div class="bg-blue-500/10 p-3 rounded-xl border border-blue-500/20">
                <svg class="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
              </div>
              <div>
                <h3 class="font-bold text-xs uppercase tracking-wider text-zinc-400 mb-1">Email</h3>
                <p class="text-zinc-900 dark:text-zinc-100 font-semibold text-base">${escapeHtml(email)}</p>
              </div>
            </div>
            <div class="flex items-start gap-4 p-6 bg-white dark:bg-zinc-900 rounded-[24px] border border-black/5 dark:border-white/5 shadow-sm">
              <div class="bg-pink-500/10 p-3 rounded-xl border border-pink-500/20">
                <svg class="w-6 h-6 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"></path></svg>
              </div>
              <div>
                <h3 class="font-bold text-xs uppercase tracking-wider text-zinc-400 mb-1">Live Chat</h3>
                <p class="text-zinc-900 dark:text-zinc-100 font-semibold text-base">Monday to Saturday, 10:00 AM - 3:00 PM (Instant reply in every section)</p>
              </div>
            </div>
            <div class="flex items-start gap-4 p-6 bg-white dark:bg-zinc-900 rounded-[24px] border border-black/5 dark:border-white/5 shadow-sm">
              <div class="bg-purple-500/10 p-3 rounded-xl border border-purple-500/20">
                <svg class="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
              </div>
              <div>
                <h3 class="font-bold text-xs uppercase tracking-wider text-zinc-400 mb-1">Office</h3>
                <p class="text-zinc-900 dark:text-zinc-100 font-semibold text-base">Plot No. 18, 4th Floor, Commercial Complex, Sector 12, Dwarka, New Delhi, Delhi 110075, India</p>
              </div>
            </div>
          </div>
        </div>
        <div class="lg:col-span-12 xl:col-span-7 bg-white dark:bg-zinc-900 p-8 sm:p-12 rounded-[32px] border border-black/5 dark:border-white/5 shadow-xl space-y-6">
          <div class="mb-2">
            <h2 class="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">Send us a message</h2>
            <p class="text-sm text-zinc-500 dark:text-zinc-400">Fill out the form below and our team will get back to you within 24 hours.</p>
          </div>
          <div class="grid sm:grid-cols-2 gap-6">
            <div class="space-y-2">
              <label class="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Your Name</label>
              <div class="w-full h-14 px-5 py-4 bg-zinc-50 dark:bg-zinc-800/60 border border-black/5 dark:border-white/5 rounded-2xl"></div>
            </div>
            <div class="space-y-2">
              <label class="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Email Address</label>
              <div class="w-full h-14 px-5 py-4 bg-zinc-50 dark:bg-zinc-800/60 border border-black/5 dark:border-white/5 rounded-2xl"></div>
            </div>
          </div>
          <div class="space-y-2">
            <label class="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Message</label>
            <div class="w-full h-36 px-5 py-4 bg-zinc-50 dark:bg-zinc-800/60 border border-black/5 dark:border-white/5 rounded-2xl"></div>
          </div>
          <div class="w-full h-14 bg-blue-600 text-white font-bold py-4 px-8 rounded-2xl flex items-center justify-center">Send Message</div>
        </div>
      </div>
    </div>
  `;
}

export function renderPrivacy(settings: any): string {
  const content = sanitizeHtml(getField(settings, 'privacy_content') || DEFAULT_PRIVACY_HTML);
  const email = getField(settings, 'support_email') || '';
  return renderStandardLegalLayout('Privacy Policy', 'Security Status', 'Secured & Active', 'Support Email', email, content);
}

export function renderReportRemoval(settings: any): string {
  const content = sanitizeHtml(getField(settings, 'report_removal_content') || DEFAULT_REPORT_REMOVAL_HTML);
  const email = getField(settings, 'support_email') || '';
  return renderStandardLegalLayout('Report & Removal Policy', 'DMCA & Takedowns', 'Active 24/7', 'Compliance Desk', email, content);
}

export function renderTerms(settings: any): string {
  const content = sanitizeHtml(getField(settings, 'terms_content') || DEFAULT_TERMS_HTML);
  const email = getField(settings, 'support_email') || '';
  return renderStandardLegalLayout('Terms & Conditions', 'Agreement Status', 'Active & Binding', 'Support Contact', email, content);
}

export function renderResponsibility(settings: any): string {
  const content = sanitizeHtml(getField(settings, 'responsibility_content') || DEFAULT_RESPONSIBILITY_HTML);
  const email = getField(settings, 'support_email') || '';
  return renderStandardLegalLayout('Platform Responsibility Clause', 'Safety & Compliance', 'Verified Policy', 'Helpdesk', email, content);
}

export function renderNotice(settings: any): string {
  const heading = getField(settings, 'important_notice_heading') || 'Important Notice';
  const content = sanitizeHtml(getField(settings, 'important_notice') || DEFAULT_NOTICE_HTML);
  const email = getField(settings, 'support_email') || '';
  return renderStandardLegalLayout(heading, 'Advisory Type', 'Official Platform Notice', 'Support Contact', email, content);
}

export function renderEthics(settings: any): string {
  const heading = getField(settings, 'ethics_heading') || 'Ethics & Safety';
  const content = sanitizeHtml(getField(settings, 'ethics_discrimination_text') || DEFAULT_ETHICS_HTML);
  const email = getField(settings, 'support_email') || '';
  return renderStandardLegalLayout(heading, 'Policy Status', 'Active & Enforced', 'Compliance Contact', email, content);
}

export function renderDisclaimer(settings: any): string {
  const heading = getField(settings, 'disclaimer_heading') || 'Disclaimer';
  const content = sanitizeHtml(getField(settings, 'disclaimer_text') || DEFAULT_DISCLAIMER_HTML);
  const email = getField(settings, 'support_email') || '';
  return renderStandardLegalLayout(heading, 'Notice Type', 'Liability Disclaimer', 'Support Desk', email, content);
}

export function render404(urlPath: string, settings: any): string {
  const siteTitle = getField(settings, 'site_title') || '';
  return `
    <div class="py-16 text-center max-w-2xl mx-auto px-4 min-h-[60vh]">
      <div class="inline-flex items-center justify-center w-20 h-20 bg-red-500/10 text-red-600 dark:text-red-400 rounded-3xl mb-6 font-extrabold text-3xl">404</div>
      <h1 class="text-4xl sm:text-5xl font-extrabold text-zinc-900 dark:text-white mb-4">404 - Page Not Found</h1>
      <h2 class="text-lg font-bold text-zinc-600 dark:text-zinc-400 mb-6">The requested resource could not be found${siteTitle ? ` on ${escapeHtml(siteTitle)}` : ''}</h2>
      <p class="text-sm text-zinc-500 dark:text-zinc-400 mb-8 leading-relaxed">
        The URL <code class="bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded text-red-500 font-mono text-sm">${escapeHtml(urlPath)}</code> does not match any application listing, news bulletin, or page.
      </p>
      <div class="flex flex-wrap items-center justify-center gap-4">
        <a href="/" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-8 rounded-2xl shadow-md transition">Return to Homepage</a>
        <a href="/news" class="bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white font-bold py-3.5 px-8 rounded-2xl transition">Latest News</a>
      </div>
    </div>
  `;
}

export function renderFaqPage(settings: any): string {
  const siteTitle = getField(settings, 'site_title') || '';
  const siteFaqs = Array.isArray(settings?.website_faqs) ? settings.website_faqs.filter((f: any) => f && f.question && f.answer) : [];
  return `
    <div class="max-w-[1000px] mx-auto px-4 sm:px-6 md:px-8 py-12 pb-20 min-h-[70vh] text-left">
      <div class="mb-6">
        <a href="/" class="inline-flex items-center gap-1.5 text-sm font-semibold text-zinc-500 hover:text-blue-600 transition-colors">← Home</a>
      </div>
      <h1 class="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100 mb-2">
        Frequently Asked Questions
      </h1>
      <p class="text-sm text-zinc-500 dark:text-zinc-400 mb-8">
        Everything you need to know about ${siteTitle ? `${escapeHtml(siteTitle)}, ` : ''}app downloads, verification, and safety.
      </p>
      <div class="space-y-4 border-t border-zinc-200 dark:border-zinc-800 pt-6">
        ${siteFaqs.map((faq: any) => `
          <details class="group rounded-2xl border border-black/5 dark:border-white/5 bg-zinc-50/80 dark:bg-zinc-800/50 p-5" open>
            <summary class="font-bold text-base text-zinc-900 dark:text-zinc-100 cursor-pointer list-none flex justify-between items-center gap-3">
              <span class="flex items-start gap-2">
                <span class="text-blue-500 font-extrabold select-none">Q.</span>
                <span>${escapeHtml(faq.question)}</span>
              </span>
              <span class="text-blue-500 font-bold select-none">+</span>
            </summary>
            <div class="mt-3 pt-3 border-t border-black/5 dark:border-white/5 text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed pl-5">
              ${sanitizeHtml(faq.answer)}
            </div>
          </details>
        `).join('')}
      </div>
    </div>
  `;
}
