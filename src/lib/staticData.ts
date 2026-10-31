// No secureStorage import to avoid Vercel build errors when secureStorage is stripped

export interface Banner {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  link: string;
}

export interface GlobalSettings {
  site_title: string;
  seo_title?: string;
  seo_description?: string;
  meta_description: string;
  logo_url: string;
  favicon_url: string;
  helpline_whatsapp: string;
  helpline_telegram: string;
  support_email: string;
  disclaimer_text: string;
  disclaimer_heading?: string;
  ethics_discrimination_text: string;
  ethics_heading?: string;
  portal_heading?: string;
  important_notice_heading?: string;
  ticker_text: string;
  animations_enabled: boolean;
  seo_keywords?: string;
  about_content?: string;
  contact_content?: string;
  privacy_content?: string;
  terms_content?: string;
  responsibility_content?: string;
  report_removal_content?: string;
  important_notice?: string;
  categories: string[];
  banners: Banner[];
  last_updated?: string;
  secure_index_title?: string;
  secure_index_subtitle?: string;
  trending_searches?: string[];
  hero_title_text?: string;
  hero_title_color?: string;
  hero_title_style?: string;
  hero_title_animation?: string;
  hero_title_subtitle?: string;
  hero_title_visible?: boolean;
  ga_tracking_id?: string;
  quick_links?: Array<{ title: string; subtitle?: string; icon?: string; color?: string; url: string }>;
  social_links?: { facebook?: string; instagram?: string; twitter?: string; linkedin?: string; youtube?: string; };
  website_faqs?: Array<{ question: string; answer: string }>;
  developers?: Array<{ id?: string; name: string; role: string; bio?: string; image_url?: string; github?: string; twitter?: string; avatar_url?: string; social?: any }>;
  // Static Pages Custom SEO
  disclaimer_meta_title?: string;
  disclaimer_meta_description?: string;
  ethics_meta_title?: string;
  ethics_meta_description?: string;
  about_meta_title?: string;
  about_meta_description?: string;
  contact_meta_title?: string;
  contact_meta_description?: string;
  privacy_meta_title?: string;
  privacy_meta_description?: string;
  terms_meta_title?: string;
  terms_meta_description?: string;
  responsibility_meta_title?: string;
  responsibility_meta_description?: string;
  report_removal_meta_title?: string;
  report_removal_meta_description?: string;
  notice_meta_title?: string;
  notice_meta_description?: string;
  developers_meta_title?: string;
  developers_meta_description?: string;
  news_meta_title?: string;
  news_meta_description?: string;
  videos_meta_title?: string;
  videos_meta_description?: string;
}

export interface NewsItem {
  id: string;
  slug: string;
  title: string;
  logo_url: string;
  image_url?: string;
  description: string;
  ceo_name: string;
  ceo_description: string;
  seo_title: string;
  seo_description: string;
  seo_keywords?: string;
  category?: string;
  og_image_url?: string;
  canonical_url?: string;
  target_region?: string;
  content: string;
  published_at?: string;
  link: string;
  read_time?: string;
  author?: string;
  description_html?: string;
  date?: string;
  tags?: string[];
  related_app_id?: string;
  created_at?: string;
  updated_at?: string;
  is_breaking?: boolean;
  is_new?: boolean;
  is_pinned?: boolean;
  sync_to_public?: boolean;
}

export interface AppConfig {
  id: string;
  name: string;
  slug: string;
  seo_title?: string;
  seo_description?: string;
  seo_keywords?: string;
  og_image_url?: string;
  canonical_url?: string;
  target_region?: string;
  category: string;
  is_coming_soon?: boolean;
  publish_date?: string;
  version: string;
  file_size: string;
  developer: string;
  icon_url: string;
  screenshots: string[];
  description_html: string;
  red_box_msg: string;
  yellow_box_msg: string;
  idea_box_msg: string;
  safety_status: 'Verified' | 'Caution' | 'Unsafe';
  serial_number?: number;
  is_featured?: boolean;
  is_new?: boolean;
  is_hot?: boolean;
  release_notes?: string;
  rating?: number;
  created_at?: string;
  custom_admin_box_html?: string;
  custom_admin_box_heading?: string;
  features_html?: string;
  faqs?: {question: string; answer: string}[];
  link_configured?: boolean;
  
