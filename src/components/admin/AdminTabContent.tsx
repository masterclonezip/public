import React, { Suspense } from 'react';
import { lazyWithRetry } from '../../lib/lazyWithRetry';
import AppsTab from '../AppsTab';
import SecurityTab from '../SecurityTab';
import FirebaseStatusPanel from '../FirebaseStatusPanel';
import { AdminDashboardOverview as DashboardTab } from './AdminDashboardOverview';
import { AdminSettingsTab as SettingsTab } from './AdminSettingsTab';
import { AdminCategoriesTab } from './AdminCategoriesTab';
import { AdminBannersTab } from './AdminBannersTab';
import { AdminGithubTab } from './AdminGithubTab';
import { AdminNewsTab } from './AdminNewsTab';
import { AdminVideosTab } from './AdminVideosTab';
import { AdminQuickLinksTab } from './AdminQuickLinksTab';
import { AdminWebsiteFaqsTab } from './AdminWebsiteFaqsTab';
import { AdminDevelopersTab } from './AdminDevelopersTab';

import AdminReviewsTab from './AdminReviewsTab';
import AdminReportsTab from './AdminReportsTab';
import AdminAIReviewStudioTab from './AdminAIReviewStudioTab';

interface TabErrorBoundaryProps {
  tabName: string;
  children: React.ReactNode;
}

interface TabErrorBoundaryState {
  hasError: boolean;
  error: any;
}

