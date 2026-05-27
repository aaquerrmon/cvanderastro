import { defineMiddleware } from 'astro:middleware';
import { defaultLanguage } from './i18n/config';

export const onRequest = defineMiddleware((context, next) => {
  // Get the language from the URL or use default
  const { url } = context;
  const pathname = new URL(url).pathname;

  // For now, we're storing language preference in localStorage on the client
  // The middleware just passes the current language to the context
  context.locals.language = defaultLanguage;

  return next();
});
