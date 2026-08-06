import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '../context/AuthContext';

export default function RequireAdmin({ children }: { children: ReactNode }) {
  const { loading, userId, isAdmin } = useAuth();
  const location = useLocation();

  if (loading) return <p className="instr-note">Перевірка доступу…</p>;
  if (!userId) return <Navigate to="/login" state={{ from: location }} replace />;
  if (!isAdmin) return <Navigate to="/" replace />;

  return <>{children}</>;
}
