import React from 'react';
import { ShieldAlert, Info, Sparkles } from 'lucide-react';

interface AppSafetyBoxesProps {
  app: {
    red_box_msg?: string;
    yellow_box_msg?: string;
    idea_box_msg?: string;
  };
}

export function AppSafetyBoxes({ app }: AppSafetyBoxesProps) {
  const hasRed = app.red_box_msg && app.red_box_msg.trim() !== '.' && app.red_box_msg.trim() !== '';
  const hasYellow = app.yellow_box_msg && app.yellow_box_msg.trim() !== '.' && app.yellow_box_msg.trim() !== '';
  const hasIdea = app.idea_box_msg && app.idea_box_msg.trim() !== '.' && app.idea_box_msg.trim() !== '';

  if (!hasRed && !hasYellow && !hasIdea) return null;

  return (
    <div className="px-1 xs:px-2 sm:px-4 md:px-6 space-y-2.5 xs:space-y-3 mb-6 xs:mb-8 w-full">
      {hasRed && (
        <div className="bg-rose-50/50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 p-3 xs:p-4 rounded-xl xs:rounded-2xl flex items-start gap-2.5 xs:gap-4 shadow-sm group">
          <div className="p-1.5 xs:p-2 bg-rose-100 dark:bg-rose-500/20 rounded-lg xs:rounded-xl text-rose-600 shrink-0">
            <ShieldAlert className="w-4 h-4 xs:w-5 xs:h-5" />
          </div>
          <div className="text-xs xs:text-sm font-medium text-rose-800 dark:text-rose-200 leading-relaxed pt-0.5">
            {app.red_box_msg}
          </div>
        </div>
      )}
      
      {hasYellow && (
        <div className="bg-orange-50/50 dark:bg-orange-500/10 border border-orange-100 dark:border-orange-500/20 p-3 xs:p-4 rounded-xl xs:rounded-2xl flex items-start gap-2.5 xs:gap-4 shadow-sm group">
          <div className="p-1.5 xs:p-2 bg-orange-100 dark:bg-orange-500/20 rounded-lg xs:rounded-xl text-orange-600 shrink-0">
            <Info className="w-4 h-4 xs:w-5 xs:h-5" />
          </div>
          <div className="text-xs xs:text-sm font-medium text-orange-800 dark:text-orange-200 leading-relaxed pt-0.5">
            {app.yellow_box_msg}
          </div>
        </div>
      )}

      {hasIdea && (
        <div className="bg-blue-50/50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 p-3 xs:p-4 rounded-xl xs:rounded-2xl flex items-start gap-2.5 xs:gap-4 shadow-sm group">
          <div className="p-1.5 xs:p-2 bg-blue-100 dark:bg-blue-500/20 rounded-lg xs:rounded-xl text-blue-600 shrink-0">
            <Sparkles className="w-4 h-4 xs:w-5 xs:h-5" />
          </div>
          <div className="text-xs xs:text-sm font-medium text-blue-800 dark:text-blue-200 leading-relaxed pt-0.5">
            {app.idea_box_msg}
          </div>
        </div>
      )}
    </div>
  );
}

export default AppSafetyBoxes;
