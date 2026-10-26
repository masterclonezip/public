import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import { RefreshCw, Sparkles, Menu } from 'lucide-react';
import { toast } from "../components/Toast";
import { useData } from '../contexts/DataContext';
import { isFirebaseConfigured, db } from '../lib/firebase';
import { adminFetch } from '../services/adminAuthService';
import { useAdminAuth } from '../hooks/useAdminAuth';
import { useAdminApps } from '../hooks/useAdminApps';
import { useAdminSettings } from '../hooks/useAdminSettings';
import { AdminSidebar } from '../components/admin/AdminSidebar';
import { AdminTabContent } from '../components/admin/AdminTabContent';
import { FirebaseStatusIndicator } from '../components/FirebaseStatusIndicator';
import { CommunityFirebaseStatusIndicator } from '../components/admin/CommunityFirebaseStatusIndicator';
import { AdminWelcomeOverlay } from '../components/admin/AdminWelcomeOverlay';
import { getAdminPath } from '../lib/utils';
import { safeEncrypt, safeDecrypt } from '../lib/cryptoUtils';
import { fetchAdminAppReviewCounts } from '../lib/communityFirebase';

export default function AdminDashboard() {
  const { 
    apps, settings, news, videos, 
    saveApps, saveSettings, saveNews, saveVideos,
    saveAppSingle, deleteAppSingle, saveSettingsSection,
    loading, refreshAll, reloadServerData, dataSource, isRefreshing: dataRefreshing, lastSyncTime,
    gitConfig, gitConfigLoading, saveGitConfig, pushAllToGitHub
  } = useData();

  const location = useLocation();
  const navigate = useNavigate();
  const adminPath = getAdminPath();

  const resolveTabFromPath = (pathname: string): string | null => {
    const segments = pathname.toLowerCase().split('/').filter(Boolean);
    const base = segments[0] || '';
    const possibleTab = ['admin', 'masterworld', adminPath.toLowerCase()].includes(base)
      ? segments[1]
      : segments[0];

    if (!possibleTab) return null;
    if (['ai-reviews', 'ai-review', 'ai-create-review', 'ai', 'create-review'].includes(possibleTab)) return 'ai-reviews';
    if (['reviews', 'review'].includes(possibleTab)) return 'reviews';
    if (['apps', 'app'].includes(possibleTab)) return 'apps';
    if (['news'].includes(possibleTab)) return 'news';
    if (['videos', 'video'].includes(possibleTab)) return 'videos';
    if (['categories', 'category'].includes(possibleTab)) return 'categories';
    if (['banners', 'banner'].includes(possibleTab)) return 'banners';
    if (['github', 'sync'].includes(possibleTab)) return 'github';
    if (['quick-links', 'links'].includes(possibleTab)) return 'quick-links';
    if (['faqs', 'faq'].includes(possibleTab)) return 'faqs';
    if (['developers', 'developer'].includes(possibleTab)) return 'developers';
    if (['reports', 'report'].includes(possibleTab)) return 'reports';
    if (['security'].includes(possibleTab)) return 'security';
    if (['settings', 'setting'].includes(possibleTab)) return 'settings';
    if (['dashboard'].includes(possibleTab)) return 'dashboard';
    return null;
  };

  const [activeTab, setActiveTab] = useState<string>(() => {
    return resolveTabFromPath(window.location.pathname) || 'dashboard';
  });

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    const pathLower = window.location.pathname.toLowerCase();
    const currentBase = pathLower.startsWith('/masterworld') ? 'masterworld' : adminPath;
    const targetUrl = tabId === 'dashboard' ? `/${currentBase}` : `/${currentBase}/${tabId}`;
    if (window.location.pathname !== targetUrl) {
      window.history.replaceState(null, '', targetUrl);
    }
  };

  useEffect(() => {
    const tabFromUrl = resolveTabFromPath(location.pathname);
    if (tabFromUrl && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [location.pathname]);

  const [saving, setSaving] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [editingAppId, setEditingAppId] = useState<string | null>(null);
  const [showWelcomeOverlay, setShowWelcomeOverlay] = useState<boolean>(() => {
    try {
      return !sessionStorage.getItem('masterworld_welcome_shown');
    } catch (e) {
      return true;
    }
  });

  const handleWelcomeComplete = () => {
    setShowWelcomeOverlay(false);
    try {
      sessionStorage.setItem('masterworld_welcome_shown', 'true');
    } catch (e) {}
  };

  const { user, checkingAuth, isAdminUser, sessionTimeLeft, handleLogout } = useAdminAuth();
  
  // When admin logs in or dashboard mounts with active admin user, automatically pull latest live data and pre-warm atomic reviews
  useEffect(() => {
    if (isAdminUser === true) {
      reloadServerData(true);
      fetchAdminAppReviewCounts().catch(() => {});
    }
  }, [isAdminUser, reloadServerData]);

  const { 
    appsList, setAppsList, fetchFailed, cachedSecureMapRef, syncSecureVault, recordAppDeletion
  } = useAdminApps(apps, loading, isAdminUser);

  const {
    newsList, setNewsList,
    banners, setBanners,
    videosList, setVideosList,
    categoriesList, setCategoriesList,
    quickLinksList, setQuickLinksList,
    websiteFaqsList, setWebsiteFaqsList,
    developersList, setDevelopersList,
    newCatInput, setNewCatInput,
    handleAddBanner, handleBannerChange, handleDeleteBanner, handleClearAllBanners,
    handleAddNews, handleNewsChange, handleDeleteNews,
    handleAddCategory, handleRemoveCategory,
    handleAddVideo, handleDeleteVideo, handleVideosChange,
    handleAddWebsiteFaq, handleRemoveWebsiteFaq, handleWebsiteFaqChange,
    handleAddQuickLink, handleRemoveQuickLink, handleQuickLinkChange,
    handleAddDeveloper, handleRemoveDeveloper, handleDeveloperChange
  } = useAdminSettings(settings, news, videos);

  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean; title: string; message: string; confirmText?: string; cancelText?: string; onConfirm: () => void | Promise<void>;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  const triggerHaptic = (intensity = 50) => {
    try { if (window.navigator?.vibrate) window.navigator.vibrate(intensity); } catch (e) {}
  };

  const handleReloadCloudData = async () => {
    setSaving(true);
    try {
      await reloadServerData(false);
      await refreshAll(true);
      toast('All data refreshed and synchronized from server across devices!', 'success');
    } catch (err: any) {
      toast('Sync failed: ' + err.message, 'error');
    } finally { setSaving(false); }
  };


  const handleSaveSettingsBase = async (updatedSettings: any) => {
    setSaving(true);
    try {
      if (updatedSettings && updatedSettings.preventDefault) {
        updatedSettings.preventDefault();
        const formData = new FormData(updatedSettings.currentTarget);
        const formSettings: any = {};
        formData.forEach((value, key) => { formSettings[key] = value; });
        
        await saveSettingsSection('general', {
          ...formSettings,
          meta_description: formSettings.meta_description || formSettings.seo_description || '',
          seo_description: formSettings.seo_description || formSettings.meta_description || ''
        });
      } else if (updatedSettings && typeof updatedSettings === 'object') {
        const keys = Object.keys(updatedSettings);
        if (keys.length === 1) {
          const sectionKey = keys[0];
          await saveSettingsSection(sectionKey, updatedSettings[sectionKey]);
        } else {
          await saveSettingsSection('general', updatedSettings);
        }
      }

      triggerHaptic();
      toast('Settings saved successfully!', 'success');
    } catch (err: any) {
      toast('Error saving settings: ' + err.message, 'error');
    } finally { setSaving(false); }
  };

  const handleSaveApp = async (e: React.FormEvent<HTMLFormElement> | any, formFieldsOverride?: any) => {
    e?.preventDefault?.();
    setSaving(true);
    try {
      const formData = e?.currentTarget ? new FormData(e.currentTarget) : null;
      const name = formFieldsOverride?.name?.trim() || (formData ? (formData.get('name') as string || formData.get('hidden_name') as string) : '') || 'New App';
      const rawSlug = formFieldsOverride?.slug || (formData ? (formData.get('slug') as string || formData.get('hidden_slug') as string) : '');
      const slug = rawSlug?.trim().toLowerCase().replace(/[^a-z0-9-_]+/g, '-') || name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const rawUrl = formFieldsOverride?.more_information_url ?? (formData ? ((formData.get('more_information_url') as string) ?? (formData.get('hidden_more_information_url') as string)) : '');
      let inputUrl = (rawUrl || '').trim();

      // Auto-decrypt if input is an encrypted ciphertext
      if (inputUrl.startsWith('U2FsdGVkX1')) {
        const dec = safeDecrypt(inputUrl);
        if (dec) inputUrl = dec;
      }

      let plaintextUrl = inputUrl;
      if (plaintextUrl && !plaintextUrl.startsWith('U2FsdGVkX1') && !plaintextUrl.toLowerCase().startsWith('http://') && !plaintextUrl.toLowerCase().startsWith('https://')) {
        plaintextUrl = 'https://' + plaintextUrl;
      }

      let encryptedUrlVal = '';
      if (plaintextUrl) {
        // Fast local encryption baseline
        encryptedUrlVal = safeEncrypt(plaintextUrl);

        // Server-side authoritative encryption verification
        try {
          const idToken = (await user?.getIdToken()) || undefined;
          const res = await adminFetch('/api/v1/admin/encrypt', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...(idToken ? { 'Authorization': `Bearer ${idToken}` } : {}) },
            body: JSON.stringify({ url: plaintextUrl })
          });
          if (res.ok) {
            const data = await res.json();
            if (data.encrypted) encryptedUrlVal = data.encrypted;
          }
        } catch (encErr) {
          console.warn("[ADMIN] Server encryption fallback to safeEncrypt:", encErr);
        }
      }

      let category = 'General';
      if (formFieldsOverride) {
        let catArr: string[] = [];
        if (Array.isArray(formFieldsOverride.category_list)) {
          catArr = [...formFieldsOverride.category_list].filter(Boolean);
        }
        if (formFieldsOverride.custom_category?.trim()) {
          const customItems = formFieldsOverride.custom_category
            .split(',')
            .map((s: string) => s.trim())
            .filter(Boolean);
          catArr.push(...customItems);
        }
        const uniqueCats = catArr.filter((item, index) => {
          return catArr.findIndex(c => c.toLowerCase() === item.toLowerCase()) === index;
        });
        if (uniqueCats.length > 0) category = uniqueCats.join(', ');
      } else if (formData) {
        let catArr: string[] = (formData.getAll('category_list') as string[]).filter(Boolean);
        const customVal = (formData.get('custom_category') as string || '').trim();
        if (customVal) {
          const customItems = customVal.split(',').map((s: string) => s.trim()).filter(Boolean);
          catArr.push(...customItems);
        }
        const uniqueCats = catArr.filter((item, index) => {
          return catArr.findIndex(c => c.toLowerCase() === item.toLowerCase()) === index;
        });
        if (uniqueCats.length > 0) category = uniqueCats.join(', ');
      }

      const actualAppId = editingAppId || Math.random().toString(36).substr(2, 9);
      const existingApp = editingAppId ? appsList.find(a => a.id === editingAppId) : null;
      const appData = {
        id: actualAppId,
        name,
        slug,
        icon_url: (formFieldsOverride?.icon_url ?? (formData ? (formData.get('icon_url') as string || formData.get('hidden_icon_url') as string) : '')) || '',
        category,
        more_information_url: plaintextUrl,
        encrypted_link: encryptedUrlVal || (plaintextUrl.startsWith('U2FsdGVkX1') ? plaintextUrl : ''),
        rating: formFieldsOverride ? (parseFloat(formFieldsOverride.rating) || 5.0) : (parseFloat(formData?.get('rating') as string || formData?.get('hidden_rating') as string) || 5.0),
        review_count: formFieldsOverride?.review_count !== undefined ? formFieldsOverride.review_count : (formData?.get('review_count') as string || formData?.get('hidden_review_count') as string || ''),
        safety_status: formFieldsOverride?.safety_status || (formData?.get('safety_status') as any) || 'Verified',
        serial_number: formFieldsOverride?.serial_number ? (parseInt(formFieldsOverride.serial_number) || appsList.length + 1) : (parseInt(formData?.get('serial_number') as string) || appsList.length + 1),
        version: formFieldsOverride?.version ?? (formData?.get('version') as string) ?? '1.0',
        file_size: formFieldsOverride?.file_size ?? (formData?.get('file_size') as string) ?? 'Unknown',
        developer: formFieldsOverride?.developer ?? (formData?.get('developer') as string) ?? 'Admin',
        description_html: formFieldsOverride?.description_html ?? (formData ? (formData.get('description_html') as string ?? formData.get('hidden_description_html') as string) : '') ?? '',
        features_html: formFieldsOverride?.features_html ?? (formData ? (formData.get('features_html') as string ?? formData.get('hidden_features_html') as string) : '') ?? '',
        custom_admin_box_heading: formFieldsOverride?.custom_admin_box_heading ?? (formData ? (formData.get('custom_admin_box_heading') as string ?? formData.get('hidden_custom_admin_box_heading') as string) : '') ?? '',
        custom_admin_box_html: formFieldsOverride?.custom_admin_box_html ?? (formData ? (formData.get('custom_admin_box_html') as string ?? formData.get('hidden_custom_admin_box_html') as string) : '') ?? '',
        seo_title: formFieldsOverride?.seo_title ?? (formData ? (formData.get('seo_title') as string ?? formData.get('hidden_seo_title') as string) : '') ?? '',
        meta_title: formFieldsOverride?.seo_title ?? (formData ? (formData.get('seo_title') as string ?? formData.get('hidden_seo_title') as string) : '') ?? '',
        seo_description: formFieldsOverride?.seo_description ?? (formData ? (formData.get('seo_description') as string ?? formData.get('hidden_seo_description') as string) : '') ?? '',
        meta_description: formFieldsOverride?.seo_description ?? (formData ? (formData.get('seo_description') as string ?? formData.get('hidden_seo_description') as string) : '') ?? '',
        reviews: formFieldsOverride?.review_count !== undefined ? formFieldsOverride.review_count : (formData?.get('review_count') as string || formData?.get('hidden_review_count') as string || ''),
        seo_keywords: formFieldsOverride?.seo_keywords ?? (formData ? (formData.get('seo_keywords') as string ?? formData.get('hidden_seo_keywords') as string) : '') ?? '',
        og_image_url: formFieldsOverride?.og_image_url ?? (formData ? (formData.get('og_image_url') as string ?? formData.get('hidden_og_image_url') as string) : '') ?? '',
        canonical_url: formFieldsOverride?.canonical_url ?? (formData ? (formData.get('canonical_url') as string ?? formData.get('hidden_canonical_url') as string) : '') ?? '',
        video_url: formFieldsOverride?.video_url ?? (formData ? (formData.get('video_url') as string ?? formData.get('hidden_video_url') as string) : '') ?? '',
        publish_date: formFieldsOverride?.publish_date ?? (formData ? (formData.get('publish_date') as string ?? formData.get('hidden_publish_date') as string) : '') ?? '',
        release_notes: formFieldsOverride?.release_notes ?? (formData ? (formData.get('release_notes') as string ?? formData.get('hidden_release_notes') as string) : '') ?? '',
        red_box_msg: formFieldsOverride?.red_box_msg ?? (formData ? (formData.get('red_box_msg') as string ?? formData.get('hidden_red_box_msg') as string) : '') ?? '',
        yellow_box_msg: formFieldsOverride?.yellow_box_msg ?? (formData ? (formData.get('yellow_box_msg') as string ?? formData.get('hidden_yellow_box_msg') as string) : '') ?? '',
        idea_box_msg: formFieldsOverride?.idea_box_msg ?? (formData ? (formData.get('idea_box_msg') as string ?? formData.get('hidden_idea_box_msg') as string) : '') ?? '',
        is_new: formFieldsOverride ? !!formFieldsOverride.is_new : (formData?.get('is_new') === 'on'),
        is_hot: formFieldsOverride ? !!formFieldsOverride.is_hot : (formData?.get('is_hot') === 'on'),
        is_coming_soon: formFieldsOverride ? !!formFieldsOverride.is_coming_soon : (formData?.get('is_coming_soon') === 'on'),
        sync_to_public: formFieldsOverride?.sync_to_public !== undefined
          ? Boolean(formFieldsOverride.sync_to_public)
          : (formData?.get('sync_to_public_val') !== null && formData?.get('sync_to_public_val') !== undefined
              ? formData?.get('sync_to_public_val') === 'true'
              : (formData?.get('sync_to_public') !== null && formData?.get('sync_to_public') !== undefined
                  ? (formData?.get('sync_to_public') === 'on' || formData?.get('sync_to_public') === 'true')
                  : (existingApp?.sync_to_public !== false))),
        screenshots: formFieldsOverride?.screenshots ? formFieldsOverride.screenshots : JSON.parse((formData ? (formData.get('screenshots_json') as string || formData.get('hidden_screenshots_json') as string) : '') || '[]'),
        faqs: formFieldsOverride?.faqs ? formFieldsOverride.faqs : JSON.parse((formData ? (formData.get('faqs_json') as string || formData.get('hidden_faqs_json') as string) : '') || '[]'),
        created_at: existingApp?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      if (plaintextUrl) {
        cachedSecureMapRef.current.set(actualAppId, plaintextUrl);
        if (slug) cachedSecureMapRef.current.set(slug, plaintextUrl);
      } else {
        cachedSecureMapRef.current.delete(actualAppId);
        if (slug) cachedSecureMapRef.current.delete(slug);
      }

      const savedResult = await saveAppSingle(appData);
      const finalSavedApp = savedResult || appData;

      setAppsList(prev => {
        const idx = prev.findIndex(a => a.id === finalSavedApp.id || (finalSavedApp.slug && a.slug === finalSavedApp.slug));
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = finalSavedApp;
          return next;
        }
        return [...prev, finalSavedApp];
      });

      setEditingAppId(null);
      triggerHaptic();
      toast('Application saved successfully!', 'success');
    } catch (err: any) {
      toast('Save failed: ' + err.message, 'error');
    } finally { setSaving(false); }
  };

  const handleTogglePublicSync = async (appId: string) => {
    const targetApp = appsList.find(a => a.id === appId);
    if (!targetApp) return;
    const newStatus = !(targetApp.sync_to_public !== false);
    const updatedApp = { ...targetApp, sync_to_public: newStatus, updated_at: new Date().toISOString() };
    try {
      await saveAppSingle(updatedApp);
      setAppsList(prev => prev.map(a => a.id === appId ? updatedApp : a));
      triggerHaptic();
      toast(newStatus ? `"${targetApp.name}" will sync to public website.` : `"${targetApp.name}" is now Admin Only (unsynced from public).`, 'success');
    } catch (err: any) {
      toast('Failed to update sync status: ' + (err?.message || 'Error'), 'error');
    }
  };

  const handleDeleteApp = (id: string) => {
    setConfirmConfig({
      isOpen: true, title: 'Delete App', message: 'Permanently delete this app?',
      onConfirm: async () => {
        try {
          cachedSecureMapRef.current.delete(id);
          recordAppDeletion(id);
          await deleteAppSingle(id);
          setAppsList(prev => prev.filter(a => a.id !== id));
          triggerHaptic();
          toast('App deleted successfully.', 'success');
        } catch (err: any) { toast('Delete failed: ' + (err?.message || 'Unknown error'), 'error'); }
      }
    });
  };

  const mergedSettings = useMemo(() => ({
    ...settings,
    banners,
    categories: categoriesList,
    quick_links: quickLinksList,
    website_faqs: websiteFaqsList,
    developers: developersList
  }), [settings, banners, categoriesList, quickLinksList, websiteFaqsList, developersList]);

  const currentBase = window.location.pathname.toLowerCase().startsWith('/masterworld') ? 'masterworld' : adminPath;
  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-300">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mb-3" />
        <p className="text-xs font-semibold tracking-wider uppercase text-slate-400">Authenticating Access...</p>
      </div>
    );
  }
  if (!user || !isAdminUser) return <Navigate to={`/${currentBase}/login`} replace />;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans selection:bg-blue-100 dark:selection:bg-blue-900/30">
      <AdminSidebar 
        activeTab={activeTab} 
        onTabChange={handleTabChange} 
        isMobileMenuOpen={isMobileMenuOpen} 
        setIsMobileMenuOpen={setIsMobileMenuOpen} 
        handleLogout={handleLogout} 
        sessionTimeLeft={sessionTimeLeft} 
        onRefresh={handleReloadCloudData}
        isRefreshing={saving}
      />

      <main className="lg:pl-64 min-h-screen transition-all duration-300">
        <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-2.5 sm:px-4 py-2 flex items-center justify-between gap-1.5 sm:gap-2">
          <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0">
            <h2 className="text-sm sm:text-base md:text-lg font-black tracking-tight capitalize truncate shrink-0">
              {activeTab === 'news' ? 'News' : activeTab.replace('-', ' ')}
            </h2>
            <div className="flex items-center gap-1 shrink-0">
              <FirebaseStatusIndicator />
              <CommunityFirebaseStatusIndicator />
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
             <button 
              type="button"
              onClick={() => setShowWelcomeOverlay(true)}
              title="Replay Welcome Experience"
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-lg font-bold text-xs transition-all border border-amber-500/20 cursor-pointer active:scale-95 whitespace-nowrap"
             >
                <Sparkles size={13} className="text-amber-500" />
                <span className="hidden md:inline">Welcome Intro</span>
             </button>
             <button 
              onClick={handleReloadCloudData} 
              disabled={saving || dataRefreshing} 
              title={lastSyncTime ? `Last synced: ${lastSyncTime}. Click to pull latest updates across all devices.` : 'Pull latest updates across all devices'}
              className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg font-bold text-xs transition-all border-0 cursor-pointer shadow-xs active:scale-95 disabled:opacity-50 whitespace-nowrap"
             >
                <RefreshCw size={13} className={(saving || dataRefreshing) ? 'animate-spin' : ''} />
                <span className="hidden sm:inline">{(saving || dataRefreshing) ? 'Syncing...' : 'Sync Devices'}</span>
                <span className="sm:hidden text-[11px]">{(saving || dataRefreshing) ? 'Sync...' : 'Sync'}</span>
             </button>
             <button
               type="button"
               onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
               className="lg:hidden p-2.5 sm:p-3 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center shrink-0 border-0"
               aria-label="Toggle Navigation Menu"
               title="Open Navigation Menu"
             >
               <Menu size={22} className="stroke-[2.5]" />
             </button>
          </div>
        </header>

        <div className={activeTab === 'ai-reviews' ? 'p-0 w-full h-[calc(100dvh-49px)] flex flex-col overflow-hidden' : (activeTab === 'reviews' ? 'p-0 sm:p-2 lg:p-4 w-full max-w-full' : 'p-3 sm:p-4 max-w-7xl mx-auto')}>
          <AdminTabContent 
            activeTab={activeTab} appsList={appsList} newsList={newsList} banners={banners} videosList={videosList}
            categoriesList={categoriesList} quickLinksList={quickLinksList} websiteFaqsList={websiteFaqsList} developersList={developersList}
            settings={mergedSettings} gitConfig={gitConfig} db={db} saving={saving} setSaving={setSaving} editingAppId={editingAppId}
            setEditingAppId={setEditingAppId}
            handleDeleteApp={handleDeleteApp} handleSaveApp={handleSaveApp} handleTogglePublicSync={handleTogglePublicSync} handleSaveSettings={handleSaveSettingsBase} 
            handleSaveNews={async (list?: any) => {
              setSaving(true);
              try {
                const targetList = (list && Array.isArray(list) && list.length > 0) ? list : newsList;
                await saveNews(targetList);
                triggerHaptic();
                toast('News saved and synchronized successfully!', 'success');
              } catch (err: any) {
                toast('Save failed: ' + (err?.message || 'Unknown error'), 'error');
              } finally {
                setSaving(false);
              }
            }}
            handleSaveCategories={(e) => { e.preventDefault(); handleSaveSettingsBase({ categories: categoriesList }); }}
            handleSaveQuickLinks={(e) => { e.preventDefault(); handleSaveSettingsBase({ quick_links: quickLinksList }); }}
            handleSaveWebsiteFaqs={(e) => { e.preventDefault(); handleSaveSettingsBase({ website_faqs: websiteFaqsList }); }}
            handleSaveDevelopers={(e) => { e.preventDefault(); handleSaveSettingsBase({ developers: developersList }); }}
            handleSaveVideos={async () => {
              setSaving(true);
              try {
                await saveVideos(videosList);
                triggerHaptic();
                toast('Videos saved and synchronized successfully!', 'success');
              } catch (err: any) {
                toast('Save failed: ' + (err?.message || 'Unknown error'), 'error');
              } finally {
                setSaving(false);
              }
            }}
            saveGitConfig={saveGitConfig} pushAllToGitHub={pushAllToGitHub} handleReloadCloudData={handleReloadCloudData} triggerHaptic={triggerHaptic}
            
            newCatInput={newCatInput}
            setNewCatInput={setNewCatInput}
            handleAddBanner={handleAddBanner}
            handleBannerChange={handleBannerChange}
            handleDeleteBanner={handleDeleteBanner}
            handleClearAllBanners={handleClearAllBanners}
            handleAddNews={handleAddNews}
            handleNewsChange={handleNewsChange}
            handleDeleteNews={handleDeleteNews}
            handleAddCategory={handleAddCategory}
            handleRemoveCategory={handleRemoveCategory}
            handleAddVideo={handleAddVideo}
            handleDeleteVideo={handleDeleteVideo}
            handleVideosChange={handleVideosChange}
            handleAddWebsiteFaq={handleAddWebsiteFaq}
            handleRemoveWebsiteFaq={handleRemoveWebsiteFaq}
            handleWebsiteFaqChange={handleWebsiteFaqChange}
            handleAddQuickLink={handleAddQuickLink}
            handleRemoveQuickLink={handleRemoveQuickLink}
            handleQuickLinkChange={handleQuickLinkChange}
            handleAddDeveloper={handleAddDeveloper}
            handleRemoveDeveloper={handleRemoveDeveloper}
            handleDeveloperChange={handleDeveloperChange}
            onTabChange={handleTabChange}
          />
        </div>
      </main>

      {confirmConfig.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60  animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">{confirmConfig.title}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 font-medium leading-relaxed">{confirmConfig.message}</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmConfig({ ...confirmConfig, isOpen: false })} className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-bold rounded-xl transition-all border-0 cursor-pointer">Cancel</button>
              <button onClick={() => { confirmConfig.onConfirm(); setConfirmConfig({ ...confirmConfig, isOpen: false }); }} className="flex-1 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-rose-600/20 border-0 cursor-pointer">Confirm</button>
            </div>
          </div>
        </div>
      )}

      {showWelcomeOverlay && (
        <AdminWelcomeOverlay 
          onComplete={handleWelcomeComplete}
          siteTitle={settings?.site_title || 'MasterWorld'}
          adminName="Boss"
        />
      )}
    </div>
  );
}
