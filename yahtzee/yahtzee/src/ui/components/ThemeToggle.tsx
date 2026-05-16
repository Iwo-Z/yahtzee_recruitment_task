import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark';
const KEY = 'yahtzee-kosci:theme';

function readInitial(): Theme {
  if (typeof window === 'undefined') return 'light';
  const stored = window.localStorage.getItem(KEY);
  if (stored === 'light' || stored === 'dark') return stored;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * Przełącznik motywu — pomarańcz/grafit. Wybór trafia do localStorage,
 * a `data-theme` na `<html>` triggeruje wszystkie reguły CSS w `styles.css`.
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(readInitial);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      window.localStorage.setItem(KEY, theme);
    } catch {
      // localStorage może być wyłączony — ignorujemy
    }
  }, [theme]);

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))}
      aria-label={`Zmień motyw na ${theme === 'light' ? 'ciemny' : 'jasny'}`}
      title={theme === 'light' ? 'Tryb ciemny' : 'Tryb jasny'}
    >
      {theme === 'light' ? '🌙' : '☀️'}
    </button>
  );
}
