import { useCallback, useEffect, useState } from 'react';

export const READING_THEMES = [
  { id: 'dark', label: 'Темна' },
  { id: 'sepia', label: 'Сепія' },
  { id: 'light', label: 'Світла' },
] as const;

export type ReadingTheme = (typeof READING_THEMES)[number]['id'];

const KEY = 'vrw:reading-theme';

function read(): ReadingTheme {
  if (typeof localStorage === 'undefined') return 'dark';
  const saved = localStorage.getItem(KEY);
  return READING_THEMES.some((t) => t.id === saved) ? (saved as ReadingTheme) : 'dark';
}

/**
 * Тема колонки читання. Живе в localStorage, а не в базі: вибір залежить від
 * освітлення і пристрою, а не від людини, тож переносити його між пристроями
 * було б радше шкідливо.
 */
export function useReadingTheme() {
  const [theme, setTheme] = useState<ReadingTheme>(read);

  useEffect(() => {
    localStorage.setItem(KEY, theme);
  }, [theme]);

  const cycle = useCallback(() => {
    setTheme((prev) => {
      const i = READING_THEMES.findIndex((t) => t.id === prev);
      return READING_THEMES[(i + 1) % READING_THEMES.length].id;
    });
  }, []);

  return { theme, setTheme, cycle };
}
