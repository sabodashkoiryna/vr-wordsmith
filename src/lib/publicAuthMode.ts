import { useAuth } from '../context/AuthContext';

// Публічний контент (Module, MatrixRow, ...) дозволено читати і гостям,
// і будь-кому залогіненому — але різними шляхами: гість іде через
// identityPool (IAM unauth-роль), залогінений — через звичний userPool
// (JWT), бо групові IAM-ролі (напр. Admins) прав на AppSync не мають.
// Повертає null, доки стан автентифікації ще не визначено — виклику
// краще почекати, інакше можна на мить піти в identityPool для того,
// хто вже залогінений.
export function usePublicAuthMode(): { authMode: 'identityPool' } | Record<string, never> | null {
  const { loading, userId } = useAuth();
  if (loading) return null;
  return userId ? {} : { authMode: 'identityPool' };
}
