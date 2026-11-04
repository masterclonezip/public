import { AppConfig, GlobalSettings, NewsItem, VideoItem } from '../typesPublic';

export const mockSettings: GlobalSettings = {
  site_title: "",
  meta_description: "",
  logo_url: "",
  favicon_url: "",
  helpline_whatsapp: "",
  helpline_telegram: "",
  support_email: "",
  disclaimer_text: "",
  ethics_discrimination_text: "",
  ticker_text: "",
  animations_enabled: true,
  categories: [],
  banners: [],
  quick_links: [],
  website_faqs: []
};

export const mockApps: AppConfig[] = [];
export const mockNews: NewsItem[] = [];
export const mockVideos: VideoItem[] = [];

/**
 * On-demand async loader for the complete offline dataset.
 * Isolates the static dataset from the critical mobile JS bundle while preserving 100% offline fallback capabilities.
 */
export async function loadFullStaticDataset(): Promise<{
  apps: AppConfig[];
  settings: GlobalSettings;
  news: NewsItem[];
  videos: VideoItem[];
}> {
  try {
    const mod = await import('./staticData');
    if (Array.isArray(mod.mockApps) && mod.mockApps.length > 0) {
      return {
        apps: mod.mockApps,
        settings: mod.mockSettings || mockSettings,
        news: mod.mockNews || [],
        videos: mod.mockVideos || []
      };
    }
  } catch (_e) {}

  try {
    const jsonMod: any = await import('./staticData.json');
    const raw = jsonMod?.default || jsonMod || {};
    return {
      apps: Array.isArray(raw.apps) ? raw.apps : [],
      settings: raw.settings || mockSettings,
      news: Array.isArray(raw.news) ? raw.news : [],
      videos: Array.isArray(raw.videos) ? raw.videos : []
    };
  } catch (_err) {
    return {
      apps: [],
      settings: mockSettings,
      news: [],
      videos: []
    };
  }
}
