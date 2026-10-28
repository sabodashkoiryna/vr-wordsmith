import { useMemo } from 'react';
import { useAuth } from '../context/AuthContext';

export type PublicAuthOpts = { authMode: 'identityPool' } | Record<string, never> | null;

// Публічний контент (Module, MatrixRow, ...) дозволено читати і гостям,
// і будь-кому залогіненому — але різними шляхами: гість іде через
// identityPool (IAM unauth-роль), залогінений — через звичний userPool
// (JWT), бо групові IAM-ролі (напр. Admins) прав на AppSync не мають.
// Повертає null, доки стан автентифікації ще не визначено — виклику
// краще почекати, інакше можна на мить піти в identityPool для того,
// хто вже залогінений.
//
// useMemo тут ОБОВ'ЯЗКОВИЙ, а не оптимізація. Результат майже всюди йде в
// залежності useEffect; новий об'єкт на кожен рендер означає, що ефект
// перезапускається після кожного setState, який сам же й викликав, —
// нескінченний цикл запитів. Саме так сторінка перевірки сертифіката
// зависала на «Перевіряємо…», встигнувши зробити 225 запитів за 6 секунд.
export function usePublicAuthMode(): PublicAuthOpts {
  const { loading, userId } = useAuth();
  return useMemo((): PublicAuthOpts => {
    if (loading) return null;
    if (userId) return {};
    return { authMode: 'identityPool' };
  }, [loading, userId]);
}
