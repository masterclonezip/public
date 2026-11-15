import React from 'react';
import { useNavigate } from 'react-router-dom';
import { HelpCircle, ChevronDown } from 'lucide-react';
import { safeHtml } from '../../lib/safeHtmlPublic';
import { cleanFaqQuestion } from '../../lib/seoUtils';

interface Faq {
  question: string;
  answer: any;
}

interface AppFaqSectionProps {
  faqs?: Faq[];
}

/**
 * Industry-standard semantic HTML5 FAQ Accordion.
 * Uses native <details> and <summary> tags with pure CSS toggle.
 * Guarantees 100% of questions and answers are rendered in the raw DOM immediately,
 * allowing Googlebot, Bingbot, and AI crawlers to index FAQs without relying on heavy JavaScript execution.
 */
export default function AppFaqSection({ faqs }: AppFaqSectionProps) {
  const navigate = useNavigate();

  if (!faqs || !Array.isArray(faqs) || faqs.length === 0) return null;

  const validFaqs = faqs.filter(f => f && f.question && f.answer);
  if (validFaqs.length === 0) return null;

  const handleFaqClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = (e.target as HTMLElement).closest('a');
    if (!target) return;
    const href = target.getAttribute('href');
    if (!href) return;
    if (href.startsWith('/') && !href.startsWith('//')) {
      e.preventDefault();
      navigate(href);
    } else if (typeof window !== 'undefined' && href.startsWith(window.location.origin)) {
      try {
        const url = new URL(href);
        e.preventDefault();
        navigate(url.pathname + url.search + url.hash);
      } catch (_err) {}
    }
  };

  return (
    <section aria-labelledby="faq-heading" className="mb-6 sm:mb-10 px-0 sm:px-4 md:px-6">
      <div className="py-5 sm:py-7 border-t border-black/5 dark:border-white/5">
        <div className="flex items-center justify-between mb-4 sm:mb-5">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <HelpCircle className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <h2 id="faq-heading" className="text-lg sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
              Frequently Asked Questions
            </h2>
          </div>
          <span className="text-[11px] sm:text-xs font-semibold text-zinc-500 dark:text-zinc-400 bg-black/5 dark:bg-white/5 px-2.5 py-0.5 rounded-full shrink-0">
            {validFaqs.length} FAQs
          </span>
        </div>

        {/* Semantic HTML5 Accordion List (Zero JavaScript execution requirement for SEO) */}
        <div onClick={handleFaqClick} className="space-y-2.5 sm:space-y-3.5">
          {validFaqs.map((faq, idx) => (
            <details
              key={`faq-app-${idx}`}
              className="group rounded-xl sm:rounded-2xl border transition-colors duration-200 overflow-hidden bg-slate-50/70 dark:bg-zinc-900/60 border-black/5 dark:border-white/5 open:bg-slate-50 open:dark:bg-zinc-900/90 open:border-blue-200 open:dark:border-blue-900/40 shadow-xs"
              open
            >
              <summary className="list-none [&::-webkit-details-marker]:hidden w-full min-h-[46px] text-left p-3.5 sm:p-4 flex items-center justify-between gap-3 cursor-pointer focus:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500 select-none">
                <h3 className="text-[14px] sm:text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-start gap-2.5">
                  <span className="text-blue-600 dark:text-blue-400 font-extrabold shrink-0 select-none">Q.</span>
                  <span className="leading-snug">{cleanFaqQuestion(faq.question)}</span>
                </h3>
                <div className="p-1 rounded-lg transition-transform duration-200 shrink-0 text-zinc-400 dark:text-zinc-500 group-open:rotate-180 group-open:text-blue-600 group-open:dark:text-blue-400 group-open:bg-blue-50 group-open:dark:bg-blue-900/30">
                  <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
              </summary>

              <div className="px-3.5 sm:px-4 pb-4 pt-1 border-t border-black/5 dark:border-white/5 text-[13.5px] sm:text-[15px] text-zinc-700 dark:text-zinc-300 leading-relaxed">
                <div className="pl-0 sm:pl-7 pt-2">
                  <div
                    className="rich-html-boundary prose prose-zinc dark:prose-invert prose-sm sm:prose-base max-w-none w-full break-words overflow-wrap-anywhere whitespace-normal text-[13.5px] sm:text-[15px]"
                    dangerouslySetInnerHTML={{ __html: safeHtml(faq.answer) }}
                  />
                </div>
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