  video_url?: string;
  is_top_chart?: boolean;
  top_chart_category?: string;
  has_secure_link?: boolean;
  sync_to_public?: boolean;
}

export interface Review {
  id: string;
  app_id: string;
  username: string;
  rating: number;
  comment: string;
  is_approved: boolean;
}

export interface VideoItem {
  id: string;
  slug: string;
  title: string;
  description: string;
  youtube_url: string;
  seo_title: string;
  seo_description: string;
  meta_description?: string;
  seo_keywords?: string;
  canonical_url?: string;
  og_image_url?: string;
  created_at: string;
}

export const mockApps: any[] = [
  {
    "custom_admin_box_html": "",
    "idea_box_msg": "",
    "updated_at": "2026-10-29T15:45:12.661Z",
    "seo_title": "Ufxufxitx",
    "seo_description": "Fuzufxugxigxg",
    "description_html": "<h2>Hx xjbjdbkdbkxbkxbkx xjbkdbkdbksbks n</h2>",
    "faqs": [
      {
        "question": "Xuvduvd",
        "answer": "<h2>DG xx</h2>"
      }
    ],
    "is_new": true,
    "safety_status": "Verified",
    "is_coming_soon": false,
    "publish_date": "",
    "icon_url": "https://res.cloudinary.com/potup3yi/image/upload/v1793272852/yn7tyiru1anaghuozhn9.webp",
    "release_notes": "",
    "id": "hancb1ns3",
    "features_html": "",
    "yellow_box_msg": "Sh hsg",
    "developer": "Admin",
    "is_hot": true,
    "screenshots": [],
    "custom_admin_box_heading": "",
    "rating": 4.8,
    "sync_to_public": true,
    "name": "SPIN CRUSH",
    "red_box_msg": "Zjbjdh",
    "video_url": "",
    "seo_keywords": "",
    "serial_number": 1,
    "review_count": 0,
    "meta_description": "Fuzufxugxigxg",
    "created_at": "2026-10-29T11:20:53.133Z",
    "og_image_url": "",
    "canonical_url": "",
    "reviews": 0,
    "slug": "spin-crush",
    "category": "All apps, Yono Apps",
    "file_size": "Unknown",
    "version": "1.0",
    "meta_title": "Ufxufxitx",
    "has_secure_link": true
  },
  {
    "description_html": "",
    "video_url": "",
    "red_box_msg": "",
    "custom_admin_box_html": "",
    "updated_at": "2026-10-29T17:33:21.550Z",
    "safety_status": "Verified",
    "is_coming_soon": false,
    "release_notes": "",
    "custom_admin_box_heading": "",
    "faqs": [],
    "icon_url": "https://res.cloudinary.com/potup3yi/image/upload/v1793294998/wefb6o70atpcdbsdsbqf.webp",
    "seo_description": "",
    "features_html": "",
    "yellow_box_msg": "",
    "seo_keywords": "",
    "file_size": "Unknown",
    "review_count": 0,
    "og_image_url": "",
    "sync_to_public": true,
    "name": "Yono",
    "seo_title": "",
    "is_new": true,
    "created_at": "2026-10-29T17:26:33.537Z",
    "meta_description": "",
    "serial_number": 2,
    "canonical_url": "",
    "idea_box_msg": "",
    "category": "General",
    "is_hot": false,
    "version": "1.0",
    "screenshots": [],
    "developer": "Admin",
    "slug": "yono",
    "reviews": 0,
    "meta_title": "",
    "publish_date": "",
    "id": "el71l8f8a",
    "rating": 5,
    "has_secure_link": false
  }
];

export const saveMockApps = (apps: any[]) => {
  try {
    localStorage.setItem('store_apps', JSON.stringify(apps));
  } catch (e) {
    console.warn('saveMockApps storage failed:', e);
  }
  mockApps.splice(0, mockApps.length, ...apps);
};

