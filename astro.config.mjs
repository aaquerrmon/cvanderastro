// @ts-check
import { defineConfig, envField } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  i18n: {
    locales: ['en', 'es'],
    defaultLocale: 'es',
    routing: {
      prefixDefaultLocale: true
    }
  },
  env: {
    schema: {
      PUBLIC_URL: envField.string({context: "client", access: "public", default: "http://localhost:4321"}),
    }
  },
  vite: {
    server: {allowedHosts: true},
    plugins: [tailwindcss()]
  }
});