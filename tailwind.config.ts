import defaultTheme from 'tailwindcss/defaultTheme';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['InterVariable', 'Inter', ...defaultTheme.fontFamily.sans],
        mono: ['JetBrains Mono', 'Fira Code', ...defaultTheme.fontFamily.mono],
      },
      colors: {
        devpro: {
          bg: '#0a0a0f',
          card: '#12121e',
          border: '#1e1e2e',
          cyan: '#06b6d4',
          emerald: '#10b981',
          purple: '#8b5cf6',
          pink: '#ec4899',
          terminal: '#22c55e',
        },
      },
    },
  },
};
