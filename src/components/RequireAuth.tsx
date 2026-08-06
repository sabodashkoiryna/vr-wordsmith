import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '../context/AuthContext';

export default function RequireAuth({ children }: { children: ReactNode }) {
  const { loading, userId } = useAuth();
  const location = useLocation();

  if (loading) return <p className="instr-note">Перевірка доступу…</p>;
  if (!userId) return <Navigate to="/login" state={{ from: location }} replace />;

  return <>{children}</>;
}
