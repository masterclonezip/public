import React, { useEffect } from 'react';
import { safeHtml } from '../lib/safeHtmlPublic';
/**
 * Responsibility safety awareness details layout
 * Advises users on secure gaming techniques and safety benchmarks.
 */

import { useData } from '../contexts/DataContextPublic';
import { ShieldCheck, Info, ArrowLeft } from 'lucide-react';
import Meta from '../components/Meta';
import { Link } from 'react-router-dom';

export default function Responsibility() {
  const { settings: mockSettings, fetchSettings } = useData();

  useEffect(() => {
    if (!mockSettings?.responsibility_content && fetchSettings) {
      fetchSettings();
    }
  }, [mockSettings?.responsibility_content, fetchSettings]);
  const responsibilityContent = mockSettings.responsibility_content || '';
  const hasHtml = /<[a-z][\s\S]*>/i.test(responsibilityContent);
  
  return (
    <div className="max-w-[1000px] mx-auto px-4 sm:px-6 md:px-8 py-12 animate-fade-in pb-20 min-h-[70vh]">
      <div className="mb-10">
        <Link 
          to="/" 
          className="inline-flex items-center gap-1 text-sm font-medium text-zinc-500 hover:text-blue-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Home
        </Link>
      </div>
      <Meta 
        title={mockSettings?.responsibility_meta_title || "Responsible Gaming"}
        description={mockSettings?.responsibility_meta_description || "Information and resources for responsible gaming and app usage."}
        canonical={window.location.origin + "/responsibility"}
      />

      <div className="animate-fade-in">
        <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 mb-6 border-b border-zinc-200 dark:border-zinc-800 pb-4">
          Responsibility & Safety
        </h1>

        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-zinc-500 dark:text-zinc-400 mb-10">
          <div><span className="font-semibold">Guideline Status:</span> Verified & Official</div>
          <div><span className="font-semibold">Support Desk:</span> {mockSettings.support_email}</div>
        </div>
        
        <div className="prose prose-zinc dark:prose-invert max-w-none text-zinc-700 dark:text-zinc-300 font-medium leading-relaxed">
          {hasHtml ? (
            <div dangerouslySetInnerHTML={{ __html: safeHtml(responsibilityContent) }} />
          ) : (
            <div dangerouslySetInnerHTML={{ __html: safeHtml(responsibilityContent.replace(/\n/g, '<br/>')) }} />
          )}
        </div>
      </div>
    </div>
  );
}
