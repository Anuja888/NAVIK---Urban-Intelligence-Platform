// ── useTheme — persisted light/dark toggle ─────────────────
import { useState, useEffect, useCallback } from 'react';

export type Theme = 'light' | 'dark';

const KEY = 'navik-theme';

function applyTheme(t: Theme, present: boolean) {
  document.documentElement.setAttribute('data-theme', t);
  document.documentElement.setAttribute('data-present', String(present));
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    try {
      const stored = localStorage.getItem(KEY) as Theme | null;
      if (stored === 'light' || stored === 'dark') return stored;
    } catch { /* ignore */ }
    return 'light';
  });

  const [present, setPresentState] = useState(false);

  // Apply on mount and whenever theme/present changes
  useEffect(() => {
    applyTheme(theme, present);
  }, [theme, present]);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    try { localStorage.setItem(KEY, t); } catch { /* ignore */ }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  }, [theme, setTheme]);

  const togglePresent = useCallback(() => {
    setPresentState((p) => !p);
  }, []);

  return { theme, toggleTheme, present, togglePresent };
}
