import React from 'react';
import Meta from '../components/Meta';
import { useData } from '../contexts/DataContextPublic';
import { Github, Twitter } from 'lucide-react';
import { getOptimizedImageUrl } from '../seo/utils';

export default function Developers() {
  const { settings, fetchSettings } = useData();

  React.useEffect(() => {
    if ((!settings.developers || settings.developers.length === 0) && fetchSettings) {
      fetchSettings();
    }
  }, [settings.developers, fetchSettings]);

  if (!settings.developers || settings.developers.length === 0) {
    return (
      <div className="animate-fade-in">
        <div className="w-full max-w-5xl mx-auto px-1 xs:px-2 sm:px-4 py-8 sm:py-12 pb-16 min-h-[60vh] flex flex-col items-center justify-center text-center">
          <Meta 
            title={settings?.developers_meta_title || "Developer Profiles"}
            description={settings?.developers_meta_description || "Browse profiles of top app developers."}
            canonical={window.location.origin + "/developers"}
          />
          <div className="max-w-lg mx-auto py-8">
            <h1 className="text-2xl sm:text-3xl font-black mb-3 text-zinc-900 dark:text-white uppercase tracking-tight">Our Developers</h1>
            <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 font-medium">Information about our developers is not available at this moment. Please check back later.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="w-full max-w-5xl mx-auto px-1 xs:px-2 sm:px-4 py-4 sm:py-8 pb-16 min-h-[70vh]">
        <Meta 
          title={settings?.developers_meta_title || "Developer Profiles"}
          description={settings?.developers_meta_description || "Browse profiles of top app developers."}
          canonical={window.location.origin + "/developers"}
        />

        <div className="w-full">
          <div className="text-left sm:text-center pb-4 sm:pb-6 mb-6 sm:mb-10 border-b border-zinc-200/80 dark:border-zinc-800/80 animate-fade-in">
            <h1 className="text-2xl xs:text-3xl sm:text-5xl font-extrabold mb-2 text-zinc-900 dark:text-zinc-100 tracking-tight">
              Meet Our Team
            </h1>
            <p className="text-sm sm:text-lg text-zinc-600 dark:text-zinc-400 font-medium max-w-2xl sm:mx-auto">
              The creative minds and technical experts building the future.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
            {settings.developers.map((dev, index) => (
              <div 
                key={`dev-card-${dev.id || dev.name || index}`} 
                className="border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-5 sm:p-6 transition-all flex flex-col items-center text-center group animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="w-32 h-32 rounded-full overflow-hidden mb-6 border-4 border-white dark:border-zinc-800 shadow-xl group-hover:scale-105 transition-transform duration-500">
                  <img 
                    src={dev.image_url ? getOptimizedImageUrl(dev.image_url, 256) : `https://ui-avatars.com/api/?name=${encodeURIComponent(dev.name)}&background=random`} 
                    alt={dev.name} 
                    loading="lazy"
                    decoding="async"
                    width={128}
                    height={128}
                    className="w-full h-full object-cover"
                  />
                </div>
                
                <h3 className="text-2xl font-black text-zinc-900 dark:text-white mb-2 tracking-tight">{dev.name}</h3>
                
                <div className="bg-pink-500/10 text-pink-600 dark:text-pink-400 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest mb-4">
                  {dev.role}
                </div>
                
                {dev.bio && (
                  <p className="text-slate-600 dark:text-slate-400 mb-8 flex-grow font-medium text-sm leading-relaxed">
                    {dev.bio}
                  </p>
                )}
                
                <div className="flex gap-4 mt-auto pt-6 border-t border-black/5 dark:border-white/5 w-full justify-center">
                  {dev.github && (
                    <a 
                      href={dev.github} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="p-3 bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 rounded-xl transition-colors text-zinc-700 dark:text-zinc-300 hover:text-black dark:hover:text-white"
                      title="GitHub"
                      aria-label={`${dev.name || 'Developer'} GitHub Profile`}
                    >
                      <Github className="w-5 h-5" />
                    </a>
                  )}
                  {dev.twitter && (
                    <a 
                      href={dev.twitter} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="p-3 bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 rounded-xl transition-colors text-zinc-700 dark:text-zinc-300 hover:text-blue-500 dark:hover:text-blue-400"
                      title="Twitter"
                      aria-label={`${dev.name || 'Developer'} Twitter Profile`}
                    >
                      <Twitter className="w-5 h-5" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
