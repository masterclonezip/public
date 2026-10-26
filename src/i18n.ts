import { useState, useEffect } from 'react';

// Dictionary of translations
const resources: Record<string, Record<string, string>> = {
  en: {
    "Home": "Home",
    "Apps": "Apps",
    "News": "News",
    "Videos": "Videos",
    "About": "About",
    "Contact": "Contact",
    "Search": "Search...",
    "Admin": "Admin",
    "All Apps": "All Apps",
    "Top Rated": "Top Rated",
    "New Releases": "New Releases",
    "Trending": "Trending",
    "Categories": "Categories",
    "Privacy Policy": "Privacy Policy",
    "Terms of Service": "Terms of Service",
  },
  es: {
    "Home": "Inicio",
    "Apps": "Aplicaciones",
    "News": "Noticias",
    "Videos": "Videos",
    "About": "Acerca de",
    "Contact": "Contacto",
    "Search": "Buscar...",
    "Admin": "Administración",
    "All Apps": "Todas las Aplicaciones",
    "Top Rated": "Mejor Valoradas",
    "New Releases": "Nuevos Lanzamientos",
    "Trending": "Tendencias",
    "Categories": "Categorías",
    "Privacy Policy": "Política de Privacidad",
    "Terms of Service": "Términos de Servicio",
  },
  fr: {
    "Home": "Accueil",
    "Apps": "Applications",
    "News": "Nouvelles",
    "Videos": "Vidéos",
    "About": "À propos",
    "Contact": "Contact",
    "Search": "Rechercher...",
    "Admin": "Administrateur",
    "All Apps": "Toutes les Applications",
    "Top Rated": "Les Mieux Notées",
    "New Releases": "Nouvelles Sorties",
    "Trending": "Tendances",
    "Categories": "Catégories",
    "Privacy Policy": "Politique de Confidentialité",
    "Terms of Service": "Conditions d'Utilisation",
  },
  hi: {
    "Home": "होम",
    "Apps": "ऐप्स",
    "News": "समाचार",
    "Videos": "वीडियो",
    "About": "के बारे में",
    "Contact": "संपर्क करें",
    "Search": "खोजें...",
    "Admin": "व्यवस्थापक",
    "All Apps": "सभी ऐप्स",
    "Top Rated": "शीर्ष रेटेड",
    "New Releases": "नई रिलीज़",
    "Trending": "रुझान",
    "Categories": "श्रेणियाँ",
    "Privacy Policy": "गोपनीयता नीति",
    "Terms of Service": "सेवा की शर्तें",
  }
};

let currentLanguage = 'en';
if (typeof window !== 'undefined') {
  try {
    currentLanguage = localStorage.getItem('i18nextLng') || 'en';
  } catch (_) {}
}

const listeners = new Set<(lang: string) => void>();

export const i18n = {
  language: currentLanguage,
  resolvedLanguage: currentLanguage,
  changeLanguage: (lng: string) => {
    currentLanguage = lng;
    i18n.language = lng;
    i18n.resolvedLanguage = lng;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('i18nextLng', lng);
      } catch (_) {}
    }
    listeners.forEach(fn => fn(lng));
    return Promise.resolve();
  },
  t: (key: string) => {
    const dict = resources[currentLanguage] || resources['en'] || {};
    return dict[key] || key;
  },
  use: () => i18n,
  init: () => Promise.resolve(),
};

export function useTranslation() {
  const [, setLang] = useState(currentLanguage);

  useEffect(() => {
    const handler = (newLang: string) => setLang(newLang);
    listeners.add(handler);
    return () => {
      listeners.delete(handler);
    };
  }, []);

  const t = (key: string) => {
    const dict = resources[currentLanguage] || resources['en'] || {};
    return dict[key] || key;
  };

  return { t, i18n };
}

export const initReactI18next = {
  type: '3rdParty',
  init: () => {},
};

export default i18n;
