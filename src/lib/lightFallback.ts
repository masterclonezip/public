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

export interface StaticDatasetPayload {
  apps: AppConfig[];
  settings: GlobalSettings;
  news: NewsItem[];
  videos: VideoItem[];
}

let cachedStaticDataset: StaticDatasetPayload | null = null;
let inflightDatasetPromise: Promise<StaticDatasetPayload> | null = null;

/**
 * Synchronous accessor for the in-memory static dataset once pre-warmed.
 */
export function getCachedStaticDatasetSync(): StaticDatasetPayload | null {
  return cachedStaticDataset;
}

/**
 * On-demand async loader for the complete offline dataset with singleton memory caching.
 * Isolates the static dataset from the critical mobile JS bundle while preserving 0ms route transitions.
 */
export async function loadFullStaticDataset(): Promise<StaticDatasetPayload> {
  if (cachedStaticDataset) {
    return cachedStaticDataset;
  }
  if (inflightDatasetPromise) {
    return inflightDatasetPromise;
  }

  inflightDatasetPromise = (async () => {
    try {
      const mod = await import('./staticData');
      if (Array.isArray(mod.mockApps) && mod.mockApps.length > 0) {
        cachedStaticDataset = {
          apps: mod.mockApps,
          settings: mod.mockSettings || mockSettings,
          news: mod.mockNews || [],
          videos: mod.mockVideos || []
        };
        return cachedStaticDataset;
      }
    } catch (_e) {}

    try {
      const jsonMod: any = await import('./staticData.json');
      const raw = jsonMod?.default || jsonMod || {};
      cachedStaticDataset = {
        apps: Array.isArray(raw.apps) ? raw.apps : [],
        settings: raw.settings || mockSettings,
        news: Array.isArray(raw.news) ? raw.news : [],
        videos: Array.isArray(raw.videos) ? raw.videos : []
      };
      return cachedStaticDataset;
    } catch (_err) {
      return {
        apps: [],
        settings: mockSettings,
        news: [],
        videos: []
      };
    } finally {
      inflightDatasetPromise = null;
    }
  })();

  return inflightDatasetPromise;
}

