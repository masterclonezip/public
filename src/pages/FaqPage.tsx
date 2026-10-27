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
    <div className="max-w-[1000px] mx-auto px-4 sm:px-6 md:px-8 py-12 animate-fade-in pb-20 min-h-[70vh]">
      <Meta 
        title={pageTitle}
        description={pageDesc}
        canonical={`${origin}/faq`}
        schema={webPageSchema}
      />
      
      <div className="mb-10">
        <Link 
          to="/" 
          className="inline-flex items-center gap-1 text-sm font-medium text-zinc-500 hover:text-blue-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Home
        </Link>
      </div>

      <div className="animate-fade-in">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <HelpCircle className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100">
              Frequently Asked Questions
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              Everything you need to know about app downloads and verification.
            </p>
          </div>
        </div>

        <div className="py-6 border-t border-zinc-200 dark:border-zinc-800 space-y-4">
          {faqs.map((faq: any, idx: number) => (
            <details
              key={`faq-page-${idx}`}
              className="group rounded-2xl border transition-colors duration-200 overflow-hidden bg-slate-50/70 dark:bg-zinc-900/60 border-black/5 dark:border-white/5 open:bg-slate-50 open:dark:bg-zinc-900/90 open:border-blue-200 open:dark:border-blue-900/40 shadow-xs"
              open
            >
              <summary className="list-none [&::-webkit-details-marker]:hidden w-full text-left p-5 sm:p-6 flex items-center justify-between gap-4 cursor-pointer focus:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500 select-none">
                <h2 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-start gap-3">
                  <span className="text-blue-600 dark:text-blue-400 font-extrabold shrink-0 select-none">Q.</span>
                  <span className="leading-snug">{faq.question}</span>
                </h2>
                <div className="p-1 rounded-lg transition-transform duration-200 shrink-0 text-zinc-400 dark:text-zinc-500 group-open:rotate-180 group-open:text-blue-600 group-open:dark:text-blue-400 group-open:bg-blue-50 group-open:dark:bg-blue-900/30">
                  <ChevronDown className="w-5 h-5" />
                </div>
              </summary>

              <div className="px-5 sm:px-6 pb-6 pt-2 border-t border-black/5 dark:border-white/5 text-sm sm:text-base text-zinc-700 dark:text-zinc-300 leading-relaxed">
                <div className="pl-6 sm:pl-7">
                  <div
                    className="prose prose-zinc dark:prose-invert prose-sm sm:prose-base max-w-none w-full break-words whitespace-normal"
                    dangerouslySetInnerHTML={{ __html: safeHtml(faq.answer) }}
                  />
                </div>
              </div>
            </details>
          ))}
        </div>
      </div>
    </div>
  );
}
