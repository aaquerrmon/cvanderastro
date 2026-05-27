import defaultTheme from 'tailwindcss/defaultTheme'; // Corregido el path de importación

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  darkMode: 'class', // ¡Esto está perfecto para que funcione el botón!
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', ...defaultTheme.fontFamily.sans], // Simplificado sin el .theme repetido
      },
      // Nota: No necesitas redeclarar slate, blue y purple aquí si solo vas a usar los por defecto, 
      // ya que Tailwind los incluye automáticamente. Pero si quieres asegurar su extensión, se hace así:
      colors: {
        slate: defaultTheme.colors.slate,
        blue: defaultTheme.colors.blue,
        purple: defaultTheme.colors.purple,
      },
    },
  },
};