class TabErrorBoundary extends React.Component<TabErrorBoundaryProps, TabErrorBoundaryState> {
  constructor(props: TabErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }
  componentDidCatch(error: any, errorInfo: any) {
    console.error(`Error in admin tab [${this.props.tabName}]:`, error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900/50 rounded-2xl p-8 max-w-2xl mx-auto my-12 text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Unable to render {this.props.tabName}</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {this.state.error?.message || "An unexpected error occurred while loading this section."}
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => this.setState({ hasError: false, error: null })}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow transition-all cursor-pointer"
            >
              Retry Loading Tab
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

interface AdminTabContentProps {
  activeTab: string;
  appsList: any[];
  newsList: any[];
  banners: any[];
  videosList: any[];
  categoriesList: string[];
  quickLinksList: any[];
  websiteFaqsList: any[];
  developersList: any[];
  settings: any;
  gitConfig: any;
  db: any;
  saving: boolean;
  setSaving?: (saving: boolean) => void;
  editingAppId: string | null;
  setEditingAppId: (id: string | null) => void;
  handleDeleteApp: (id: string) => void;
  handleSaveApp: (e: any) => void;
  handleTogglePublicSync?: (id: string) => Promise<void> | void;
  handleSaveSettings: (e: any) => void;
  handleSaveNews: (list?: any) => void;
  handleSaveCategories: (e: any) => void;
  handleSaveQuickLinks: (e: any) => void;
  handleSaveWebsiteFaqs: (e: any) => void;
  handleSaveDevelopers: (e: any) => void;
  handleSaveVideos?: (e?: any) => Promise<void> | void;
  saveGitConfig: (conf: any) => Promise<void>;
  pushAllToGitHub: (customConfig?: any, onProgress?: any, ...args: any[]) => Promise<any>;
  handleReloadCloudData: () => void;
  triggerHaptic: () => void;
  
  // Handlers from useAdminSettings
  newCatInput: string;
  setNewCatInput: (val: string) => void;
  handleAddBanner: () => void;
  handleBannerChange: (id: string, field: string, value: any) => void;
  handleDeleteBanner: (id: string) => void;
  handleClearAllBanners?: () => void;
  handleAddNews: () => string;
  handleNewsChange: (id: string, field: string, value: any) => void;
  handleDeleteNews: (id: string) => void;
  handleAddCategory: () => void;
  handleRemoveCategory: (cat: string) => void;
  handleAddVideo: () => void;
  handleDeleteVideo: (id: string) => void;
  handleVideosChange: (id: string, field: string, value: any) => void;
  handleAddWebsiteFaq: () => void;
  handleRemoveWebsiteFaq: (index: number) => void;
  handleWebsiteFaqChange: (index: number, field: string, value: any) => void;
  handleAddQuickLink: () => void;
  handleRemoveQuickLink: (index: number) => void;
  handleQuickLinkChange: (index: number, field: string, value: any) => void;
  handleAddDeveloper: () => void;
  handleRemoveDeveloper: (index: number) => void;
  handleDeveloperChange: (index: number, field: string, value: any) => void;
  onTabChange?: (tab: string) => void;
}

export const AdminTabContent = ({
  activeTab,
  appsList,
  newsList,
  banners,
  videosList,
  categoriesList,
  quickLinksList,
  websiteFaqsList,
  developersList,
  settings,
  gitConfig,
  db,
  saving,
  setSaving,
  editingAppId,
  setEditingAppId,
  handleDeleteApp,
  handleSaveApp,
  handleTogglePublicSync,
  handleSaveSettings,
  handleSaveNews,
  handleSaveCategories,
  handleSaveQuickLinks,
  handleSaveWebsiteFaqs,
  handleSaveDevelopers,
  handleSaveVideos,
  saveGitConfig,
  pushAllToGitHub,
  handleReloadCloudData,
  triggerHaptic,
  
  newCatInput,
  setNewCatInput,
  handleAddBanner,
  handleBannerChange,
  handleDeleteBanner,
  handleClearAllBanners,
  handleAddNews,
  handleNewsChange,
  handleDeleteNews,
  handleAddCategory,
  handleRemoveCategory,
  handleAddVideo,
  handleDeleteVideo,
  handleVideosChange,
  handleAddWebsiteFaq,
  handleRemoveWebsiteFaq,
  handleWebsiteFaqChange,
  handleAddQuickLink,
  handleRemoveQuickLink,
  handleQuickLinkChange,
  handleAddDeveloper,
  handleRemoveDeveloper,
  handleDeveloperChange,
  onTabChange
}: AdminTabContentProps) => {
  const renderTab = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardTab apps={appsList} news={newsList} onTabChange={onTabChange} />;
      case 'apps':
        return (
          <AppsTab 
            appsList={appsList} 
            editingAppId={editingAppId} 
            setEditingAppId={setEditingAppId} 
            handleDeleteApp={handleDeleteApp}
            handleSaveApp={handleSaveApp}
            handleTogglePublicSync={handleTogglePublicSync}
            categories={categoriesList}
            saving={saving}
          />
        );
      case 'banners':
        return (
          <AdminBannersTab 
            banners={banners} 
            saving={saving} 
            handleSaveBanners={(e: any) => { e?.preventDefault?.(); handleSaveSettings({ banners }); }}
            handleAddBanner={handleAddBanner}
            handleBannerChange={handleBannerChange}
            handleDeleteBanner={handleDeleteBanner}
            handleClearAllBanners={handleClearAllBanners}
          />
        );
      case 'categories':
        return (
          <AdminCategoriesTab 
            categoriesList={categoriesList} 
            saving={saving}
            newCatInput={newCatInput}
            setNewCatInput={setNewCatInput}
            addCategory={handleAddCategory}
            removeCategory={handleRemoveCategory}
            handleSaveCategories={handleSaveCategories}
          />
        );
      case 'news':
        return (
          <AdminNewsTab 
            newsList={newsList} 
            saving={saving} 
            handleAddNews={handleAddNews}
            handleNewsChange={handleNewsChange}
            handleDeleteNews={handleDeleteNews}
            saveNews={async (list) => { await handleSaveNews(list); }}
            setSaving={setSaving || (() => {})}
            appsList={appsList}
          />
        );
      case 'videos':
        return (
          <AdminVideosTab 
            videosList={videosList} 
            saving={saving}
            handleAddVideo={handleAddVideo}
            handleDeleteVideo={handleDeleteVideo}
            handleVideosChange={handleVideosChange}
            handleSaveVideos={async (e) => { e?.preventDefault?.(); await handleSaveVideos?.(e); }}
          />
        );
      case 'faqs':
        return (
          <AdminWebsiteFaqsTab 
            websiteFaqsList={websiteFaqsList} 
            saving={saving} 
            handleAddWebsiteFaq={handleAddWebsiteFaq}
            handleRemoveWebsiteFaq={handleRemoveWebsiteFaq}
            handleWebsiteFaqChange={handleWebsiteFaqChange}
            handleSaveWebsiteFaqs={handleSaveWebsiteFaqs}
          />
        );
      case 'quick-links':
        return (
          <AdminQuickLinksTab 
            quickLinksList={quickLinksList} 
            saving={saving} 
            handleAddQuickLink={handleAddQuickLink}
            handleRemoveQuickLink={handleRemoveQuickLink}
            handleQuickLinkChange={handleQuickLinkChange}
            handleSaveQuickLinks={handleSaveQuickLinks}
          />
        );
      case 'github':
        return (
          <AdminGithubTab 
            gitConfig={gitConfig} 
            saveGitConfig={saveGitConfig} 
            pushAllToGitHub={pushAllToGitHub} 
            appsList={appsList}
            settings={settings}
            newsList={newsList}
            videosList={videosList}
            generatePreview={() => "Preview not available in this view"}
          />
        );
      case 'developers':
        return (
          <AdminDevelopersTab 
            developersList={developersList} 
            saving={saving} 
            handleAddDeveloper={handleAddDeveloper}
            handleRemoveDeveloper={handleRemoveDeveloper}
            handleDeveloperChange={handleDeveloperChange}
            handleSaveDevelopers={handleSaveDevelopers}
          />
        );
      case 'reviews':
        return (
          <AdminReviewsTab
            appsList={appsList}
            onNavigateToAIStudio={() => onTabChange?.('ai-reviews')}
            pushAllToGitHub={pushAllToGitHub}
            gitConfig={gitConfig}
          />
        );
      case 'ai-reviews':
        return (
          <AdminAIReviewStudioTab
            appsList={appsList}
            newsList={newsList}
            videosList={videosList}
            faqsList={websiteFaqsList}
            developersList={developersList}
            settings={settings}
            handleSaveSettings={handleSaveSettings}
          />
        );
      case 'reports':
        return <AdminReportsTab appsList={appsList} />;
      case 'security':
        return (
          <div className="space-y-6">
            <SecurityTab />
            <FirebaseStatusPanel />
          </div>
        );
      case 'settings':
        return <SettingsTab settings={settings} saving={saving} handleSaveSettings={(e: React.FormEvent<HTMLFormElement>) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          const updatedSettings = {
            ...settings,
            banners: banners ?? settings.banners ?? [],
            categories: categoriesList ?? settings.categories ?? [],
            quick_links: quickLinksList ?? settings.quick_links ?? [],
            website_faqs: websiteFaqsList ?? settings.website_faqs ?? [],
            developers: developersList ?? settings.developers ?? []
          };
          formData.forEach((value, key) => {
            updatedSettings[key] = value;
          });
          updatedSettings.social_links = {
            facebook: (formData.get('social_facebook') as string) || '',
            instagram: (formData.get('social_instagram') as string) || '',
            twitter: (formData.get('social_twitter') as string) || '',
            linkedin: (formData.get('social_linkedin') as string) || '',
            youtube: (formData.get('social_youtube') as string) || '',
          };
          delete updatedSettings.social_facebook;
          delete updatedSettings.social_instagram;
          delete updatedSettings.social_twitter;
          delete updatedSettings.social_linkedin;
          delete updatedSettings.social_youtube;
          updatedSettings.hero_title_visible = formData.get('hero_title_visible') === 'true';

          // Automatically populate both logo_url and favicon_url if the Admin provides only one
          const cleanLogo = String(updatedSettings.logo_url || '').trim();
          const cleanFavicon = String(updatedSettings.favicon_url || '').trim();
          if (cleanLogo && !cleanFavicon) {
            updatedSettings.favicon_url = cleanLogo;
          } else if (cleanFavicon && !cleanLogo) {
            updatedSettings.logo_url = cleanFavicon;
          }

          if (updatedSettings.gemini_api_key !== undefined || updatedSettings.gemini_model !== undefined) {
            try {
              const currentConfig = JSON.parse(
                localStorage.getItem('ai_review_studio_config_v1') ||
                localStorage.getItem('admin_ai_studio_config') ||
                '{}'
              );
              if (updatedSettings.gemini_api_key !== undefined) {
                currentConfig.apiKey = (updatedSettings.gemini_api_key || '').trim();
              }
              if (updatedSettings.gemini_model) {
                currentConfig.model = updatedSettings.gemini_model;
              }
              currentConfig.updatedAt = Date.now();
              localStorage.setItem('ai_review_studio_config_v1', JSON.stringify(currentConfig));
              localStorage.setItem('admin_ai_studio_config', JSON.stringify(currentConfig));
              fetch('/api/v1/admin/community/aistudio-settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ config: currentConfig })
              }).catch(() => {});
            } catch (_) {}
          }

          handleSaveSettings(updatedSettings);
        }} />;

      default:
        return null;
    }
  };

  return (
    <TabErrorBoundary tabName={activeTab}>
      {renderTab()}
    </TabErrorBoundary>
  );
};
