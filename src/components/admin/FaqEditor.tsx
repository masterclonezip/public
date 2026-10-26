import React, { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';

interface FaqEditorProps {
  initialFaqs: { question: string; answer: string }[];
  onChange?: (faqs: { question: string; answer: string }[]) => void;
}

export function FaqEditor({ initialFaqs, onChange }: FaqEditorProps) {
  const [faqs, setFaqs] = useState<{ question: string; answer: string }[]>(initialFaqs || []);

  useEffect(() => {
    setFaqs(initialFaqs || []);
  }, [initialFaqs]);

  const updateAndNotify = (newFaqs: { question: string; answer: string }[]) => {
    setFaqs(newFaqs);
    if (onChange) {
      onChange(newFaqs);
    }
  };

  const addFaq = () => {
    const newFaqs = [...faqs, { question: '', answer: '' }];
    updateAndNotify(newFaqs);
  };

  const removeFaq = (index: number) => {
    const newFaqs = faqs.filter((_, i) => i !== index);
    updateAndNotify(newFaqs);
  };

  const updateFaq = (index: number, field: 'question' | 'answer', value: string) => {
    const newFaqs = [...faqs];
    newFaqs[index] = { ...newFaqs[index], [field]: value };
    updateAndNotify(newFaqs);
  };

  return (
    <div className="space-y-4">
      <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">Interactive FAQ System</h3>
      <input type="hidden" name="faqs_json" value={JSON.stringify(faqs)} />
      {faqs.map((faq, idx) => (
        <div key={idx} className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200/60 dark:border-slate-800/80 space-y-3 relative">
          <button 
            type="button" 
            onClick={() => removeFaq(idx)} 
            className="absolute top-3 right-3 text-rose-500 hover:text-rose-600 bg-rose-50 dark:bg-rose-950/20 p-1.5 rounded-lg transition-all border-0 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <div className="grid gap-3">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Question</label>
              <input 
                type="text" 
                value={faq.question} 
                onChange={e => updateFaq(idx, 'question', e.target.value)} 
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500" 
                placeholder="e.g. Is this app safe?" 
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Answer (HTML supported)</label>
              <textarea 
                value={faq.answer} 
                onChange={e => updateFaq(idx, 'answer', e.target.value)} 
                rows={3} 
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500" 
                placeholder="Yes, it is 100% safe..."
              ></textarea>
            </div>
          </div>
        </div>
      ))}
      <button 
        type="button" 
        onClick={addFaq} 
        className="w-full flex items-center justify-center gap-1.5 py-3 bg-blue-50 dark:bg-blue-950/20 border border-dashed border-blue-200 dark:border-blue-900/30 rounded-xl text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-100/60 dark:hover:bg-blue-950/40 transition-all font-bold cursor-pointer"
      >
        <Plus className="w-4 h-4" /> Add FAQ Item
      </button>
    </div>
  );
}
export default FaqEditor;
