import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Button from '../../ui/Button';
import { client } from '../../lib/amplify-client';
import { usePublicAuthMode } from '../../lib/publicAuthMode';
import CertificateDocument, { type CertificateData } from './CertificateDocument';

type Check = {
  found: boolean;
  revoked?: boolean | null;
  certificateNumber?: string | null;
  studentFullName?: string | null;
  courseTitle?: string | null;
  hours?: number | null;
  totalPoints?: number | null;
  maxPoints?: number | null;
  issuedAt?: string | null;
};

/**
 * Публічна перевірка сертифіката.
 *
 * Відкрита гостю навмисно — у цьому весь сенс коду на документі. Дані йдуть
 * не з моделі, а через запит до Lambda: правило доступу діє на рівні моделі,
 * тож дозвіл гостю читати `Certificate` відкрив би йому ВЕСЬ список.
 *
 * Гість ходить через identityPool, залогінений — через userPool. Пропустити
 * `usePublicAuthMode` тут не можна: сторінку відкриває і той, і той, а збій
 * асиметричний — перевіряючи лише залогіненим, його не побачиш.
 */
export default function VerifyPage() {
  const { code: codeParam } = useParams();
  const navigate = useNavigate();
  const authOpts = usePublicAuthMode();
  const [code, setCode] = useState(codeParam ?? '');
  const [result, setResult] = useState<Check | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const check = useCallback(
    async (value: string) => {
      if (authOpts === null || !value.trim()) return;
      setLoading(true);
      setError(null);
      setResult(null);
      try {
        const res = await client.queries.verifyCertificate({ code: value.trim() }, authOpts);
        if (res.errors?.length) throw new Error(res.errors.map((e) => e.message).join('; '));
        setResult((res.data ?? { found: false }) as Check);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Не вдалося перевірити');
      } finally {
        setLoading(false);
      }
    },
    [authOpts],
  );

  useEffect(() => {
    if (codeParam) void check(codeParam);
  }, [codeParam, check]);

  const doc: CertificateData | null =
    result?.found && result.certificateNumber
      ? {
          certificateNumber: result.certificateNumber,
          verificationCode: code.trim().toUpperCase(),
          studentFullName: result.studentFullName ?? '',
          courseTitle: result.courseTitle ?? '',
          hours: result.hours ?? null,
          totalPoints: result.totalPoints ?? 0,
          maxPoints: result.maxPoints ?? 100,
          issuedAt: result.issuedAt ?? new Date().toISOString(),
        }
      : null;

  return (
    <section className="container-content py-14 md:py-20">
      <div className="font-mono text-2xs tracking-widest text-violet-300">Перевірка сертифіката</div>
      <h1 className="mt-3 text-3xl text-ink">Чи справжній цей документ</h1>
      <p className="mt-3 max-w-2xl text-ink-soft">
        Введіть код, надрукований на сертифікаті. Перевірка не потребує входу й не показує
        нічого, крім того, що вже є на самому документі.
      </p>

      <form
        className="mt-8 flex max-w-xl flex-wrap gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          navigate(`/certificate/verify/${encodeURIComponent(code.trim().toUpperCase())}`);
          void check(code);
        }}
      >
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="НАПРИКЛАД 4VH3ABOMHH"
          aria-label="Код перевірки"
          className="min-w-[240px] flex-1 rounded-[var(--radius-sm)] border border-[var(--line-strong)] bg-space-900/60 px-4 py-3 font-mono text-md tracking-[0.12em] text-ink placeholder:text-ink-dim focus:border-cyan-400 focus:outline-none"
        />
        <Button type="submit" disabled={loading || !code.trim()}>
          {loading ? 'Перевіряємо…' : 'Перевірити'}
        </Button>
      </form>

      {error && <p className="mt-6 text-sm text-danger">{error}</p>}

      {result && !result.found && (
        <div className="mt-8 max-w-xl rounded-[var(--radius-lg)] bg-space-800 p-6">
          <div className="font-mono text-2xs tracking-widest text-danger">НЕ ЗНАЙДЕНО</div>
          <p className="mt-2 text-ink-soft">
            Сертифіката з таким кодом не існує. Перевірте, чи правильно переписано код —
            у ньому лише латинські літери й цифри.
          </p>
        </div>
      )}

      {result?.found && result.revoked && (
        <div className="mt-8 max-w-xl rounded-[var(--radius-lg)] bg-space-800 p-6">
          <div className="font-mono text-2xs tracking-widest text-danger">ВІДКЛИКАНО</div>
          <p className="mt-2 text-ink-soft">
            Такий сертифікат видавався, але був відкликаний. Він більше не підтверджує
            завершення курсу.
          </p>
        </div>
      )}

      {doc && !result?.revoked && (
        <>
          <div className="mt-8 max-w-xl rounded-[var(--radius-lg)] bg-space-800 p-6">
            <div className="font-mono text-2xs tracking-widest text-success">
              СПРАВЖНІЙ СЕРТИФІКАТ
            </div>
            <p className="mt-2 text-ink-soft">
              Виданий <b className="text-ink">{doc.studentFullName}</b>{' '}
              {new Date(doc.issuedAt).toLocaleDateString('uk-UA')}, результат {doc.totalPoints} з{' '}
              {doc.maxPoints} балів.
            </p>
          </div>

          <div className="mt-6 overflow-hidden rounded-[var(--radius-lg)] bg-white shadow-[var(--shadow-3)]">
            <CertificateDocument data={doc} />
          </div>
        </>
      )}
    </section>
  );
}
