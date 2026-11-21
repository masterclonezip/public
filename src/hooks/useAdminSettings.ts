import { useState, useEffect, useRef } from 'react';
import { mockNews, mockVideos, mockSettings } from '../lib/staticData';
import { formatPageTitle } from '../lib/seoUtils';

export const useAdminSettings = (settings: any, news: any[], videos: any[]) => {
  const [newsList, setNewsList] = useState<any[]>(() => (Array.isArray(news) && news.length > 0 ? news : (mockNews || [])));
  const [banners, setBanners] = useState<any[]>(() => (settings?.banners || mockSettings?.banners || []));
  const [videosList, setVideosList] = useState<any[]>(() => (Array.isArray(videos) && videos.length > 0 ? videos : (mockVideos || [])));
  const [categoriesList, setCategoriesList] = useState<string[]>(() => (settings?.categories || mockSettings?.categories || []));
  const [quickLinksList, setQuickLinksList] = useState<any[]>(() => (settings?.quick_links || mockSettings?.quick_links || []));
  const [websiteFaqsList, setWebsiteFaqsList] = useState<any[]>(() => (settings?.website_faqs || mockSettings?.website_faqs || []));
  const [developersList, setDevelopersList] = useState<any[]>(() => (settings?.developers || mockSettings?.developers || []));
  const [newCatInput, setNewCatInput] = useState('');

  const deletedNewsIdsRef = useRef(new Set<string>());
  const deletedBannerIdsRef = useRef(new Set<string>());
  const deletedVideoIdsRef = useRef(new Set<string>());
  const deletedCategoryNamesRef = useRef(new Set<string>());

  const prevBannersSigRef = useRef<string>('');
  const prevCategoriesSigRef = useRef<string>('');
  const prevQuickLinksSigRef = useRef<string>('');
  const prevFaqsSigRef = useRef<string>('');
  const prevDevelopersSigRef = useRef<string>('');

  // Synchronize news directly when fresh server data arrives
  useEffect(() => {
    if (Array.isArray(news)) {
      const mapped = news
        .filter(n => !deletedNewsIdsRef.current.has(n.id))
        .map(n => {
          const staticFallback = (mockNews || []).find(
            (m: any) => (m.id && m.id === n.id) || (m.slug && n.slug && m.slug.toLowerCase() === n.slug.toLowerCase())
          );
          let content = n.content || n.description_html || '';
          if (!content || !content.trim()) {
            if (staticFallback?.content || staticFallback?.description_html) {
              content = staticFallback.content || staticFallback.description_html;
            }
          }
          const brand = settings?.site_title || '';
          const cleanTitle = n.title ? formatPageTitle(n.title, '', brand) : '';
          const rawSeoTitle = n.seo_title || n.meta_title || staticFallback?.seo_title || staticFallback?.meta_title || '';
          const cleanSeoTitle = rawSeoTitle ? formatPageTitle(rawSeoTitle, '', brand) : '';
          const rawSeoDesc = n.seo_description || n.meta_description || staticFallback?.seo_description || staticFallback?.meta_description || '';
          return {
            ...(staticFallback || {}),
            ...n,
            title: cleanTitle || n.title || '',
            seo_title: cleanSeoTitle,
            meta_title: cleanSeoTitle,
            seo_description: rawSeoDesc,
            meta_description: rawSeoDesc,
            content,
            description_html: content
          };
        });
      setNewsList(mapped);
    }
  }, [news, settings?.site_title]);

  // Synchronize videos directly when fresh server data arrives
  useEffect(() => {
    if (Array.isArray(videos)) {
      const brand = settings?.site_title || '';
      setVideosList(
        videos
          .filter(v => !deletedVideoIdsRef.current.has(v.id))
          .map(v => {
            const rawSeoTitle = v.seo_title || v.meta_title || '';
            const cleanSeoTitle = rawSeoTitle ? formatPageTitle(rawSeoTitle, '', brand) : '';
            return {
              ...v,
              title: v.title ? formatPageTitle(v.title, v.title, brand) : '',
              ...(rawSeoTitle ? { seo_title: cleanSeoTitle, meta_title: cleanSeoTitle } : {})
            };
          })
      );
    }
  }, [videos, settings?.site_title]);

  // Synchronize settings per-section only when that specific section changes in settings,
  // preserving any in-progress unsaved edits in other tabs.
  useEffect(() => {
    if (settings && typeof settings === 'object') {
      if (Array.isArray(settings.banners)) {
        const sig = JSON.stringify(settings.banners);
        if (sig !== prevBannersSigRef.current) {
          prevBannersSigRef.current = sig;
          setBanners(settings.banners.filter((b: any) => !deletedBannerIdsRef.current.has(b.id)));
        }
      }
      if (Array.isArray(settings.categories)) {
        const sig = JSON.stringify(settings.categories);
        if (sig !== prevCategoriesSigRef.current) {
          prevCategoriesSigRef.current = sig;
          setCategoriesList(settings.categories.filter((c: string) => !deletedCategoryNamesRef.current.has(c)));
        }
      }
      if (Array.isArray(settings.quick_links)) {
        const sig = JSON.stringify(settings.quick_links);
        if (sig !== prevQuickLinksSigRef.current) {
          prevQuickLinksSigRef.current = sig;
          setQuickLinksList(settings.quick_links);
        }
      }
      if (Array.isArray(settings.website_faqs)) {
        const sig = JSON.stringify(settings.website_faqs);
        if (sig !== prevFaqsSigRef.current) {
          prevFaqsSigRef.current = sig;
          setWebsiteFaqsList(settings.website_faqs);
        }
      }
      if (Array.isArray(settings.developers)) {
        const sig = JSON.stringify(settings.developers);
        if (sig !== prevDevelopersSigRef.current) {
          prevDevelopersSigRef.current = sig;
          setDevelopersList(settings.developers);
        }
      }
    }
  }, [settings]);


  // Banners
  const handleAddBanner = () => {
    const newBanner = {
      id: Math.random().toString(36).substr(2, 9),
      title: 'New Banner',
      subtitle: 'Subtitle text',
      image: '',
      link: '/'
    };
    setBanners(prev => [newBanner, ...prev]);
  };

  const handleBannerChange = (id: string, field: string, value: string) => {
    setBanners(prev => prev.map(b => b.id === id ? { ...b, [field]: value } : b));
  };

  const handleDeleteBanner = (id: string) => {
    deletedBannerIdsRef.current.add(id);
    setBanners(prev => prev.filter(b => b.id !== id));
  };

  const handleClearAllBanners = () => {
    setBanners(prev => {
      prev.forEach(b => {
        if (b.id) deletedBannerIdsRef.current.add(b.id);
      });
      return [];
    });
  };

  // News
  const handleAddNews = () => {
    const newId = Math.random().toString(36).substr(2, 9);
    const nowIso = new Date().toISOString();
    const newItem = {
      id: newId,
      slug: `news-${newId}`,
      title: 'New News Item',
      logo_url: '',
      image_url: '',
      description: 'News description...',
      description_html: '<p>Content...</p>',
      content: '<p>Content...</p>',
      ceo_name: 'Admin Team',
      ceo_description: 'Transparency & Security Analyst',
      author: 'Admin Team',
      created_at: nowIso,
      date: nowIso,
      published_at: nowIso,
      updated_at: nowIso,
      read_time: '3 min read',
      is_breaking: false,
      is_new: true,
      category: 'General',
      is_pinned: false,
      sync_to_public: true
    };
    setNewsList(prev => [newItem, ...prev]);
    return newId;
  };

  const handleNewsChange = (id: string, field: string, value: any) => {
    setNewsList(prev => prev.map(n => {
      if (n.id !== id) return n;
      const updated: any = { ...n, [field]: value, updated_at: new Date().toISOString() };
      if (field === 'title' && (!n.slug || n.slug.startsWith('news-') || n.slug === 'new-news-item')) {
        updated.slug = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      }
      if (field === 'seo_title') {
        updated.meta_title = value;
      } else if (field === 'meta_title') {
        updated.seo_title = value;
      }
      if (field === 'seo_description') {
        updated.meta_description = value;
      } else if (field === 'meta_description') {
        updated.seo_description = value;
      }
      if (field === 'content') {
        updated.description_html = value;
      } else if (field === 'description_html') {
        updated.content = value;
      }
      if (field === 'logo_url') {
        updated.image_url = value;
      } else if (field === 'image_url') {
        updated.logo_url = value;
      }
      if (field === 'ceo_name') {
        updated.author = value;
      } else if (field === 'author') {
        updated.ceo_name = value;
      }
      if (field === 'date') {
        updated.published_at = value;
      } else if (field === 'published_at') {
        updated.date = value;
      }
      return updated;
    }));
  };

  const handleDeleteNews = (id: string) => {
    deletedNewsIdsRef.current.add(id);
    setNewsList(prev => prev.filter(n => n.id !== id));
  };

  // Categories
  const handleAddCategory = () => {
    const trimmed = newCatInput.trim();
    if (trimmed) {
      deletedCategoryNamesRef.current.delete(trimmed);
      if (!categoriesList.includes(trimmed)) {
        setCategoriesList(prev => [...prev, trimmed]);
      }
      setNewCatInput('');
    }
  };

  const handleRemoveCategory = (cat: string) => {
    deletedCategoryNamesRef.current.add(cat);
    setCategoriesList(prev => prev.filter(c => c !== cat));
  };

  // Videos
  const handleAddVideo = () => {
    const newId = Math.random().toString(36).substr(2, 9);
    setVideosList(prev => [{
      id: newId,
      slug: `video-${newId}`,
      title: 'New Video',
      youtube_url: '',
      url: '',
      thumbnail: '',
      description: '',
      seo_title: '',
      seo_description: '',
      seo_keywords: '',
      created_at: new Date().toISOString()
    }, ...prev]);
    return newId;
  };

  const handleDeleteVideo = (id: string) => {
    deletedVideoIdsRef.current.add(id);
    setVideosList(prev => prev.filter(v => v.id !== id));
  };

  const handleVideosChange = (id: string, field: string, value: any) => {
    setVideosList(prev => prev.map(v => {
      if (v.id !== id) return v;
      const updated: any = { ...v, [field]: value, updated_at: new Date().toISOString() };
      if (field === 'title' && (!v.slug || v.slug.startsWith('video-') || v.slug === 'new-video')) {
        updated.slug = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      }
      if (field === 'youtube_url' || field === 'url') {
        updated.youtube_url = value;
        updated.url = value;
        const videoIdMatch = String(value || '').match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|shorts\/|watch\?v=|watch\?.+&v=))([^&?/]+)/);
        if (videoIdMatch && videoIdMatch[1]) {
          updated.thumbnail = `https://img.youtube.com/vi/${videoIdMatch[1]}/hqdefault.jpg`;
        }
      }
      if (field === 'seo_title') {
        updated.meta_title = value;
      } else if (field === 'meta_title') {
        updated.seo_title = value;
      }
      if (field === 'seo_description') {
        updated.meta_description = value;
      } else if (field === 'meta_description') {
        updated.seo_description = value;
      }
      return updated;
    }));
  };

  // Website FAQs
  const handleAddWebsiteFaq = () => {
    setWebsiteFaqsList(prev => [{ question: 'New Question', answer: 'New Answer' }, ...prev]);
  };

  const handleRemoveWebsiteFaq = (index: number) => {
    setWebsiteFaqsList(prev => {
      const updated = [...prev];
      updated.splice(index, 1);
      return updated;
    });
  };

  const handleWebsiteFaqChange = (index: number, field: string, value: any) => {
    setWebsiteFaqsList(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  // Quick Links
  const handleAddQuickLink = () => {
    setQuickLinksList(prev => [{ title: 'New Link', subtitle: 'Description', icon: 'compass', color: 'blue', url: '/' }, ...prev]);
  };

  const handleRemoveQuickLink = (index: number) => {
    setQuickLinksList(prev => {
      const updated = [...prev];
      updated.splice(index, 1);
      return updated;
    });
  };

  const handleQuickLinkChange = (index: number, field: string, value: any) => {
    setQuickLinksList(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  // Developers
  const handleAddDeveloper = () => {
    setDevelopersList(prev => [{ name: 'New Developer', role: 'Role', image_url: '', github: '', twitter: '', bio: '' }, ...prev]);
  };

  const handleRemoveDeveloper = (index: number) => {
    setDevelopersList(prev => {
      const updated = [...prev];
      updated.splice(index, 1);
      return updated;
    });
  };

  const handleDeveloperChange = (index: number, field: string, value: any) => {
    setDevelopersList(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  return {
    newsList, setNewsList,
    banners, setBanners,
    videosList, setVideosList,
    categoriesList, setCategoriesList,
    quickLinksList, setQuickLinksList,
    websiteFaqsList, setWebsiteFaqsList,
    developersList, setDevelopersList,
    newCatInput, setNewCatInput,
    handleAddBanner, handleBannerChange, handleDeleteBanner, handleClearAllBanners,
    handleAddNews, handleNewsChange, handleDeleteNews,
    handleAddCategory, handleRemoveCategory,
    handleAddVideo, handleDeleteVideo, handleVideosChange,
    handleAddWebsiteFaq, handleRemoveWebsiteFaq, handleWebsiteFaqChange,
    handleAddQuickLink, handleRemoveQuickLink, handleQuickLinkChange,
    handleAddDeveloper, handleRemoveDeveloper, handleDeveloperChange
  };
};
