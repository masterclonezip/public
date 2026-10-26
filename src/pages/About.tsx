import { useState, useEffect } from 'react';
import { safeHtml } from '../lib/safeHtmlPublic';
/**
 * About page layout
 * Explains the verification frameworks, safe apk guidelines, and the platform mission statement.
 */

import { useData } from '../contexts/DataContextPublic';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Meta from '../components/Meta';

export default function About() {
  const { settings: mockSettings, fetchSettings } = useData();

  useEffect(() => {
    if (!mockSettings?.about_content && fetchSettings) {
      fetchSettings();
    }
  }, [mockSettings?.about_content, fetchSettings]);
  const rawAboutContent = mockSettings?.about_content?.trim() || '';
  const hasHtml = /<[a-z][\s\S]*>/i.test(rawAboutContent);

  return (
    <div className="max-w-[1000px] mx-auto px-4 sm:px-6 md:px-8 py-12 animate-fade-in pb-20 min-h-[70vh]">
      <Meta 
        title={mockSettings?.about_meta_title || "About Us"}
        description={mockSettings?.about_meta_description || "Learn more about our platform mission, safe verification frameworks, threat monitoring standards, and stable node guidelines."}
        canonical={window.location.origin + "/about"}
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
        <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 mb-6 border-b border-zinc-200 dark:border-zinc-800 pb-4">
          About Us
        </h1>

        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-zinc-500 dark:text-zinc-400 mb-10">
          <div><span className="font-semibold">Platform:</span> Verifiable & Transparent</div>
          {mockSettings?.support_email && (
            <div><span className="font-semibold">Inquiries:</span> {mockSettings.support_email}</div>
          )}
        </div>
        
        <div className="prose prose-zinc dark:prose-invert max-w-none text-zinc-700 dark:text-zinc-300 font-medium leading-relaxed">
          {hasHtml ? (
            <div dangerouslySetInnerHTML={{ __html: safeHtml(rawAboutContent) }} />
          ) : (
            <div dangerouslySetInnerHTML={{ __html: safeHtml(rawAboutContent.replace(/\n/g, '<br/>')) }} />
          )}
        </div>
      </div>
    </div>
  );
}
