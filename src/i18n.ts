import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en/translation.json';
import es from './locales/es/translation.json';
import fr from './locales/fr/translation.json';
import de from './locales/de/translation.json';
import ar from './locales/ar/translation.json';
import zh from './locales/zh/translation.json';
import hi from './locales/hi/translation.json';

const resources = {
  en: { translation: en },
  es: { translation: es },
  fr: { translation: fr },
  de: { translation: de },
  ar: { translation: ar },
  zh: { translation: zh },
  hi: { translation: hi },
};

const savedLang = typeof window !== 'undefined' ? localStorage.getItem('lang') : null;
const initialLng = savedLang || 'en';

i18n.use(initReactI18next).init({
  resources,
  lng: initialLng,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

// ensure document direction is correct on load
if (typeof document !== 'undefined') {
  document.documentElement.dir = initialLng === 'ar' ? 'rtl' : 'ltr';
}

// persist changes and toggle RTL when language changes
i18n.on('languageChanged', (lng) => {
  try {
    localStorage.setItem('lang', lng);
    if (typeof document !== 'undefined') {
      document.documentElement.dir = lng === 'ar' ? 'rtl' : 'ltr';
    }
  } catch (e) {
    // ignore storage errors
  }
});

export default i18n;
