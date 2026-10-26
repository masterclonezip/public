import React from 'react';
import { Link } from 'react-router-dom';
import { 
  LayoutGrid, 
  PlusCircle, 
  Tag, 
  Newspaper, 
  Video, 
  User, 
  Users, 
  Headphones, 
  Gamepad2, 
  FileText, 
  ShieldCheck, 
  Scale, 
  Gavel, 
  AlertTriangle,
  CheckCircle2,
  Facebook, 
  Instagram, 
  Twitter, 
  Linkedin, 
  Youtube 
} from 'lucide-react';
import { useData } from '../../contexts/DataContextPublic';
import { getOptimizedImageUrl } from '../../seo/utils';

export function PublicFooter() {
  const { settings } = useData();
  const siteTitle = settings?.site_title || '';

  const directoryLinks = [
    { label: 'All Apps', to: '/', icon: LayoutGrid },
    { label: 'New Apps', to: '/new-apps', icon: PlusCircle },
    { label: 'Categories', to: '/categories', icon: Tag },
    { label: 'Industry News', to: '/news', icon: Newspaper },
    { label: 'Video Reviews', to: '/videos', icon: Video },
  ];

  const complianceLinks = [
    { label: 'Privacy Policy', to: '/privacy', icon: ShieldCheck },
    { label: 'Terms of Service', to: '/terms', icon: FileText },
    { label: 'Ethics Policy', to: '/ethics', icon: Scale },
    { label: 'Legal Notice', to: '/notice', icon: Gavel },
    { label: 'Disclaimer', to: '/disclaimer', icon: AlertTriangle },
  ];

  const companyLinks = [
    { label: 'About Us', to: '/about', icon: User },
    { label: 'Developer Team', to: '/developers', icon: Users },
    { label: 'Contact Support', to: '/contact', icon: Headphones },
    { label: 'Responsible Gaming', to: '/responsibility', icon: Gamepad2 },
    { label: 'Report / DMCA', to: '/report-removal', icon: FileText },
  ];

  return (
    <footer suppressHydrationWarning={true} className="w-full mt-8 sm:mt-12 bg-zinc-100 dark:bg-[#060913] text-zinc-600 dark:text-zinc-400 border-t border-zinc-200 dark:border-white/[0.08] transition-colors select-none">
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        
        {/* Brand Header Line */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4 pb-5 border-b border-zinc-200/80 dark:border-white/[0.08] mb-5 sm:mb-6">
          <div className="flex items-center gap-2.5 flex-wrap">
            <Link 
              to="/" 
              className="text-lg sm:text-xl font-black tracking-tight text-zinc-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors inline-flex items-center gap-2"
              aria-label={`${siteTitle || 'Homepage'}`}
            >
              {settings?.logo_url && (
                <img
                  src={getOptimizedImageUrl(settings.logo_url, 80)}
                  width={28}
                  height={28}
                  loading="lazy"
                  decoding="async"
                  alt={`${siteTitle || 'Official'} Logo`}
                  className="w-6 h-6 sm:w-7 sm:h-7 object-contain shrink-0"
                />
              )}
              <span>{siteTitle}</span>
            </Link>

            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 text-blue-700 dark:text-blue-400 text-[10px] font-bold tracking-wider uppercase">
              <CheckCircle2 className="w-3 h-3 text-blue-600 dark:text-cyan-400 shrink-0" />
              <span>Verified</span>
            </span>
          </div>

          <p className="text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400 leading-snug">
            Independent application transparency, safety benchmarking, and reviews.
          </p>
        </div>

        {/* Compact 3-Column Navigation Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-5 sm:gap-8 mb-6 sm:mb-8 text-left">
          
          {/* Column 1: Directory */}
          <div className="flex flex-col gap-1.5">
            <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
              <span>Directory</span>
            </h3>
            {directoryLinks.map((item, idx) => {
              const IconComponent = item.icon;
              return (
                <Link
                  key={`dir-${idx}`}
                  to={item.to}
                  className="inline-flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-white py-0.5 transition-colors group"
                >
                  <IconComponent className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 group-hover:text-cyan-500 dark:group-hover:text-cyan-400 transition-colors shrink-0" />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Column 2: Compliance & Legal */}
          <div className="flex flex-col gap-1.5">
            <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>Compliance</span>
            </h3>
            {complianceLinks.map((item, idx) => {
              const IconComponent = item.icon;
              return (
                <Link
                  key={`comp-${idx}`}
                  to={item.to}
                  className="inline-flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-white py-0.5 transition-colors group"
                >
                  <IconComponent className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 group-hover:text-emerald-500 dark:group-hover:text-emerald-400 transition-colors shrink-0" />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Column 3: Company */}
          <div className="flex flex-col gap-1.5 col-span-2 sm:col-span-1">
            <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
              <span>Company</span>
            </h3>
            {companyLinks.map((item, idx) => {
              const IconComponent = item.icon;
              return (
                <Link
                  key={`comp-co-${idx}`}
                  to={item.to}
                  className="inline-flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-white py-0.5 transition-colors group"
                >
                  <IconComponent className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 group-hover:text-purple-500 dark:group-hover:text-purple-400 transition-colors shrink-0" />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>

        </div>

        {/* Bottom Bar: Copyright & Social Links */}
        <div className="pt-4 border-t border-zinc-200/80 dark:border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-500 text-center sm:text-left">
            &copy; {new Date().getFullYear()} <span className="font-semibold text-zinc-700 dark:text-zinc-300">{siteTitle}</span>. All rights reserved.
          </p>

          <div className="flex items-center gap-2.5">
            {settings?.social_links?.facebook ? (
              <a 
                aria-label="Facebook" 
                href={settings.social_links.facebook} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="w-7 h-7 rounded-full bg-zinc-200 dark:bg-white/[0.06] hover:bg-blue-600 text-zinc-600 dark:text-zinc-300 hover:text-white flex items-center justify-center transition-all"
              >
                <Facebook className="w-3.5 h-3.5 fill-current" />
              </a>
            ) : (
              <a 
                aria-label="Facebook" 
                href="https://facebook.com" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="w-7 h-7 rounded-full bg-zinc-200 dark:bg-white/[0.06] hover:bg-blue-600 text-zinc-600 dark:text-zinc-300 hover:text-white flex items-center justify-center transition-all"
              >
                <Facebook className="w-3.5 h-3.5 fill-current" />
              </a>
            )}

            {settings?.social_links?.instagram ? (
              <a 
                aria-label="Instagram" 
                href={settings.social_links.instagram} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="w-7 h-7 rounded-full bg-zinc-200 dark:bg-white/[0.06] hover:bg-pink-600 text-zinc-600 dark:text-zinc-300 hover:text-white flex items-center justify-center transition-all"
              >
                <Instagram className="w-3.5 h-3.5" />
              </a>
            ) : (
              <a 
                aria-label="Instagram" 
                href="https://instagram.com" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="w-7 h-7 rounded-full bg-zinc-200 dark:bg-white/[0.06] hover:bg-pink-600 text-zinc-600 dark:text-zinc-300 hover:text-white flex items-center justify-center transition-all"
              >
                <Instagram className="w-3.5 h-3.5" />
              </a>
            )}

            {settings?.social_links?.youtube ? (
              <a 
                aria-label="YouTube" 
                href={settings.social_links.youtube} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="w-7 h-7 rounded-full bg-zinc-200 dark:bg-white/[0.06] hover:bg-red-600 text-zinc-600 dark:text-zinc-300 hover:text-white flex items-center justify-center transition-all"
              >
                <Youtube className="w-3.5 h-3.5 fill-current" />
              </a>
            ) : (
              <a 
                aria-label="YouTube" 
                href="https://youtube.com" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="w-7 h-7 rounded-full bg-zinc-200 dark:bg-white/[0.06] hover:bg-red-600 text-zinc-600 dark:text-zinc-300 hover:text-white flex items-center justify-center transition-all"
              >
                <Youtube className="w-3.5 h-3.5 fill-current" />
              </a>
            )}

            {settings?.social_links?.twitter && (
              <a 
                aria-label="Twitter" 
                href={settings.social_links.twitter} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="w-7 h-7 rounded-full bg-zinc-200 dark:bg-white/[0.06] hover:bg-sky-500 text-zinc-600 dark:text-zinc-300 hover:text-white flex items-center justify-center transition-all"
              >
                <Twitter className="w-3.5 h-3.5 fill-current" />
              </a>
            )}

            {settings?.social_links?.linkedin && (
              <a 
                aria-label="LinkedIn" 
                href={settings.social_links.linkedin} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="w-7 h-7 rounded-full bg-zinc-200 dark:bg-white/[0.06] hover:bg-blue-700 text-zinc-600 dark:text-zinc-300 hover:text-white flex items-center justify-center transition-all"
              >
                <Linkedin className="w-3.5 h-3.5 fill-current" />
              </a>
            )}
          </div>

        </div>

      </div>
    </footer>
  );
}

export default PublicFooter;
