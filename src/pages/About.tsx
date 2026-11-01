import React, { useEffect } from 'react';
import { safeHtml } from '../lib/safeHtmlPublic';
import { useData } from '../contexts/DataContextPublic';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Meta from '../components/Meta';
import { DEFAULT_ABOUT_HTML } from '../lib/defaultLegalContent';

export default function About() {
  const { settings: mockSettings, fetchSettings } = useData();
  const navigate = useNavigate();

  useEffect(() => {
    if (!mockSettings?.about_content && fetchSettings) {
      fetchSettings();
    }
  }, [mockSettings?.about_content, fetchSettings]);

  const rawAboutContent = mockSettings?.about_content?.trim() || DEFAULT_ABOUT_HTML;

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
    <div className="max-w-[1000px] mx-auto px-3 sm:px-6 md:px-8 py-8 sm:py-12 animate-fade-in pb-20 min-h-[70vh] text-left">
      <Meta 
        title={mockSettings?.about_meta_title || "About Us"}
        description={mockSettings?.about_meta_description || "Learn more about our platform mission, safe verification frameworks, threat monitoring standards, and stable node guidelines."}
        canonical={(typeof window !== 'undefined' ? window.location.origin : '') + "/about"}
      />
      <div className="mb-6 sm:mb-8">
        <Link 
          to="/" 
          className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-500 hover:text-blue-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Home
        </Link>
      </div>
      <div className="animate-fade-in">
        <h1 className="text-2xl xs:text-3xl sm:text-5xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 mb-4 sm:mb-6 border-b border-zinc-200 dark:border-zinc-800 pb-4">
          About Us
        </h1>

        <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mb-6 sm:mb-8">
          <div><span className="font-semibold">Platform:</span> Verifiable & Transparent</div>
          {mockSettings?.support_email && (
            <div><span className="font-semibold">Inquiries:</span> {mockSettings.support_email}</div>
          )}
        </div>
        
        <div
          onClick={handleHtmlClick}
          className="bg-white dark:bg-zinc-900/90 border border-zinc-200/80 dark:border-white/10 rounded-2xl sm:rounded-3xl p-4 xs:p-5 sm:p-8 md:p-10 shadow-xs overflow-hidden"
        >
          <div className="rich-html-boundary prose prose-zinc dark:prose-invert max-w-none text-sm sm:text-base text-zinc-700 dark:text-zinc-300 font-medium leading-relaxed">
            <div dangerouslySetInnerHTML={{ __html: safeHtml(rawAboutContent) }} />
          </div>
        </div>
      </div>
    </div>
  );
}

