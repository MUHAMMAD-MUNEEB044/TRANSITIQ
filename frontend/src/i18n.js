import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import ur from './locales/ur.json';

const STORAGE_KEY = 'transitiq_lang';
const savedLang = localStorage.getItem(STORAGE_KEY) || 'en';

export const applyLanguageDirection = (lang) => {
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'ur' ? 'rtl' : 'ltr';
  document.body.classList.toggle('font-urdu', lang === 'ur');
};

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ur: { translation: ur },
  },
  lng: savedLang,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

applyLanguageDirection(savedLang);

export const changeLanguage = (lang) => {
  localStorage.setItem(STORAGE_KEY, lang);
  applyLanguageDirection(lang);
  return i18n.changeLanguage(lang);
};

export default i18n;
