/**
 * Fallback Community Store Interface & Lightweight Local Store
 * Used purely for in-memory types and server-side fallback calculations.
 * Public reviews are fetched LIVE directly from Cloud Firestore via `communityFirebase.ts`.
 */

export interface ReviewRecord {
  id: string;
  appId: string;
  appSlug?: string;
  appName?: string;
  userName: string;
  rating: number;
  reviewText: string;
  timestamp: string;
  status: 'published' | 'pending' | 'rejected' | string;
  helpful_count: number;
  isPinned: boolean;
  reported: boolean;
  report_count: number;
  source: 'community' | 'google' | 'admin_created' | 'ai_generated' | string;
  adminReply?: {
    text: string;
    author: string;
    timestamp: string;
  } | null;
  updated_at?: string;
  [key: string]: any;
}

export interface AppReviewStats {
  averageRating: number;
  totalReviews: number;
  starCounts: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
}

export interface ReviewsResponse {
  reviews: ReviewRecord[];
  totalCount: number;
  nextCursor?: string;
  stats: AppReviewStats;
}

export interface CommunityStoreInterface {
  getReviewsForApp(
    appId: string,
    cursor?: string,
    limit?: number,
    appName?: string,
    rating?: number,
    appSlug?: string
  ): Promise<ReviewsResponse>;
  getAppStats(appId: string, fallbackRating?: number, appSlug?: string): AppReviewStats;
  addReview(data: Partial<ReviewRecord>): ReviewRecord;
}

export const STATIC_COMMUNITY_REVIEWS: ReviewRecord[] = [];

class FallbackCommunityStore implements CommunityStoreInterface {
  private reviews: ReviewRecord[] = [];

  constructor(initialReviews: ReviewRecord[] = STATIC_COMMUNITY_REVIEWS) {
    this.reviews = initialReviews;
  }

  public setReviews(newReviews: ReviewRecord[]) {
    this.reviews = newReviews;
  }

  public getAllReviews(): ReviewRecord[] {
    return this.reviews;
  }

  public async getReviewsForApp(
    appId: string,
    cursor?: string,
    limit: number = 20,
    _appName?: string,
    rating: number = 4.8,
    appSlug?: string
  ): Promise<ReviewsResponse> {
    const cleanId = (appId || '').trim();
    const cleanSlug = (appSlug || '').trim();

    const matched = this.reviews.filter(r => {
      const matchId = cleanId && (r.appId === cleanId || r.appSlug === cleanId);
      const matchSlug = cleanSlug && (r.appId === cleanSlug || r.appSlug === cleanSlug);
      return matchId || matchSlug;
    });

    const stats = this.getAppStats(appId, rating, appSlug);

    let startIndex = 0;
    if (cursor) {
      const idx = matched.findIndex(r => r.id === cursor);
      if (idx !== -1) startIndex = idx + 1;
    }

    const paged = matched.slice(startIndex, startIndex + limit);
    const hasMore = startIndex + limit < matched.length;

    return {
      reviews: paged,
      totalCount: matched.length,
      nextCursor: hasMore && paged.length > 0 ? paged[paged.length - 1].id : undefined,
      stats
    };
  }

  public getAppStats(appId: string, fallbackRating: number = 4.8, appSlug?: string): AppReviewStats {
    const cleanId = (appId || '').trim();
    const cleanSlug = (appSlug || '').trim();

    const matched = this.reviews.filter(r => {
      const matchId = cleanId && (r.appId === cleanId || r.appSlug === cleanId);
      const matchSlug = cleanSlug && (r.appId === cleanSlug || r.appSlug === cleanSlug);
      return matchId || matchSlug;
    });

    if (matched.length === 0) {
      const clamped = Math.max(1, Math.min(5, Number(fallbackRating) || 4.8));
      return {
        averageRating: Number(clamped.toFixed(1)),
        totalReviews: 0,
        starCounts: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
      };
    }

    const starCounts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    let sum = 0;
    matched.forEach(r => {
      const s = Math.max(1, Math.min(5, Math.round(r.rating || 5))) as 1 | 2 | 3 | 4 | 5;
      starCounts[s] = (starCounts[s] || 0) + 1;
      sum += (r.rating || 5);
    });

    return {
      averageRating: Number((sum / matched.length).toFixed(1)),
      totalReviews: matched.length,
      starCounts
    };
  }

  public addReview(data: Partial<ReviewRecord>): ReviewRecord {
    const newRecord: ReviewRecord = {
      id: data.id || `rev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      appId: data.appId || '',
      appSlug: data.appSlug || '',
      appName: data.appName || '',
      userName: data.userName || 'Player',
      rating: Number(data.rating) || 5,
      reviewText: data.reviewText || '',
      timestamp: data.timestamp || new Date().toISOString(),
      status: data.status || 'published',
      helpful_count: Number(data.helpful_count) || 0,
      isPinned: Boolean(data.isPinned),
      reported: Boolean(data.reported),
      report_count: Number(data.report_count) || 0,
      source: data.source || 'community',
      adminReply: data.adminReply || null,
      updated_at: data.updated_at || new Date().toISOString()
    };
    this.reviews.unshift(newRecord);
    return newRecord;
  }
}

export const communityStoreFallback = new FallbackCommunityStore();
export const communityStore = communityStoreFallback;
