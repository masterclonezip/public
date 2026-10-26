import React, { useState } from 'react';
import { Play } from 'lucide-react';

function getYouTubeId(url: string): string | null {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

export function YouTubePlayer({ videoUrl }: { videoUrl: string }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const videoId = getYouTubeId(videoUrl);

  if (!videoId) return null;

  const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

  if (isPlaying) {
    return (
      <div className="flex-none w-[180px] sm:w-[250px] aspect-[16/9] rounded-xl overflow-hidden snap-center bg-black shadow-sm border border-black/5 dark:border-white/10">
        <iframe
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
          title="YouTube video player"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="w-full h-full"
        ></iframe>
      </div>
    );
  }

  return (
    <button 
      type="button"
      onClick={() => setIsPlaying(true)}
      aria-label="Play video"
      className="flex-none w-[180px] sm:w-[250px] aspect-[16/9] rounded-xl overflow-hidden snap-center bg-zinc-100 dark:bg-zinc-800 shadow-sm border border-black/5 dark:border-white/10 cursor-pointer relative group flex items-center justify-center text-left"
    >
      <img 
        src={thumbnailUrl} 
        alt="Video thumbnail" 
        loading="lazy"
        width={250}
        height={140}
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
      />
      <div className="absolute inset-0 bg-black/30 flex items-center justify-center group-hover:bg-black/45 transition-colors">
        <div className="w-12 h-12 rounded-full bg-white/95 text-zinc-900 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-200">
          <Play className="w-5 h-5 fill-current ml-0.5" />
        </div>
      </div>
    </button>
  );
}

export default YouTubePlayer;
