import { useState } from 'react';
import type { FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AuthShell, { AuthLink } from '../../features/auth/AuthShell';
import Field from '../../ui/Field';
import Button from '../../ui/Button';

export default function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await signIn(email, password);
      const from = (location.state as { from?: { pathname?: string } })?.from;
      navigate(from?.pathname ?? '/learn', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не вдалося увійти.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      eyebrow="Вхід"
      title="З поверненням"
      subtitle="Увійдіть, щоб продовжити навчання з того місця, де зупинились."
      footer={
        <>
          Ще немає акаунту? <AuthLink to="/signup">Зареєструватися безкоштовно</AuthLink>
        </>
      }
    >
      <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
        <Field
          label="EMAIL"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Field
          label="ПАРОЛЬ"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={error}
        />
        <Button type="submit" size="lg" disabled={busy} className="mt-1 w-full">
          {busy ? 'Входимо…' : 'Увійти'}
        </Button>
      </form>
    </AuthShell>
  );
}
