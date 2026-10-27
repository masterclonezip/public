import React, { useEffect } from 'react';
import { safeHtml } from '../lib/safeHtmlPublic';
/**
 * Report & Removal Policy Page
 */

import { useData } from '../contexts/DataContextPublic';
import { Link } from 'react-router-dom';
import { ArrowLeft, Trash2, ShieldCheck } from 'lucide-react';
import Meta from '../components/Meta';

export default function ReportRemoval() {
  const { settings: mockSettings, fetchSettings } = useData();

  useEffect(() => {
    if (!mockSettings?.report_removal_content && fetchSettings) {
      fetchSettings();
    }
  }, [mockSettings?.report_removal_content, fetchSettings]);
  const reportRemovalContent = mockSettings.report_removal_content || '';
  const hasHtml = /<[a-z][\s\S]*>/i.test(reportRemovalContent);

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
        title={mockSettings?.report_removal_meta_title || "Report & Removal"}
        description={mockSettings?.report_removal_meta_description || "Report content or request removal of specific applications."}
        canonical={window.location.origin + "/report-removal"}
      />

      <div className="animate-fade-in">
        <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 mb-6 border-b border-zinc-200 dark:border-zinc-800 pb-4">
          Report & Removal Policy
        </h1>

        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-zinc-500 dark:text-zinc-400 mb-10">
          <div><span className="font-semibold">Policy Status:</span> Official & Enforced</div>
          <div><span className="font-semibold">Compliance Contact:</span> {mockSettings.support_email}</div>
        </div>
        
        <div className="prose prose-zinc dark:prose-invert max-w-none text-zinc-700 dark:text-zinc-300 font-medium leading-relaxed">
          {hasHtml ? (
            <div dangerouslySetInnerHTML={{ __html: safeHtml(reportRemovalContent) }} />
          ) : (
            <div dangerouslySetInnerHTML={{ __html: safeHtml(reportRemovalContent.replace(/\n/g, '<br/>')) }} />
          )}
        </div>
      </div>
    </div>
  );
}
