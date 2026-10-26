import React from 'react';
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
  if (!faqs || !Array.isArray(faqs) || faqs.length === 0) return null;

  const validFaqs = faqs.filter(f => f && f.question && f.answer);
  if (validFaqs.length === 0) return null;

  return (
    <section aria-labelledby="faq-heading" className="mb-8 sm:mb-12 px-1 sm:px-4 md:px-6">
      <div className="py-8 border-t border-black/5 dark:border-white/5">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <HelpCircle className="w-5 h-5" />
            </div>
            <h2 id="faq-heading" className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
              Frequently Asked Questions
            </h2>
          </div>
          <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 bg-black/5 dark:bg-white/5 px-2.5 py-1 rounded-full">
            {validFaqs.length} FAQs
          </span>
        </div>

        {/* Semantic HTML5 Accordion List (Zero JavaScript execution requirement for SEO) */}
        <div className="space-y-3 sm:space-y-4">
          {validFaqs.map((faq, idx) => (
            <details
              key={`faq-app-${idx}`}
              className="group rounded-xl sm:rounded-2xl border transition-colors duration-200 overflow-hidden bg-slate-50/70 dark:bg-zinc-900/60 border-black/5 dark:border-white/5 open:bg-slate-50 open:dark:bg-zinc-900/90 open:border-blue-200 open:dark:border-blue-900/40 shadow-xs"
              open
            >
              <summary className="list-none [&::-webkit-details-marker]:hidden w-full text-left p-4 sm:p-5 flex items-center justify-between gap-4 cursor-pointer focus:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500 select-none">
                <h3 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-start gap-3">
                  <span className="text-blue-600 dark:text-blue-400 font-extrabold shrink-0 select-none">Q.</span>
                  <span className="leading-snug">{cleanFaqQuestion(faq.question)}</span>
                </h3>
                <div className="p-1 rounded-lg transition-transform duration-200 shrink-0 text-zinc-400 dark:text-zinc-500 group-open:rotate-180 group-open:text-blue-600 group-open:dark:text-blue-400 group-open:bg-blue-50 group-open:dark:bg-blue-900/30">
                  <ChevronDown className="w-5 h-5" />
                </div>
              </summary>

              <div className="px-4 sm:px-5 pb-5 pt-1 border-t border-black/5 dark:border-white/5 text-sm sm:text-base text-zinc-700 dark:text-zinc-300 leading-relaxed">
                <div className="pl-6 sm:pl-7 pt-2">
                  <div
                    className="prose prose-zinc dark:prose-invert prose-sm sm:prose-base max-w-none w-full break-words overflow-wrap-anywhere whitespace-normal"
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
