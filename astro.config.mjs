// @ts-check
import { defineConfig, envField } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  adapter: cloudflare(),
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
      GITHUB_TOKEN: envField.string({context: "server", access: "secret"})
    }
  },
  vite: {
    server: {allowedHosts: true},
    plugins: [tailwindcss()]
  }
});