import React from 'react';
import { HelpCircle, ChevronDown } from 'lucide-react';
import { safeHtml } from '../../lib/safeHtmlPublic';
import { cleanFaqQuestion } from '../../lib/seoUtils';

interface WebsiteFaq {
  question: string;
  answer: any;
}

interface HomeFaqSectionProps {
  faqs?: WebsiteFaq[];
  searchTerm: string;
}

export default function HomeFaqSection({ faqs, searchTerm }: HomeFaqSectionProps) {
  if (searchTerm || !faqs || faqs.length === 0) return null;

  return (
    <section 
      aria-labelledby="home-faq-heading" 
      className="mt-10 sm:mt-14 mb-8 px-2 max-w-5xl mx-auto w-full select-none"
    >
      <div className="bg-zinc-50/80 dark:bg-[#080c18]/80 border border-zinc-200/80 dark:border-white/[0.08] rounded-2xl sm:rounded-3xl p-4 sm:p-7 shadow-xs backdrop-blur-xs">
        
        {/* Section Header */}
        <div className="flex items-center justify-between mb-5 sm:mb-7 pb-3.5 border-b border-zinc-200/80 dark:border-white/[0.08]">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-blue-600 dark:text-cyan-400 flex items-center justify-center shrink-0">
              <HelpCircle className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h2 id="home-faq-heading" className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white tracking-tight">
                Frequently Asked Questions
              </h2>
            </div>
          </div>
          <span className="text-[11px] sm:text-xs font-semibold text-zinc-500 dark:text-zinc-400 bg-zinc-200/70 dark:bg-white/[0.06] px-2.5 py-1 rounded-full">
            {faqs.length} FAQs
          </span>
        </div>
        
        {/* Semantic Crawler-Ready HTML5 Accordion List */}
        <div className="space-y-2.5 sm:space-y-3">
          {faqs.map((faq, index) => (
            <details 
              key={`faq-home-${index}`}
              itemScope
              itemProp="mainEntity"
              itemType="https://schema.org/Question"
              className="group rounded-xl sm:rounded-2xl border border-zinc-200/90 dark:border-white/[0.07] bg-white dark:bg-[#0c101d] hover:border-blue-500/30 dark:hover:border-cyan-500/30 transition-all duration-200 overflow-hidden shadow-xs"
            >
              {/* Question Summary Header */}
              <summary className="list-none [&::-webkit-details-marker]:hidden flex items-center justify-between gap-3 p-3.5 sm:p-4 text-left cursor-pointer focus:outline-hidden select-none group-open:bg-zinc-50/50 dark:group-open:bg-white/[0.02]">
                <span className="flex items-center gap-2.5 min-w-0 pr-1">
                  <span className="w-5 h-5 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-cyan-400 text-[11px] font-black flex items-center justify-center shrink-0">
                    Q
                  </span>
                  <span itemProp="name" className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-100 leading-snug">
                    {cleanFaqQuestion(faq.question)}
                  </span>
                </span>

                <div className="w-6 h-6 rounded-full bg-zinc-100 dark:bg-white/[0.06] text-zinc-500 dark:text-zinc-400 flex items-center justify-center shrink-0 group-open:rotate-180 group-open:bg-blue-50 dark:group-open:bg-cyan-500/20 group-open:text-blue-600 dark:group-open:text-cyan-400 transition-transform duration-200">
                  <ChevronDown className="w-3.5 h-3.5" />
                </div>
              </summary>

              {/* Crawlable Answer Body (Directly Present in Raw DOM for Search Crawlers) */}
              <div 
                itemScope 
                itemProp="acceptedAnswer" 
                itemType="https://schema.org/Answer"
                className="px-4 pb-4 pt-2 border-t border-zinc-100 dark:border-white/[0.05] text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed bg-zinc-50/30 dark:bg-black/10"
              >
                <div 
                  itemProp="text"
                  className="prose prose-zinc dark:prose-invert prose-xs sm:prose-sm max-w-none w-full break-words leading-relaxed pl-7"
                  dangerouslySetInnerHTML={{ __html: safeHtml(faq.answer) }}
                />
              </div>
            </details>
          ))}
        </div>

      </div>
    </section>
  );
}
