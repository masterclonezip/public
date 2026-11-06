import React, { useState, useRef } from 'react';
import { adminFetch } from '../../../../services/adminAuthService';
import { safeHtml } from '../../../../lib/safeHtmlPublic';
import { Sparkles, Loader2, ChevronDown, ChevronUp, CheckCircle, Info, Eye, Code } from 'lucide-react';

interface ContentSectionProps {
  formFields: any;
  handleFieldChange: (field: string, value: any) => void;
}

export const ContentSection = ({ formFields, handleFieldChange }: ContentSectionProps) => {
  const [isFormatting, setIsFormatting] = useState(false);
  const [aiStatusMsg, setAiStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [previewMode, setPreviewMode] = useState<'edit' | 'preview'>('edit');
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const insertHtmlSnippet = (before: string, after: string = '', defaultText: string = 'Text here') => {
    const el = textareaRef.current;
    const current = formFields.description_html || '';
    if (!el) {
      handleFieldChange('description_html', `${current}${current ? '\n' : ''}${before}${defaultText}${after}`);
      return;
    }
    const start = el.selectionStart ?? current.length;
    const end = el.selectionEnd ?? current.length;
    const selected = current.slice(start, end) || defaultText;
    const next = current.slice(0, start) + before + selected + after + current.slice(end);
    handleFieldChange('description_html', next);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + before.length, start + before.length + selected.length);
    }, 10);
  };

  const handleAiFormatHtml = async () => {
    const rawContent = formFields.description_html || '';
    if (!rawContent.trim()) {
      setAiStatusMsg({ type: 'error', text: 'Please paste or write your raw review text/script into the HTML box first.' });
      return;
    }

    setIsFormatting(true);
    setAiStatusMsg(null);

    try {
      const res = await adminFetch('/api/v1/admin/ai-format-html', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: rawContent,
          appName: formFields.name || ''
        })
      });

      const data = await res.json();
      if (data.success && data.formattedHtml) {
        handleFieldChange('description_html', data.formattedHtml);
        setAiStatusMsg({
          type: 'success',
          text: (data.source === 'gemini-ai' || data.source === 'gemini-ai-pro')
            ? '✨ HTML structured with clean H2/H3 headings, lists, and highlighted key terms.'
            : '✨ Cleaned and formatted HTML structure.'
        });
      } else {
        setAiStatusMsg({ type: 'error', text: data.error || 'Failed to format HTML.' });
      }
    } catch (err: any) {
      setAiStatusMsg({ type: 'error', text: 'Error connecting to AI Formatter service.' });
    } finally {
      setIsFormatting(false);
    }
  };

  return (
    <div className="animate-fade-in space-y-5">
      {/* Primary Gateway Access Link */}
      <div>
        <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
          Primary Gateway Access Link (Target URL to secure & encrypt)
        </label>
        <div className="flex gap-2">
          <input 
            type="text" 
            name="more_information_url" 
            value={formFields.more_information_url || ''} 
            onChange={e => handleFieldChange('more_information_url', e.target.value)} 
            placeholder="https://..." 
            className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500 font-mono" 
          />
          {formFields.more_information_url && formFields.more_information_url.startsWith('U2FsdGVkX1') && (
            <button
              type="button"
              onClick={async () => {
                try {
                  const res = await adminFetch('/api/v1/admin/decrypt-url', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ encryptedUrl: formFields.more_information_url })
                  });
                  const data = await res.json();
                  if (data.decrypted) {
                    handleFieldChange('more_information_url', data.decrypted);
                    try {
                      await navigator.clipboard.writeText(data.decrypted);
                      setAiStatusMsg({ type: 'success', text: 'Decrypted URL revealed and copied to clipboard.' });
                    } catch (_) {
                      setAiStatusMsg({ type: 'success', text: 'Decrypted URL revealed in input field.' });
                    }
                  } else {
                    setAiStatusMsg({ type: 'error', text: 'Failed to decrypt URL.' });
                  }
                } catch (_) {
                  setAiStatusMsg({ type: 'error', text: 'Error decrypting URL.' });
                }
              }}
              className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-semibold text-xs transition-all whitespace-nowrap cursor-pointer border-0"
            >
              Reveal Link
            </button>
          )}
        </div>
        <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-1">
          On save, APK-Gatekeeper securely hashes and encrypts this link on the server, keeping backend code invisible to client browsers.
        </p>
      </div>

      {/* Main Unified Description & Review HTML Box */}
      <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3.5 sm:p-5 space-y-3 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-slate-200 dark:border-slate-800 pb-3">
          <div>
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
              <span>Full App Description & Review HTML</span>
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Write HTML directly, use quick tag buttons below, or click AI Format to structure plain text.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="inline-flex rounded-xl bg-slate-200/70 dark:bg-slate-800 p-0.5">
              <button
                type="button"
                onClick={() => setPreviewMode('edit')}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all border-0 cursor-pointer ${
                  previewMode === 'edit'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'bg-transparent text-slate-600 dark:text-slate-400'
                }`}
              >
                <Code className="w-3.5 h-3.5" />
                Edit HTML
              </button>
              <button
                type="button"
                onClick={() => setPreviewMode('preview')}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all border-0 cursor-pointer ${
                  previewMode === 'preview'
                    ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                    : 'bg-transparent text-slate-600 dark:text-slate-400'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                Preview
              </button>
            </div>

            <button
              type="button"
              onClick={handleAiFormatHtml}
              disabled={isFormatting}
              className="px-3 py-1.5 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-700 hover:to-pink-700 text-white font-bold text-[11px] rounded-xl shadow-sm flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50 border-0 cursor-pointer"
            >
              {isFormatting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Formatting...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                  <span>✨ AI Structure</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Mobile-Friendly Quick HTML Tag Bar */}
        {previewMode === 'edit' && (
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
            {[
              { label: 'H2 Heading', before: '<h2>', after: '</h2>', sample: 'Section Heading' },
              { label: 'H3 Subhead', before: '<h3>', after: '</h3>', sample: 'Subheading' },
              { label: 'Paragraph', before: '<p>', after: '</p>', sample: 'Paragraph text...' },
              { label: 'Bold', before: '<strong>', after: '</strong>', sample: 'Important' },
              { label: 'Bullet List', before: '<ul>\n  <li>', after: '</li>\n</ul>', sample: 'Key point' },
              { label: 'Link', before: '<a href="https://">', after: '</a>', sample: 'Link text' },
            ].map((btn) => (
              <button
                key={btn.label}
                type="button"
                onClick={() => insertHtmlSnippet(btn.before, btn.after, btn.sample)}
                className="shrink-0 px-2.5 py-1 bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg text-[10px] font-bold transition-colors cursor-pointer active:scale-95"
              >
                + {btn.label}
              </button>
            ))}
          </div>
        )}

        {aiStatusMsg && (
          <div className={`p-3 rounded-xl text-xs flex items-start gap-2.5 ${
            aiStatusMsg.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 text-emerald-800 dark:text-emerald-300' : 'bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/80 text-rose-800 dark:text-rose-300'
          }`}>
            {aiStatusMsg.type === 'success' ? <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" /> : <Info className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />}
            <span className="leading-relaxed font-medium">{aiStatusMsg.text}</span>
          </div>
        )}

        {previewMode === 'edit' ? (
          <textarea 
            ref={textareaRef}
            name="description_html" 
            value={formFields.description_html || ''} 
            onChange={e => handleFieldChange('description_html', e.target.value)} 
            rows={14} 
            className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700/80 rounded-xl p-3.5 font-mono text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 leading-relaxed shadow-inner"
            placeholder="Paste HTML or raw text here..."
          ></textarea>
        ) : (
          <div className="w-full min-h-[260px] max-h-[420px] overflow-y-auto bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-4 prose prose-sm dark:prose-invert max-w-none text-slate-800 dark:text-slate-200">
            {formFields.description_html?.trim() ? (
              <div dangerouslySetInnerHTML={{ __html: safeHtml(formFields.description_html) }} />
            ) : (
              <p className="text-xs text-slate-400 italic">No HTML content yet. Switch to Edit HTML to add content.</p>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1 gap-2">
          <span>💡 H1 is reserved for the App Title. Sub-headings automatically use H2/H3.</span>
          <span className="font-semibold text-slate-700 dark:text-slate-300">Chars: {(formFields.description_html || '').length}</span>
        </div>
      </div>

      {/* Optional Collapsible Extra Fields */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full p-3.5 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/80 text-left flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors border-0 cursor-pointer"
        >
          <span>Advanced Extra Banners & Legacy Feature Lists (Optional)</span>
          {showAdvanced ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>

        {showAdvanced && (
          <div className="p-4 bg-slate-50 dark:bg-slate-950/50 border-t border-slate-200 dark:border-slate-800/80 space-y-4 animate-fade-in">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Key Features HTML List</label>
                <textarea 
                  name="features_html" 
                  value={formFields.features_html || ''} 
                  onChange={e => handleFieldChange('features_html', e.target.value)} 
                  rows={4} 
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-3 font-mono text-xs text-slate-800 dark:text-emerald-400 focus:outline-none focus:border-blue-500"
                  placeholder="<li>Secure encryption</li>&#10;<li>Unlimited bandwidth</li>"
                ></textarea>
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Custom Extra Box Banner Title</label>
                  <input 
                    type="text" 
                    name="custom_admin_box_heading" 
                    value={formFields.custom_admin_box_heading || ''} 
                    onChange={e => handleFieldChange('custom_admin_box_heading', e.target.value)} 
                    placeholder="e.g. SPECIAL COMPATIBILITY NOTE"
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500" 
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Custom Extra Box HTML Description</label>
                  <textarea 
                    name="custom_admin_box_html" 
                    value={formFields.custom_admin_box_html || ''} 
                    onChange={e => handleFieldChange('custom_admin_box_html', e.target.value)} 
                    rows={2} 
                    placeholder="<p>Extra banner text...</p>"
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-3 font-mono text-xs text-slate-800 dark:text-blue-400 focus:outline-none focus:border-blue-500"
                  ></textarea>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
