export type MarketplaceStyle =
  | 'blended_authentic'
  | 'play_store'
  | 'amazon_flipkart'
  | 'hinglish_casual'
  | 'ultra_short_crowd'
  | 'critical_tester';

export type ReviewLengthMix =
  | 'natural_mix'
  | 'short_punchy'
  | 'medium_standard'
  | 'detailed_story';

export type ReviewLanguageMix =
  | 'english_india'
  | 'hinglish_mix'
  | 'global_english'
  | 'pure_hinglish';

export type ReviewFocusTopic =
  | 'what_app_provides'
  | 'onboarding_ease'
  | 'daily_experience'
  | 'device_network'
  | 'comparison_verdict'
  | 'feature_requests';

// Compatibility aliases for subcomponents
export type DateDistributionMode =
  | 'today_only'
  | 'today_morning'
  | 'today_evening'
  | 'yesterday_only'
  | 'today_and_yesterday'
  | 'last_2_days'
  | 'last_3_days'
  | 'last_5_days'
  | 'last_7_days'
  | 'last_15_days'
  | 'last_30_days';

export type RatingMixMode =
  | 'mostly_positive'
  | 'all_5_star'
  | 'balanced_realistic'
  | 'critical_feedback'
  | 'realistic_48'
  | 'pure_5'
  | 'balanced_45'
  | 'mixed_42';
export type LanguageToneMode = 'casual_indian' | 'enthusiastic_gamer' | 'detailed_analytical' | 'short_punchy' | 'mixed_natural' | string;
export type PublishMode = 'stage' | 'direct_firebase' | string;

export interface StudioConfig {
  apiKey: string;
  model: string;
  reviewsPerApp: number;
  ratingMix: RatingMixMode;
  tone: 'casual_indian' | 'enthusiastic_gamer' | 'detailed_analytical' | 'short_punchy' | 'mixed_natural';
  marketplaceStyle: MarketplaceStyle;
  lengthDistribution: ReviewLengthMix;
  languageMix: ReviewLanguageMix;
  focusTopics: ReviewFocusTopic[];
  humanImperfectionLevel: 'natural' | 'polished' | 'raw_casual';
  dateRangeMode: 'recent_days' | 'custom_days' | 'custom_months' | 'specific_range';
  customDays: number;
  customMonths: number;
  startDate: string;
  endDate: string;
  autoPublish: boolean;
  likesProbability: number;
  maxLikesPerReview: number;
  generationPacing: 'batch_fast' | 'step_by_step';
  activeSessionDirective?: string;
  updatedAt?: number;
  // Optional compatibility properties
  publishMode?: PublishMode;
  dateMode?: DateDistributionMode;
  languageTone?: LanguageToneMode;
  customTopic?: string;
}

export interface StagedReview {
  id: string;
  appId: string;
  appSlug?: string;
  appName: string;
  appIcon?: string;
  appCategory?: string;
  authorName: string;
  userName?: string;
  rating: number;
  content: string;
  reviewText?: string;
  createdAt: string;
  dateTag?: string;
  helpfulCount: number;
  helpful_count?: number;
  isPinned: boolean;
  status: 'staged' | 'publishing' | 'published' | 'failed';
  adminReply?: string;
  personaTag?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  text: string;
  timestamp: string;
  isGenerating?: boolean;
  generatedCount?: number;
  appliedAdjustments?: string[];
  modelUsed?: string;
}

export interface BrainDirective {
  id: string;
  rule: string;
  category: 'tone' | 'vocabulary' | 'formatting' | 'safety' | 'custom';
  active: boolean;
  createdAt: string;
}

export interface GenerationActionLog {
  id: string;
  timestamp: string;
  actionType: 'generated' | 'published' | 'edited' | 'deleted' | 'directive_added';
  summary: string;
  appNames: string[];
  count: number;
}

export interface AppGenerationProgress {
  appId: string;
  appName: string;
  appIcon?: string;
  totalTarget: number;
  completedCount: number;
  status: 'waiting' | 'generating' | 'completed' | 'error';
  lastReviewPreview?: string;
  errorMsg?: string;
}

export interface AIStudioBrainMemory {
  version: string;
  lastUpdated: string;
  directives: BrainDirective[];
  actionLogs: GenerationActionLog[];
  totalGeneratedAllTime: number;
  totalPublishedAllTime: number;
  appLastGeneratedMap: Record<string, string>;
}

export interface AIConnectionStatus {
  state: 'checking' | 'connected' | 'missing_key' | 'invalid_key' | 'error';
  model: string;
  requestedModel?: string;
  latencyMs?: number;
  keySource?: 'custom' | 'saved_studio' | 'server_env' | 'none';
  keyMask?: string;
  hasServerEnvKey?: boolean;
  serverEnvKeyMask?: string;
  errorMessage?: string;
  warningMessage?: string;
  lastCheckedAt?: number;
}
