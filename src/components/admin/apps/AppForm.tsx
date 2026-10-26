import React from 'react';
import { 
  X, 
  Edit2, 
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

interface AppFormProps {
  editingAppId: string | null;
  formFields: any;
  activeFormTab: string;
  setActiveFormTab: (tab: any) => void;
  handleFieldChange: (field: string, value: any) => void;
  handleSaveApp: (e: any, formFieldsOverride?: any) => void;
  handleQuickClean: () => void;
  setEditingAppId: (id: string | null) => void;
  categories: string[];
  saving: boolean;
}

export const AppForm = ({
  editingAppId,
  formFields,
  activeFormTab,
  setActiveFormTab,
  handleFieldChange,
  handleSaveApp,
  handleQuickClean,
  setEditingAppId,
  categories,
  saving
}: AppFormProps) => {
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
      <input type="hidden" name="hidden_publish_date" value={formFields.publish_date || ''} />
      <input type="hidden" name="hidden_video_url" value={formFields.video_url || ''} />
      <input type="hidden" name="hidden_release_notes" value={formFields.release_notes || ''} />

      {/* Form Sticky Header */}
      <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800/80 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
        <div className="min-w-0 flex items-center gap-2">
          <button 
            type="button" 
            onClick={() => setEditingAppId(null)} 
            className="lg:hidden p-1.5 -ml-1 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg bg-slate-100 dark:bg-slate-800 border-0 cursor-pointer shrink-0"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 truncate">
              <Edit2 className="w-4 h-4 text-blue-500 shrink-0" />
              {editingAppId === "" ? 'Add New Application' : `Edit: ${formFields.name || 'Untitled'}`}
            </h3>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-0.5 truncate">
              {editingAppId === "" ? 'CATALOG_CREATION_MODE' : `APP_ID: ${editingAppId}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            type="button"
            onClick={() => setEditingAppId(null)}
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-all border-0 cursor-pointer"
          >
            Cancel
          </button>
          <button 
            type="button"
            onClick={handleQuickClean}
            className="text-xs font-semibold text-amber-600 hover:text-amber-700 dark:text-amber-500 dark:hover:text-amber-400 px-3 py-1.5 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/10 transition-all border-0 cursor-pointer"
          >
            Quick Clean
          </button>
          <button 
            type="submit" 
            disabled={saving} 
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all disabled:opacity-50 cursor-pointer border-0"
          >
            {saving ? 'Saving...' : <><Save className="w-3.5 h-3.5"/> Save App</>}
          </button>
        </div>
      </div>

      {/* Form Secondary Tabs Strip */}
      <div className="flex border-b border-slate-100 dark:border-slate-800 overflow-x-auto shrink-0 bg-white dark:bg-slate-900 px-3 py-1 custom-scrollbar">
        {[
          { id: 'general', label: 'Basic Info', icon: HelpCircle },
          { id: 'screenshots', label: 'Screenshots', icon: Image },
          { id: 'seo', label: 'SEO & Meta', icon: Compass },
          { id: 'content', label: 'HTML Body', icon: Type },
          { id: 'alerts', label: 'Info Alerts', icon: ShieldAlert },
          { id: 'faqs', label: 'FAQs List', icon: MessageSquare }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeFormTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveFormTab(tab.id as any)}
              className={`flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold border-b-2 transition-all whitespace-nowrap border-0 cursor-pointer ${
                isActive 
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50/30 dark:bg-blue-950/10' 
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-50/50 dark:hover:bg-slate-800/10'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Form Scrollable Body content */}
      <input type="hidden" name="sync_to_public_val" value={formFields.sync_to_public !== false ? 'true' : 'false'} />
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 pb-40 sm:pb-48 space-y-6 custom-scrollbar bg-slate-50/30 dark:bg-slate-900/10">
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
          <div className="animate-fade-in space-y-4">
            <p className="text-xs text-slate-500 dark:text-slate-400">Manage interactive FAQs specific to this application. FAQs support structured HTML and formatting.</p>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
              <FaqEditor 
                key={editingAppId || 'new'} 
                initialFaqs={formFields.faqs || []} 
                onChange={(updatedFaqs) => handleFieldChange('faqs', updatedFaqs)}
              />
            </div>
          </div>
        )}
        {activeFormTab === 'screenshots' && (
          <div className="animate-fade-in space-y-4">
            <p className="text-xs text-slate-500 dark:text-slate-400">Manage and preview high-quality optimized app screenshots for the detail page gallery.</p>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
              <ScreenshotsEditor 
                key={editingAppId || 'new'} 
                initialScreenshots={formFields.screenshots || []} 
                onChange={(updatedScreenshots) => handleFieldChange('screenshots', updatedScreenshots)}
              />
            </div>
          </div>
        )}
      </div>

      {/* Form Sticky Action Footer */}
      <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800/80 flex justify-end items-center gap-3 bg-white/95 dark:bg-slate-900/95  shrink-0 sticky bottom-0 z-20 pb-safe shadow-lg">
        <button 
          type="button"
          onClick={() => setEditingAppId(null)}
          className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
        >
          Cancel
        </button>
        <button 
          type="submit" 
          disabled={saving} 
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-md transition-all disabled:opacity-50 cursor-pointer border-0 active:scale-95"
        >
          {saving ? 'Synchronizing...' : <><Save className="w-4 h-4"/> Publish App Configuration</>}
        </button>
      </div>
    </form>
  );
};
