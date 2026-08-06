import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signUp, confirmSignUp } from 'aws-amplify/auth';

type Step = 'form' | 'confirm' | 'done';

export default function SignUpPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('form');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSignUp(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await signUp({
        username: email,
        password,
        options: {
          userAttributes: { email, name: fullName },
        },
      });
      setStep('confirm');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не вдалося зареєструватися.');
    } finally {
      setBusy(false);
    }
  }

  async function handleConfirm(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const { nextStep } = await confirmSignUp({ username: email, confirmationCode: code });
      if (nextStep.signUpStep === 'DONE') {
        setStep('done');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не вдалося підтвердити код.');
    } finally {
      setBusy(false);
    }
  }

  if (step === 'done') {
    return (
      <section className="page">
        <div className="eyebrow">Реєстрація</div>
        <h2>Акаунт підтверджено</h2>
        <p className="instr-note">Тепер можете увійти зі своїм email і паролем.</p>
        <button className="btn primary" onClick={() => navigate('/login')}>
          До входу
        </button>
      </section>
    );
  }

  if (step === 'confirm') {
    return (
      <section className="page">
        <div className="eyebrow">Реєстрація</div>
        <h2>Підтвердження email</h2>
        <p className="instr-note">Ми надіслали код підтвердження на {email}. Введіть його нижче.</p>
        <form className="authform" onSubmit={handleConfirm}>
          <label>
            Код підтвердження
            <input required value={code} onChange={(e) => setCode(e.target.value)} />
          </label>
          {error && <p className="error">{error}</p>}
          <button className="btn primary" type="submit" disabled={busy}>
            {busy ? 'Перевірка…' : 'Підтвердити'}
          </button>
        </form>
      </section>
    );
  }

  return (
    <section className="page">
      <div className="eyebrow">Реєстрація</div>
      <h2>Створити акаунт</h2>
      <form className="authform" onSubmit={handleSignUp}>
        <label>
          Ім'я
          <input required value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </label>
        <label>
          Email
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label>
          Пароль
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <span className="hint">Мінімум 8 символів, великі й малі букви, цифра, символ.</span>
        </label>
        {error && <p className="error">{error}</p>}
        <button className="btn primary" type="submit" disabled={busy}>
          {busy ? 'Реєстрація…' : 'Зареєструватися'}
        </button>
        <p className="hint">
          Вже є акаунт? <Link to="/login">Увійти</Link>
        </p>
      </form>
    </section>
  );
}
