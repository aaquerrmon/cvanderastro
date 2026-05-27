import { create } from 'zustand';
import { defaultLanguage } from '../i18n/config';

interface LanguageStore {
  language: 'es' | 'en';
  setLanguage: (lang: 'es' | 'en') => void;
  initLanguage: () => void;
}

export const useLanguageStore = create<LanguageStore>((set) => ({
  language: defaultLanguage,
  setLanguage: (lang: 'es' | 'en') => {
    set({ language: lang });
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('language', lang);
    }
  },
  initLanguage: () => {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('language');
      const lang = (saved === 'es' || saved === 'en') ? saved : defaultLanguage;
      set({ language: lang });
    }
  }
}));
