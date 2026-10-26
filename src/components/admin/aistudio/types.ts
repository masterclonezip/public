export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant' | 'system';
  text: string;
  timestamp: string;
  suggestedAction?: 'generate' | 'adjust_prompt' | 'save_memory';
}

export interface BrainMemoryDirective {
  id: string;
  rule: string;
  category: 'tone' | 'topic' | 'date' | 'rating' | 'persona' | 'general';
  createdAt: string;
  active: boolean;
}

export interface StagedReview {
  id: string;
  appId: string;
  appName: string;
  appSlug?: string;
  appIcon?: string;
  appCategory?: string;
  userName: string;
  rating: number;
  reviewText: string;
  dateTag: string;
  timestamp: string; // ISO date string
  status: 'staged' | 'approved' | 'published';
  helpful_count?: number; // Likes / helpful vote count below the comment
}

export type DateDistributionMode = 
  | 'today_and_yesterday' // 50% Today, 50% Yesterday
  | 'today_only'          // 100% Today
  | 'yesterday_only'      // 100% Yesterday
  | 'today_morning'       // Today morning / daytime
  | 'today_evening'       // Today evening / night
  | 'last_2_days'         // Strict past 48 hours
  | 'last_3_days'         // Spread evenly across today, yesterday, and 2 days ago
  | 'last_5_days'         // Spread across last 5 days
  | 'last_7_days'         // Spread naturally across past week
  | 'last_15_days'        // Spread across last 2 weeks (no future)
  | 'last_30_days';       // Spread across last month (no future)

export type RatingMixMode = 
  | 'auto_app_rating'     // Smart Auto: Automatically matches the app's real catalog rating score (e.g. 4.3★)
  | 'all_5_star'          // 100% 5-star
  | 'all_4_star'          // 100% 4-star
  | 'all_3_star'          // 100% 3-star (neutral/average feedback)
  | 'all_2_star'          // 100% 2-star (issues/missing features)
  | 'all_1_star'          // 100% 1-star (complaints/bugs/crashes)
  | 'organic_full_mix'    // Full 1 to 5 star realistic mix (complaints, praise, suggestions)
  | 'critical_bugs'       // 1-star & 2-star critical bug and improvement feedback
  | 'high_praise'         // 90% 5-star, 10% 4-star
  | 'natural'             // Default: ~75% 5-star, 20% 4-star, 5% 3-star
  | 'balanced_critical';  // 50% 5-star, 30% 4-star, 20% 1-3 star

export type LanguageToneMode = 
  | 'all_rounder_standard'  // Standard, normal everyday users across all categories
  | 'happy_with_emojis'     // Happy enthusiastic customers with natural emojis (😊, 👍, ⭐)
  | 'super_excited_emojis'  // Highly enthusiastic fans with energetic emojis (🔥, 🚀, ❤️, 💯)
  | 'hinglish_natural'      // Casual, colloquial Indian mobile tone
  | 'natural_english'       // Casual, everyday conversational English
  | 'short_punchy'          // Ultra-short punchy feedback (1-2 sentences)
  | 'detailed_feedback'    // Thoughtful 2-3 sentence user experience feedback
  | 'honest_balanced'       // Balanced constructive feedback praising strengths
  | 'feature_focused'       // Technical praise on UI smoothness and battery life
  | 'beginner_friendly'     // Simple friendly praise for first-time installers
  | 'daily_regular_user';   // Habitual daily user perspective praising long-term stability

export type PublishMode = 
  | 'wait_approve'  // Reviews staged for manual admin inspection, edit & 1-click publish
  | 'auto_direct';  // Reviews automatically published directly to Live Community upon generation

export type LikesRateMode = 
  | 'subtle_1_2'     // Recommended: Low subtle rate, mostly 1 or 2 likes, occasional 0
  | 'natural_0_3'    // Organic mix: 0 to 3 likes across comments
  | 'modest_1_4'     // Modest engagement: 1 to 4 likes
  | 'zero_none'      // 0 likes clean
  | 'custom';        // Custom admin set range

export interface StudioConfig {
  apiKey: string;
  model: string;
  reviewsPerApp: number;
  dateMode: DateDistributionMode;
  ratingMix: RatingMixMode;
  languageTone: LanguageToneMode;
  likesMode?: LikesRateMode;
  customTopic: string;
  publishMode: PublishMode;
  activeSessionDirective?: string; // Live directive agreed in chat or typed in custom box
}
