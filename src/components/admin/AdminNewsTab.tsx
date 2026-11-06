import React, { useState, useMemo, useRef } from 'react';
import {
  Newspaper,
  Plus,
  Trash2,
  Save,
  RefreshCw,
  Pin,
  Search,
  Edit3,
  Eye,
  Code,
  Globe,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Lock,
  X,
  ArrowLeft,
  Wand2,
  Smartphone,
  ChevronDown,
  ChevronUp,
  User
} from 'lucide-react';
import ImageUpload from '../ImageUpload';
import { SeoFieldWithLimit } from './SeoFieldWithLimit';
import { adminFetch } from '../../services/adminAuthService';
import { safeHtml, structureHtmlFragment } from '../../lib/safeHtmlPublic';

interface AdminNewsTabProps {
  newsList: any[];
  saving: boolean;
  handleAddNews: () => string;
  handleNewsChange: (id: string, field: string, value: any) => void;
  handleDeleteNews: (id: string) => void;
  saveNews: (list: any[]) => Promise<void>;
  saveNewsSingle?: (singleItem: any) => Promise<void> | void;
  setSaving: (saving: boolean) => void;
  appsList?: any[];
}

const QUICK_CATEGORIES = [
  'General',
  'Security Update',
  'App Release',
  'Industry News',
  'Platform Guide',
  'Safety Alert',
  'Review & Analysis'
];

function createBlankDraft(): any {
  const newId = Math.random().toString(36).substring(2, 11);
  const nowIso = new Date().toISOString();
  return {
    id: newId,
    slug: '',
    title: '',
    category: 'General',
    logo_url: '',
    image_url: '',
    og_image_url: '',
    description: '',
    content: '',
    description_html: '',
    ceo_name: 'Admin Team',
    author: 'Admin Team',
    ceo_description: 'Transparency & Security Analyst',
    seo_title: '',
    meta_title: '',
    seo_description: '',
    meta_description: '',
    seo_keywords: '',
    canonical_url: '',
    target_region: 'Global',
    link: '',
    related_app_id: '',
    created_at: nowIso,
    date: nowIso,
    published_at: nowIso,
    updated_at: nowIso,
    read_time: '3 min read',
    is_pinned: false,
    is_breaking: false,
    is_new: true,
    sync_to_public: true
  };
}

function normalizeDraftForSave(raw: any): any {
  const nowIso = new Date().toISOString();
  const title = String(raw.title || '').trim() || 'Untitled News Article';
  const rawSlug = String(raw.slug || '').trim();
  const slug = rawSlug
    ? rawSlug.toLowerCase().replace(/[^a-z0-9-_]+/g, '-').replace(/(^-|-$)/g, '')
    : title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `news-${raw.id}`;

  const rawBody = String(raw.content ?? raw.description_html ?? '').trim();
  const structuredBody = rawBody ? structureHtmlFragment(rawBody) : '';
  const coverImg = String(raw.logo_url || raw.image_url || '').trim();
  const ogImg = String(raw.og_image_url || coverImg || '').trim();

  // Plain text summary fallback for auto SEO
  const plainBody = structuredBody
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const summaryText = String(raw.description || '').trim();

  // Auto-populate SEO title & description if left blank so mobile publishing is 1-step
  const seoTitle = String(raw.seo_title || raw.meta_title || title.slice(0, 58)).trim();
  const seoDesc = String(
    raw.seo_description || raw.meta_description || (summaryText || plainBody).slice(0, 155)
  ).trim();

  const authorName = String(raw.ceo_name || raw.author || 'Admin Team').trim();
  const pubDate = raw.date || raw.published_at || raw.created_at || nowIso;

  // Calculate read time automatically if default or empty
  const words = plainBody ? plainBody.split(/\s+/).length : 0;
  const computedReadTime = words > 0 ? `${Math.max(1, Math.ceil(words / 200))} min read` : '3 min read';
  const readTime = String(raw.read_time || computedReadTime).trim() || computedReadTime;

  return {
    ...raw,
    id: String(raw.id || Math.random().toString(36).substring(2, 11)).trim(),
    title,
    slug,
    category: String(raw.category || 'General').trim() || 'General',
    logo_url: coverImg,
    image_url: coverImg,
    og_image_url: ogImg,
    description: summaryText,
    content: structuredBody,
    description_html: structuredBody,
    seo_title: seoTitle,
    meta_title: seoTitle,
    seo_description: seoDesc,
    meta_description: seoDesc,
    seo_keywords: String(raw.seo_keywords || '').trim(),
    canonical_url: String(raw.canonical_url || '').trim(),
    target_region: String(raw.target_region || 'Global').trim(),
    link: String(raw.link || '').trim(),
    related_app_id: String(raw.related_app_id || '').trim(),
    ceo_name: authorName,
    author: authorName,
    ceo_description: String(raw.ceo_description || 'Transparency & Security Analyst').trim(),
    date: pubDate,
    published_at: pubDate,
    updated_at: nowIso,
    read_time: readTime,
    is_pinned: Boolean(raw.is_pinned),
    is_breaking: Boolean(raw.is_breaking),
    is_new: Boolean(raw.is_new),
    sync_to_public: raw.sync_to_public !== false
  };
}

