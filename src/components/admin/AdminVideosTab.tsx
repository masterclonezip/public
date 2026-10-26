import React, { useState } from 'react';
import { Video as VideoIcon, Plus, Trash2, LayoutDashboard, Edit2, Save } from 'lucide-react';

interface AdminVideosTabProps {
  videosList: any[];
  handleAddVideo: () => void;
  handleDeleteVideo: (id: string) => void;
  handleVideosChange: (id: string, field: string, value: any) => void;
  handleSaveVideos: (e: React.FormEvent) => void;
  saving: boolean;
}

export const AdminVideosTab = React.memo(({
  videosList,
  handleAddVideo,
  handleDeleteVideo,
  handleVideosChange,
  handleSaveVideos,
  saving
}: AdminVideosTabProps) => {
  const [editingVideoId, setEditingVideoId] = useState<string | null>(null);

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-6 rounded-2xl border border-black/10 dark:border-white/10 shadow-sm">
        <h2 className="text-xl font-bold flex items-center gap-2 dark:text-white"><VideoIcon className="w-5 h-5 text-blue-500" /> Video Matrix</h2>
        <button onClick={() => {
          handleAddVideo();
        }} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-all"><Plus className="w-4 h-4" /> Add Video</button>
      </div>
      <div className="space-y-4">
        {videosList.map((item: any) => (
          <div key={item.id} className="bg-white dark:bg-slate-900 border border-black/10 dark:border-white/10 rounded-2xl p-6 shadow-sm relative overflow-hidden">
            {editingVideoId === item.id ? (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-black/10 dark:border-white/10 pb-4 mb-4 gap-4">
                  <div>
                    <h3 className="font-bold text-lg text-blue-600 flex items-center gap-2"><LayoutDashboard className="w-4 h-4"/> Edit Video</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono">ID: {item.id}</p>
                  </div>
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <button onClick={() => handleDeleteVideo(item.id)} className="flex-1 sm:flex-none flex justify-center items-center gap-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-900/20 text-rose-600 px-4 py-2 rounded-lg font-semibold text-sm transition-all"><Trash2 className="w-4 h-4" /> Delete</button>
                    <button onClick={() => setEditingVideoId(null)} className="flex-1 sm:flex-none flex justify-center items-center gap-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white px-4 py-2 rounded-lg font-semibold text-sm transition-all">Close</button>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="space-y-5">
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white border-b border-black/5 dark:border-white/5 pb-2">Stream Config</h4>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Video Title</label>
                      <input type="text" value={item.title} onChange={e => handleVideosChange(item.id, 'title', e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-sm dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" placeholder="Title" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Slug (URL)</label>
                        <input type="text" value={item.slug} onChange={e => handleVideosChange(item.id, 'slug', e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-sm dark:text-white font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">YouTube URL</label>
                        <input type="text" value={item.youtube_url} onChange={e => handleVideosChange(item.id, 'youtube_url', e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-sm dark:text-white font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Video Description</label>
                      <textarea value={item.description} onChange={e => handleVideosChange(item.id, 'description', e.target.value)} rows={4} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-sm dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"></textarea>
                    </div>
                    
                    {item.youtube_url && (() => {
                      const videoIdMatch = item.youtube_url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]+)/);
                      const videoId = videoIdMatch ? videoIdMatch[1] : null;
                      if (videoId) {
                        return (
                          <div className="pt-2">
                            <img src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`} loading="lazy" width={480} height={360} className="w-full h-48 object-cover rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm" alt="Preview" />
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>

                  <div className="space-y-5">
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white border-b border-black/5 dark:border-white/5 pb-2">Video SEO Armor</h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">SEO Optimized Header</label>
                        <input type="text" value={item.seo_title} onChange={e => handleVideosChange(item.id, 'seo_title', e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-sm dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">SEO Meta String</label>
                        <textarea value={item.seo_description} onChange={e => handleVideosChange(item.id, 'seo_description', e.target.value)} rows={3} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-sm dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"></textarea>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Search Keywords</label>
                        <input type="text" value={item.seo_keywords || ''} onChange={e => handleVideosChange(item.id, 'seo_keywords', e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-sm dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                  {(() => {
                    const videoIdMatch = item.youtube_url?.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]+)/);
                    const videoId = videoIdMatch ? videoIdMatch[1] : null;
                    return videoId ? (
                      <img src={`https://img.youtube.com/vi/${videoId}/default.jpg`} loading="lazy" width={120} height={90} className="w-16 h-12 object-cover rounded-lg border border-slate-200 dark:border-slate-700" alt={item.title} />
                    ) : (
                      <div className="w-16 h-12 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center border border-slate-200 dark:border-slate-700">
                        <VideoIcon className="w-5 h-5 text-slate-400" />
                      </div>
                    );
                  })()}
                  <div>
                    <h3 className="font-bold text-lg text-slate-900 dark:text-white">{item.title || 'Untitled Video'}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{item.slug}</p>
                  </div>
                </div>
                <button onClick={() => setEditingVideoId(item.id)} className="flex items-center gap-2 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 text-blue-600 px-4 py-2 rounded-lg font-semibold text-sm transition-all"><Edit2 className="w-4 h-4" /> Edit</button>
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="mt-8 pt-6 border-t border-black/10 dark:border-white/10 flex justify-end">
        <button onClick={handleSaveVideos} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-all">
          {saving ? 'Processing Stream...' : <><Save className="w-5 h-5"/> Publish Video Matrix</>}
        </button>
      </div>
    </div>
  );
});

AdminVideosTab.displayName = 'AdminVideosTab';

export default AdminVideosTab;
