import React from 'react';

interface SidebarItemProps {
  id: string;
  active: boolean;
  onClick: (id: string) => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  badge?: React.ReactNode;
}

export const AdminSidebarItem = React.memo(({ 
  id, 
  active, 
  onClick, 
  icon: Icon, 
  label,
  badge
}: SidebarItemProps) => {
  return (
    <button 
      onClick={() => onClick(id)}
      className={`flex items-center justify-between w-full text-left px-4 py-2 rounded-xl transition-all min-h-[40px] font-bold text-sm group border-0 cursor-pointer ${
        active 
          ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/15' 
          : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-slate-800/40 hover:text-slate-900 dark:hover:text-white'
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <Icon className={`w-4 h-4 flex-shrink-0 transition-transform group-active:scale-95 ${active ? 'text-white' : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300'}`} /> 
        <span className="truncate">{label}</span>
      </div>
      {badge}
    </button>
  );
});

AdminSidebarItem.displayName = 'AdminSidebarItem';

export default AdminSidebarItem;
