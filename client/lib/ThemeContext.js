'use client';
import { createContext, useContext, useState } from 'react';

const ThemeContext = createContext({ theme: 'dark', toggleTheme: () => {} });

const getInitialTheme = () => {
  if (typeof window === 'undefined') return 'dark';
  return document.documentElement.dataset.theme || 'dark';
};

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(getInitialTheme);

  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = next;
      try {
        localStorage.setItem('theme', next);
      } catch (e) {
        // localStorage unavailable
      }
      return next;
    });
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
