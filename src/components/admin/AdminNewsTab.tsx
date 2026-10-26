import React, { useState, useMemo } from 'react';
import { 
  Newspaper, 
  Plus, 
  Trash2, 
  LayoutDashboard, 
  Edit2, 
  Save, 
  X, 
  CheckCircle2, 
  RefreshCw, 
  Globe, 
  Lock, 
  Pin, 
  Flame, 
  Sparkles, 
  ExternalLink, 
  Calendar, 
  Clock, 
  Eye, 
  Search, 
  FileText 
} from 'lucide-react';
import { toast } from '../Toast';
import ImageUpload from '../ImageUpload';
import { safeHtml } from '../../lib/safeHtmlPublic';
import { SeoFieldWithLimit } from './SeoFieldWithLimit';

interface AdminNewsTabProps {
  newsList: any[];
  handleAddNews: () => string;
  handleDeleteNews: (id: string) => void;
  handleNewsChange: (id: string, field: string, value: any) => void;
  saveNews: (list: any[]) => Promise<void>;
  saving: boolean;
  setSaving: (saving: boolean) => void;
  appsList: any[];
}

export const AdminNewsTab = React.memo(({
  newsList,
  handleAddNews,
  handleDeleteNews,
  handleNewsChange,
  saveNews,
  saving,
  setSaving,
  appsList
}: AdminNewsTabProps) => {
  const [editingNewsId, setEditingNewsId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'live' | 'draft'>('all');
  const [showHtmlPreview, setShowHtmlPreview] = useState(false);

  // Statistics
  const stats = useMemo(() => {
    const total = newsList.length;
    const live = newsList.filter(n => n.sync_to_public !== false).length;
    const drafts = total - live;
    const pinned = newsList.filter(n => n.is_pinned).length;
    return { total, live, drafts, pinned };
  }, [newsList]);

  // Filtered news list based on search and status
  const displayedNews = useMemo(() => {
    return newsList.filter(item => {
      // Status filter
      if (statusFilter === 'live' && item.sync_to_public === false) return false;
      if (statusFilter === 'draft' && item.sync_to_public !== false) return false;

      // Search term
      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase();
      return (
        item.title?.toLowerCase().includes(q) ||
        item.slug?.toLowerCase().includes(q) ||
        item.category?.toLowerCase().includes(q) ||
        item.description?.toLowerCase().includes(q) ||
        item.ceo_name?.toLowerCase().includes(q)
      );
    });
  }, [newsList, statusFilter, searchTerm]);

  const handleSaveAll = async (customList?: any[]) => {
    setSaving(true);
    try {
      const listToSave = customList || newsList;
      await saveNews(listToSave);
      toast('News saved and synchronized to public website & database successfully!', 'success');
    } catch (e: any) {
      console.error('Failed to save news:', e);
      toast('Failed to save news: ' + (e?.message || 'Error'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveItemAndClose = async (itemId: string) => {
    setSaving(true);
    try {
      await saveNews(newsList);
      toast('News item saved and synchronized to public website!', 'success');
      setEditingNewsId(null);
    } catch (e: any) {
      console.error('Failed to save news item:', e);
      toast('Failed to save: ' + (e?.message || 'Error'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const calculateReadingTime = (text: string): string => {
    if (!text) return '1 min read';
    const words = text.replace(/<[^>]*>?/gm, ' ').trim().split(/\s+/).filter(Boolean).length;
    const minutes = Math.max(1, Math.ceil(words / 180));
    return `${minutes} min read`;
  };

  return (
    <div className="animate-fade-in space-y-6">
      {/* Top Header Controls */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-black/10 dark:border-white/10 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2 dark:text-white">
              <Newspaper className="w-5 h-5 text-blue-500" /> News Management &amp; Publishing Portal
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Create and manage transparency bulletins, updates, and releases published to the public website.
            </p>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={() => {
                const newId = handleAddNews();
                setEditingNewsId(newId);
              }}
              className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 active:scale-95 text-white px-4 py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Add News Article
            </button>
            <button
              onClick={() => handleSaveAll()}
              disabled={saving}
              className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 active:scale-95 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer"
            >
              {saving ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>{saving ? 'Syncing...' : 'Save & Publish All'}</span>
            </button>
          </div>
        </div>

        {/* Stats & Search Bar */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              All Articles ({stats.total})
            </button>
            <button
              onClick={() => setStatusFilter('live')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                statusFilter === 'live'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-900/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50'
              }`}
            >
              <Globe className="w-3 h-3" /> Live on Public ({stats.live})
            </button>
            <button
              onClick={() => setStatusFilter('draft')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                statusFilter === 'draft'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-200/60 dark:border-amber-900/40 hover:bg-amber-100 dark:hover:bg-amber-900/50'
              }`}
            >
              <Lock className="w-3 h-3" /> Drafts ({stats.drafts})
            </button>
            {stats.pinned > 0 && (
              <span className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-100/60 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 flex items-center gap-1">
                <Pin className="w-3 h-3" /> {stats.pinned} Pinned
              </span>
            )}
          </div>

          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search news title, slug..."
              className="w-full pl-9 pr-8 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* News List */}
      <div className="space-y-4">
        {displayedNews.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-12 text-center">
            <Newspaper className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
              {searchTerm ? 'No Matching News Articles Found' : 'No News Items Yet'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-4">
              {searchTerm ? `No articles matching "${searchTerm}".` : 'Add your first article or release announcement.'}
            </p>
            {searchTerm ? (
              <button
                onClick={() => setSearchTerm('')}
                className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-4 py-2 rounded-lg font-semibold text-xs inline-flex items-center gap-2 cursor-pointer"
              >
                Clear Search
              </button>
            ) : (
              <button
                onClick={() => {
                  const newId = handleAddNews();
                  setEditingNewsId(newId);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold text-xs inline-flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Add News Article
              </button>
            )}
          </div>
        ) : (
          displayedNews.map((item: any) => (
            <div 
              key={item.id} 
              className={`bg-white dark:bg-slate-900 border rounded-2xl p-6 shadow-sm relative overflow-hidden transition-all ${
                editingNewsId === item.id 
                  ? 'border-blue-500 ring-2 ring-blue-500/20' 
                  : item.sync_to_public === false 
                    ? 'border-amber-200 dark:border-amber-900/40 bg-amber-50/10 dark:bg-amber-950/5' 
                    : 'border-black/10 dark:border-white/10'
              }`}
            >
              {editingNewsId === item.id ? (
                <div className="space-y-6">
                  {/* Editor Header */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-black/10 dark:border-white/10 pb-4 mb-4 gap-4">
                    <div>
                      <h3 className="font-bold text-lg text-blue-600 flex items-center gap-2">
                        <LayoutDashboard className="w-4 h-4" /> Editing: {item.title || 'Untitled News Article'}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono">
                        ID: {item.id} • Slug: /{item.slug || 'untitled'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <a
                        href={`/news/${item.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 sm:flex-none flex justify-center items-center gap-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-3.5 py-2 rounded-lg font-semibold text-xs transition-all cursor-pointer"
                        title="View article on public website"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> Preview Live
                      </a>
                      <button
                        onClick={() => handleSaveItemAndClose(item.id)}
                        disabled={saving}
                        className="flex-1 sm:flex-none flex justify-center items-center gap-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-semibold text-sm transition-all shadow-sm cursor-pointer"
                      >
                        {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        <span>Save &amp; Done</span>
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm(`Delete article "${item.title || 'this item'}"?`)) {
                            handleDeleteNews(item.id);
                            const updatedList = newsList.filter(n => n.id !== item.id);
                            handleSaveAll(updatedList);
                            setEditingNewsId(null);
                          }
                        }}
                        className="flex-1 sm:flex-none flex justify-center items-center gap-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-900/20 text-rose-600 px-3 py-2 rounded-lg font-semibold text-sm transition-all cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" /> Delete
                      </button>
                      <button
                        onClick={() => setEditingNewsId(null)}
                        className="flex-1 sm:flex-none flex justify-center items-center gap-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white px-3 py-2 rounded-lg font-semibold text-sm transition-all cursor-pointer"
                      >
                        <X className="w-4 h-4" /> Close
                      </button>
                    </div>
                  </div>

                  {/* Public Website Sync & Visibility Banner */}
                  <div className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                    item.sync_to_public !== false
                      ? 'bg-emerald-50/80 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60'
                      : 'bg-amber-50/80 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/60'
                  }`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        item.sync_to_public !== false 
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' 
                          : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                      }`}>
                        {item.sync_to_public !== false ? <Globe className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-900 dark:text-white">
                            Public Website Status:
                          </span>
                          <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                            item.sync_to_public !== false
                              ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                              : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
                          }`}>
                            {item.sync_to_public !== false ? 'Live on Public Website' : 'Admin Only (Draft)'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                          {item.sync_to_public !== false 
                            ? 'This article is live, indexed by Google (sitemap-news.xml), and viewable by all public visitors.'
                            : 'This article is in draft mode and hidden from public visitors and search engine sitemaps.'}
                        </p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input 
                        type="checkbox"
                        checked={item.sync_to_public !== false}
                        onChange={e => handleNewsChange(item.id, 'sync_to_public', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-14 h-7 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-emerald-600"></div>
                    </label>
                  </div>

                  {/* Publishing Flags & Date Bar */}
                  <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700/80 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-center">
                    {/* Publication Date */}
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
                          Publication Date
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            const nowIso = new Date().toISOString();
                            handleNewsChange(item.id, 'date', nowIso);
                            handleNewsChange(item.id, 'published_at', nowIso);
                          }}
                          className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline font-bold cursor-pointer"
                        >
                          Set Today
                        </button>
                      </div>
                      <input
                        type="date"
                        value={(item.date || item.published_at || '').substring(0, 10)}
                        onChange={e => {
                          const val = e.target.value ? new Date(e.target.value).toISOString() : new Date().toISOString();
                          handleNewsChange(item.id, 'date', val);
                          handleNewsChange(item.id, 'published_at', val);
                        }}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-xs dark:text-white focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* Estimated Read Time */}
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
                          Read Time
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            const autoCalc = calculateReadingTime(item.content || item.description || '');
                            handleNewsChange(item.id, 'read_time', autoCalc);
                          }}
                          className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline font-bold cursor-pointer"
                        >
                          Auto Calculate
                        </button>
                      </div>
                      <input
                        type="text"
                        value={item.read_time || '3 min read'}
                        onChange={e => handleNewsChange(item.id, 'read_time', e.target.value)}
                        placeholder="3 min read"
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-xs dark:text-white focus:ring-2 focus:ring-blue-500 font-medium"
                      />
                    </div>

                    {/* Feature Toggles */}
                    <div className="sm:col-span-2 flex flex-wrap items-center gap-3 pt-2 sm:pt-0">
                      <label className="flex items-center gap-2 cursor-pointer bg-white dark:bg-slate-900 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold select-none hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                        <input
                          type="checkbox"
                          checked={Boolean(item.is_pinned)}
                          onChange={e => handleNewsChange(item.id, 'is_pinned', e.target.checked)}
                          className="rounded text-amber-500 focus:ring-amber-400 w-4 h-4 cursor-pointer"
                        />
                        <span className="flex items-center gap-1 text-slate-800 dark:text-slate-200">
                          <Pin className="w-3.5 h-3.5 text-amber-500" /> Pin to Top
                        </span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer bg-white dark:bg-slate-900 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold select-none hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                        <input
                          type="checkbox"
                          checked={Boolean(item.is_breaking)}
                          onChange={e => handleNewsChange(item.id, 'is_breaking', e.target.checked)}
                          className="rounded text-red-600 focus:ring-red-400 w-4 h-4 cursor-pointer"
                        />
                        <span className="flex items-center gap-1 text-slate-800 dark:text-slate-200">
                          <Flame className="w-3.5 h-3.5 text-red-500" /> Breaking News
                        </span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer bg-white dark:bg-slate-900 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold select-none hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                        <input
                          type="checkbox"
                          checked={Boolean(item.is_new)}
                          onChange={e => handleNewsChange(item.id, 'is_new', e.target.checked)}
                          className="rounded text-emerald-600 focus:ring-emerald-400 w-4 h-4 cursor-pointer"
                        />
                        <span className="flex items-center gap-1 text-slate-800 dark:text-slate-200">
                          <Sparkles className="w-3.5 h-3.5 text-emerald-500" /> New Badge
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* Form Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Left Column: General Info & Author */}
                    <div className="space-y-5">
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white border-b border-black/5 dark:border-white/5 pb-2">
                        General Article Information
                      </h4>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Article Title *</label>
                        <input
                          type="text"
                          value={item.title || ''}
                          onChange={e => handleNewsChange(item.id, 'title', e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-sm dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium"
                          placeholder="Article title"
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Slug (URL Path)</label>
                          <input
                            type="text"
                            value={item.slug || ''}
                            onChange={e => handleNewsChange(item.id, 'slug', e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-sm dark:text-white font-mono focus:ring-2 focus:ring-blue-500 transition-all"
                            placeholder="article-slug-url"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Category</label>
                          <input
                            type="text"
                            value={item.category || ''}
                            onChange={e => handleNewsChange(item.id, 'category', e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-sm dark:text-white focus:ring-2 focus:ring-blue-500 transition-all"
                            placeholder="Industry / Updates / Transparency"
                          />
                        </div>
                      </div>

                      {/* Thumbnail & Cover Image */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                          News Cover / Thumbnail URL (16:9 Aspect Ratio)
                        </label>
                        <ImageUpload
                          value={item.logo_url || item.image_url || ''}
                          onChange={val => {
                            handleNewsChange(item.id, 'logo_url', val);
                            handleNewsChange(item.id, 'image_url', val);
                          }}
                          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm dark:text-white font-mono focus-within:ring-2 focus-within:ring-blue-500 transition-all overflow-hidden"
                          placeholder="https://... (16:9 aspect ratio recommended)"
                        />
                        {(item.logo_url || item.image_url) && (
                          <div className="mt-3 flex items-center justify-center w-full max-w-sm rounded-xl overflow-hidden border border-black/10 dark:border-white/10 bg-slate-100 dark:bg-slate-800 p-2">
                            <img 
                              src={item.logo_url || item.image_url} 
                              alt="Thumbnail Preview" 
                              className="max-w-full h-auto max-h-40 object-contain rounded-md shadow-sm" 
                            />
                          </div>
                        )}
                      </div>

                      {/* Short Description */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                          Short Summary / Search Snippet *
                        </label>
                        <textarea
                          value={item.description || ''}
                          onChange={e => handleNewsChange(item.id, 'description', e.target.value)}
                          rows={3}
                          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-sm dark:text-white focus:ring-2 focus:ring-blue-500 transition-all leading-relaxed"
                          placeholder="Brief summary for listings, Google snippets, and social sharing..."
                        />
                      </div>

                      {/* Author Dossier */}
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white border-b border-black/5 dark:border-white/5 pb-2 mt-6">
                        Author &amp; Attribution
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Author / Lead Analyst</label>
                          <input
                            type="text"
                            value={item.ceo_name || item.author || ''}
                            onChange={e => {
                              handleNewsChange(item.id, 'ceo_name', e.target.value);
                              handleNewsChange(item.id, 'author', e.target.value);
                            }}
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-sm dark:text-white focus:ring-2 focus:ring-blue-500 transition-all"
                            placeholder="e.g. Admin Team"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Role / Bio Tagline</label>
                          <input
                            type="text"
                            value={item.ceo_description || ''}
                            onChange={e => handleNewsChange(item.id, 'ceo_description', e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-sm dark:text-white focus:ring-2 focus:ring-blue-500 transition-all"
                            placeholder="e.g. Transparency & Security Analyst"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Right Column: SEO & External Meta */}
                    <div className="space-y-5">
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white border-b border-black/5 dark:border-white/5 pb-2">
                        SEO Meta &amp; Social Graph
                      </h4>
                      <div className="grid gap-4">
                        <SeoFieldWithLimit
                          label="SEO Meta Title"
                          name={`news_seo_title_${item.id}`}
                          value={item.seo_title || ''}
                          onChange={val => handleNewsChange(item.id, 'seo_title', val)}
                          maxChars={58}
                          placeholder="Custom Google title tag (falls back to Title)..."
                          helperText="Recommended: 50–58 characters to avoid Google search truncation."
                        />
                        <SeoFieldWithLimit
                          label="SEO Meta Description"
                          type="textarea"
                          name={`news_seo_desc_${item.id}`}
                          value={item.seo_description || ''}
                          onChange={val => handleNewsChange(item.id, 'seo_description', val)}
                          maxChars={155}
                          rows={2}
                          placeholder="Custom Google snippet description (falls back to Summary)..."
                          helperText="Recommended: 130–155 characters to display fully in search snippets."
                        />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Social OG Image</label>
                            <ImageUpload
                              value={item.og_image_url || ''}
                              onChange={val => handleNewsChange(item.id, 'og_image_url', val)}
                              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm dark:text-white font-mono focus-within:ring-2 focus-within:ring-blue-500 transition-all overflow-hidden"
                              placeholder="https://..."
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Canonical URL</label>
                            <input
                              type="text"
                              value={item.canonical_url || ''}
                              onChange={e => handleNewsChange(item.id, 'canonical_url', e.target.value)}
                              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-sm dark:text-white font-mono focus:ring-2 focus:ring-blue-500 transition-all"
                              placeholder="/news/..."
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Target Region</label>
                            <input
                              type="text"
                              value={item.target_region || 'India'}
                              onChange={e => handleNewsChange(item.id, 'target_region', e.target.value)}
                              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-sm dark:text-white focus:ring-2 focus:ring-blue-500 transition-all"
                              placeholder="India / Global"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">SEO Keywords</label>
                            <input
                              type="text"
                              value={item.seo_keywords || ''}
                              onChange={e => handleNewsChange(item.id, 'seo_keywords', e.target.value)}
                              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-sm dark:text-white focus:ring-2 focus:ring-blue-500 transition-all"
                              placeholder="rummy news, updates, safety"
                            />
                          </div>
                        </div>

                        <h4 className="font-bold text-sm text-slate-900 dark:text-white border-b border-black/5 dark:border-white/5 pb-2 mt-4">
                          Cross-Links &amp; Relationships
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">External Source URL</label>
                            <input
                              type="text"
                              value={item.link || ''}
                              onChange={e => handleNewsChange(item.id, 'link', e.target.value)}
                              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-sm dark:text-white font-mono focus:ring-2 focus:ring-blue-500 transition-all"
                              placeholder="https://original-source-link..."
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Related Application</label>
                            <select
                              value={item.related_app_id || ''}
                              onChange={e => handleNewsChange(item.id, 'related_app_id', e.target.value)}
                              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-sm dark:text-white focus:ring-2 focus:ring-blue-500 transition-all"
                            >
                              <option value="">No App Linked</option>
                              {appsList && appsList.map((app: any) => (
                                <option key={app.id} value={app.id}>
                                  {app.name} ({app.id})
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* HTML Content Body & Live Preview */}
                  <div className="space-y-3 pt-6 border-t border-black/10 dark:border-white/10">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                      <div className="flex items-center gap-3">
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                          <FileText className="w-4 h-4 text-blue-500" /> Full Article Body (HTML / Markdown)
                        </h4>
                        <span className="text-xs text-slate-400">
                          {((item.content || item.description_html || '').trim().split(/\s+/).filter(Boolean).length)} words
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowHtmlPreview(prev => !prev)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                          showHtmlPreview
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>{showHtmlPreview ? 'Hide Preview' : 'Show Live HTML Preview'}</span>
                      </button>
                    </div>

                    {showHtmlPreview ? (
                      <div className="p-6 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl max-h-[400px] overflow-y-auto">
                        <div 
                          className="prose dark:prose-invert max-w-none text-sm text-slate-800 dark:text-slate-200 leading-relaxed"
                          dangerouslySetInnerHTML={{ __html: safeHtml(item.content || item.description_html || '<p><em>No content written yet.</em></p>') }}
                        />
                      </div>
                    ) : (
                      <textarea
                        value={item.content || item.description_html || ''}
                        onChange={e => {
                          handleNewsChange(item.id, 'content', e.target.value);
                          handleNewsChange(item.id, 'description_html', e.target.value);
                        }}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-4 text-slate-800 dark:text-slate-200 font-mono text-sm shadow-inner min-h-[280px] focus:ring-2 focus:ring-blue-500 transition-all leading-relaxed"
                        placeholder="<p>Full article body HTML content with paragraphs, headings, bullet points...</p>"
                      />
                    )}
                  </div>

                  {/* Editor Bottom Actions */}
                  <div className="pt-4 border-t border-black/10 dark:border-white/10 flex flex-col sm:flex-row justify-end items-center gap-3">
                    <button
                      onClick={() => setEditingNewsId(null)}
                      className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                    >
                      Close Editor
                    </button>
                    <button
                      onClick={() => handleSaveItemAndClose(item.id)}
                      disabled={saving}
                      className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 active:scale-95 disabled:opacity-50 text-white px-8 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                    >
                      {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      <span>Save &amp; Publish Article</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Collapsed Item View */
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="flex items-start gap-4">
                    {item.logo_url || item.image_url ? (
                      <div className="w-24 h-16 bg-slate-50 dark:bg-slate-900/50 rounded-xl flex items-center justify-center border border-black/10 dark:border-white/10 shadow-sm shrink-0 p-1 overflow-hidden">
                        <img
                          src={item.logo_url || item.image_url}
                          className="max-w-full max-h-full object-cover rounded-md"
                          loading="lazy"
                          alt={item.title}
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      </div>
                    ) : (
                      <div className="w-24 h-16 bg-blue-50 dark:bg-blue-900/20 text-blue-500 rounded-xl flex items-center justify-center border border-blue-100 dark:border-blue-800 shrink-0">
                        <Newspaper className="w-6 h-6" />
                      </div>
                    )}
                    <div>
                      <h3 className="font-bold text-base dark:text-white flex items-center gap-2 flex-wrap">
                        {item.title || 'Untitled News Article'}
                        
                        {/* Live / Draft Badge */}
                        {item.sync_to_public === false ? (
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 flex items-center gap-1">
                            <Lock className="w-2.5 h-2.5" /> Admin Only (Draft)
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-900/30 flex items-center gap-1">
                            <Globe className="w-2.5 h-2.5" /> Live on Public
                          </span>
                        )}

                        {/* Pinned Badge */}
                        {item.is_pinned && (
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-amber-500 text-white shadow-sm flex items-center gap-1">
                            <Pin className="w-2.5 h-2.5" /> Pinned
                          </span>
                        )}

                        {/* Breaking Badge */}
                        {item.is_breaking && (
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-red-600 text-white shadow-sm animate-pulse flex items-center gap-1">
                            <Flame className="w-2.5 h-2.5" /> Breaking
                          </span>
                        )}

                        {/* New Badge */}
                        {item.is_new && !item.is_breaking && (
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-600 text-white shadow-sm flex items-center gap-1">
                            <Sparkles className="w-2.5 h-2.5" /> New
                          </span>
                        )}

                        {/* Category Tag */}
                        {item.category && (
                          <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            {item.category}
                          </span>
                        )}
                      </h3>

                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                        {item.description || 'No description provided.'}
                      </p>

                      <div className="flex items-center gap-3 text-[11px] text-slate-400 dark:text-slate-500 mt-2 font-mono flex-wrap">
                        <span>Slug: /{item.slug || 'untitled'}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          {new Date(item.date || item.published_at || item.created_at || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                        {item.read_time && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400" /> {item.read_time}
                            </span>
                          </>
                        )}
                        {(item.ceo_name || item.author) && (
                          <>
                            <span>•</span>
                            <span className="text-slate-600 dark:text-slate-300 font-sans">
                              By: {item.ceo_name || item.author}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
                    {/* View Live Link */}
                    {item.slug && item.sync_to_public !== false && (
                      <a
                        href={`/news/${item.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-3 py-2 rounded-lg font-semibold text-xs transition-all cursor-pointer"
                        title="Open live article in new tab"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> View
                      </a>
                    )}

                    {/* Quick Pin Toggle */}
                    <button
                      type="button"
                      onClick={() => {
                        const newPinned = !item.is_pinned;
                        handleNewsChange(item.id, 'is_pinned', newPinned);
                        const updatedList = newsList.map(n => n.id === item.id ? { ...n, is_pinned: newPinned } : n);
                        handleSaveAll(updatedList);
                      }}
                      className={`flex items-center gap-1 px-2.5 py-2 rounded-lg font-semibold text-xs transition-all border cursor-pointer ${
                        item.is_pinned
                          ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
                      }`}
                      title={item.is_pinned ? "Click to unpin" : "Click to pin article to the top"}
                    >
                      <Pin className="w-3.5 h-3.5" />
                    </button>

                    {/* Quick Live Toggle */}
                    <button
                      type="button"
                      onClick={() => {
                        const newStatus = !(item.sync_to_public !== false);
                        handleNewsChange(item.id, 'sync_to_public', newStatus);
                        const updatedList = newsList.map(n => n.id === item.id ? { ...n, sync_to_public: newStatus } : n);
                        handleSaveAll(updatedList);
                      }}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-semibold text-xs transition-all border cursor-pointer ${
                        item.sync_to_public !== false
                          ? 'bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                          : 'bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                      }`}
                      title={item.sync_to_public !== false ? "Click to unpublish from public website" : "Click to publish live to public website"}
                    >
                      {item.sync_to_public !== false ? <Globe className="w-3.5 h-3.5 text-emerald-500" /> : <Lock className="w-3.5 h-3.5 text-amber-500" />}
                      <span>{item.sync_to_public !== false ? 'Live' : 'Draft'}</span>
                    </button>

                    {/* Edit */}
                    <button
                      onClick={() => setEditingNewsId(item.id)}
                      className="flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-3.5 py-2 rounded-lg font-semibold text-xs transition-all cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" /> Edit
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => {
                        if (window.confirm(`Delete article "${item.title || 'this item'}"?`)) {
                          handleDeleteNews(item.id);
                          const updatedList = newsList.filter(n => n.id !== item.id);
                          handleSaveAll(updatedList);
                        }
                      }}
                      className="flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 px-3.5 py-2 rounded-lg font-semibold text-xs transition-all cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Bottom Sticky Sync Bar */}
      {newsList.length > 0 && (
        <div className="mt-8 pt-6 border-t border-black/10 dark:border-white/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Clicking Save &amp; Publish synchronizes all news entries to Cloud Firestore and local storage, immediately updating the public website.
          </p>
          <button
            onClick={() => handleSaveAll()}
            disabled={saving}
            className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 active:scale-95 disabled:opacity-50 text-white px-8 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
          >
            {saving ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>{saving ? 'Synchronizing...' : 'Save & Publish All News'}</span>
          </button>
        </div>
      )}
    </div>
  );
});

AdminNewsTab.displayName = 'AdminNewsTab';

export default AdminNewsTab;
