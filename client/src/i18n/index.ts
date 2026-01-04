import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { zh } from './locales/zh';
import { en } from './locales/en';

// Supported languages
export const SUPPORTED_LANGUAGES = {
  zh: { name: '中文', nativeName: '中文', flag: '🇨🇳' },
  en: { name: 'English', nativeName: 'English', flag: '🇺🇸' },
} as const;

export type SupportedLanguage = keyof typeof SUPPORTED_LANGUAGES;

// Initialize i18n
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      zh: { translation: zh },
      en: { translation: en },
    },
    fallbackLng: 'zh',
    supportedLngs: Object.keys(SUPPORTED_LANGUAGES),

    // Language detection options
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'werewolf-language',
    },

    interpolation: {
      escapeValue: false, // React already escapes values
    },

    // Debug mode (disable in production)
    debug: false,
  });

// Helper function to change language
export const changeLanguage = (lng: SupportedLanguage) => {
  i18n.changeLanguage(lng);
};

// Get current language
export const getCurrentLanguage = (): SupportedLanguage => {
  return i18n.language as SupportedLanguage;
};

export default i18n;
