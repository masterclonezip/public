import { useState } from 'react';

export const useAppFilters = (appsList: any[]) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Verified' | 'Caution' | 'Unsafe' | 'is_new' | 'is_hot' | 'is_coming_soon' | 'admin_only' | 'synced'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const filteredApps = appsList.filter((app: any) => {
    const matchesSearch = !searchQuery || 
      (app.name && app.name.toLowerCase().includes(searchQuery.toLowerCase())) || 
      (app.slug && app.slug.toLowerCase().includes(searchQuery.toLowerCase())) || 
      (app.category && app.category.toLowerCase().includes(searchQuery.toLowerCase())) || 
      (app.seo_keywords && app.seo_keywords.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = 
      categoryFilter === 'all' || 
      app.category?.toLowerCase().split(',').map((c: string) => c.trim().toLowerCase()).includes(categoryFilter.toLowerCase());

    const matchesStatus = 
      statusFilter === 'all' ||
      (statusFilter === 'Verified' && app.safety_status === 'Verified') ||
      (statusFilter === 'Caution' && app.safety_status === 'Caution') ||
      (statusFilter === 'Unsafe' && app.safety_status === 'Unsafe') ||
      (statusFilter === 'is_new' && app.is_new) ||
      (statusFilter === 'is_hot' && app.is_hot) ||
      (statusFilter === 'is_coming_soon' && app.is_coming_soon) ||
      (statusFilter === 'admin_only' && app.sync_to_public === false) ||
      (statusFilter === 'synced' && app.sync_to_public !== false);

    return matchesSearch && matchesCategory && matchesStatus;
  });

  return {
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    categoryFilter,
    setCategoryFilter,
    filteredApps
  };
};
