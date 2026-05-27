import { create } from 'zustand';

interface ThemeStore {
  isDark: boolean;
  setIsDark: (isDark: boolean) => void;
  toggleTheme: () => void;
  initTheme: () => void;
}

export const useThemeStore = create<ThemeStore>((set) => ({
  isDark: false,
  setIsDark: (isDark: boolean) => {
    set({ isDark });
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('theme', isDark ? 'dark' : 'light');
    }
    if (typeof document !== 'undefined') {
      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  },
  toggleTheme: () => {
    set((state) => {
      const newIsDark = !state.isDark;
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('theme', newIsDark ? 'dark' : 'light');
      }
      if (typeof document !== 'undefined') {
        if (newIsDark) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
      return { isDark: newIsDark };
    });
  },
  initTheme: () => {
    if (typeof localStorage !== 'undefined' && typeof document !== 'undefined') {
      const saved = localStorage.getItem('theme');
      const isDark = saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
      set({ isDark });
      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }
}));
