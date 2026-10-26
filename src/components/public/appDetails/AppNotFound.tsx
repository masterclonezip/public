import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import Meta from '../../Meta';

interface AppNotFoundProps {
  slug: string;
}

export default function AppNotFound({ slug }: AppNotFoundProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center px-4 max-w-md mx-auto">
      <Meta 
        title="404 - App Not Found" 
        description="The requested application could not be located." 
        noindex={true} 
      />
      <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 rounded-2xl flex items-center justify-center mb-6">
        <ShieldAlert className="w-8 h-8" />
      </div>
      <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">App Not Found</h1>
      <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-3 leading-relaxed mb-6">
        The requested application "<span className="font-mono font-medium text-zinc-800 dark:text-zinc-200">{slug}</span>" could not be located.
        If you just created it, it might still be propagating. Try refreshing.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
        <button 
          onClick={() => window.location.reload()}
          className="flex items-center justify-center gap-2 px-6 py-2.5 bg-zinc-800 hover:bg-zinc-900 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-white rounded-[16px] font-semibold text-sm transition-all hover:scale-[1.02] active:scale-[0.98] shadow-md cursor-pointer"
        >
          Refresh Data
        </button>
        <Link 
          to="/" 
          className="flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-[16px] font-semibold text-sm transition-all hover:scale-[1.02] active:scale-[0.98] shadow-md"
        >
          <ArrowLeft className="w-4 h-4" /> Go to Store
        </Link>
      </div>
    </div>
  );
}
