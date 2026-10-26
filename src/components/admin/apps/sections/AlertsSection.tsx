import React from 'react';

interface AlertsSectionProps {
  formFields: any;
  handleFieldChange: (field: string, value: any) => void;
}

export const AlertsSection = ({ formFields, handleFieldChange }: AlertsSectionProps) => {
  return (
    <div className="animate-fade-in space-y-5">
      <p className="text-xs text-slate-500 dark:text-slate-400">Configure Markdown system notifications displayed in full-width alert cards directly on the app download page.</p>
      
      <div className="space-y-4">
        <div>
          <label className="block text-[10px] font-black uppercase tracking-wider text-rose-500 mb-1">🔴 Danger / Security Alert Box (Markdown)</label>
          <textarea 
            name="red_box_msg" 
            value={formFields.red_box_msg} 
            onChange={e => handleFieldChange('red_box_msg', e.target.value)} 
            rows={3} 
            className="w-full bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/30 rounded-xl p-2.5 text-xs font-semibold text-rose-800 dark:text-rose-100 focus:outline-none focus:border-rose-500"
            placeholder="e.g. **CRITICAL:** Use of this older version is no longer recommended due to vulnerabilities."
          ></textarea>
        </div>

        <div>
          <label className="block text-[10px] font-black uppercase tracking-wider text-amber-500 mb-1">🟡 Warning / Caution Alert Box (Markdown)</label>
          <textarea 
            name="yellow_box_msg" 
            value={formFields.yellow_box_msg} 
            onChange={e => handleFieldChange('yellow_box_msg', e.target.value)} 
            rows={3} 
            className="w-full bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 rounded-xl p-2.5 text-xs font-semibold text-amber-800 dark:text-amber-100 focus:outline-none focus:border-amber-500"
            placeholder="e.g. **NOTICE:** This app currently shows high battery overhead on Android 14."
          ></textarea>
        </div>

        <div>
          <label className="block text-[10px] font-black uppercase tracking-wider text-emerald-500 mb-1">🟢 Tip / Recommendation Alert Box (Markdown)</label>
          <textarea 
            name="idea_box_msg" 
            value={formFields.idea_box_msg} 
            onChange={e => handleFieldChange('idea_box_msg', e.target.value)} 
            rows={3} 
            className="w-full bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30 rounded-xl p-2.5 text-xs font-semibold text-emerald-800 dark:text-emerald-100 focus:outline-none focus:border-emerald-500"
            placeholder="e.g. **TIP:** Select the nearest node during VPN startup for 40% faster latency."
          ></textarea>
        </div>
      </div>
    </div>
  );
};
