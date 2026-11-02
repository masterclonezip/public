import React, { useMemo } from 'react';
import { useData } from '../contexts/DataContextPublic';
import { Link } from 'react-router-dom';
import { ArrowLeft, HelpCircle, ChevronDown } from 'lucide-react';
import Meta from '../components/Meta';
import { safeHtml } from '../lib/safeHtmlPublic';

export default function FaqPage() {
  const { settings, fetchSettings } = useData();
  const siteTitle = settings?.site_title || '';
  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  React.useEffect(() => {
    if ((!settings?.website_faqs || settings.website_faqs.length === 0) && fetchSettings) {
      fetchSettings();
    }
  }, [settings?.website_faqs, fetchSettings]);

  const faqs = useMemo(() => {
    if (settings?.website_faqs && Array.isArray(settings.website_faqs) && settings.website_faqs.length > 0) {
      return settings.website_faqs.filter((f: any) => f && f.question && f.answer);
    }
    return [];
  }, [settings?.website_faqs]);

  const pageTitle = settings?.faq_meta_title || "Frequently Asked Questions";
  const pageDesc = settings?.faq_meta_description || "Everything you need to know about app verification and downloads.";
  const webPageSchema = useMemo(() => ({
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${origin}/faq#webpage`,
    "url": `${origin}/faq`,
    "name": pageTitle,
    "headline": pageTitle,
    "description": pageDesc,
    "inLanguage": "en"
  }), [origin, pageTitle, pageDesc]);

  return (
    <div className="w-full max-w-5xl mx-auto px-1 xs:px-2 sm:px-4 py-3 sm:py-6 animate-fade-in pb-16 min-h-[70vh] text-left">
      <Meta 
        title={pageTitle}
        description={pageDesc}
        canonical={`${origin}/faq`}
        schema={webPageSchema}
      />
      
      <div className="mb-3 sm:mb-5">
        <Link 
          to="/" 
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-zinc-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Home
        </Link>
      </div>

      <div className="animate-fade-in">
        <div className="flex items-center gap-3 pb-3 sm:pb-4 mb-4 sm:mb-6 border-b border-zinc-200/80 dark:border-zinc-800/80">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <HelpCircle className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <h1 className="text-xl xs:text-2xl sm:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100">
              Frequently Asked Questions
            </h1>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
              Everything you need to know about app downloads and verification.
            </p>
          </div>
        </div>

        <div className="space-y-3 sm:space-y-4">
          {faqs.map((faq: any, idx: number) => (
            <details
              key={`faq-page-${idx}`}
              className="group rounded-xl sm:rounded-2xl border transition-colors duration-200 overflow-hidden bg-transparent border-zinc-200/80 dark:border-zinc-800/80 open:border-blue-500/30 dark:open:border-blue-500/30"
              open
            >
              <summary className="list-none [&::-webkit-details-marker]:hidden w-full text-left p-3.5 sm:p-5 flex items-center justify-between gap-3 cursor-pointer focus:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500 select-none">
                <h2 className="text-sm sm:text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-start gap-2.5">
                  <span className="text-blue-600 dark:text-blue-400 font-extrabold shrink-0 select-none">Q.</span>
                  <span className="leading-snug">{faq.question}</span>
                </h2>
                <div className="p-1 rounded-lg transition-transform duration-200 shrink-0 text-zinc-400 dark:text-zinc-500 group-open:rotate-180 group-open:text-blue-600 group-open:dark:text-blue-400">
                  <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
              </summary>

              <div className="px-3.5 sm:px-5 pb-4 sm:pb-5 pt-2 border-t border-zinc-200/60 dark:border-zinc-800/60 text-sm sm:text-base text-zinc-700 dark:text-zinc-300 leading-relaxed">
                <div
                  className="rich-html-boundary open-page-body prose prose-zinc dark:prose-invert prose-sm sm:prose-base max-w-none w-full break-words whitespace-normal"
                  dangerouslySetInnerHTML={{ __html: safeHtml(faq.answer) }}
                />
              </div>
            </details>
          ))}
        </div>
      </div>
    </div>
  );
}
