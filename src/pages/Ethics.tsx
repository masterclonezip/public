import React, { useEffect } from 'react';
import { safeHtml } from '../lib/safeHtmlPublic';
import { useData } from '../contexts/DataContextPublic';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Meta from '../components/Meta';
import { DEFAULT_ETHICS_HTML } from '../lib/defaultLegalContent';

export default function Ethics() {
  const { settings: mockSettings, fetchSettings } = useData();
  const navigate = useNavigate();

  useEffect(() => {
    if (!mockSettings?.ethics_discrimination_text && fetchSettings) {
      fetchSettings();
    }
  }, [mockSettings?.ethics_discrimination_text, fetchSettings]);

  const handleHtmlClick = (e: React.MouseEvent<HTMLDivElement>) => {
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
    <div className="w-full max-w-5xl mx-auto px-1 xs:px-2 sm:px-4 py-3 sm:py-6 animate-fade-in pb-16 min-h-[70vh] text-left">
      <div className="mb-3 sm:mb-5">
        <Link 
          to="/" 
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-zinc-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Home
        </Link>
      </div>
      <Meta 
        title={mockSettings.ethics_meta_title || mockSettings.ethics_heading || 'Ethics & Safety'}
        description={mockSettings.ethics_meta_description || "Our commitment to ethics, safety, and transparent reviews."}
        canonical={(typeof window !== 'undefined' ? window.location.origin : '') + "/ethics"}
      />

      <div className="animate-fade-in">
        <h1 className="text-xl xs:text-2xl sm:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100 mb-2 sm:mb-3">
          {mockSettings.ethics_heading || 'Ethics & Safety'}
        </h1>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 pb-3 sm:pb-4 mb-4 sm:mb-6 border-b border-zinc-200/80 dark:border-zinc-800/80">
          <div><span className="font-semibold text-zinc-700 dark:text-zinc-300">Policy Status:</span> Active & Enforced</div>
          {mockSettings.support_email && (
            <div><span className="font-semibold text-zinc-700 dark:text-zinc-300">Compliance Contact:</span> {mockSettings.support_email}</div>
          )}
        </div>
        
        <div
          onClick={handleHtmlClick}
          className="rich-html-boundary open-page-body prose prose-zinc dark:prose-invert max-w-none text-sm sm:text-base text-zinc-700 dark:text-zinc-300 font-medium leading-relaxed"
          dangerouslySetInnerHTML={{ __html: safeHtml(mockSettings.ethics_discrimination_text || DEFAULT_ETHICS_HTML) }}
        />
      </div>
    </div>
  );
}

