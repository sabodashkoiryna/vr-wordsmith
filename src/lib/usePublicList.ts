import { useEffect, useState } from 'react';
import { client } from './amplify-client';
import { usePublicAuthMode } from './publicAuthMode';

type Listable = { list: (opts?: Record<string, unknown>) => Promise<{ data: unknown[]; errors?: { message: string }[] | null }> };

/**
 * Читання PUBLIC-моделі з правильним authMode.
 *
 * Обгортка навмисна: кожна публічна модель мусить іти через usePublicAuthMode
 * (гість — identityPool, залогінений — userPool). Пропустиш один виклик — і
 * Unauthorized отримає або гість, або адмін, причому асиметрично: якщо
 * тестувати лише залогіненим, помилку не побачиш. Хук робить це правило
 * неможливим забути.
 *
 * `fallback` рендериться миттєво, доки дані летять, — тому лендінг не блимає
 * порожніми секціями й не чекає на мережу для першого малювання.
 */
export function usePublicList<T>(
  model: unknown,
  options?: { sortBy?: keyof T; filter?: (item: T) => boolean; fallback?: T[] },
) {
  const authOpts = usePublicAuthMode();
  const [items, setItems] = useState<T[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authOpts === null) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await (model as Listable).list(authOpts);
        if (cancelled) return;
        if (res.errors?.length) throw new Error(res.errors.map((e) => e.message).join('; '));
        let data = res.data as T[];
        if (options?.filter) data = data.filter(options.filter);
        if (options?.sortBy) {
          const key = options.sortBy;
          data = [...data].sort((a, b) => Number(a[key] ?? 0) - Number(b[key] ?? 0));
        }
        setItems(data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Помилка завантаження');
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authOpts]);

  // Доки даних немає — віддаємо запасний контент, якщо він переданий.
  return { items: items ?? options?.fallback ?? null, loaded: items !== null, error };
}

export { client };
