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
    "reviews": 0,
    "developer": "Admin",
    "review_count": 0,
    "screenshots": [],
    "og_image_url": "",
    "custom_admin_box_html": "",
    "red_box_msg": "IMPORTANT Never share your OTP, bank details, card PIN, or passwords with any app or person. Download APK files only from sources you trust. ",
    "created_at": "2026-11-01T15:13:50.274Z",
    "is_hot": false,
    "name": "EVER 777",
    "seo_keywords": "every 77, every 77 apk, every 77 apk download, every 77 game, every 77 latest version, every 77 free download, every 77 android app, every 77 app",
    "icon_url": "https://res.cloudinary.com/potup3yi/image/upload/v1793546491/vtwuonharlo6opxo1nsm.webp",
    "updated_at": "2026-11-01T17:44:41.672Z",
    "file_size": "Unknown",
    "video_url": "",
    "id": "dfo28zln2",
    "serial_number": 2,
    "seo_description": "Get the  Every 77 APK free for Android. screenshots and how to install safely. Get the latest version on YonoAppDex.",
    "category": "All apps, Yono Apps",
    "yellow_box_msg": "NOTICE This is a third-party app listed on YonoAppDex. We do not guarantee any earnings or rewards. Please use the app responsibly and only if it is legal in your resion.",
    "version": "1.0",
    "features_html": "",
    "rating": 5,
    "meta_title": "Every 77 APK Download – Free Android Game (Latest 2026)",
    "is_coming_soon": false,
    "is_new": true,
    "custom_admin_box_heading": "",
    "release_notes": "",
    "meta_description": "Get the  Every 77 APK free for Android. screenshots and how to install safely. Get the latest version on YonoAppDex.",
    "safety_status": "Verified",
    "seo_title": "Every 77 APK Download – Free Android Game (Latest 2026)",
    "faqs": [
      {
        "question": "What is Every 777 ??",
        "answer": "<p>Every 77 is an Android game app listed on YonoAppDex. This page explains its features, installation steps, and safety tips so you can decide before downloading..</p>"
      },
      {
        "question": "Is Every 77 Free to Download ?",
        "answer": "<p>Yes, the app is listed as free. Some apps may include optional in-app items, so please check inside the app</p>"
      },
      {
        "question": "Is Every 77 free to download?",
        "answer": "<p>Yes, the app is listed as free. Some apps may include optional in-app items, so please check inside the app.</p>"
      }
    ],
    "sync_to_public": true,
    "slug": "every-77",
    "canonical_url": "https://yonoappdex.com/app/every-77",
    "description_html": "<h2>About Every 77</h2>\n<p>Every 77 is an Android game app listed on YonoAppDex. This page gives you a clear overview of the app, its main features, and important points to check before you download or install it.</p>\n\n<h2>Key Features</h2>\n<ul>\n<li>Simple and easy-to-use interface</li>\n<li>Lightweight app with quick loading</li>\n<li>Designed for Android devices</li>\n<li>Free to download</li>\n<li>Regular listing updates on YonoAppDex</li>\n</ul>\n\n<h2>App Information</h2>\n<ul>\n<li><strong>App Name:</strong> Every 77</li>\n<li><strong>Category:</strong> Game</li>\n<li><strong>Platform:</strong> Android</li>\n<li><strong>Price:</strong> Free</li>\n<li><strong>Rating:</strong> 5.0 (195 reviews)</li>\n</ul>\n\n<h2>How to Install Every 77 APK</h2>\n<ol>\n<li>Tap the download button on this page.</li>\n<li>Open the downloaded APK file from your notifications or file manager.</li>\n<li>If asked, allow installation from this source in your phone settings.</li>\n<li>Tap Install and wait for the process to finish.</li>\n<li>Open the app and follow the on-screen steps.</li>\n</ol>\n\n<h3>Safety Tips Before You Install</h3>\n<ul>\n<li>Download only from trusted sources and check the file before opening.</li>\n<li>Never share your OTP, bank details, or passwords with any app or person.</li>\n<li>Use the app responsibly and only if it is legal in your region.</li>\n<li>Keep a security app or Google Play Protect turned on.</li>\n</ul>\n\n<h2>Frequently Asked Questions</h2>\n<h3>Is Every 77 free to download?</h3>\n<p>Yes, the app is listed as free. Some apps may include optional in-app items, so check inside the app.</p>\n\n<h3>Is Every 77 available for iPhone?</h3>\n<p>This listing is for Android devices only.</p>\n\n<h3>Which Android version is required?</h3>\n<p>Most modern Android phones work well. Check the Basic Info tab for the exact requirement.</p>\n\n<h2>Disclaimer</h2>\n<p>YonoAppDex is an independent app directory. We are not the developer of Every 77 and do not guarantee any earnings, results, or rewards. Information is provided for reference only. Please review the app yourself and use it at your own discretion.</p>",
    "publish_date": "",
    "idea_box_msg": "",
    "has_secure_link": false
  },
  {
    "file_size": "Unknown",
    "rating": 5,
    "description_html": "<h2>About Slots Winner</h2>\n\n<p>Slots Winner is a free Android game built around classic slot-style gameplay. It is designed for casual entertainment with simple controls and a clean interface.</p>\n\n<h2>Key Features</h2>\n\n<ul>\n  <li>Easy-to-use interface suitable for new players</li>\n  <li>Classic slot-style gameplay with colorful visuals</li>\n  <li>Free to install on supported Android devices</li>\n  <li>Lightweight design that runs smoothly on most phones</li>\n  <li>Quick sessions you can enjoy anytime</li>\n</ul>\n\n<h3>How to Get Started</h3>\n\n<p>1. Check that your device is running a supported version of Android.</p>\n\n<p>2. Make sure you have enough free storage space.</p>\n\n<p>3. Open the download link on this page and follow the on-screen steps.</p>\n\n<p>4. Review the permissions requested before you install.</p>\n\n<p>5. Launch the game and explore the features at your own pace.</p>\n\n<h3>Device Requirements</h3>\n\n<ul>\n  <li>Android smartphone or tablet</li>\n  <li>Stable internet connection recommended</li>\n  <li>Sufficient free storage space</li>\n</ul>\n\n<h2>Frequently Asked Questions</h2>\n\n<p>Is Slots Winner free to install?</p>\n\n<p>Yes, the game is free to install. Please review the in-app details before making any purchase.</p>\n\n<p>Is this game suitable for everyone?</p>\n\n<p>No. This game is intended for users aged 18 and above only.</p>\n\n<p>Does the game guarantee winnings?</p>\n\n<p>No. Slots Winner is made for entertainment purposes only. Results are random, and no winnings, rewards or earnings are guaranteed.</p>\n\n<p>Is it safe to install?</p>\n\n<p>Always download from a source you trust, review the permissions the app asks for, and keep your device security settings turned on.</p>\n\n<h3>Important Disclaimer</h3>\n\n<p>Slots Winner is intended for entertainment only. This page does not promise or guarantee any winnings, income or rewards. Availability and rules for gaming apps may vary by country or state, so please make sure the app is permitted in your region before using it. This game is for adults aged 18+ only. Please play responsibly, set time limits for yourself, and take breaks. If gaming starts to affect your daily life, stop and speak to someone you trust.</p>",
    "seo_description": "Slots Winner is a free Android slots-style game with simple gameplay. 18+ only. Play responsibly and check app details before installing.",
    "id": "78rqtov9p",
    "is_new": true,
    "meta_title": "Slots Winner – Free Android Slots Game for Fun",
    "icon_url": "https://res.cloudinary.com/potup3yi/image/upload/v1793553811/see8zebidhgqfnb1rz3l.png",
    "video_url": "",
    "seo_keywords": "slots winner, slots game android, free slots game, slot games, casual casino game, android game",
    "meta_description": "Slots Winner is a free Android slots-style game with simple gameplay. 18+ only. Play responsibly and check app details before installing.",
    "version": "1.0",
    "developer": "Admin",
    "og_image_url": "",
    "name": "SLOTS WINNER",
    "review_count": 0,
    "serial_number": 2,
    "faqs": [
      {
        "question": "Is Slots Winner free to install?",
        "answer": "<p>Yes, the game is free to install. Please review the in-app details before making any purchase.</p>"
      },
      {
        "question": "Is this game suitable for everyone?",
        "answer": "<p>No. This game is intended for users aged 18 and above only. Please play responsibly.</p>"
      },
      {
        "question": "Does Slots Winner guarantee winnings?",
        "answer": "<p>No. The game is made for entertainment only. Results are random, and no winnings, rewards or earnings are guaranteed.</p>"
      },
      {
        "question": "",
        "answer": ""
      }
    ],
    "features_html": "",
    "yellow_box_msg": "NOTICE This game is for entertainment only. Results are random and no winnings or earnings are guaranteed. Availability may vary by country or state, so check the rules in your region before using it.",
    "idea_box_msg": "",
    "created_at": "2026-11-01T17:39:17.014Z",
    "publish_date": "",
    "is_coming_soon": false,
    "seo_title": "Slots Winner – Free Android Slots Game for Fun",
    "screenshots": [],
    "slug": "slots-winner",
    "custom_admin_box_html": "",
    "red_box_msg": "IMPORTANT This game is for users aged **18+ only**. Download apps only from sources you trust and review the permissions before installing.",
    "release_notes": "",
    "safety_status": "Verified",
    "is_hot": false,
    "sync_to_public": true,
    "custom_admin_box_heading": "",
    "reviews": 0,
    "canonical_url": "https://yonoappdex.com/app/slots-winner",
    "category": "All apps, Yono Apps",
    "updated_at": "2026-11-01T18:32:25.943Z",
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
  "meta_description": "Independent directory of Yono apps and games. Read detailed profiles, labels and real-money warnings, with official links only to apps without real money.",
  "logo_url": "https://res.cloudinary.com/potup3yi/image/upload/v1793499107/vvqemcm3gkjsko5m6unw.png",
  "favicon_url": "https://res.cloudinary.com/potup3yi/image/upload/v1793499107/vvqemcm3gkjsko5m6unw.png",
  "helpline_whatsapp": "",
  "helpline_telegram": "",
  "support_email": "",
  "disclaimer_text": "<h2><svg width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"#1a73e8\" stroke-width=\"2\" style=\"vertical-align:middle;margin-right:8px\" aria-hidden=\"true\"><circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M12 8h.01M11 12h1v5h1\"/></svg>1. General Information and No Endorsement</h2>\n<p>The content on YonoappDex, including app profiles, rule explanations, labels, and categories, is published for general information, education, and software discovery. YonoappDex is an observational digital encyclopedia.</p>\n<ul>\n  <li><strong>Public sources:</strong> we build profiles from public information, such as developer websites, official store listings, published rules, and version notes. We do not inspect source code, run security penetration tests, or play with real money.</li>\n  <li><strong>No endorsement:</strong> listing an app, or giving it a label or tick, is not an endorsement, security clearance, or legal certification. It is not an assurance of the operator's solvency, fairness, or reliability. You use any information at your own discretion and risk.</li>\n  <li><strong>Labels can change:</strong> labels reflect public information at the time of review, which is shown on each listing. Apps change, and a label may become out of date.</li>\n</ul>\n\n<h2><svg width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"#d97706\" stroke-width=\"2\" style=\"vertical-align:middle;margin-right:8px\" aria-hidden=\"true\"><path d=\"M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z\"/><path d=\"M12 9v4M12 17h.01\"/></svg>2. Apps That Involve Real Money</h2>\n<p>Our directory also describes apps that involve real money. We describe them factually, in line with consumer risk-transparency standards under the <a href=\"https://consumeraffairs.nic.in/\" target=\"_blank\" rel=\"noopener noreferrer\">Consumer Protection Act, 2019</a> and guidelines from the <a href=\"https://www.ascionline.in/\" target=\"_blank\" rel=\"noopener noreferrer\">Advertising Standards Council of India (ASCI)</a>.</p>\n<ul>\n  <li><strong>Information only:</strong> for these apps we provide information and do not provide download links. We do not publish referral codes, bonus offers, or instructions for depositing.</li>\n  <li><strong>18+ only:</strong> real-money apps are for adults aged 18 and older.</li>\n  <li><strong>Legal status:</strong> real-money online gaming is prohibited or restricted under Indian law, including the <a href=\"https://www.indiacode.nic.in/\" target=\"_blank\" rel=\"noopener noreferrer\">Promotion and Regulation of Online Gaming Act, 2025</a>, and state laws. YonoappDex does not provide legal advice. You are responsible for checking and following the law that applies to you.</li>\n  <li><strong>Financial risk:</strong> real-money games carry a substantial risk of loss. Winning is not assured, and knowing the rules does not ensure returns. Real-money and fast-paced gaming can also be habit-forming.</li>\n  <li><strong>The absence of a warning is not a promise:</strong> some apps change their features or do not describe them clearly. If an app has no warning on our site, do not assume it involves no real money. Check the app's own terms.</li>\n</ul>\n\n<h2><svg width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"#1a73e8\" stroke-width=\"2\" style=\"vertical-align:middle;margin-right:8px\" aria-hidden=\"true\"><rect x=\"2\" y=\"6\" width=\"20\" height=\"13\" rx=\"2\"/><path d=\"M2 10h20\"/></svg>3. Ads, In-App Purchases, and Data in Third-Party Apps</h2>\n<p>Many apps, including free ones, show advertising, sell in-app items, or collect data through advertising and analytics tools. We try to mention these where public information shows them, but our profiles may not be complete. Check an app's store listing, privacy policy, and permissions before you install it.</p>\n\n<h2><svg width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"#1a73e8\" stroke-width=\"2\" style=\"vertical-align:middle;margin-right:8px\" aria-hidden=\"true\"><path d=\"M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-6\"/><path d=\"M12 3v12M8 7l4-4 4 4\"/></svg>4. Non-Operator Status</h2>\n<p>YonoappDex is not a gaming operator, casino, bookmaker, or payment processor. We do not handle player registrations, process UPI or bank deposits, hold wallet balances, or manage withdrawals. We are not able to mediate or refund disputes, failed transactions, frozen accounts, or forfeited bonuses between you and an app developer. Please direct support and financial claims to the developer.</p>\n\n<h2><svg width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"#1a73e8\" stroke-width=\"2\" style=\"vertical-align:middle;margin-right:8px\" aria-hidden=\"true\"><path d=\"M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3\"/></svg>5. Outbound Links and File Hosting</h2>\n<ul>\n  <li><strong>Links:</strong> we link only to apps we have labelled as not involving real money and whose official source we have confirmed, using the official store page or the developer's own website. See How We Label Apps.</li>\n  <li><strong>No file hosting:</strong> YonoappDex servers do not store executable software files (.apk, .xapk, .ipa).</li>\n  <li><strong>External sites:</strong> when you click an outbound link, we show a notice that you are leaving our domain. Developers can change their code, rules, or ownership at any time without telling us. To the extent permitted by law, we are not responsible for malware, device damage, data loss, or misleading practices on third-party sites.</li>\n</ul>\n\n<h2><svg width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"#1a73e8\" stroke-width=\"2\" style=\"vertical-align:middle;margin-right:8px\" aria-hidden=\"true\"><path d=\"M12 3l8 3v6c0 4.5-3.2 8.3-8 9-4.8-.7-8-4.5-8-9V6z\"/></svg>6. Non-Affiliation</h2>\n<p>YonoappDex is independent. It has no affiliation with <strong>State Bank of India (SBI)</strong>, the official <strong>SBI YONO</strong> banking platform, or any app developer. Third-party names, logos, and brands belong to their owners and are used to identify apps. See our Legal Notice for details.</p>\n\n<h2><svg width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"#1a73e8\" stroke-width=\"2\" style=\"vertical-align:middle;margin-right:8px\" aria-hidden=\"true\"><rect x=\"3\" y=\"5\" width=\"18\" height=\"14\" rx=\"2\"/><path d=\"M3 7l9 6 9-6\"/></svg>7. Contact</h2>\n<p>For questions about this Disclaimer, or to report a wrong label or an unsafe link:</p>\n<p><strong>Grievance Officer:</strong> Govardhan Das, YonoappDex<br>\n<strong>Email:</strong> <a href=\"mailto:support@yonoappdex.com\">support@yonoappdex.com</a></p>\n<p><em>Last updated: 2 November 2026</em></p>",
  "ethics_discrimination_text": "<h2><svg width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"#1a73e8\" stroke-width=\"2\" style=\"vertical-align:middle;margin-right:8px\" aria-hidden=\"true\"><path d=\"M12 3l8 3v6c0 4.5-3.2 8.3-8 9-4.8-.7-8-4.5-8-9V6z\"/></svg>1. Our Commitment to Editorial Integrity</h2>\n<p>People searching for Yono apps meet misleading promotional blogs, disguised ads, and counterfeit download sites. YonoappDex is an independent, non-commercial directory that aims to give clear, factual information about Yono apps of every kind, so visitors understand an app before they download it. This policy explains how we research, label, write, and update every app profile.</p>\n\n<h2><svg width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"#1a73e8\" stroke-width=\"2\" style=\"vertical-align:middle;margin-right:8px\" aria-hidden=\"true\"><circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M5.6 5.6l12.8 12.8\"/></svg>2. Independence and Funding</h2>\n<p>A site that earns money for every download or deposit tends to write sales pitches. We keep our editorial work separate from commercial interests:</p>\n<ul>\n  <li><strong>No referral or affiliate income:</strong> we do not currently take part in referral programs, cost-per-acquisition networks, revenue sharing, or affiliate schemes with any developer or operator.</li>\n  <li><strong>No paid placements:</strong> developers cannot pay to be listed, featured, ranked higher, or described favourably.</li>\n  <li><strong>No gifts or favours:</strong> our editors may not accept money, credits, gifts, or favours from developers in exchange for inclusion, labels, or the removal of negative safety information.</li>\n  <li><strong>If this changes:</strong> if we ever add advertising or other income, we will say so on this page and in our other policies before it starts.</li>\n</ul>\n\n<h2><svg width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"#1a73e8\" stroke-width=\"2\" style=\"vertical-align:middle;margin-right:8px\" aria-hidden=\"true\"><circle cx=\"11\" cy=\"11\" r=\"7\"/><path d=\"M21 21l-4.3-4.3\"/></svg>3. How We Research and Write Profiles</h2>\n<p>Our editors do not write subjective gameplay reviews and do not create player accounts or wager real money on listed apps. We build each profile from public sources:</p>\n<ul>\n  <li><strong>Sources:</strong> developer websites, official store listings, published rules and terms, version notes, interface descriptions, and technical details such as size, system requirements, and permission declarations.</li>\n  <li><strong>Level of detail:</strong> we describe each app as thoroughly as public information allows, including game type, rules, features, monetisation, and legal status. Where information is missing or unclear, we say so.</li>\n  <li><strong>Neutral tone:</strong> we write in a descriptive, analytical tone and avoid hype or promises such as \"easy winnings\" or \"guaranteed payouts\".</li>\n  <li><strong>Review date:</strong> each profile shows when it was last reviewed. A profile does not amount to an audit of the app's code or an assurance of the developer's reliability.</li>\n</ul>\n\n<h2><svg width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"#d97706\" stroke-width=\"2\" style=\"vertical-align:middle;margin-right:8px\" aria-hidden=\"true\"><path d=\"M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z\"/><path d=\"M12 9v4M12 17h.01\"/></svg>4. Real-Money Apps: Information Without Promotion</h2>\n<p>In line with consumer transparency principles under the <a href=\"https://consumeraffairs.nic.in/\" target=\"_blank\" rel=\"noopener noreferrer\">Consumer Protection Act, 2019</a> and the advertising standards of the <a href=\"https://www.ascionline.in/\" target=\"_blank\" rel=\"noopener noreferrer\">Advertising Standards Council of India (ASCI)</a>, we handle apps that involve real money as follows:</p>\n<ul>\n  <li><strong>Full description, no link:</strong> we describe these apps in detail so people can understand them. We do not provide download links for them.</li>\n  <li><strong>No promotional content:</strong> we do not publish referral codes, welcome bonuses, offer amounts, deposit instructions, or wording that encourages people to play.</li>\n  <li><strong>Clear warnings:</strong> each real-money profile carries a visible 18+ notice, a financial risk warning, and a note on the legal position under Indian law.</li>\n  <li><strong>Unknown cases:</strong> where we cannot tell whether an app involves real money, we label it \"unknown\" and do not provide a link.</li>\n</ul>\n\n<h2><svg width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"#dc2626\" stroke-width=\"2\" style=\"vertical-align:middle;margin-right:8px\" aria-hidden=\"true\"><rect x=\"5\" y=\"11\" width=\"14\" height=\"10\" rx=\"2\"/><path d=\"M8 11V7a4 4 0 0 1 8 0v4\"/></svg>5. Source Checks Before We Link</h2>\n<p>Popular \"Yono\" names are often copied by clones that steal user data. Before we publish a link, we follow these steps, which are explained on the How We Label Apps page:</p>\n<ul>\n  <li><strong>Origin check:</strong> we compare the developer name, store listing, and domain history to confirm the link leads to the official developer website or official store page, and not to a mirror or modded APK site.</li>\n  <li><strong>Real-money check:</strong> we link only to apps we have found not to involve real money.</li>\n  <li><strong>Point-in-time notice:</strong> external developers control their own sites, so our check applies at the review date shown on the listing. Our exit notice tells visitors they are leaving YonoappDex.</li>\n</ul>\n\n<h2><svg width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"#1a73e8\" stroke-width=\"2\" style=\"vertical-align:middle;margin-right:8px\" aria-hidden=\"true\"><path d=\"M21 12a9 9 0 1 1-3-6.7M21 4v5h-5\"/></svg>6. Corrections, Updates, and Removal of Links</h2>\n<ul>\n  <li><strong>Updates:</strong> when a developer makes a major change, we update the profile and the review date.</li>\n  <li><strong>Reports:</strong> if someone reports that a linked app involves real money or is unsafe, we aim to disable the link within 24 hours and review afterwards. A link removed for real money is not restored.</li>\n  <li><strong>Safety over traffic:</strong> an app's search popularity does not change our decision.</li>\n  <li><strong>Wording of warnings:</strong> when we warn about an app, we state facts and cite the source, such as \"users have reported withdrawal delays\", and we offer the developer a way to respond.</li>\n</ul>\n\n<h2><svg width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"#1a73e8\" stroke-width=\"2\" style=\"vertical-align:middle;margin-right:8px\" aria-hidden=\"true\"><rect x=\"3\" y=\"5\" width=\"18\" height=\"14\" rx=\"2\"/><path d=\"M3 7l9 6 9-6\"/></svg>7. Editorial Contact</h2>\n<p>Decisions on categories, labels, and safety warnings rest with the independent administration of YonoappDex. To report a factual error or an ethical concern about a listing:</p>\n<p><strong>Grievance Officer:</strong> Govardhan Das, YonoappDex<br>\n<strong>Email:</strong> <a href=\"mailto:support@yonoappdex.com\">support@yonoappdex.com</a></p>\n<p><em>Last updated: 2 November 2026</em></p>",
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
  "secure_index_title": "Trusted Application Directory & Digital Resource Portal",
  "last_ping_at": "2026-11-01T02:16:33.837Z",
  "portal_heading": "",
  "terms_meta_description": "YonoappDex Terms and Conditions: use of the directory, 18+ rule for real-money apps, acceptable use, warranty disclaimer, liability limits, governing law.",
  "seo_title": "YonoappDex | Yono Apps & Games Directory",
  "copyright_text": "",
  "hero_title_animation": "zoom-out",
  "hero_title_color": "cosmic-purple",
  "news_meta_description": "",
  "seo_keywords": "YonoappDex, Yono apps, Yono games, Yono app directory, Yono games list, Yono app information, Yono card games, Yono casual games, Yono app details, Yono game rules, real money game warning, Yono app labels, official source confirmed, Play Store games directory, app information India",
  "faq_meta_description": "",
  "about_meta_title": "About YonoappDex: Vision, Mission & Purpose",
  "last_updated": "2026-11-02T04:07:40.677Z",
  "telegram_url": "",
  "privacy_meta_title": "Read our Privacy Policy",
  "privacy_content": "<h2><svg width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"#1a73e8\" stroke-width=\"2\" style=\"vertical-align:middle;margin-right:8px\" aria-hidden=\"true\"><path d=\"M12 3l8 3v6c0 4.5-3.2 8.3-8 9-4.8-.7-8-4.5-8-9V6z\"/></svg>1. Introduction and Who We Are</h2>\n<p>This Privacy Policy explains how YonoappDex (yonoappdex.com) handles information when you browse our app directory. YonoappDex is run by its administration, which decides how any personal data we receive is used. Our Grievance Officer is Govardhan Das. We keep data collection to a minimum and aim to follow the <a href=\"https://www.meity.gov.in/\" target=\"_blank\" rel=\"noopener noreferrer\">Digital Personal Data Protection Act, 2023 (DPDP Act)</a> and the <a href=\"https://www.indiacode.nic.in/\" target=\"_blank\" rel=\"noopener noreferrer\">Information Technology Act, 2000</a>.</p>\n\n<h2><svg width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"#1a73e8\" stroke-width=\"2\" style=\"vertical-align:middle;margin-right:8px\" aria-hidden=\"true\"><rect x=\"5\" y=\"11\" width=\"14\" height=\"10\" rx=\"2\"/><path d=\"M8 11V7a4 4 0 0 1 8 0v4\"/></svg>2. What We Do Not Ask For</h2>\n<p>You do not need an account or to give personal details to use this site. We do not ask for or process:</p>\n<ul>\n  <li><strong>Accounts or profiles:</strong> we have no registration, login, or user profiles.</li>\n  <li><strong>Financial or KYC data:</strong> bank details, UPI IDs, card numbers, wallet balances, Aadhaar, PAN, or KYC documents.</li>\n  <li><strong>Device files:</strong> viewing our pages does not give us access to your storage, contacts, SMS, or media.</li>\n</ul>\n\n<h2><svg width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"#1a73e8\" stroke-width=\"2\" style=\"vertical-align:middle;margin-right:8px\" aria-hidden=\"true\"><circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M5.6 5.6l12.8 12.8\"/></svg>3. Cookies, Browser Storage and Security Technology</h2>\n<ul>\n  <li><strong>No advertising trackers:</strong> we do not use behavioural retargeting pixels, cross-site tracking cookies, or advertising profiling scripts, and we do not show behavioural advertising.</li>\n  <li><strong>Security cookies from Cloudflare:</strong> our site is protected by Cloudflare. To tell real visitors from automated bots and to stop attacks, Cloudflare may set security cookies in your browser, such as <code>__cf_bm</code> (bot detection) and <code>cf_clearance</code> (set after a security check is passed). These are used for security, not advertising.</li>\n  <li><strong>Local storage on your device:</strong> we use browser storage to remember choices such as your theme preference and notices you have acknowledged. This stays in your browser and is not used to build a profile of you. It is cleared when you clear your browser data.</li>\n  <li><strong>Your control:</strong> you can block or delete cookies and local storage in your browser settings. Some security checks may then not work as intended, and you may see notices again.</li>\n</ul>\n\n<h2><svg width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"#1a73e8\" stroke-width=\"2\" style=\"vertical-align:middle;margin-right:8px\" aria-hidden=\"true\"><rect x=\"3\" y=\"4\" width=\"18\" height=\"6\" rx=\"1\"/><rect x=\"3\" y=\"14\" width=\"18\" height=\"6\" rx=\"1\"/></svg>4. Technical Data, Logs and Service Providers</h2>\n<p>We use Cloudflare and our hosting provider to deliver and protect this website. When you visit, these providers receive standard technical data, such as your IP address, browser type, device and operating system, the page requested, and the referring URL. An IP address may be personal data.</p>\n<ul>\n  <li><strong>Purpose:</strong> to deliver pages, detect bots and attacks, and keep the site secure and available.</li>\n  <li><strong>Retention:</strong> security and server logs are kept by these providers for periods set by their own policies. We do not use this data to identify individual visitors or to build advertising profiles.</li>\n  <li><strong>Location:</strong> our providers may process data on servers outside India.</li>\n  <li><strong>Aggregate statistics:</strong> traffic figures we use, such as page views on an app profile, are aggregated and do not identify you.</li>\n</ul>\n\n<h2><svg width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"#1a73e8\" stroke-width=\"2\" style=\"vertical-align:middle;margin-right:8px\" aria-hidden=\"true\"><path d=\"M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z\"/><path d=\"M14 3v5h5\"/></svg>5. Images and Content From Other Sites</h2>\n<p>App icons, screenshots, or other images on our pages may be loaded from an app's official store page or developer site. When that happens, your browser connects to that site, and it may receive your IP address and browser details. That site's own privacy policy applies to the data it receives.</p>\n\n<h2><svg width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"#1a73e8\" stroke-width=\"2\" style=\"vertical-align:middle;margin-right:8px\" aria-hidden=\"true\"><rect x=\"3\" y=\"5\" width=\"18\" height=\"14\" rx=\"2\"/><path d=\"M3 7l9 6 9-6\"/></svg>6. Reports and Emails You Send Us</h2>\n<p>We receive information from you only when you choose to send it, through the on-page \"Report / Flag App\" form or by emailing <a href=\"mailto:support@yonoappdex.com\">support@yonoappdex.com</a>.</p>\n<ul>\n  <li><strong>What we receive:</strong> the issue category and description you submit, any contact details, screenshots, or documents you include, and the technical data described above.</li>\n  <li><strong>Purpose:</strong> we use this information only to investigate and respond to your report or grievance, and to correct our listings. We suggest you do not include sensitive personal details that are not needed.</li>\n  <li><strong>No sale or sharing:</strong> we do not sell, rent, or trade your information, and we do not share your email address with developers or marketing agencies. We may disclose information where the law requires it, or share the substance of a report with a developer so they can respond, without your contact details.</li>\n  <li><strong>Retention:</strong> once your matter is resolved, the record is archived or deleted in line with applicable legal requirements.</li>\n</ul>\n\n<h2><svg width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"#1a73e8\" stroke-width=\"2\" style=\"vertical-align:middle;margin-right:8px\" aria-hidden=\"true\"><path d=\"M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3\"/></svg>7. Third-Party Sites and Apps</h2>\n<p>Our privacy responsibility covers our own website. When you click an outbound link, we show a notice that you are leaving YonoappDex, and the developer's privacy policy then applies. Many apps ask for phone number registration, KYC, device permissions, or payment details. We do not control how external developers collect or use your data, so please read their privacy policy before registering or downloading.</p>\n\n<h2><svg width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"#dc2626\" stroke-width=\"2\" style=\"vertical-align:middle;margin-right:8px\" aria-hidden=\"true\"><circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M8 12h8\"/></svg>8. Children</h2>\n<p>YonoappDex is open to general visitors, including young people. We do not require accounts, we do not track or profile visitors, and we do not knowingly ask children for personal information. If you are under 18, please ask a parent or guardian before you send us a message. If we find that a child has sent us personal details without a parent or guardian involved, we will delete them. Apps that involve real money are for adults aged 18 and older.</p>\n\n<h2><svg width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"#1a73e8\" stroke-width=\"2\" style=\"vertical-align:middle;margin-right:8px\" aria-hidden=\"true\"><path d=\"M12 3v18M5 7h14M8 21h8\"/><path d=\"M5 7l-3 7a3.5 3.5 0 0 0 6 0zM19 7l-3 7a3.5 3.5 0 0 0 6 0z\"/></svg>9. Your Rights Under the DPDP Act, 2023</h2>\n<p>Under the <a href=\"https://www.meity.gov.in/\" target=\"_blank\" rel=\"noopener noreferrer\">Digital Personal Data Protection Act, 2023</a>, if you have contacted us, you may ask us to confirm whether we hold your information, correct inaccurate details, or erase your correspondence from our support records. You may also use our grievance process, and, where the Act allows, approach the Data Protection Board of India. Please write to our Grievance Officer:</p>\n<p><strong>Grievance Officer:</strong> Govardhan Das, YonoappDex<br>\n<strong>Email:</strong> <a href=\"mailto:support@yonoappdex.com\">support@yonoappdex.com</a></p>\n\n<h2><svg width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"#1a73e8\" stroke-width=\"2\" style=\"vertical-align:middle;margin-right:8px\" aria-hidden=\"true\"><path d=\"M21 12a9 9 0 1 1-3-6.7M21 4v5h-5\"/></svg>10. Changes to This Policy</h2>\n<p>We may update this policy when our technology, service providers, or Indian data protection law change. Updates will be published on this page with a new date.</p>\n<p><em>Last updated: 2 November 2026</em></p>",
  "videos_meta_title": "",
  "seo_description": "",
  "responsibility_content": "<h2><svg width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"#1a73e8\" stroke-width=\"2\" style=\"vertical-align:middle;margin-right:8px\" aria-hidden=\"true\"><path d=\"M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z\"/></svg>1. Our Commitment to Player Safety</h2>\n<p>YonoappDex lists Yono apps of many kinds, from casual arcade and board games to card games and apps that involve real money. Games are designed to hold attention, and some use ads, in-app purchases, or reward systems. This charter explains healthy habits for every player and the added risks of real-money apps. It is written in line with consumer awareness principles under the <a href=\"https://consumeraffairs.nic.in/\" target=\"_blank\" rel=\"noopener noreferrer\">Consumer Protection Act, 2019</a> and the risk-disclosure standards of the <a href=\"https://www.ascionline.in/\" target=\"_blank\" rel=\"noopener noreferrer\">Advertising Standards Council of India (ASCI)</a>.</p>\n\n<h2><svg width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"#1a73e8\" stroke-width=\"2\" style=\"vertical-align:middle;margin-right:8px\" aria-hidden=\"true\"><path d=\"M12 3l8 3v6c0 4.5-3.2 8.3-8 9-4.8-.7-8-4.5-8-9V6z\"/></svg>2. Healthy Gaming Habits for Everyone</h2>\n<ul>\n  <li><strong>Set time limits:</strong> use alarms and take regular breaks, especially before sleep and during study or work hours.</li>\n  <li><strong>Watch in-app spending:</strong> check what an app sells before you install it, and set spending limits in your app store account.</li>\n  <li><strong>Protect personal information:</strong> do not share OTPs, UPI PINs, passwords, or identity documents with an app or anyone who contacts you about it.</li>\n  <li><strong>Check permissions:</strong> a card or arcade game does not need your SMS inbox, call logs, or contacts. Review the permissions before you accept them.</li>\n  <li><strong>Download from official sources:</strong> use the official store or the developer's own website, and be careful with \"modded\" or \"hacked\" versions.</li>\n</ul>\n\n<h2><svg width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"#d97706\" stroke-width=\"2\" style=\"vertical-align:middle;margin-right:8px\" aria-hidden=\"true\"><path d=\"M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z\"/><path d=\"M12 9v4M12 17h.01\"/></svg>3. Apps That Involve Real Money</h2>\n<p>Real-money apps are for adults aged <strong>18 and older</strong>. Real-money online gaming is prohibited or restricted under Indian law, including the <a href=\"https://www.indiacode.nic.in/\" target=\"_blank\" rel=\"noopener noreferrer\">Promotion and Regulation of Online Gaming Act, 2025</a>. YonoappDex describes these apps for information only and does not provide links to them. If you use one anyway, please keep in mind:</p>\n<ul>\n  <li><strong>Entertainment, not income:</strong> real-money games are not a reliable way to earn money, clear debt, or build wealth.</li>\n  <li><strong>Chance and variance:</strong> even in games described as skill-based, short-term results are strongly affected by chance, random card distribution, and platform fees. No strategy removes the risk of loss.</li>\n  <li><strong>Risk of total loss:</strong> money you deposit can be lost in full.</li>\n  <li><strong>Set a budget:</strong> use only money you can afford to lose without affecting living costs, rent, family, education, or savings.</li>\n  <li><strong>Do not chase losses:</strong> depositing more to win back money is a common trap. Stop when your limit is reached.</li>\n  <li><strong>Do not borrow to play:</strong> avoid credit cards, loans, overdrafts, or money from friends and family.</li>\n  <li><strong>Avoid emotional play:</strong> do not play when stressed, depressed, anxious, under financial pressure, or under the influence of alcohol or medication.</li>\n</ul>\n\n<h2><svg width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"#1a73e8\" stroke-width=\"2\" style=\"vertical-align:middle;margin-right:8px\" aria-hidden=\"true\"><rect x=\"5\" y=\"11\" width=\"14\" height=\"10\" rx=\"2\"/><path d=\"M8 11V7a4 4 0 0 1 8 0v4\"/></svg>4. Digital Security and Device Hygiene</h2>\n<ul>\n  <li><strong>Separate accounts:</strong> avoid linking your main savings account or salary UPI ID to gaming apps. Use a low-balance secondary account if you transact.</li>\n  <li><strong>Beware of \"guaranteed win\" offers:</strong> Telegram groups, WhatsApp channels, or YouTube videos that sell \"hacked Yono APKs\", \"colour prediction predictors\", or \"winning tricks\" are commonly used to steal money and take over devices.</li>\n  <li><strong>Keep your device updated:</strong> install security updates and use a trusted security app.</li>\n</ul>\n\n<h2><svg width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"#dc2626\" stroke-width=\"2\" style=\"vertical-align:middle;margin-right:8px\" aria-hidden=\"true\"><path d=\"M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z\"/><path d=\"M12 9v4M12 17h.01\"/></svg>5. Warning Signs of Problem Gaming</h2>\n<p>Compulsive habits often develop gradually. You or someone you know may be affected if you notice:</p>\n<ul>\n  <li>Spending more and more time or money to feel the same excitement.</li>\n  <li>Feeling restless, irritable, or anxious when cutting down or stopping.</li>\n  <li>Hiding gaming activity or losses from family, spouses, or colleagues.</li>\n  <li>Neglecting work, studies, sleep, or relationships because of gaming.</li>\n  <li>Repeatedly failing to keep your own time or spending limits.</li>\n</ul>\n\n<h2><svg width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"#1a73e8\" stroke-width=\"2\" style=\"vertical-align:middle;margin-right:8px\" aria-hidden=\"true\"><circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M5.6 5.6l12.8 12.8\"/></svg>6. Taking a Break: Practical Steps</h2>\n<p>YonoappDex does not run gaming servers or manage player accounts, so <strong>we are not able to block your access to an app or freeze your account.</strong> You can take these steps yourself:</p>\n<ol>\n  <li><strong>Ask the app to close your account:</strong> contact the app's customer support and request account closure or self-exclusion.</li>\n  <li><strong>Uninstall and block:</strong> remove gaming apps, clear saved logins, and use digital wellbeing locks or app-blocking software such as Gamban or BetBlocker.</li>\n  <li><strong>Cool off financially:</strong> disable UPI auto-pay mandates and lower daily transaction limits in your banking app.</li>\n</ol>\n\n<h2><svg width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"#dc2626\" stroke-width=\"2\" style=\"vertical-align:middle;margin-right:8px\" aria-hidden=\"true\"><circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M8 12h8\"/></svg>7. Parents and Guardians</h2>\n<p>Real-money gaming is unlawful for anyone under 18. We encourage parents and guardians to:</p>\n<ul>\n  <li>Secure phones and tablets with biometric or PIN locks, and keep UPI PINs and banking passwords private from children.</li>\n  <li>Use parental controls such as <strong>Google Family Link</strong> or <strong>Apple Screen Time</strong> to block unknown apps (sideloading), restrict adult content, and set purchase limits.</li>\n  <li>Talk with children about ads, in-app purchases, and \"free money\" offers.</li>\n</ul>\n\n<h2><svg width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"#1a73e8\" stroke-width=\"2\" style=\"vertical-align:middle;margin-right:8px\" aria-hidden=\"true\"><path d=\"M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z\"/></svg>8. Mental Health and Addiction Support (India)</h2>\n<p>If you or someone in your family is struggling with compulsive gaming, financial distress, or emotional overwhelm, free and confidential support is available:</p>\n<ul>\n  <li><strong><a href=\"https://telemanas.mohfw.gov.in/\" target=\"_blank\" rel=\"noopener noreferrer\">Tele-MANAS</a> (Ministry of Health &amp; Family Welfare):</strong> call <strong>14416</strong> or <strong>1800-891-4416</strong>, 24/7, toll-free, in 20+ Indian languages.</li>\n  <li><strong>KIRAN Mental Health Helpline (Ministry of Social Justice &amp; Empowerment):</strong> call <strong>1800-599-0019</strong>, 24/7, toll-free.</li>\n  <li><strong><a href=\"https://nimhans.ac.in/\" target=\"_blank\" rel=\"noopener noreferrer\">NIMHANS</a> SHUT Clinic (Bengaluru):</strong> Service for Healthy Use of Technology, offering clinical help for technology and gaming addiction.</li>\n  <li><strong>Vandrevala Foundation Crisis Helpline:</strong> call <strong>+91 9999 666 555</strong>, 24/7, confidential.</li>\n</ul>\n\n<h2><svg width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"#1a73e8\" stroke-width=\"2\" style=\"vertical-align:middle;margin-right:8px\" aria-hidden=\"true\"><rect x=\"3\" y=\"5\" width=\"18\" height=\"14\" rx=\"2\"/><path d=\"M3 7l9 6 9-6\"/></svg>9. Contact Our Safety Desk</h2>\n<p>If you find a listed app that does not honour self-exclusion requests or targets vulnerable users, please report it so we can review the listing.</p>\n<p><strong>Grievance Officer:</strong> Govardhan Das, YonoappDex<br>\n<strong>Email:</strong> <a href=\"mailto:support@yonoappdex.com\">support@yonoappdex.com</a></p>\n<p><em>Last updated: 2 November 2026</em></p>",
  "news_meta_title": "",
  "new_apps_meta_title": "",
  "turnstile_site_key": "",
  "hero_title_style": "mono",
  "hero_title_visible": true,
  "faq_meta_title": "",
  "cloudinary_api_key": "",
  "cloudinary_upload_preset": "",
  "ethics_meta_description": "How YonoappDex documents apps: zero commissions, no paid rankings, observational research, clear 18+ risk labels and prompt delisting of unsafe links.",
  "secure_index_subtitle": "Explore verified applications, safe downloads, and essential digital tools all in one place.",
  "developers_meta_title": "",
  "notice_meta_title": "Legal Notice & Intellectual Property Disclosure",
  "cloudinary_cloud_name": "",
  "notice_meta_description": "YonoappDex legal notice: independence from SBI and game studios, trademark and copyright fair use, Section 79 intermediary status and how to file an IP takedown.",
  "report_removal_meta_title": "Report, Grievance & Removal Policy",
  "report_removal_content": "<h2><svg width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"#1a73e8\" stroke-width=\"2\" style=\"vertical-align:middle;margin-right:8px\" aria-hidden=\"true\"><path d=\"M12 3l8 3v6c0 4.5-3.2 8.3-8 9-4.8-.7-8-4.5-8-9V6z\"/></svg>1. Purpose and Legal Framework</h2>\n<p>YonoappDex is an information directory of Yono apps of every kind, including casual games, card games, and apps that involve real money. We describe each app as clearly as public information allows. Third-party apps change over time. Developers may update their code, change their rules, add real-money features, abandon domains, or let certificates expire after we have reviewed them.</p>\n<p>This policy gives users, security researchers, intellectual property owners, and authorities a clear way to report problems with a listing. It is designed to follow <a href=\"https://www.indiacode.nic.in/\" target=\"_blank\" rel=\"noopener noreferrer\">Section 79 of the Information Technology Act, 2000</a> and Rule 3(2) of the <a href=\"https://www.meity.gov.in/\" target=\"_blank\" rel=\"noopener noreferrer\">Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021</a>. Our labels and link rules are explained on the How We Label Apps page.</p>\n\n<h2><svg width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"#1a73e8\" stroke-width=\"2\" style=\"vertical-align:middle;margin-right:8px\" aria-hidden=\"true\"><path d=\"M5 21V4\"/><path d=\"M5 4h13l-2 4 2 4H5\"/></svg>2. How to Report a Listing</h2>\n<ul>\n  <li><strong>Channel A: On-page \"Report / Flag App\" button.</strong> Every app profile has this button. No account is needed. Choose the issue category, describe the problem, and submit it to our moderation queue.</li>\n  <li><strong>Channel B: Email.</strong> For intellectual property notices, developer requests, regulatory orders, or reports that include screenshots and transaction records, write to <a href=\"mailto:support@yonoappdex.com\">support@yonoappdex.com</a>.</li>\n</ul>\n\n<h2><svg width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"#dc2626\" stroke-width=\"2\" style=\"vertical-align:middle;margin-right:8px\" aria-hidden=\"true\"><path d=\"M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z\"/><path d=\"M12 9v4M12 17h.01\"/></svg>3. What You Can Report</h2>\n<ol>\n  <li><strong>A real-money app that has a download link:</strong> an app listed with a link that involves deposits, wallets, cash prizes, paid contests, or coins that can be exchanged for money or vouchers.</li>\n  <li><strong>Malware, phishing, or a hijacked link:</strong> a link no longer leads to the official developer website or store page, starts an unverified .apk download, or has been taken over by a clone.</li>\n  <li><strong>Operator misconduct:</strong> credible reports that an operator is blocking legitimate withdrawals or refunds, manipulating game mechanics, or running a payment scam.</li>\n  <li><strong>Legal concerns:</strong> evidence that a listed app is breaking Indian law or is not enforcing age limits on its real-money features.</li>\n  <li><strong>Inaccuracies:</strong> outdated versions, changed rules, defunct apps, wrong labels, or broken links returning 404 or server errors.</li>\n  <li><strong>Intellectual property:</strong> requests from verified publishers, trademark holders, or authorised representatives under the <a href=\"https://copyright.gov.in/\" target=\"_blank\" rel=\"noopener noreferrer\">Copyright Act, 1957</a> or the <a href=\"https://ipindia.gov.in/\" target=\"_blank\" rel=\"noopener noreferrer\">Trade Marks Act, 1999</a>.</li>\n</ol>\n\n<h2><svg width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"#1a73e8\" stroke-width=\"2\" style=\"vertical-align:middle;margin-right:8px\" aria-hidden=\"true\"><path d=\"M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z\"/><path d=\"M14 3v5h5\"/></svg>4. Information Needed for Legal or IP Notices</h2>\n<p>A safety report made with the on-page button needs only an issue category and a description. Formal legal or IP requests sent by email should include the following, so we can guard against misuse of the process:</p>\n<ul>\n  <li>The exact URL(s) on YonoappDex where the app profile appears.</li>\n  <li>Identification of the trademark, copyrighted work, or law allegedly violated.</li>\n  <li>Documents showing ownership, such as trademark registration certificates, domain ownership records, or authorisation letters.</li>\n  <li>A statement that the information in the notice is accurate and given in good faith.</li>\n</ul>\n\n<h2><svg width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"#1a73e8\" stroke-width=\"2\" style=\"vertical-align:middle;margin-right:8px\" aria-hidden=\"true\"><circle cx=\"11\" cy=\"11\" r=\"7\"/><path d=\"M21 21l-4.3-4.3\"/></svg>5. How We Handle Reports</h2>\n<ol>\n  <li><strong>Logging and triage:</strong> every report is logged. Reports about malware, phishing, fraud, or a real-money app with a link are handled first.</li>\n  <li><strong>Link removal first:</strong> if a report says a linked app involves real money, we aim to disable the outbound link within 24 hours of the report, often sooner, and review afterwards. We may restore the link if the review shows the app does not involve real money.</li>\n  <li><strong>Review:</strong> we check public information about the app, including the developer's website, store listing, rules, and terms, and correct the listing if needed.</li>\n  <li><strong>Outcome:</strong>\n    <ul>\n      <li><em>Real-money app:</em> the link is permanently disabled and the app is labelled \"Real money\". The information page stays.</li>\n      <li><em>Unsafe or fraudulent app:</em> the link is disabled and a public safety warning is shown on the listing.</li>\n      <li><em>IP or developer requests:</em> the listing is corrected or removed where the request is verified.</li>\n    </ul>\n  </li>\n  <li><strong>Review of a decision:</strong> a developer may ask us to review a label or link decision by sending evidence to our Grievance Officer.</li>\n</ol>\n\n<h2><svg width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"#1a73e8\" stroke-width=\"2\" style=\"vertical-align:middle;margin-right:8px\" aria-hidden=\"true\"><circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M12 7v5l3 2\"/></svg>6. Response Timelines</h2>\n<ul>\n  <li><strong>Acknowledgment:</strong> within <strong>24 hours</strong> of receiving a formal report.</li>\n  <li><strong>Link removal for real-money reports and urgent security issues:</strong> we aim to act within <strong>24 hours</strong>.</li>\n  <li><strong>Resolution:</strong> within a maximum of <strong>15 days</strong> of receipt.</li>\n</ul>\n\n<h2><svg width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"#d97706\" stroke-width=\"2\" style=\"vertical-align:middle;margin-right:8px\" aria-hidden=\"true\"><circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M12 8h.01M11 12h1v5h1\"/></svg>7. What We Cannot Do</h2>\n<ul>\n  <li>YonoappDex is an information directory. We do not create or operate the apps listed.</li>\n  <li><strong>We cannot recover lost money, unfreeze third-party accounts, issue refunds, or require a developer to process a withdrawal.</strong></li>\n  <li>Reporting still helps, because it lets us correct the listing and warn other users. If you are a victim of financial cyber fraud, we advise filing a complaint on the <a href=\"https://cybercrime.gov.in/\" target=\"_blank\" rel=\"noopener noreferrer\">National Cyber Crime Reporting Portal</a> or calling the national helpline <strong>1930</strong>, in addition to reporting the app here.</li>\n</ul>\n\n<h2><svg width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"#1a73e8\" stroke-width=\"2\" style=\"vertical-align:middle;margin-right:8px\" aria-hidden=\"true\"><rect x=\"3\" y=\"5\" width=\"18\" height=\"14\" rx=\"2\"/><path d=\"M3 7l9 6 9-6\"/></svg>8. Grievance Officer</h2>\n<p><strong>Grievance Officer:</strong> Govardhan Das, YonoappDex<br>\n<strong>Email:</strong> <a href=\"mailto:support@yonoappdex.com\">support@yonoappdex.com</a><br>\n<strong>On-site:</strong> use the \"Report / Flag App\" button on any app profile.</p>\n<p><em>Last updated: 2 November 2026</em></p>",
  "about_meta_description": "About YonoappDex: an independent, non-commercial directory of Yono apps of every kind, from casual card games to Play Store picks, with real-money warnings.",
  "categories_meta_description": "",
  "ethics_heading": "Editorial Standards & Ethics Policy | YonoappDex",
  "important_notice": "<h2><svg width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"#1a73e8\" stroke-width=\"2\" style=\"vertical-align:middle;margin-right:8px\" aria-hidden=\"true\"><path d=\"M12 3l8 3v6c0 4.5-3.2 8.3-8 9-4.8-.7-8-4.5-8-9V6z\"/></svg>1. Independence and Non-Affiliation</h2>\n<p>YonoappDex is an independent software encyclopedia and information directory.</p>\n<ul>\n  <li><strong>No banking connection:</strong> YonoappDex has no corporate, commercial, institutional, technical, or operational affiliation with <strong>State Bank of India (SBI)</strong>, the official <strong>SBI YONO</strong> banking platform, or any other bank, financial institution, or government body.</li>\n  <li><strong>No developer ownership:</strong> we are independent of the developers, studios, and operators of the apps in our directory. We do not own, operate, co-develop, or manage any listed app.</li>\n</ul>\n\n<h2><svg width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"#1a73e8\" stroke-width=\"2\" style=\"vertical-align:middle;margin-right:8px\" aria-hidden=\"true\"><path d=\"M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z\"/><path d=\"M7.5 7.5h.01\"/></svg>2. Use of \"Yono\" and Third-Party Trademarks</h2>\n<p>All third-party app names, developer brands, logos, and trademarks on YonoappDex belong to their respective owners.</p>\n<ul>\n  <li><strong>Descriptive use:</strong> \"Yono\" is the word many people use when they search for this family of mobile apps and games. We use it to describe the type of apps listed and to help visitors find them. It does not suggest any link to the SBI YONO platform.</li>\n  <li><strong>Trademark law:</strong> we refer to third-party names and marks to identify and categorise apps, as permitted under <a href=\"https://ipindia.gov.in/\" target=\"_blank\" rel=\"noopener noreferrer\">Section 30 of The Trade Marks Act, 1999</a>, to the extent that section applies. This use does not imply endorsement, sponsorship, or ownership by YonoappDex.</li>\n</ul>\n\n<h2><svg width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"#1a73e8\" stroke-width=\"2\" style=\"vertical-align:middle;margin-right:8px\" aria-hidden=\"true\"><circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M14.8 9.2a3.5 3.5 0 1 0 0 5.6\"/></svg>3. Copyright and Fair Dealing</h2>\n<p>The original site design, taxonomy, graphics, and written analysis on YonoappDex are protected by copyright as original editorial work.</p>\n<ul>\n  <li><strong>Fair dealing:</strong> where we show public app information or small reference icons so visitors can recognise an app, we rely on fair dealing for review, criticism, and public information under <a href=\"https://copyright.gov.in/\" target=\"_blank\" rel=\"noopener noreferrer\">Section 52(1) of the Indian Copyright Act, 1957</a>, to the extent it applies.</li>\n  <li><strong>No file distribution:</strong> we do not copy, decompile, host, or distribute proprietary source code, game engines, or installation packages (.apk, .xapk, .ipa).</li>\n</ul>\n\n<h2><svg width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"#1a73e8\" stroke-width=\"2\" style=\"vertical-align:middle;margin-right:8px\" aria-hidden=\"true\"><path d=\"M12 3v18M5 7h14M8 21h8\"/><path d=\"M5 7l-3 7a3.5 3.5 0 0 0 6 0zM19 7l-3 7a3.5 3.5 0 0 0 6 0z\"/></svg>4. Intermediary Status</h2>\n<p>YonoappDex operates as an information index and directory. To the extent available under <a href=\"https://www.indiacode.nic.in/\" target=\"_blank\" rel=\"noopener noreferrer\">Section 79 of the Information Technology Act, 2000</a> and the <a href=\"https://www.meity.gov.in/\" target=\"_blank\" rel=\"noopener noreferrer\">Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021</a>, an intermediary that does not initiate transmissions or modify external content may be exempt from liability for third-party actions. We aim to follow the due-diligence and grievance requirements of those Rules. Once you leave our site through an outbound link, YonoappDex has no control over the external site's software, terms, or financial operations.</p>\n\n<h2><svg width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"#d97706\" stroke-width=\"2\" style=\"vertical-align:middle;margin-right:8px\" aria-hidden=\"true\"><path d=\"M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z\"/><path d=\"M12 9v4M12 17h.01\"/></svg>5. Real-Money Apps and Applicable Law</h2>\n<p>Nothing on YonoappDex is legal advice, financial advice, or an invitation to take part in real-money gaming. Real-money online gaming is prohibited or restricted under Indian law, including the <a href=\"https://www.indiacode.nic.in/\" target=\"_blank\" rel=\"noopener noreferrer\">Promotion and Regulation of Online Gaming Act, 2025</a>, and state laws. We describe real-money apps for information only and do not provide links to them. Real-money apps are for adults aged 18 and older, and you are responsible for following the law that applies to you.</p>\n\n<h2><svg width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"#1a73e8\" stroke-width=\"2\" style=\"vertical-align:middle;margin-right:8px\" aria-hidden=\"true\"><path d=\"M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z\"/><path d=\"M14 3v5h5\"/></svg>6. IP Inquiries and Takedown Notices</h2>\n<p>We respect the intellectual property rights of software creators and trademark holders, and we act on verified requests.</p>\n<ul>\n  <li><strong>How to file:</strong> if you are the verified trademark owner, copyright holder, or authorised representative of a listed app and want a correction, trademark clarification, or removal of the profile, send a written request to our Grievance Officer.</li>\n  <li><strong>What to include:</strong> (a) the specific YonoappDex URL, (b) documents showing trademark registration or developer ownership, and (c) a statement confirming your authority to act for the rights holder.</li>\n</ul>\n\n<h2><svg width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"#1a73e8\" stroke-width=\"2\" style=\"vertical-align:middle;margin-right:8px\" aria-hidden=\"true\"><rect x=\"3\" y=\"5\" width=\"18\" height=\"14\" rx=\"2\"/><path d=\"M3 7l9 6 9-6\"/></svg>7. Grievance Officer and Response Timeline</h2>\n<p><strong>Grievance Officer:</strong> Govardhan Das, YonoappDex<br>\n<strong>Email:</strong> <a href=\"mailto:support@yonoappdex.com\">support@yonoappdex.com</a><br>\n<strong>Timeline:</strong> acknowledgment within <strong>24 hours</strong>; investigation and resolution within <strong>15 days</strong> of receipt.</p>\n<p><em>Last updated: 2 November 2026</em></p>",
  "terms_content": "<h2><svg width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"#1a73e8\" stroke-width=\"2\" style=\"vertical-align:middle;margin-right:8px\" aria-hidden=\"true\"><path d=\"M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z\"/><path d=\"M14 3v5h5\"/></svg>1. Acceptance of Terms</h2>\n<p>These Terms &amp; Conditions are an agreement between you and the administration of YonoappDex for your use of our app directory and information. By using this website, you confirm that you have read and agree to these terms, which operate under the <a href=\"https://www.indiacode.nic.in/\" target=\"_blank\" rel=\"noopener noreferrer\">Indian Contract Act, 1872</a>. If you disagree with any part, please stop using the site.</p>\n\n<h2><svg width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"#dc2626\" stroke-width=\"2\" style=\"vertical-align:middle;margin-right:8px\" aria-hidden=\"true\"><circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M8 12h8\"/></svg>2. Who May Use This Site and 18+ Notice</h2>\n<ul>\n  <li><strong>General visitors:</strong> YonoappDex is open to general visitors. If you are under 18, we encourage you to use the site with the guidance of a parent or guardian.</li>\n  <li><strong>Real-money apps are for adults:</strong> apps that involve real money are for adults aged <strong>18 and older</strong>. Real-money online gaming is prohibited or restricted under Indian law, including the <a href=\"https://www.indiacode.nic.in/\" target=\"_blank\" rel=\"noopener noreferrer\">Promotion and Regulation of Online Gaming Act, 2025</a>, and state laws. We describe these apps for information only and do not provide links to them.</li>\n  <li><strong>Your responsibility:</strong> you are responsible for making sure your use of this site and of any third-party app follows the laws that apply to you.</li>\n</ul>\n\n<h2><svg width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"#1a73e8\" stroke-width=\"2\" style=\"vertical-align:middle;margin-right:8px\" aria-hidden=\"true\"><path d=\"M12 3l8 3v6c0 4.5-3.2 8.3-8 9-4.8-.7-8-4.5-8-9V6z\"/></svg>3. Nature of the Service</h2>\n<p>YonoappDex is an observational software encyclopedia and information directory. To the extent available under <a href=\"https://www.indiacode.nic.in/\" target=\"_blank\" rel=\"noopener noreferrer\">Section 79 of the Information Technology Act, 2000</a> and the <a href=\"https://www.meity.gov.in/\" target=\"_blank\" rel=\"noopener noreferrer\">Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021</a>, we act as an intermediary. See our Legal Notice for details.</p>\n<p>We do not develop, host, operate, or manage the apps we list. We do not facilitate payments, process UPI or bank deposits, manage wallets, verify KYC, or settle gameplay disputes. Our labels and links follow the rules on the How We Label Apps page and are based on public information.</p>\n\n<h2><svg width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"#1a73e8\" stroke-width=\"2\" style=\"vertical-align:middle;margin-right:8px\" aria-hidden=\"true\"><path d=\"M12 3v18M5 7h14M8 21h8\"/><path d=\"M5 7l-3 7a3.5 3.5 0 0 0 6 0zM19 7l-3 7a3.5 3.5 0 0 0 6 0z\"/></svg>4. Intellectual Property</h2>\n<p>The design, original text, graphics, structure, and source code of YonoappDex belong to us.</p>\n<ul>\n  <li><strong>Third-party marks:</strong> we claim no ownership of third-party app names, developer brands, or icons. They belong to their owners.</li>\n  <li><strong>Fair dealing and descriptive use:</strong> app titles, icons, and descriptions are used to identify, categorise, and review apps, relying on fair dealing under <a href=\"https://copyright.gov.in/\" target=\"_blank\" rel=\"noopener noreferrer\">Section 52 of the Indian Copyright Act, 1957</a> and descriptive use under <a href=\"https://ipindia.gov.in/\" target=\"_blank\" rel=\"noopener noreferrer\">The Trade Marks Act, 1999</a>, to the extent those laws apply.</li>\n</ul>\n\n<h2><svg width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"#d97706\" stroke-width=\"2\" style=\"vertical-align:middle;margin-right:8px\" aria-hidden=\"true\"><path d=\"M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z\"/><path d=\"M12 9v4M12 17h.01\"/></svg>5. Acceptable Use</h2>\n<p>We give you a limited, revocable, non-exclusive licence to use the directory for personal, non-commercial information. You agree <strong>not</strong> to:</p>\n<ul>\n  <li><strong>Scrape our data:</strong> use bots, crawlers, AI scrapers, or data-mining tools to extract, copy, or mirror our database, text, or taxonomy without written permission.</li>\n  <li><strong>Interfere with the network:</strong> bypass our security, launch DDoS attacks, inject malicious code, or disrupt our hosting.</li>\n  <li><strong>Abuse our channels:</strong> submit false takedown requests, falsify ownership claims, or spam our reporting channels (<a href=\"mailto:support@yonoappdex.com\">support@yonoappdex.com</a>) to target listings unfairly.</li>\n  <li><strong>Redistribute commercially:</strong> copy, repackage, or sell our profiles on other websites, Telegram channels, or directories.</li>\n</ul>\n\n<h2><svg width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"#1a73e8\" stroke-width=\"2\" style=\"vertical-align:middle;margin-right:8px\" aria-hidden=\"true\"><path d=\"M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3\"/></svg>6. Outbound Links and File Hosting</h2>\n<p>We do not host, store, or distribute executable files (.apk, .xapk, .ipa). Where we provide outbound links, they lead to official store pages or developer websites.</p>\n<ul>\n  <li><strong>Exit notice:</strong> clicking an outbound link shows a notice that you are leaving YonoappDex.</li>\n  <li><strong>Your risk:</strong> once you reach an external site, its terms apply. Downloading, installing, or using any external app is at your own discretion and risk.</li>\n</ul>\n\n<h2><svg width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"#1a73e8\" stroke-width=\"2\" style=\"vertical-align:middle;margin-right:8px\" aria-hidden=\"true\"><circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M12 8h.01M11 12h1v5h1\"/></svg>7. Disclaimer of Warranties</h2>\n<p>Information, labels, and outbound links are provided <strong>\"AS IS\"</strong> and <strong>\"AS AVAILABLE\"</strong>, without warranties of any kind, express or implied. Developers can change servers, rules, features, or domain ownership after we review an app, so we do not promise that any description, label, or link will stay accurate, secure, or error-free. Listing an app, or marking it with a tick, is not an assurance of the developer's legal compliance, solvency, or software safety.</p>\n\n<h2><svg width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"#dc2626\" stroke-width=\"2\" style=\"vertical-align:middle;margin-right:8px\" aria-hidden=\"true\"><path d=\"M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z\"/><path d=\"M12 9v4M12 17h.01\"/></svg>8. Limitation of Liability</h2>\n<p>To the maximum extent permitted by Indian law, YonoappDex, its founders, administrators, and editors are not liable for direct, indirect, incidental, consequential, or punitive damages arising from your use of the directory or any listed third-party app, including:</p>\n<ul>\n  <li>Financial losses, locked accounts, delayed withdrawals, or payment disputes in third-party apps.</li>\n  <li>Device damage, data loss, or malware from files downloaded from external sites.</li>\n  <li>Legal penalties for users who use real-money apps where the law prohibits them.</li>\n</ul>\n\n<h2><svg width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"#1a73e8\" stroke-width=\"2\" style=\"vertical-align:middle;margin-right:8px\" aria-hidden=\"true\"><path d=\"M12 3l8 3v6c0 4.5-3.2 8.3-8 9-4.8-.7-8-4.5-8-9V6z\"/></svg>9. Indemnification</h2>\n<p>You agree to indemnify and hold harmless YonoappDex and its administration against third-party claims, legal actions, regulatory liabilities, damages, and expenses (including reasonable legal fees) arising from your breach of these terms, misuse of our directory data, or unlawful use of external apps.</p>\n\n<h2><svg width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"#1a73e8\" stroke-width=\"2\" style=\"vertical-align:middle;margin-right:8px\" aria-hidden=\"true\"><path d=\"M12 20h9\"/><path d=\"M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z\"/></svg>10. Changes, Delisting, and Termination</h2>\n<p>We may change or remove any listing, label, link, or part of these terms at any time. If we receive reports that a linked app involves real money, or that a developer domain has become unsafe or fraudulent, we will act under our Report, Grievance &amp; Removal Policy. Continuing to use the site after changes means you accept the revised terms. Changes are shown with a new \"Last updated\" date.</p>\n\n<h2><svg width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"#1a73e8\" stroke-width=\"2\" style=\"vertical-align:middle;margin-right:8px\" aria-hidden=\"true\"><path d=\"M12 3v18M5 7h14M8 21h8\"/><path d=\"M5 7l-3 7a3.5 3.5 0 0 0 6 0zM19 7l-3 7a3.5 3.5 0 0 0 6 0z\"/></svg>11. Governing Law, Severability, and Contact</h2>\n<p>These terms are governed by the laws of <strong>India</strong>, without regard to conflict-of-law principles.</p>\n<ul>\n  <li><strong>Severability:</strong> if a court holds any provision invalid or unenforceable, the rest stays in force.</li>\n  <li><strong>Legal notices and questions:</strong> please send them to our Grievance Officer.</li>\n</ul>\n<p><strong>Grievance Officer:</strong> Govardhan Das, YonoappDex<br>\n<strong>Email:</strong> <a href=\"mailto:support@yonoappdex.com\">support@yonoappdex.com</a></p>\n<p><em>Last updated: 2 November 2026</em></p>",
  "disclaimer_heading": "Disclaimer & Statutory Risk Advisory | YonoappDex",
  "twitter_url": "",
  "privacy_meta_description": "YonoappDex's Privacy Policy: no accounts, no ad trackers, how Cloudflare security cookies and logs work, your DPDP Act 2023 rights and how to contact us.",
  "footer_text": "",
  "ethics_meta_title": "Editorial Standards & Ethics Policy",
  "contact_meta_title": "",
  "important_notice_heading": "Legal Notice & Intellectual Property Disclosure | YonoappDex",
  "gemini_model": "gemini-2.5-flash",
  "report_removal_meta_description": "Report an unsafe, inaccurate or real-money app listing on YonoappDex. Learn how to flag apps, file IP takedown requests and our 24-hour and 15-day timelines.",
  "new_apps_meta_description": "",
  "categories_meta_title": "",
  "disclaimer_meta_description": "Read YonoappDex's disclaimer: no endorsement, real-money gaming risks, 18+ age rule, restricted Indian states, zero hosting of APKs and non-affiliation with SBI.",
  "videos_meta_description": "",
  "primary_color": "#10b981",
  "hero_title_text": "Explore Yono Apps & Games",
  "site_description": "",
  "_rest_admin_bypass": "aistudio_preview_bypass_key",
  "responsibility_meta_description": "Safe gaming habits for every player, warning signs of problem gaming and free Indian helplines like Tele-MANAS and KIRAN. Read YonoappDex's Safety Charter.",
  "terms_meta_title": "Terms & Conditions (Terms of Service)",
  "instagram_url": "",
  "contact_email": "",
  "site_tagline": "",
  "ga_tracking_id": "",
  "youtube_url": "",
  "contact_meta_description": "",
  "about_content": "<h2><svg width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"#1a73e8\" stroke-width=\"2\" style=\"vertical-align:middle;margin-right:8px\" aria-hidden=\"true\"><circle cx=\"12\" cy=\"12\" r=\"9\"/><circle cx=\"12\" cy=\"12\" r=\"4\"/></svg>Why YonoappDex Exists</h2>\n<p>The world of mobile entertainment, and especially the fast-growing \"Yono\" app ecosystem, is hard to navigate. Every day, people looking for casual card games, arcade titles, board games, and other Yono apps meet a mix of unverified websites, misleading information, and counterfeit download pages.</p>\n<p>YonoappDex was created to bring clarity to this space. Our aim is to be a clean, reliable, and objective encyclopedia of Yono apps of every kind, so people can understand an app's features, rules, and background before they download it.</p>\n\n<h2><svg width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"#1a73e8\" stroke-width=\"2\" style=\"vertical-align:middle;margin-right:8px\" aria-hidden=\"true\"><path d=\"M4 19.5A2.5 2.5 0 0 1 6.5 17H20\"/><path d=\"M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z\"/></svg>What \"Dex\" Means and What We List</h2>\n<p>\"Dex\" stands for Index. YonoappDex is an independent directory that collects scattered information about Yono apps and turns it into clean, readable profiles. We aim to list Yono apps of every kind, including casual and card games, apps popular on the Play Store, and apps that involve real money. Each profile is as detailed as public information allows.</p>\n\n<h2><svg width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"#d97706\" stroke-width=\"2\" style=\"vertical-align:middle;margin-right:8px\" aria-hidden=\"true\"><path d=\"M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z\"/><path d=\"M12 9v4M12 17h.01\"/></svg>Clear Labels and Safe Linking</h2>\n<p>Listing an app and linking to it are different things on YonoappDex. Apps that involve real money are described in full, with an 18+ notice and a risk warning, but we do not provide download links for them. We provide links only for apps whose official source we have confirmed and that we have found not to involve real money. These carry a green \"Official Source Confirmed\" tick. Apps we have not checked are marked as unverified. The How We Label Apps page explains each label.</p>\n\n<h2><svg width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"#1a73e8\" stroke-width=\"2\" style=\"vertical-align:middle;margin-right:8px\" aria-hidden=\"true\"><circle cx=\"11\" cy=\"11\" r=\"7\"/><path d=\"M21 21l-4.3-4.3\"/></svg>How We Work</h2>\n<p>Our team works as digital archivists, not game testers. We build profiles from public sources, such as developer documentation, official store listings, published rules, and version notes. Each profile shows when it was last reviewed, so readers know how current the information is.</p>\n\n<h2><svg width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"#1a73e8\" stroke-width=\"2\" style=\"vertical-align:middle;margin-right:8px\" aria-hidden=\"true\"><path d=\"M12 3l8 3v6c0 4.5-3.2 8.3-8 9-4.8-.7-8-4.5-8-9V6z\"/></svg>Independent and Non-Commercial</h2>\n<p>YonoappDex does not accept paid developer sponsorships, sell rankings, or earn from referral partnerships. Our priority is accurate public information, with user safety and education first. See our Editorial Standards &amp; Ethics Policy for details.</p>\n\n<h2><svg width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"#1a73e8\" stroke-width=\"2\" style=\"vertical-align:middle;margin-right:8px\" aria-hidden=\"true\"><path d=\"M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z\"/><circle cx=\"12\" cy=\"12\" r=\"3\"/></svg>Our Commitment to Transparency</h2>\n<p>People have the right to know what they are about to download. By describing apps clearly, labelling them honestly, and acting quickly on reports, we aim to give visitors a safe and trustworthy place to explore the Yono app world. If you find a mistake, please tell us through the Report / Flag App button or at <a href=\"mailto:support@yonoappdex.com\">support@yonoappdex.com</a>.</p>\n<p><em>Last updated: 2 November 2026</em></p>",
  "maintenance_mode": false,
  "developers_meta_description": "",
  "hero_title_subtitle": "Know the app before you download it. And get every app information.",
  "social_links": {
    "youtube": "",
    "linkedin": "",
    "twitter": "",
    "facebook": "",
    "instagram": ""
  },
  "custom_head_scripts": "",
  "og_image": "",
  "responsibility_meta_title": "Responsible Gaming & Player Safety Charter",
  "disclaimer_meta_title": "Disclaimer & Statutory Risk Advisory",
  "facebook_url": "",
  "trending_searches": "Yonoapp, Digital Tools, Verified Apps, Safe Portal, Mobile Utilities, Trending Games"
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
