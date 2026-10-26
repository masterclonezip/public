import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { safeHtml } from '../lib/safeHtmlPublic';
import { cn } from '../lib/utilsPublic';

interface AccordionItemProps {
  question: string;
  answer: string;
  isWebsiteFaq?: boolean;
}

export default function AccordionItem({ question, answer, isWebsiteFaq }: AccordionItemProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={cn(
      "border border-black/5 dark:border-white/5 rounded-xl overflow-hidden transition-all duration-200",
      isWebsiteFaq ? "bg-white/80 dark:bg-zinc-900/80 hover:border-black/10 dark:hover:border-white/10 shadow-xs" : "bg-white dark:bg-zinc-900 shadow-xs p-1"
    )}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full text-left font-semibold cursor-pointer select-none flex items-center justify-between text-zinc-900 dark:text-white transition-colors",
          isWebsiteFaq ? "py-3.5 px-4 text-sm sm:text-[15px]" : "p-3 text-sm font-medium"
        )}
      >
        <span className="flex items-center gap-2.5 flex-1 pr-2">
          {isWebsiteFaq && <span className="text-blue-500 font-bold text-xs shrink-0">Q.</span>}
          <span className="leading-snug">{question}</span>
        </span>
        <div className={cn(
          "shrink-0 flex items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 transition-transform duration-200",
          isOpen ? "rotate-180 bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" : "rotate-0",
          "w-6 h-6"
        )}>
          <ChevronDown className="w-3.5 h-3.5" />
        </div>
      </button>
      
      <div className={cn(
        "overflow-hidden border-t border-black/5 dark:border-white/5",
        isOpen ? "block animate-in fade-in slide-in-from-top-1 duration-150" : "hidden"
      )}>
        <div className={cn(
          "text-slate-600 dark:text-slate-400 leading-relaxed",
          isWebsiteFaq ? "px-4 pb-4 pt-3 text-xs sm:text-sm font-normal bg-zinc-50/50 dark:bg-zinc-900/40" : "px-3 pb-3 pt-2 text-xs"
        )}>
          <div className={cn("flex flex-col items-start gap-2 w-full")}>
            <div 
              className="prose prose-zinc dark:prose-invert prose-xs sm:prose-sm max-w-none w-full break-words overflow-wrap-anywhere whitespace-normal leading-relaxed text-slate-600 dark:text-slate-300"
              dangerouslySetInnerHTML={{ __html: safeHtml(answer) }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

