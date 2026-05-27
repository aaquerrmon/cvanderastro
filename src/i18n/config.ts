import es from './es.json';
import en from './en.json';

export const languages = {
  es: 'Español',
  en: 'English'
} as const;

export const defaultLanguage = 'es';

export const translations = {
  es,
  en
} as const;

export type Language = keyof typeof translations;

export function getTranslation(lang: Language, key: string): string {
  const keys = key.split('.');
  let current: any = translations[lang];

  for (const k of keys) {
    current = current?.[k];
  }

  return current ?? key;
}

export function useTranslation(lang: Language) {
  return (key: string): string => getTranslation(lang, key);
}
