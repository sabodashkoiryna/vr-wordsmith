import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { signUp, confirmSignUp, resendSignUpCode } from 'aws-amplify/auth';
import AuthShell, { AuthLink } from '../../features/auth/AuthShell';
import Field from '../../ui/Field';
import Button from '../../ui/Button';

type Step = 'form' | 'confirm' | 'done';

export default function SignUpPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('form');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSignUp(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await signUp({
        username: email,
        password,
        options: { userAttributes: { email, name: fullName } },
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
      if (nextStep.signUpStep === 'DONE') setStep('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не вдалося підтвердити код.');
    } finally {
      setBusy(false);
    }
  }

  async function handleResend() {
    setError(null);
    setNotice(null);
    try {
      await resendSignUpCode({ username: email });
      setNotice('Код надіслано ще раз.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не вдалося надіслати код.');
    }
  }

  if (step === 'done') {
    return (
      <AuthShell
        eyebrow="Готово"
        title="Акаунт підтверджено"
        subtitle="Тепер можете увійти й почати з першого модуля."
      >
        <Button size="lg" className="w-full" onClick={() => navigate('/login')}>
          Увійти
        </Button>
      </AuthShell>
    );
  }

  if (step === 'confirm') {
    return (
      <AuthShell
        eyebrow="Крок 2 з 2"
        title="Підтвердіть email"
        subtitle={`Ми надіслали код підтвердження на ${email}. Якщо листа немає — перевірте теку «Спам».`}
        footer={
          <button
            type="button"
            onClick={handleResend}
            className="cursor-pointer border-none bg-transparent p-0 text-violet-300 underline-offset-4 hover:underline"
          >
            Надіслати код ще раз
          </button>
        }
      >
        <form className="flex flex-col gap-5" onSubmit={handleConfirm}>
          <Field
            label="КОД ПІДТВЕРДЖЕННЯ"
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
            error={error}
            hint={notice ?? undefined}
          />
          <Button type="submit" size="lg" disabled={busy} className="w-full">
            {busy ? 'Перевіряємо…' : 'Підтвердити'}
          </Button>
        </form>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="Крок 1 з 2"
      title="Створити акаунт"
      subtitle="Реєстрація безкоштовна. Прогрес і бали зберігаються, курс проходиться у власному темпі."
      footer={
        <>
          Вже є акаунт? <AuthLink to="/login">Увійти</AuthLink>
        </>
      }
    >
      <form className="flex flex-col gap-5" onSubmit={handleSignUp}>
        <Field
          label="ІМ'Я ТА ПРІЗВИЩЕ"
          autoComplete="name"
          required
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          hint="Саме так ваше ім'я буде вказано в сертифікаті."
        />
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
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          hint="Мінімум 8 символів: великі й малі букви, цифра та спецсимвол."
          error={error}
        />
        <Button type="submit" size="lg" disabled={busy} className="mt-1 w-full">
          {busy ? 'Реєструємо…' : 'Зареєструватися'}
        </Button>
      </form>
    </AuthShell>
  );
}
