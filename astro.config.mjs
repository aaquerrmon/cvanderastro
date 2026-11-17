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
  // Con prefixDefaultLocale las rutas de archivo sin prefijo dan 404 en Astro 6,
  // así que /mcp se resuelve como redirect antes del router i18n.
  redirects: {
    '/mcp': '/es/mcp'
  },
  env: {
    schema: {
      PUBLIC_URL: envField.string({context: "client", access: "public", default: "http://localhost:4321"}),
      PUBLIC_MCP_KEY_HASH: envField.string({context: "client", access: "public", optional: true}),
      GITHUB_TOKEN: envField.string({context: "server", access: "secret"})
    }
  },
  vite: {
    server: {allowedHosts: true},
    plugins: [tailwindcss()]
  }
});