export const AdminNewsTab: React.FC<AdminNewsTabProps> = ({
  newsList,
  saving,
  handleDeleteNews,
  saveNews,
  saveNewsSingle,
  setSaving,
  appsList = []
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'live' | 'draft' | 'pinned'>('all');

  // Dedicated Editor State
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [draft, setDraft] = useState<any>(() => createBlankDraft());
  const [htmlViewMode, setHtmlViewMode] = useState<'edit' | 'preview'>('edit');
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [isAiFormatting, setIsAiFormatting] = useState(false);
  const [editorNotice, setEditorNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Clean collapsible sections for optional settings (keeps mobile screen 100% uncluttered)
  const [showSeoSection, setShowSeoSection] = useState(false);
  const [showAuthorSection, setShowAuthorSection] = useState(false);

  const htmlTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  const filteredNews = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return (newsList || [])
      .filter((item) => {
        if (statusFilter === 'live' && item.sync_to_public === false) return false;
        if (statusFilter === 'draft' && item.sync_to_public !== false) return false;
        if (statusFilter === 'pinned' && !item.is_pinned) return false;
        if (!q) return true;
        return (
          (item.title || '').toLowerCase().includes(q) ||
          (item.slug || '').toLowerCase().includes(q) ||
          (item.category || '').toLowerCase().includes(q) ||
          (item.description || '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        if (a.is_pinned && !b.is_pinned) return -1;
        if (!a.is_pinned && b.is_pinned) return 1;
        return new Date(b.date || b.created_at || 0).getTime() - new Date(a.date || a.created_at || 0).getTime();
      });
  }, [newsList, searchQuery, statusFilter]);

  const { totalCount, liveCount, draftCount, pinnedCount } = useMemo(() => {
    let live = 0, draftC = 0, pinned = 0;
    for (let i = 0; i < newsList.length; i++) {
      const n = newsList[i];
      if (n.sync_to_public !== false) live++;
      else draftC++;
      if (n.is_pinned) pinned++;
    }
    return { totalCount: newsList.length, liveCount: live, draftCount: draftC, pinnedCount: pinned };
  }, [newsList]);

  const openNewArticleEditor = () => {
    setDraft(createBlankDraft());
    setIsCreatingNew(true);
    setSlugManuallyEdited(false);
    setHtmlViewMode('edit');
    setShowSeoSection(false);
    setShowAuthorSection(false);
    setEditorNotice(null);
    setIsEditorOpen(true);
  };

  const openEditArticleEditor = (item: any) => {
    const bodyHtml = item.content || item.description_html || '';
    const coverImg = item.logo_url || item.image_url || '';
    setDraft({
      ...createBlankDraft(),
      ...item,
      content: bodyHtml,
      description_html: bodyHtml,
      logo_url: coverImg,
      image_url: coverImg,
      seo_title: item.seo_title || item.meta_title || '',
      seo_description: item.seo_description || item.meta_description || '',
      ceo_name: item.ceo_name || item.author || 'Admin Team',
      author: item.author || item.ceo_name || 'Admin Team',
      date: item.date || item.published_at || item.created_at || new Date().toISOString(),
      sync_to_public: item.sync_to_public !== false
    });
    setIsCreatingNew(false);
    setSlugManuallyEdited(true);
    setHtmlViewMode('edit');
    setShowSeoSection(false);
    setShowAuthorSection(false);
    setEditorNotice(null);
    setIsEditorOpen(true);
  };

  const updateDraft = (field: string, value: any) => {
    setDraft((prev: any) => {
      const next: any = { ...prev, [field]: value };
      if (field === 'title' && !slugManuallyEdited) {
        next.slug = String(value || '')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '');
      }
      if (field === 'content' || field === 'description_html') {
        next.content = value;
        next.description_html = value;
      }
      if (field === 'logo_url' || field === 'image_url') {
        next.logo_url = value;
        next.image_url = value;
      }
      if (field === 'seo_title' || field === 'meta_title') {
        next.seo_title = value;
        next.meta_title = value;
      }
      if (field === 'seo_description' || field === 'meta_description') {
        next.seo_description = value;
        next.meta_description = value;
      }
      if (field === 'ceo_name' || field === 'author') {
        next.ceo_name = value;
        next.author = value;
      }
      if (field === 'date' || field === 'published_at') {
        next.date = value;
        next.published_at = value;
      }
      return next;
    });
  };

  const insertHtmlTag = (before: string, after: string = '', sample: string = 'Text here') => {
    const el = htmlTextareaRef.current;
    const current = String(draft.content || draft.description_html || '');
    if (!el) {
      updateDraft('content', `${current}${current ? '\n' : ''}${before}${sample}${after}`);
      return;
    }
    const start = el.selectionStart ?? current.length;
    const end = el.selectionEnd ?? current.length;
    const selected = current.slice(start, end) || sample;
    const nextVal = current.slice(0, start) + before + selected + after + current.slice(end);
    updateDraft('content', nextVal);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + before.length, start + before.length + selected.length);
    }, 10);
  };

  const handleAutoFillSeoFromArticle = () => {
    const cleanHeadline = String(draft.title || '').trim().slice(0, 58);
    const rawSummary = String(draft.description || '').trim();
    const plainBody = String(draft.content || '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const cleanDesc = (rawSummary || plainBody).slice(0, 155);
    const coverImg = String(draft.logo_url || draft.image_url || '').trim();

    setDraft((prev: any) => ({
      ...prev,
      seo_title: cleanHeadline,
      meta_title: cleanHeadline,
      seo_description: cleanDesc,
      meta_description: cleanDesc,
      og_image_url: prev.og_image_url || coverImg
    }));
    setEditorNotice({ type: 'success', text: 'SEO Title, Description & Social Image synced from article!' });
  };

  const handleAiFormatArticleHtml = async () => {
    const rawContent = String(draft.content || draft.description_html || '').trim();
    if (!rawContent) {
      setEditorNotice({ type: 'error', text: 'Write or paste your article text first before formatting.' });
      return;
    }
    setIsAiFormatting(true);
    setEditorNotice(null);
    try {
      const res = await adminFetch('/api/v1/admin/ai-format-html', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: rawContent,
          appName: draft.title || 'News Article'
        })
      });
      const data = await res.json();
      if (data.success && data.formattedHtml) {
        updateDraft('content', data.formattedHtml);
        setEditorNotice({
          type: 'success',
          text: '✨ Article formatted into clean HTML headings & paragraphs!'
        });
      } else {
        const localStructured = structureHtmlFragment(rawContent);
        updateDraft('content', localStructured);
        setEditorNotice({
          type: 'success',
          text: '✨ Structured paragraphs and headings into clean HTML.'
        });
      }
    } catch (_) {
      const localStructured = structureHtmlFragment(rawContent);
      updateDraft('content', localStructured);
      setEditorNotice({
        type: 'success',
        text: '✨ Structured paragraphs and headings into clean HTML.'
      });
    } finally {
      setIsAiFormatting(false);
    }
  };

  const handleSaveDraftToFirebase = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!String(draft.title || '').trim()) {
      setEditorNotice({ type: 'error', text: 'Please enter an Article Headline (Title).' });
      return;
    }

    const normalizedItem = normalizeDraftForSave(draft);

    if (saveNewsSingle) {
      await saveNewsSingle(normalizedItem);
      setIsEditorOpen(false);
      setIsCreatingNew(false);
      return;
    }

    const existsInList = newsList.some((n) => n.id === normalizedItem.id);
    const updatedList = existsInList
      ? newsList.map((n) => (n.id === normalizedItem.id ? normalizedItem : n))
      : [normalizedItem, ...newsList];

    setSaving(true);
    try {
      await saveNews(updatedList);
      setIsEditorOpen(false);
      setIsCreatingNew(false);
    } finally {
      setSaving(false);
    }
  };

  const handleQuickToggleStatus = async (item: any) => {
    const nextSync = !(item.sync_to_public !== false);
    const updatedItem = normalizeDraftForSave({
      ...item,
      sync_to_public: nextSync
    });
    if (saveNewsSingle) {
      await saveNewsSingle(updatedItem);
      return;
    }
    const updatedList = newsList.map((n) => (n.id === item.id ? updatedItem : n));
    setSaving(true);
    try {
      await saveNews(updatedList);
    } finally {
      setSaving(false);
    }
  };

  const handleQuickTogglePin = async (item: any) => {
    const nextPin = !item.is_pinned;
    const updatedItem = normalizeDraftForSave({
      ...item,
      is_pinned: nextPin
    });
    if (saveNewsSingle) {
      await saveNewsSingle(updatedItem);
      return;
    }
    const updatedList = newsList.map((n) => (n.id === item.id ? updatedItem : n));
    setSaving(true);
    try {
      await saveNews(updatedList);
    } finally {
      setSaving(false);
    }
  };

  const linkedAppPreview = useMemo(() => {
    if (!draft.related_app_id) return null;
    return appsList.find((a) => a.id === draft.related_app_id || a.slug === draft.related_app_id) || null;
  }, [draft.related_app_id, appsList]);

  return (
    <div className="animate-fade-in space-y-2.5 sm:space-y-3.5 pb-6">
      {/* Compact Header & Controls */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-2.5 sm:p-3.5 shadow-xs space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-xl bg-blue-600/10 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Newspaper className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white truncate">
                News ({totalCount})
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={openNewArticleEditor}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer border-0 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>New Article</span>
            </button>
          </div>
        </div>

        {/* Search & Filter Strip */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            {[
              { id: 'all', label: 'All', count: totalCount },
              { id: 'live', label: 'Live', count: liveCount },
              { id: 'draft', label: 'Drafts', count: draftCount },
              { id: 'pinned', label: 'Pinned', count: pinnedCount }
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id as any)}
                className={`shrink-0 px-2.5 py-1 rounded-xl text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
                  statusFilter === tab.id
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-slate-50 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 border-slate-200/70 dark:border-slate-700/70'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                    statusFilter === tab.id
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-200/70 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-60">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search news..."
              className="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl pl-8 pr-7 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold border-0 bg-transparent cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* News Articles List */}
      {filteredNews.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 text-center space-y-2">
          <Newspaper className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
          <div className="text-sm font-bold text-slate-800 dark:text-slate-200">No articles found</div>
          <button
            type="button"
            onClick={openNewArticleEditor}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold border-0 cursor-pointer"
          >
            + Add First Article
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3">
          {filteredNews.map((item) => {
            const cover = item.logo_url || item.image_url || '';
            const linkedApp = item.related_app_id
              ? appsList.find((a) => a.id === item.related_app_id || a.slug === item.related_app_id)
              : null;
            const isConfirmingDelete = confirmDeleteId === item.id;

            return (
              <div
                key={item.id}
                className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-2.5 sm:p-3 transition-all shadow-xs flex flex-col justify-between gap-2"
              >
                {/* Card Content Row */}
                <div
                  onClick={() => openEditArticleEditor(item)}
                  className="flex items-start gap-2.5 cursor-pointer"
                >
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 overflow-hidden shrink-0 flex items-center justify-center">
                    {cover ? (
                      <img
                        src={cover}
                        alt=""
                        loading="lazy"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <Newspaper className="w-5 h-5 text-slate-400" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 flex-wrap mb-0.5">
                      <span className="px-1.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 text-[10px] font-bold">
                        {item.category || 'General'}
                      </span>

                      {item.sync_to_public !== false ? (
                        <span className="px-1.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold flex items-center gap-1">
                          <Globe className="w-2.5 h-2.5" /> Live
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 text-[10px] font-bold flex items-center gap-1">
                          <Lock className="w-2.5 h-2.5" /> Draft
                        </span>
                      )}

                      {item.is_pinned && (
                        <span className="px-1.5 py-0.5 rounded-md bg-amber-500 text-white text-[9px] font-black">
                          📌 Pinned
                        </span>
                      )}
                    </div>

                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white line-clamp-2 leading-snug">
                      {item.title || 'Untitled Article'}
                    </h3>

                    <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400 dark:text-slate-500">
                      <span>
                        {item.date
                          ? new Date(item.date).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })
                          : 'Today'}
                      </span>
                      {linkedApp && (
                        <>
                          <span>•</span>
                          <span className="text-indigo-600 dark:text-indigo-400 font-semibold truncate max-w-[140px]">
                            📱 {linkedApp.name}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Simple 1-Tap Action Row */}
                <div className="flex items-center justify-between gap-1.5 pt-1.5 border-t border-slate-100 dark:border-slate-800/80">
                  <button
                    type="button"
                    onClick={() => openEditArticleEditor(item)}
                    className="flex-1 py-1.5 px-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer border-0 active:scale-95"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickToggleStatus(item)}
                    disabled={saving}
                    className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer border ${
                      item.sync_to_public !== false
                        ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60'
                        : 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60'
                    }`}
                  >
                    {item.sync_to_public !== false ? 'Live' : 'Draft'}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickTogglePin(item)}
                    disabled={saving}
                    title={item.is_pinned ? 'Unpin' : 'Pin to Top'}
                    className={`p-1.5 rounded-xl transition-all cursor-pointer border ${
                      item.is_pinned
                        ? 'bg-amber-500 text-white border-amber-500'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <Pin className="w-3.5 h-3.5" />
                  </button>

                  {item.slug && (
                    <a
                      href={`/news/${item.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="View Public Page"
                      className="p-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center justify-center"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}

                  {isConfirmingDelete ? (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setConfirmDeleteId(null);
                          handleDeleteNews(item.id);
                        }}
                        className="px-2 py-1.5 bg-rose-600 text-white rounded-xl text-[10px] font-black uppercase border-0 cursor-pointer"
                      >
                        Delete
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-2 py-1.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-[10px] font-bold border-0 cursor-pointer"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(item.id)}
                      title="Delete Article"
                      className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border border-rose-200/60 dark:border-rose-800/50 transition-all cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* =====================================================================
          CLEAN SINGLE-PAGE MOBILE NEWS EDITOR (Top Save Only — No Bottom Bar)
         ===================================================================== */}
      {isEditorOpen && (
        <div className="fixed inset-0 z-[999999] bg-slate-950/60 backdrop-blur-xs flex items-stretch sm:items-center justify-center sm:p-3 animate-fade-in">
          <form
            onSubmit={handleSaveDraftToFirebase}
            className="bg-white dark:bg-slate-900 w-full sm:max-w-3xl h-[100dvh] sm:h-[94dvh] sm:rounded-2xl border-0 sm:border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Clean Top Bar: Back Button + Title + Live/Pin + SAVE Button */}
            <div className="px-2.5 py-2 sm:px-4 sm:py-2.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-1.5 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <button
                  type="button"
                  onClick={() => setIsEditorOpen(false)}
                  className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-0 cursor-pointer shrink-0"
                  title="Close Editor"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div className="min-w-0">
                  <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate">
                    {isCreatingNew ? 'New Article' : 'Edit Article'}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-mono truncate">
                    /news/{draft.slug || 'auto-slug'}
                  </p>
                </div>
              </div>

              {/* Quick Visibility, Pin & Top Save Button */}
              <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => updateDraft('sync_to_public', !(draft.sync_to_public !== false))}
                  className={`px-2 py-1.5 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
                    draft.sync_to_public !== false
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-amber-500 text-white border-amber-500'
                  }`}
                >
                  {draft.sync_to_public !== false ? 'Live' : 'Draft'}
                </button>
                <button
                  type="button"
                  onClick={() => updateDraft('is_pinned', !draft.is_pinned)}
                  className={`px-2 py-1.5 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
                    draft.is_pinned
                      ? 'bg-amber-500 text-white border-amber-500'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  📌
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer border-0 disabled:opacity-50 active:scale-95"
                >
                  {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>{saving ? 'Saving...' : 'Save'}</span>
                </button>
              </div>
            </div>

            {/* Feedback Banner */}
            {editorNotice && (
              <div
                className={`mx-2.5 mt-2 p-2 rounded-xl text-xs font-semibold flex items-center justify-between gap-2 shrink-0 ${
                  editorNotice.type === 'success'
                    ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                    : 'bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  {editorNotice.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  )}
                  <span>{editorNotice.text}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setEditorNotice(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 bg-transparent border-0 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Single-Scroll Clean Body */}
            <div className="flex-1 overflow-y-auto p-2.5 sm:p-4 pb-6 space-y-3 custom-scrollbar">
              {/* 1. Headline (Title) */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                  1. Article Title (Headline) *
                </label>
                <input
                  type="text"
                  required
                  value={draft.title || ''}
                  onChange={(e) => updateDraft('title', e.target.value)}
                  placeholder="Enter news headline..."
                  className="w-full bg-slate-50/70 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* 2. Cover Image & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                    2. Cover Image URL
                  </label>
                  <div className="flex items-center gap-2">
                    <ImageUpload
                      name="news_cover_url"
                      value={draft.logo_url || draft.image_url || ''}
                      onChange={(val) => updateDraft('logo_url', val)}
                      placeholder="Paste Cloudinary URL or upload..."
                      className="flex-1 bg-slate-50/70 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100 overflow-hidden"
                    />
                    {(draft.logo_url || draft.image_url) && (
                      <img
                        src={draft.logo_url || draft.image_url}
                        alt="Cover"
                        className="w-9 h-9 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                    3. Category & App Link
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <select
                      value={QUICK_CATEGORIES.includes(draft.category) ? draft.category : 'Custom'}
                      onChange={(e) => {
                        if (e.target.value !== 'Custom') {
                          updateDraft('category', e.target.value);
                        }
                      }}
                      className="w-full bg-slate-50/70 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-2 py-2 text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500 cursor-pointer"
                    >
                      {QUICK_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>

                    <select
                      value={draft.related_app_id || ''}
                      onChange={(e) => updateDraft('related_app_id', e.target.value)}
                      className="w-full bg-slate-50/70 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-2 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500 cursor-pointer"
                      title="Connect an App to display a download card inside this news article"
                    >
                      <option value="">📱 No App Linked</option>
                      {appsList.map((app) => (
                        <option key={app.id} value={app.id}>
                          {app.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  {linkedAppPreview && (
                    <div className="mt-1 flex items-center justify-between bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-800/50 rounded-lg px-2 py-1 text-[10px] font-bold text-indigo-700 dark:text-indigo-300">
                      <span className="truncate">✓ Linked App: {linkedAppPreview.name}</span>
                      <button
                        type="button"
                        onClick={() => updateDraft('related_app_id', '')}
                        className="text-rose-500 hover:underline bg-transparent border-0 cursor-pointer ml-2"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* 4. Short Summary */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                  4. Short Summary (News Cards & Auto-SEO)
                </label>
                <textarea
                  rows={2}
                  value={draft.description || ''}
                  onChange={(e) => updateDraft('description', e.target.value)}
                  placeholder="Write 1–2 short sentences summarizing this news..."
                  className="w-full bg-slate-50/70 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* 5. Article Content (HTML or Plain Text) */}
              <div className="bg-slate-50/70 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-800 rounded-2xl p-2.5 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-1.5">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">
                    5. Article Content (HTML or Text)
                  </label>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleAiFormatArticleHtml}
                      disabled={isAiFormatting}
                      className="px-2 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer border-0 disabled:opacity-50"
                    >
                      {isAiFormatting ? (
                        <RefreshCw className="w-3 h-3 animate-spin" />
                      ) : (
                        <Wand2 className="w-3 h-3" />
                      )}
                      <span>{isAiFormatting ? 'Formatting...' : 'Clean HTML'}</span>
                    </button>

                    <div className="inline-flex rounded-lg bg-slate-200/80 dark:bg-slate-900 p-0.5">
                      <button
                        type="button"
                        onClick={() => setHtmlViewMode('edit')}
                        className={`px-2 py-1 rounded-md text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer border-0 ${
                          htmlViewMode === 'edit'
                            ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-2xs'
                            : 'bg-transparent text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        <Code className="w-3 h-3" /> Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => setHtmlViewMode('preview')}
                        className={`px-2 py-1 rounded-md text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer border-0 ${
                          htmlViewMode === 'preview'
                            ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-2xs'
                            : 'bg-transparent text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        <Eye className="w-3 h-3" /> Preview
                      </button>
                    </div>
                  </div>
                </div>

                {/* Simple 1-Tap HTML Tag Toolbar */}
                {htmlViewMode === 'edit' && (
                  <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-0.5">
                    {[
                      { label: 'H2', action: () => insertHtmlTag('<h2>', '</h2>', 'Section Heading') },
                      { label: 'H3', action: () => insertHtmlTag('<h3>', '</h3>', 'Subheading') },
                      { label: 'Paragraph', action: () => insertHtmlTag('<p>', '</p>', 'Paragraph text...') },
                      { label: 'Bold', action: () => insertHtmlTag('<strong>', '</strong>', 'important text') },
                      {
                        label: 'List',
                        action: () =>
                          insertHtmlTag('<ul>\n  <li>', '</li>\n  <li>Second point</li>\n</ul>', 'First point')
                      },
                      { label: 'Quote', action: () => insertHtmlTag('<blockquote>', '</blockquote>', 'Key quote...') },
                      {
                        label: 'Link',
                        action: () =>
                          insertHtmlTag('<a href="https://" target="_blank" rel="noopener noreferrer">', '</a>', 'Link Text')
                      }
                    ].map((btn) => (
                      <button
                        key={btn.label}
                        type="button"
                        onClick={btn.action}
                        className="shrink-0 px-2 py-1 rounded-lg bg-white dark:bg-slate-900 hover:bg-blue-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-[11px] font-bold transition-colors cursor-pointer"
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>
                )}

                {htmlViewMode === 'edit' ? (
                  <textarea
                    ref={htmlTextareaRef}
                    rows={9}
                    value={draft.content || draft.description_html || ''}
                    onChange={(e) => updateDraft('content', e.target.value)}
                    placeholder="Write or paste your news article here. Plain text paragraphs are automatically converted to clean HTML on save..."
                    className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs sm:text-sm font-mono leading-relaxed text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                ) : (
                  <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 min-h-[200px] max-h-[360px] overflow-y-auto">
                    {(draft.content || draft.description_html || '').trim() ? (
                      <div
                        className="prose prose-sm dark:prose-invert max-w-none text-slate-800 dark:text-slate-200 leading-relaxed"
                        dangerouslySetInnerHTML={{
                          __html: safeHtml(structureHtmlFragment(draft.content || draft.description_html || ''))
                        }}
                      />
                    ) : (
                      <p className="text-xs text-slate-400 italic text-center py-8">
                        Nothing to preview yet. Switch to Edit to write your article.
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* ===============================================================
                  OPTIONAL ACCORDION 1: SEO & URL SETTINGS (AUTO-FILLED)
                 =============================================================== */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900">
                <button
                  type="button"
                  onClick={() => setShowSeoSection(!showSeoSection)}
                  className="w-full px-3 py-2.5 flex items-center justify-between gap-2 bg-slate-50/70 dark:bg-slate-800/40 hover:bg-slate-100/70 dark:hover:bg-slate-800 transition-colors cursor-pointer border-0 text-left"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Globe className="w-4 h-4 text-blue-500 shrink-0" />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                      SEO, URL Slug & Social Sharing
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold shrink-0">
                      Auto-Synced
                    </span>
                  </div>
                  {showSeoSection ? (
                    <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                  )}
                </button>

                {showSeoSection && (
                  <div className="p-3 space-y-3 border-t border-slate-200 dark:border-slate-800 animate-fade-in">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        Auto-fills from Headline & Summary if left blank:
                      </span>
                      <button
                        type="button"
                        onClick={handleAutoFillSeoFromArticle}
                        className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 text-[11px] font-bold border border-blue-200 dark:border-blue-800 cursor-pointer shrink-0"
                      >
                        Sync from Article
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                          URL Slug
                        </label>
                        <input
                          type="text"
                          value={draft.slug || ''}
                          onChange={(e) => {
                            setSlugManuallyEdited(true);
                            updateDraft('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-_]+/g, '-'));
                          }}
                          placeholder="auto-generated-from-title"
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-mono font-semibold text-blue-600 dark:text-blue-400"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                          SEO Keywords (Comma separated)
                        </label>
                        <input
                          type="text"
                          value={draft.seo_keywords || ''}
                          onChange={(e) => updateDraft('seo_keywords', e.target.value)}
                          placeholder="security, update, release"
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100"
                        />
                      </div>
                    </div>

                    <SeoFieldWithLimit
                      label="SEO Meta Title (Max 58 chars)"
                      name="news_seo_title"
                      value={draft.seo_title || ''}
                      onChange={(val) => updateDraft('seo_title', val)}
                      maxChars={58}
                      placeholder={draft.title || 'Auto-filled from headline...'}
                    />

                    <SeoFieldWithLimit
                      label="SEO Meta Description (Max 155 chars)"
                      type="textarea"
                      name="news_seo_description"
                      value={draft.seo_description || ''}
                      onChange={(val) => updateDraft('seo_description', val)}
                      maxChars={155}
                      rows={2}
                      placeholder={draft.description || 'Auto-filled from summary...'}
                    />

                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                        Social Share OG Image URL (Defaults to Cover Image)
                      </label>
                      <ImageUpload
                        name="news_og_image_url"
                        value={draft.og_image_url || ''}
                        onChange={(val) => updateDraft('og_image_url', val)}
                        placeholder={draft.logo_url || 'https://res.cloudinary.com/...'}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100 overflow-hidden"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* ===============================================================
                  OPTIONAL ACCORDION 2: AUTHOR, DATE & BADGES
                 =============================================================== */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900">
                <button
                  type="button"
                  onClick={() => setShowAuthorSection(!showAuthorSection)}
                  className="w-full px-3 py-2.5 flex items-center justify-between gap-2 bg-slate-50/70 dark:bg-slate-800/40 hover:bg-slate-100/70 dark:hover:bg-slate-800 transition-colors cursor-pointer border-0 text-left"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <User className="w-4 h-4 text-indigo-500 shrink-0" />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                      Author, Publish Date & Extra Badges
                    </span>
                    <span className="text-[10px] text-slate-400 truncate hidden sm:inline">
                      ({draft.ceo_name || 'Admin Team'} • {draft.read_time || '3 min read'})
                    </span>
                  </div>
                  {showAuthorSection ? (
                    <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                  )}
                </button>

                {showAuthorSection && (
                  <div className="p-3 space-y-3 border-t border-slate-200 dark:border-slate-800 animate-fade-in">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                          Author Name
                        </label>
                        <input
                          type="text"
                          value={draft.ceo_name || ''}
                          onChange={(e) => updateDraft('ceo_name', e.target.value)}
                          placeholder="Admin Team"
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                          Author Role / Title
                        </label>
                        <input
                          type="text"
                          value={draft.ceo_description || ''}
                          onChange={(e) => updateDraft('ceo_description', e.target.value)}
                          placeholder="Transparency & Security Analyst"
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                            Publish Date
                          </label>
                          <button
                            type="button"
                            onClick={() => updateDraft('date', new Date().toISOString())}
                            className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-transparent border-0 cursor-pointer"
                          >
                            Set Now
                          </button>
                        </div>
                        <input
                          type="datetime-local"
                          value={(() => {
                            const raw = draft.date || draft.created_at;
                            if (!raw) return '';
                            const d = new Date(raw);
                            if (isNaN(d.getTime())) return '';
                            const pad = (n: number) => String(n).padStart(2, '0');
                            return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
                              d.getHours()
                            )}:${pad(d.getMinutes())}`;
                          })()}
                          onChange={(e) => {
                            if (!e.target.value) return;
                            const parsed = new Date(e.target.value);
                            if (!isNaN(parsed.getTime())) {
                              updateDraft('date', parsed.toISOString());
                            }
                          }}
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                          External Reference Link (Optional)
                        </label>
                        <input
                          type="text"
                          value={draft.link || ''}
                          onChange={(e) => updateDraft('link', e.target.value)}
                          placeholder="https://..."
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-mono font-semibold text-slate-800 dark:text-slate-100"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => updateDraft('is_breaking', !draft.is_breaking)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          draft.is_breaking
                            ? 'bg-rose-600 text-white border-rose-600'
                            : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        ⚡ Breaking News Badge
                      </button>

                      <button
                        type="button"
                        onClick={() => updateDraft('is_new', !draft.is_new)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          draft.is_new
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        ✨ New Article Badge
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default AdminNewsTab;
