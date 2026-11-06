import React from 'react';
import { 
  ArrowLeft, 
  Save, 
  HelpCircle, 
  Image, 
  Compass, 
  Type, 
  ShieldAlert, 
  MessageSquare 
} from 'lucide-react';
import FaqEditor from "../FaqEditor";
import ScreenshotsEditor from "../ScreenshotsEditor";
import { GeneralSection } from "./sections/GeneralSection";
import { SEOSection } from "./sections/SEOSection";
import { ContentSection } from "./sections/ContentSection";
import { AlertsSection } from "./sections/AlertsSection";
import { useAppForm } from "../../../hooks/useAppForm";

interface AppFormProps {
  editApp?: any;
  editingAppId: string | null;
  appsList?: any[];
  initialFormTab?: string;
  handleSaveApp: (e: any, formFieldsOverride?: any) => void;
  setEditingAppId: (id: string | null) => void;
  categories: string[];
  saving: boolean;
}

export const AppForm = React.memo(({
  editApp,
  editingAppId,
  appsList = [],
  initialFormTab = 'general',
  handleSaveApp,
  setEditingAppId,
  categories,
  saving
}: AppFormProps) => {
  const {
    formFields,
    activeFormTab,
    setActiveFormTab,
    handleFieldChange,
    handleQuickClean
  } = useAppForm(editApp, editingAppId, appsList, categories);

  React.useEffect(() => {
    if (initialFormTab) {
      setActiveFormTab(initialFormTab as any);
    }
  }, [initialFormTab, setActiveFormTab]);

  return (
    <form onSubmit={(e) => { e.preventDefault(); handleSaveApp(e, formFields); }} className="flex flex-col h-full overflow-hidden">
      {/* Hidden inputs to guarantee form state is preserved when submitted from any tab */}
      <input type="hidden" name="hidden_rating" value={formFields.rating !== undefined ? formFields.rating : '4.8'} />
      <input type="hidden" name="hidden_review_count" value={formFields.review_count !== undefined ? formFields.review_count : ''} />
      <input type="hidden" name="hidden_more_information_url" value={formFields.more_information_url || ''} />
      <input type="hidden" name="hidden_name" value={formFields.name || ''} />
      <input type="hidden" name="hidden_slug" value={formFields.slug || ''} />
      <input type="hidden" name="hidden_icon_url" value={formFields.icon_url || ''} />
      <input type="hidden" name="hidden_seo_title" value={formFields.seo_title || ''} />
      <input type="hidden" name="hidden_seo_description" value={formFields.seo_description || ''} />
      <input type="hidden" name="hidden_seo_keywords" value={formFields.seo_keywords || ''} />
      <input type="hidden" name="hidden_og_image_url" value={formFields.og_image_url || ''} />
      <input type="hidden" name="hidden_description_html" value={formFields.description_html || ''} />
      <input type="hidden" name="hidden_features_html" value={formFields.features_html || ''} />
      <input type="hidden" name="hidden_red_box_msg" value={formFields.red_box_msg || ''} />
      <input type="hidden" name="hidden_yellow_box_msg" value={formFields.yellow_box_msg || ''} />
      <input type="hidden" name="hidden_idea_box_msg" value={formFields.idea_box_msg || ''} />
      <input type="hidden" name="hidden_custom_admin_box_heading" value={formFields.custom_admin_box_heading || ''} />
      <input type="hidden" name="hidden_custom_admin_box_html" value={formFields.custom_admin_box_html || ''} />
      <input type="hidden" name="hidden_screenshots_json" value={JSON.stringify(formFields.screenshots || [])} />
      <input type="hidden" name="hidden_faqs_json" value={JSON.stringify(formFields.faqs || [])} />
      <input type="hidden" name="hidden_canonical_url" value={formFields.canonical_url || ''} />
      <input type="hidden" name="hidden_target_region" value={formFields.target_region || ''} />
      <input type="hidden" name="hidden_publish_date" value={formFields.publish_date || ''} />
      <input type="hidden" name="hidden_video_url" value={formFields.video_url || ''} />
      <input type="hidden" name="hidden_release_notes" value={formFields.release_notes || ''} />
      <input type="hidden" name="sync_to_public_val" value={formFields.sync_to_public !== false ? 'true' : 'false'} />

      {/* Single Top Sticky Header with Save Button (No redundant bottom footer) */}
      <div className="px-2.5 py-2.5 sm:px-4 sm:py-3 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center gap-2 bg-white dark:bg-slate-900 shrink-0">
        <div className="min-w-0 flex items-center gap-2">
          <button 
            type="button" 
            onClick={() => setEditingAppId(null)} 
            className="p-2 text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white rounded-xl bg-slate-100 dark:bg-slate-800 border-0 cursor-pointer shrink-0 active:scale-95"
            title="Back to Apps"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0">
            <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate">
              {editingAppId === "" ? 'Add New App' : (formFields.name || 'Edit App')}
            </h3>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono truncate">
              /app/{formFields.slug || 'auto-slug'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button 
            type="button"
            onClick={handleQuickClean}
            className="text-[11px] font-bold text-amber-600 dark:text-amber-400 px-2.5 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 transition-all border border-amber-200/60 dark:border-amber-800/50 cursor-pointer"
            title="Clean & normalize app fields"
          >
            ✨ Clean
          </button>
          <button 
            type="submit" 
            disabled={saving} 
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50 cursor-pointer border-0 whitespace-nowrap active:scale-95"
          >
            <Save className="w-3.5 h-3.5"/>
            <span>{saving ? 'Saving...' : 'Save'}</span>
          </button>
        </div>
      </div>

      {/* Form Section Tabs: Clean 3x2 Grid on Mobile (All 6 tabs visible at once), Flex row on Desktop */}
      <div className="grid grid-cols-3 sm:flex border-b border-slate-200 dark:border-slate-800 shrink-0 bg-slate-50/80 dark:bg-slate-900/80 p-1 sm:px-3 sm:py-1 gap-1">
        {[
          { id: 'general', label: 'Basic', icon: HelpCircle },
          { id: 'content', label: 'HTML', icon: Type },
          { id: 'seo', label: 'SEO', icon: Compass },
          { id: 'screenshots', label: 'Images', icon: Image },
          { id: 'alerts', label: 'Alerts', icon: ShieldAlert },
          { id: 'faqs', label: 'FAQs', icon: MessageSquare }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeFormTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveFormTab(tab.id as any)}
              className={`flex items-center justify-center sm:justify-start gap-1.5 px-2 sm:px-3.5 py-2 rounded-lg sm:rounded-none sm:border-b-2 text-[11px] sm:text-xs font-bold transition-all whitespace-nowrap border-0 cursor-pointer ${
                isActive 
                  ? 'bg-blue-600 text-white sm:bg-blue-50/40 sm:dark:bg-blue-950/20 sm:text-blue-600 sm:dark:text-blue-400 sm:border-blue-500 shadow-2xs sm:shadow-none' 
                  : 'bg-white dark:bg-slate-800/70 sm:bg-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Form Scrollable Body content — Full height, no wasted bottom space */}
      <div className="flex-1 overflow-y-auto p-2.5 sm:p-5 pb-6 space-y-4 custom-scrollbar bg-slate-50/30 dark:bg-slate-900/10">
        {activeFormTab === 'general' && (
          <GeneralSection 
            formFields={formFields} 
            handleFieldChange={handleFieldChange} 
            categories={categories} 
          />
        )}
        {activeFormTab === 'seo' && (
          <SEOSection 
            formFields={formFields} 
            handleFieldChange={handleFieldChange} 
          />
        )}
        {activeFormTab === 'content' && (
          <ContentSection 
            formFields={formFields} 
            handleFieldChange={handleFieldChange} 
          />
        )}
        {activeFormTab === 'alerts' && (
          <AlertsSection 
            formFields={formFields} 
            handleFieldChange={handleFieldChange} 
          />
        )}
        {activeFormTab === 'faqs' && (
          <div className="animate-fade-in space-y-3">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3">
              <FaqEditor 
                key={editingAppId || 'new'} 
                initialFaqs={formFields.faqs || []} 
                onChange={(updatedFaqs) => handleFieldChange('faqs', updatedFaqs)}
              />
            </div>
          </div>
        )}
        {activeFormTab === 'screenshots' && (
          <div className="animate-fade-in space-y-3">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3">
              <ScreenshotsEditor 
                key={editingAppId || 'new'} 
                initialScreenshots={formFields.screenshots || []} 
                onChange={(updatedScreenshots) => handleFieldChange('screenshots', updatedScreenshots)}
              />
            </div>
          </div>
        )}
      </div>
    </form>
  );
});