export const mockSettings: any = {
  "site_title": "YonoappDex",
  "meta_description": "",
  "logo_url": "",
  "favicon_url": "",
  "helpline_whatsapp": "",
  "helpline_telegram": "",
  "support_email": "",
  "disclaimer_text": "",
  "ethics_discrimination_text": "",
  "ticker_text": "",
  "animations_enabled": true,
  "categories": [
    "All apps",
    "Yono Apps"
  ],
  "banners": [],
  "quick_links": [],
  "website_faqs": [],
  "developers": [],
  "contact_meta_description": "",
  "trending_searches": "",
  "privacy_meta_description": "",
  "portal_heading": "",
  "contact_meta_title": "",
  "primary_color": "#10b981",
  "facebook_url": "",
  "cloudinary_api_key": "",
  "report_removal_content": "",
  "hero_title_visible": true,
  "cloudinary_cloud_name": "",
  "site_description": "",
  "telegram_url": "",
  "social_links": {
    "youtube": "",
    "facebook": "",
    "instagram": "",
    "linkedin": "",
    "twitter": ""
  },
  "terms_meta_title": "",
  "terms_content": "",
  "gemini_model": "gemini-2.5-flash",
  "last_updated": "2026-10-31T16:10:36.437Z",
  "disclaimer_meta_title": "",
  "ethics_heading": "",
  "contact_email": "",
  "important_notice_heading": "",
  "site_tagline": "",
  "faq_meta_description": "",
  "new_apps_meta_title": "",
  "responsibility_content": "",
  "twitter_url": "",
  "videos_meta_description": "",
  "custom_head_scripts": "",
  "hero_title_color": "classic-dark",
  "videos_meta_title": "",
  "news_meta_description": "",
  "about_meta_description": "",
  "categories_meta_title": "",
  "report_removal_meta_title": "",
  "responsibility_meta_title": "",
  "cloudinary_upload_preset": "",
  "seo_keywords": "",
  "secure_index_title": "",
  "privacy_meta_title": "",
  "seo_description": "",
  "hero_title_animation": "fade-in",
  "hero_title_style": "modern",
  "footer_text": "",
  "privacy_content": "",
  "hero_title_subtitle": "",
  "new_apps_meta_description": "",
  "hero_title_text": "",
  "notice_meta_description": "",
  "maintenance_mode": false,
  "youtube_url": "",
  "categories_meta_description": "",
  "disclaimer_heading": "",
  "secure_index_subtitle": "",
  "faq_meta_title": "",
  "news_meta_title": "",
  "important_notice": "",
  "ga_tracking_id": "",
  "notice_meta_title": "",
  "terms_meta_description": "",
  "responsibility_meta_description": "",
  "about_content": "",
  "about_meta_title": "",
  "seo_title": "",
  "copyright_text": "",
  "_rest_admin_bypass": "aistudio_preview_bypass_key",
  "disclaimer_meta_description": "",
  "report_removal_meta_description": "",
  "ethics_meta_description": "",
  "turnstile_site_key": "",
  "developers_meta_title": "",
  "instagram_url": "",
  "developers_meta_description": "",
  "og_image": "",
  "ethics_meta_title": ""
};

export const saveMockSettings = (settings: any) => {
  try {
    localStorage.setItem('store_settings', JSON.stringify(settings));
  } catch (e) {
    console.warn('saveMockSettings storage failed:', e);
  }
  Object.assign(mockSettings, settings);
};

export const mockNews: any[] = [];

export const saveMockNews = (newsList: any[]) => {
  try {
    localStorage.setItem('store_news', JSON.stringify(newsList));
  } catch (e) {
    console.warn('saveMockNews storage failed:', e);
  }
  mockNews.splice(0, mockNews.length, ...newsList);
};

export const mockVideos: any[] = [];

export const saveMockVideos = (videos: VideoItem[]) => {
  try {
    localStorage.setItem('store_videos', JSON.stringify(videos));
  } catch (e) {
    console.warn('saveMockVideos storage failed:', e);
  }
  mockVideos.splice(0, mockVideos.length, ...videos);
};
