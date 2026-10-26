import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

interface SeoFieldWithLimitProps {
  label: string;
  type?: 'input' | 'textarea';
  name: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  maxChars?: number;
  rows?: number;
  className?: string;
  helperText?: string;
}

export const SeoFieldWithLimit: React.FC<SeoFieldWithLimitProps> = ({
  label,
  type = 'input',
  name,
  value,
  defaultValue = '',
  onChange,
  placeholder,
  maxChars = 58,
  rows = 3,
  className = '',
  helperText
}) => {
  const isControlled = value !== undefined;
  const [internalVal, setInternalVal] = useState(defaultValue || '');

  useEffect(() => {
    if (!isControlled && defaultValue !== undefined) {
      setInternalVal(defaultValue);
    }
  }, [defaultValue, isControlled]);

  const currentVal = isControlled ? (value || '') : internalVal;
  const charCount = currentVal.length;
  const isOverLimit = charCount > maxChars;
  const overCount = charCount - maxChars;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const newVal = e.target.value;
    if (!isControlled) {
      setInternalVal(newVal);
    }
    onChange?.(newVal);
  };

  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="flex items-center justify-between">
        <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400">
          {label}
        </label>
        <div className="flex items-center gap-1.5 text-[11px] font-semibold">
          {isOverLimit ? (
            <span className="flex items-center gap-1 text-red-600 dark:text-red-400 font-bold animate-pulse">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{charCount} / {maxChars} chars (+{overCount} over limit)</span>
            </span>
          ) : (
            <span className={`flex items-center gap-1 ${charCount > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
              {charCount > 0 && <CheckCircle2 className="w-3.5 h-3.5" />}
              <span>{charCount} / {maxChars} chars {charCount > 0 ? '(Optimal)' : ''}</span>
            </span>
          )}
        </div>
      </div>

      {type === 'input' ? (
        <input
          type="text"
          name={name}
          value={isControlled ? value : internalVal}
          onChange={handleChange}
          placeholder={placeholder}
          className={`w-full bg-white dark:bg-slate-900 rounded-xl p-2.5 text-xs font-semibold text-slate-800 dark:text-slate-100 transition-all focus:outline-none ${
            isOverLimit
              ? 'border-2 border-red-500 dark:border-red-500 focus:border-red-600 dark:focus:border-red-400 focus:ring-2 focus:ring-red-500/20 shadow-[0_0_12px_rgba(239,68,68,0.2)]'
              : 'border border-slate-200 dark:border-slate-800 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-1 focus:ring-blue-500/20'
          }`}
        />
      ) : (
        <textarea
          name={name}
          value={isControlled ? value : internalVal}
          onChange={handleChange}
          rows={rows}
          placeholder={placeholder}
          className={`w-full bg-white dark:bg-slate-900 rounded-xl p-2.5 text-xs font-semibold text-slate-800 dark:text-slate-100 transition-all focus:outline-none ${
            isOverLimit
              ? 'border-2 border-red-500 dark:border-red-500 focus:border-red-600 dark:focus:border-red-400 focus:ring-2 focus:ring-red-500/20 shadow-[0_0_12px_rgba(239,68,68,0.2)]'
              : 'border border-slate-200 dark:border-slate-800 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-1 focus:ring-blue-500/20'
          }`}
        />
      )}

      {/* Warning message displayed when limit is crossed */}
      {isOverLimit && (
        <div className="flex items-center gap-1.5 p-2 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 text-[11px] leading-tight font-medium">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-500" />
          <span>
            <strong>Google SERP Cut-off Warning:</strong> Text exceeds {maxChars} characters ({charCount} total, +{overCount} extra). Google search results will truncate this with <strong>"..."</strong>.
          </span>
        </div>
      )}

      {helperText && !isOverLimit && (
        <p className="text-[10px] text-slate-400">{helperText}</p>
      )}
    </div>
  );
};

export default SeoFieldWithLimit;
