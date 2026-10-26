/**
 * WebsiteTitleHero animated display header
 * Renders large typographic titles and responsive decorative gradient particles.
 */

import React from 'react';

interface WebsiteTitleHeroProps {
  settings: {
    hero_title_text?: string;
    hero_title_color?: string;
    hero_title_style?: string;
    hero_title_animation?: string;
    hero_title_subtitle?: string;
    hero_title_visible?: boolean;
    animations_enabled?: boolean;
  };
}

export const WebsiteTitleHero = React.memo(({ settings }: WebsiteTitleHeroProps) => {
  const visible = settings.hero_title_visible !== false;
  const text = settings.hero_title_text ?? '';
  const subtitle = settings.hero_title_subtitle ?? '';

  if (!visible || (!text && !subtitle)) {
    const fallbackH1 = (settings as any).site_title || '';
    return <h1 className="sr-only">{fallbackH1}</h1>;
  }

  const style = settings.hero_title_style || 'modern';
  const color = settings.hero_title_color || 'classic-dark';
  const animation = settings.hero_title_animation || 'fade-in';
  const isAnimated = settings.animations_enabled !== false;

  // Map Font / Style Option
  let styleClasses = 'font-sans font-black tracking-tight text-center leading-none text-base xs:text-xl sm:text-2xl md:text-3xl lg:text-4xl';
  if (style === 'modern') {
    styleClasses = 'font-sans font-black uppercase text-center tracking-tighter leading-none text-base xs:text-xl sm:text-3xl md:text-4xl';
  } else if (style === 'serif') {
    styleClasses = 'font-serif font-black text-center italic leading-tight text-base xs:text-xl sm:text-2xl md:text-3xl lg:text-4xl';
  } else if (style === 'mono') {
    styleClasses = 'font-mono font-extrabold uppercase text-center tracking-tight leading-none text-sm xs:text-lg sm:text-2xl md:text-3xl';
  }

  // Map Color Gradient Style
  let colorClasses = 'bg-gradient-to-r from-zinc-950 via-zinc-800 to-zinc-900 bg-clip-text text-transparent dark:from-white dark:via-zinc-200 dark:to-zinc-300';
  if (color === 'emerald-indigo') {
    colorClasses = 'bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-600 bg-clip-text text-transparent';
  } else if (color === 'neon-sky') {
    colorClasses = 'bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-600 bg-clip-text text-transparent';
  } else if (color === 'sunset-fire') {
    colorClasses = 'bg-gradient-to-r from-amber-500 via-orange-600 to-rose-600 bg-clip-text text-transparent';
  } else if (color === 'cosmic-purple') {
    colorClasses = 'bg-gradient-to-r from-pink-500 via-fuchsia-600 to-purple-600 bg-clip-text text-transparent';
  }

  // Map CSS Animation class
  let animClass = '';
  if (isAnimated && animation !== 'none') {
    if (animation === 'fade-in') animClass = '';
    else if (animation === 'slide-up') animClass = 'animate-in slide-in-from-bottom-2 duration-300';
    else if (animation === 'bounce-in') animClass = 'animate-in zoom-in-95 duration-300';
    else if (animation === 'zoom-out') animClass = 'animate-in zoom-in-105 duration-300';
    else if (animation === 'glow-pulse') animClass = 'animate-pulse duration-1000';
  }

  return (
    <div className="w-full relative py-1 sm:py-1.5 px-4 overflow-hidden flex flex-col items-center justify-center text-center my-0">
      {/* Background Soft Ambient Light */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center -z-10 overflow-hidden">
        <div 
          className={`w-[200px] sm:w-[300px] h-[100px] sm:h-[150px] rounded-full blur-[40px] sm:blur-[60px] mix-blend-multiply dark:mix-blend-screen opacity-8 transition-colors duration-500 ${
            animation === 'glow-pulse' && isAnimated ? 'animate-pulse' : ''
          } ${
            color === 'emerald-indigo' ? 'bg-emerald-500/30 dark:bg-indigo-500/15' :
            color === 'neon-sky' ? 'bg-cyan-500/30 dark:bg-blue-500/15' :
            color === 'sunset-fire' ? 'bg-amber-500/30 dark:bg-rose-500/15' :
            color === 'cosmic-purple' ? 'bg-pink-500/30 dark:bg-purple-500/15' :
            'bg-zinc-500/15 dark:bg-zinc-700/15'
          }`}
        />
      </div>

      <div className="max-w-4xl mx-auto flex flex-col items-center justify-center gap-1">
        {/* Dynamic Big Typography Header */}
        <h1 className={`${styleClasses} ${colorClasses} ${animClass} select-text block max-w-3xl filter drop-shadow-sm`}>
          {text}
        </h1>

        {/* Dynamic Tagline Subtitle */}
        {subtitle && (
          <p className="text-[9px] sm:text-[10px] font-bold tracking-[0.18em] text-zinc-900/60 dark:text-zinc-100/60 uppercase max-w-2xl select-text pt-0.5 leading-tight">
            {subtitle}
          </p>
        )}
        
        {/* Modern decorative baseline element */}
        <div 
          className={`h-[2px] w-12 rounded-full mt-1 bg-zinc-200 dark:bg-zinc-800 transition-all duration-300 ${
            color === 'emerald-indigo' ? 'bg-gradient-to-r from-emerald-400 to-indigo-500' :
            color === 'neon-sky' ? 'bg-gradient-to-r from-cyan-400 to-blue-500' :
            color === 'sunset-fire' ? 'bg-gradient-to-r from-amber-400 to-rose-500' :
            color === 'cosmic-purple' ? 'bg-gradient-to-r from-pink-400 to-purple-500' :
            ''
          }`}
        />
      </div>
    </div>
  );
});

WebsiteTitleHero.displayName = 'WebsiteTitleHero';

