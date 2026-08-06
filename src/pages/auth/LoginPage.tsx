import { useState } from 'react';
import type { FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

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
      const from = (location.state as { from?: Location })?.from;
      navigate(from ? `${from.pathname}` : '/admin', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не вдалося увійти.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="page">
      <div className="eyebrow">Вхід</div>
      <h2>Вхід до акаунту</h2>
      <form className="authform" onSubmit={handleSubmit}>
        <label>
          Email
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label>
          Пароль
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {error && <p className="error">{error}</p>}
        <button className="btn primary" type="submit" disabled={busy}>
          {busy ? 'Входимо…' : 'Увійти'}
        </button>
      </form>
    </section>
  );
}
