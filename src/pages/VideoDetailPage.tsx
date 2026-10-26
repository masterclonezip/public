/**
 * VideoDetailPage deep guides layout
 * Embeds specific video walkthroughs and enables direct, live user queries and commentaries.
 */

import { useState, useEffect, useRef } from 'react';
import { useParams, Navigate, Link } from 'react-router-dom';
import Meta from '../components/Meta';
import { useData } from '../contexts/DataContextPublic';
import { mockVideos as staticMockVideos } from '../lib/lightFallback';
import { ArrowLeft, MessageSquare, Send, Calendar, ShieldAlert } from 'lucide-react';

interface Comment {
  id: string;
  author: string;
  content: string;
  date: string;
}

export default function VideoDetailPage() {
  const { videos: mockVideos, settings: mockSettings, loading, videosSyncedWithServer, serverVideosFetched, refreshAll } = useData();
  const { slug } = useParams();
  const videoItem = mockVideos.find(v => v.slug?.toLowerCase() === slug?.toLowerCase() || v.id?.toLowerCase() === slug?.toLowerCase()) ||
                    staticMockVideos.find(v => v.slug?.toLowerCase() === slug?.toLowerCase() || v.id?.toLowerCase() === slug?.toLowerCase());
  const [commentText, setCommentText] = useState('');
  
  const [triedRefresh, setTriedRefresh] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const syncAttemptedRef = useRef<Record<string, boolean>>({});

  useEffect(() => {
    window.scrollTo(0, 0);
    setTriedRefresh(false);
    setIsRefreshing(false);
  }, [slug]);

  // Automatically trigger a silent cloud sync if the requested item is not found in local cache
  useEffect(() => {
    const slugKey = slug?.toLowerCase() || '';
    if (!slugKey) return;

    const found = mockVideos.some(v => v.slug?.toLowerCase() === slugKey || v.id?.toLowerCase() === slugKey);
    if (!found && !syncAttemptedRef.current[slugKey] && !triedRefresh && !isRefreshing) {
      syncAttemptedRef.current[slugKey] = true;
      setIsRefreshing(true);
      console.info(`[VideoDetail] Video "${slug}" sync initiated for deep-link resolve.`);
      refreshAll(true)
        .catch((e: any) => {
          console.warn("[VideoDetail] Deep-link video sync notice:", e.message || e);
        })
        .finally(() => {
          setTriedRefresh(true);
          setIsRefreshing(false);
        });
    }
  }, [slug, mockVideos, triedRefresh, isRefreshing, refreshAll]);

  const getInitialComments = () => {
    const saved = localStorage.getItem(`video_comments_${slug}`);
    if (saved) {
      return JSON.parse(saved);
    }
    return [];
  };

  const [comments, setComments] = useState<Comment[]>(getInitialComments);

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    const newComment: Comment = {
      id: Math.random().toString(36).substr(2, 9),
      author: 'Guest User',
      content: commentText,
      date: new Date().toLocaleDateString()
    };

    const newCommentsList = [newComment, ...comments];
    setComments(newCommentsList);
    localStorage.setItem(`video_comments_${slug}`, JSON.stringify(newCommentsList));
    setCommentText('');
  };

  if (loading && !videoItem) {
    return (
      <div className="flex flex-col items-center justify-center py-20 min-h-[40vh]">
        <div className="w-8 h-8 border-[3px] border-black/10 dark:border-white/10 border-t-blue-500 rounded-full animate-spin mb-4"></div>
        <p className="text-sm font-medium tracking-wide text-zinc-500 animate-pulse">Loading transmission...</p>
      </div>
    );
  }

  // Graceful interstitial for slow database cold-starts or deep links on first visit
  if (!videoItem && (!serverVideosFetched || !videosSyncedWithServer || isRefreshing || !triedRefresh)) {
    return (
      <div className="flex flex-col items-center justify-center py-20 min-h-[40vh] text-center px-4 max-w-sm mx-auto">
        <div className="w-8 h-8 border-[3px] border-black/10 dark:border-white/10 border-t-blue-500 rounded-full animate-spin mb-4"></div>
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mt-2">Syncing</h3>
        <p className="text-sm text-zinc-500 mt-2 leading-relaxed">
          Verifying secure transmission logs with the network...
        </p>
      </div>
    );
  }

  if (!videoItem) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-4 max-w-md mx-auto">
        <Meta 
          title="404 - Video Not Found" 
          description="The requested video walkthrough could not be located." 
          noindex={true} 
        />
        <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 rounded-2xl flex items-center justify-center mb-6">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">Transmission Not Found</h1>
        <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-3 leading-relaxed mb-8">
          The requested video transmission "<span className="font-mono font-medium text-zinc-800 dark:text-zinc-200">{slug}</span>" could not be loaded.
        </p>
        <Link 
          to="/videos" 
          className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-[16px] font-semibold text-sm transition-all hover:scale-[1.02] active:scale-[0.98] shadow-md"
        >
          <ArrowLeft className="w-4 h-4" /> View other videos
        </Link>
      </div>
    );
  }

  // Extract YouTube ID
  function extractYoutubeId(urlStr: string) {
    if (!urlStr) return '';
    try {
      const url = new URL(urlStr);
      if (url.hostname.includes('youtube.com')) {
        if (url.pathname.startsWith('/shorts/') || url.pathname.startsWith('/live/') || url.pathname.startsWith('/embed/') || url.pathname.startsWith('/v/')) {
          return url.pathname.split('/')[2] || url.pathname.split('/')[1] || '';
        }
        return url.searchParams.get('v') || '';
      } else if (url.hostname.includes('youtu.be')) {
        return url.pathname.slice(1);
      }
    } catch (e) {
      if (urlStr.length === 11 && !urlStr.includes('/')) return urlStr;
    }
    const m = urlStr.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|shorts\/|live\/|watch\?v=|watch\?.+&v=))([^&?\s]+)/);
    if (m && m[1]) return m[1];
    return urlStr.split('/').pop()?.split('?')[0] || '';
  }
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const videoId = extractYoutubeId(videoItem.youtube_url);
  const canonicalVideoUrl = videoItem.canonical_url || `${origin}/videos/${encodeURIComponent(videoItem.slug || videoItem.id)}`;
  const rawUploadDate = (videoItem as any).updated_at || videoItem.created_at || (videoItem as any).published_at || (videoItem as any).date || '2026-09-01T00:00:00.000Z';
  const parsedUploadDate = Date.parse(String(rawUploadDate));
  const uploadDateIso = !isNaN(parsedUploadDate) && parsedUploadDate > 0 ? new Date(parsedUploadDate).toISOString() : '2026-09-01T00:00:00.000Z';

  const videoSchema = {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    "name": videoItem.title,
    "description": videoItem.seo_description || videoItem.description || videoItem.title,
    "thumbnailUrl": videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : `${origin}/logo.png`,
    "uploadDate": uploadDateIso,
    "contentUrl": videoItem.youtube_url
  };

  const videoBreadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": origin || "/"
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Videos",
        "item": `${origin}/videos`
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": videoItem.title,
        "item": canonicalVideoUrl
      }
    ]
  };

  return (
    <div className="animate-fade-in max-w-[1550px] mx-auto px-3 sm:px-6 md:px-10 pb-12">
      <Meta 
        title={videoItem.seo_title || videoItem.title}
        description={videoItem.seo_description || videoItem.description}
        keywords={videoItem.seo_keywords}
        image={`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`}
        url={canonicalVideoUrl}
        type="website"
        canonical={canonicalVideoUrl}
        schema={videoSchema}
        breadcrumbSchema={videoBreadcrumbSchema}
      />
      
      <div className="mb-6 pt-4">
        <Link 
          to="/videos" 
          className="inline-flex items-center gap-2 text-sm font-medium text-blue-500 hover:text-blue-600 transition-colors group"
        >
          <div className="p-1.5 rounded-full bg-blue-50 dark:bg-blue-900/20 group-hover:-translate-x-1 transition-transform">
            <ArrowLeft className="w-4 h-4" />
          </div>
          Videos
        </Link>
      </div>

      <div className="bg-zinc-50 dark:bg-zinc-800/30 rounded-[32px] overflow-hidden shadow-sm border border-black/5 dark:border-white/5 relative">
        <div className="relative w-full bg-black">
           <div className="aspect-video w-full max-w-5xl mx-auto">
              {videoId ? (
                <iframe 
                  className="w-full h-full"
                  src={`https://www.youtube.com/embed/${videoId}?autoplay=0`} 
                  title={videoItem.title}
                  frameBorder="0" 
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                  allowFullScreen>
                </iframe>
              ) : (
                <div className="flex items-center justify-center h-full text-zinc-500 font-medium text-sm">Invalid video URL</div>
              )}
           </div>
        </div>
        
        <div className="p-6 sm:p-10">
            <div className="flex items-center gap-2 mb-4">
                <span className="bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400 text-[10px] font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wider">Video Hub</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-bold leading-tight mb-4 tracking-tight text-zinc-900 dark:text-zinc-100">
              {videoItem.title}
            </h1>
            
            <div className="flex items-center gap-2 mb-8 text-sm font-medium text-zinc-500">
                <Calendar className="w-4 h-4" />
                <span>
                  {videoItem.created_at ? new Date(videoItem.created_at).toLocaleDateString() : 'Recently Published'}
                </span>
            </div>

            <div className="prose prose-zinc dark:prose-invert max-w-none text-zinc-600 dark:text-zinc-400 leading-relaxed text-base">
              <p>{videoItem.description}</p>
            </div>

            <div className="mt-12 pt-10 border-t border-black/5 dark:border-white/5">
              <h3 className="text-xl font-bold flex items-center gap-2 mb-8 tracking-tight text-zinc-900 dark:text-zinc-100">
                <MessageSquare className="w-5 h-5 text-blue-500" />
                Comments ({comments.length})
              </h3>
              
              <form onSubmit={handleAddComment} className="mb-10">
                <div className="relative">
                  <textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Add a comment..."
                    className="w-full bg-white dark:bg-zinc-900 border border-black/10 dark:border-white/10 rounded-2xl p-4 pr-14 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/30 transition-all min-h-[120px] resize-y outline-none font-normal text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
                  />
                  <button
                    type="submit"
                    disabled={!commentText.trim()}
                    className="absolute bottom-4 right-4 w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center hover:bg-blue-700 transition-all disabled:opacity-50 active:scale-[0.95]"
                    aria-label="Submit comment"
                  >
                    <Send className="w-4 h-4 mr-0.5" />
                  </button>
                </div>
              </form>

              <div className="space-y-4">
                {comments.map((comment) => (
                  <div 
                    key={comment.id} 
                    className="bg-white dark:bg-zinc-900 p-6 rounded-[20px] border border-black/5 dark:border-white/5 shadow-sm animate-fade-in"
                  >
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 flex items-center justify-center font-bold text-sm shrink-0">
                          {comment.author.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 leading-none mb-1">{comment.author}</p>
                          <p className="text-xs font-medium text-zinc-500">{comment.date}</p>
                        </div>
                    </div>
                    <p className="text-zinc-600 dark:text-zinc-300 leading-relaxed text-sm">{comment.content}</p>
                  </div>
                ))}
                {comments.length === 0 && (
                  <div className="py-16 text-center">
                     <p className="text-sm font-medium text-zinc-500">No comments yet. Be the first!</p>
                  </div>
                )}
              </div>
            </div>
        </div>
      </div>
    </div>
  );
}
