import { useState, useMemo } from 'react';

export type AppSortOption = 'default' | 'updated' | 'serial' | 'name' | 'missing_info';

export const useAppFilters = (appsList: any[]) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Verified' | 'Caution' | 'Unsafe' | 'is_new' | 'is_hot' | 'is_coming_soon' | 'admin_only' | 'synced'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<AppSortOption>('default');

  const filteredApps = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const catTarget = categoryFilter === 'all' ? '' : categoryFilter.trim().toLowerCase();

    const filtered = (appsList || []).filter((app: any) => {
      const matchesSearch = !q ||
        (typeof app.name === 'string' && app.name.toLowerCase().includes(q)) ||
        (typeof app.slug === 'string' && app.slug.toLowerCase().includes(q)) ||
        (typeof app.category === 'string' && app.category.toLowerCase().includes(q)) ||
        (typeof app.developer === 'string' && app.developer.toLowerCase().includes(q)) ||
        (typeof app.seo_keywords === 'string' && app.seo_keywords.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      const matchesCategory =
        !catTarget ||
        (typeof app.category === 'string' &&
          app.category.split(',').some((c: string) => c.trim().toLowerCase() === catTarget));

      if (!matchesCategory) return false;

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

      if (!matchesStatus) return false;

      if (sortBy === 'missing_info') {
        const missingIcon = !app.icon_url || app.icon_url === '/logo.png';
        const missingLink = !app.more_information_url && !app.encrypted_link;
        const missingDesc = !app.description_html || String(app.description_html).trim().length < 40;
        return missingIcon || missingLink || missingDesc;
      }

      return true;
    });

    if (sortBy === 'updated') {
      return [...filtered].sort((a, b) => {
        const tA = new Date(a.updated_at || a.created_at || 0).getTime() || 0;
        const tB = new Date(b.updated_at || b.created_at || 0).getTime() || 0;
        return tB - tA;
      });
    }
    if (sortBy === 'serial') {
      return [...filtered].sort((a, b) => (Number(a.serial_number) || 9999) - (Number(b.serial_number) || 9999));
    }
    if (sortBy === 'name') {
      return [...filtered].sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
    }

    return filtered;
  }, [appsList, searchQuery, categoryFilter, statusFilter, sortBy]);

  return {
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    categoryFilter,
    setCategoryFilter,
    sortBy,
    setSortBy,
    filteredApps
  };
};


