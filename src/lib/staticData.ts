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
    "created_at": "2026-10-29T11:20:53.133Z",
    "category": "All apps, Yono Apps",
    "canonical_url": "",
    "og_image_url": "",
    "is_hot": true,
    "safety_status": "Verified",
    "custom_admin_box_html": "",
    "is_new": true,
    "publish_date": "",
    "video_url": "",
    "id": "hancb1ns3",
    "release_notes": "",
    "seo_description": "Fuzufxugxigxg",
    "description_html": "<h2>Hx xjbjdbkdbkxbkxbkx xjbkdbkdbksbks n</h2>",
    "slug": "spin-crush",
    "is_coming_soon": false,
    "rating": 4.8,
    "seo_keywords": "",
    "yellow_box_msg": "Sh hsg",
    "red_box_msg": "Zjbjdh",
    "review_count": 0,
    "name": "SPIN CRUSH",
    "developer": "Admin",
    "icon_url": "https://res.cloudinary.com/potup3yi/image/upload/v1793272852/yn7tyiru1anaghuozhn9.webp",
    "reviews": 0,
    "custom_admin_box_heading": "",
    "serial_number": 1,
    "idea_box_msg": "",
    "meta_description": "Fuzufxugxigxg",
    "file_size": "Unknown",
    "meta_title": "Ufxufxitx",
    "screenshots": [],
    "version": "1.0",
    "updated_at": "2026-10-29T15:45:12.661Z",
    "seo_title": "Ufxufxitx",
    "faqs": [
      {
        "question": "Xuvduvd",
        "answer": "<h2>DG xx</h2>"
      }
    ],
    "sync_to_public": true,
    "features_html": "",
    "has_secure_link": true
  },
  {
    "serial_number": 2,
    "yellow_box_msg": "",
    "reviews": 0,
    "red_box_msg": "",
    "faqs": [],
    "og_image_url": "",
    "is_coming_soon": false,
    "publish_date": "",
    "seo_title": "",
    "updated_at": "2026-10-29T17:33:21.550Z",
    "meta_title": "",
    "icon_url": "https://res.cloudinary.com/potup3yi/image/upload/v1793294998/wefb6o70atpcdbsdsbqf.webp",
    "version": "1.0",
    "file_size": "Unknown",
    "meta_description": "",
    "seo_keywords": "",
    "review_count": 0,
    "features_html": "",
    "idea_box_msg": "",
    "sync_to_public": true,
    "safety_status": "Verified",
    "developer": "Admin",
    "rating": 5,
    "canonical_url": "",
    "slug": "yono",
    "name": "Yono",
    "description_html": "",
    "screenshots": [],
    "release_notes": "",
    "video_url": "",
    "seo_description": "",
    "category": "General",
    "custom_admin_box_html": "",
    "is_hot": false,
    "custom_admin_box_heading": "",
    "id": "el71l8f8a",
    "is_new": true,
    "created_at": "2026-10-29T17:26:33.537Z",
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
  "logo_url": "https://res.cloudinary.com/potup3yi/image/upload/v1793471348/ptagmwyr07rmxmjlxcqr.png",
  "favicon_url": "https://res.cloudinary.com/potup3yi/image/upload/v1793471348/ptagmwyr07rmxmjlxcqr.png",
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
  "instagram_url": "",
  "report_removal_meta_description": "",
  "custom_head_scripts": "",
  "social_links": {
    "facebook": "",
    "instagram": "",
    "youtube": "",
    "linkedin": "",
    "twitter": ""
  },
  "trending_searches": "",
  "responsibility_content": "",
  "twitter_url": "",
  "hero_title_subtitle": "",
  "hero_title_visible": true,
  "contact_email": "",
  "new_apps_meta_description": "",
  "important_notice_heading": "",
  "seo_keywords": "",
  "youtube_url": "",
  "facebook_url": "",
  "cloudinary_cloud_name": "",
  "og_image": "",
  "hero_title_color": "classic-dark",
  "maintenance_mode": false,
  "contact_meta_description": "",
  "last_updated": "2026-10-31T18:29:34.146Z",
  "copyright_text": "",
  "developers_meta_description": "",
  "privacy_meta_title": "",
  "responsibility_meta_title": "",
  "categories_meta_description": "",
  "_rest_admin_bypass": "aistudio_preview_bypass_key",
  "gemini_model": "gemini-2.5-flash",
  "seo_title": "",
  "privacy_content": "",
  "faq_meta_description": "",
  "site_description": "",
  "notice_meta_description": "",
  "cloudinary_upload_preset": "",
  "about_meta_title": "",
  "ethics_meta_description": "",
  "about_meta_description": "",
  "news_meta_title": "",
  "report_removal_content": "",
  "terms_meta_title": "",
  "news_meta_description": "",
  "terms_content": "",
  "cloudinary_api_key": "",
  "new_apps_meta_title": "",
  "footer_text": "",
  "categories_meta_title": "",
  "site_tagline": "",
  "notice_meta_title": "",
  "faq_meta_title": "",
  "turnstile_site_key": "",
  "responsibility_meta_description": "",
  "seo_description": "",
  "important_notice": "",
  "disclaimer_meta_title": "",
  "ethics_meta_title": "",
  "secure_index_subtitle": "",
  "telegram_url": "",
  "report_removal_meta_title": "",
  "hero_title_style": "modern",
  "portal_heading": "",
  "hero_title_animation": "fade-in",
  "about_content": "",
  "disclaimer_heading": "",
  "terms_meta_description": "",
  "developers_meta_title": "",
  "ethics_heading": "",
  "videos_meta_title": "",
  "secure_index_title": "",
  "hero_title_text": "",
  "primary_color": "#10b981",
  "contact_meta_title": "",
  "ga_tracking_id": "",
  "privacy_meta_description": "",
  "disclaimer_meta_description": "",
  "videos_meta_description": ""
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
