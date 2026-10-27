import { useCallback, useEffect, useMemo, useState } from 'react';
import Button from '../../ui/Button';
import { client } from '../../lib/amplify-client';
import { unwrap } from '../../lib/unwrap';

type Slot = {
  id: string;
  number: string;
  status: string;
  certificateId: string | null;
  studentId: string | null;
  batchLabel: string | null;
};

type Cert = {
  id: string;
  certificateNumber: string;
  verificationCode: string;
  studentFullName: string;
  totalPoints: number;
  maxPoints: number;
  issuedAt: string;
  revokedAt: string | null;
};

/**
 * Пул номерів і видані сертифікати.
 *
 * Номери вносяться списком, бо беруться з реєстру закладу, а не вигадуються
 * системою. Видача забирає найменший вільний — тут його лише видно й можна
 * поповнити запас.
 */
export default function CertificatesAdmin() {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [certs, setCerts] = useState<Cert[]>([]);
  const [paste, setPaste] = useState('');
  const [batch, setBatch] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setError(null);
      const [nums, cs] = await Promise.all([
        unwrap(client.models.CertificateNumber.list({ limit: 1000 })),
        unwrap(client.models.Certificate.list({ limit: 1000 })),
      ]);
      setSlots(
        nums
          .map((n) => ({
            id: n.id,
            number: n.number,
            status: n.status,
            certificateId: n.certificateId ?? null,
            studentId: n.studentId ?? null,
            batchLabel: n.batchLabel ?? null,
          }))
          .sort((a, b) => a.number.localeCompare(b.number, 'uk', { numeric: true })),
      );
      setCerts(
        cs
          .map((c) => ({
            id: c.id,
            certificateNumber: c.certificateNumber,
            verificationCode: c.verificationCode,
            studentFullName: c.studentFullName,
            totalPoints: c.totalPoints,
            maxPoints: c.maxPoints,
            issuedAt: c.issuedAt,
            revokedAt: c.revokedAt ?? null,
          }))
          .sort((a, b) => b.issuedAt.localeCompare(a.issuedAt)),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не вдалося завантажити');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const existing = useMemo(() => new Set(slots.map((s) => s.number)), [slots]);

  /* Розбираємо вставлене ЗАЗДАЛЕГІДЬ і показуємо, скільки додасться, а
     скільки відсіється дублікатом — щоб людина бачила результат до запису,
     а не дізнавалася про нього після. */
  const parsed = useMemo(() => {
    const seen = new Set<string>();
    const fresh: string[] = [];
    const dupes: string[] = [];
    for (const raw of paste.split(/[\n,;]+/)) {
      const n = raw.trim();
      if (!n) continue;
      if (existing.has(n) || seen.has(n)) dupes.push(n);
      else {
        seen.add(n);
        fresh.push(n);
      }
    }
    return { fresh, dupes };
  }, [paste, existing]);

  async function addNumbers() {
    if (!parsed.fresh.length) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      for (const number of parsed.fresh) {
        await unwrap(
          client.models.CertificateNumber.create({
            number,
            status: 'free',
            batchLabel: batch.trim() || null,
          }),
        );
      }
      setNotice(
        `Додано ${parsed.fresh.length} номерів.` +
          (parsed.dupes.length ? ` Пропущено дублікатів: ${parsed.dupes.length}.` : ''),
      );
      setPaste('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не вдалося додати номери');
    } finally {
      setBusy(false);
    }
  }

  async function releaseBurned(s: Slot) {
    setBusy(true);
    setError(null);
    try {
      await unwrap(
        client.models.CertificateNumber.update({
          id: s.id,
          status: 'free',
          studentId: null,
          usedAt: null,
        }),
      );
      setNotice(`Номер ${s.number} повернуто у вільні.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не вдалося звільнити номер');
    } finally {
      setBusy(false);
    }
  }

  async function removeFree(s: Slot) {
    if (!window.confirm(`Видалити номер ${s.number} з пулу?`)) return;
    setBusy(true);
    try {
      await unwrap(client.models.CertificateNumber.delete({ id: s.id }));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не вдалося видалити');
    } finally {
      setBusy(false);
    }
  }

  const free = slots.filter((s) => s.status === 'free');
  const used = slots.filter((s) => s.status !== 'free');
  /* 'used' без certificateId — номер згорів між позначенням і створенням
     документа. Показуємо окремо: це єдиний стан, що потребує втручання. */
  const burned = used.filter((s) => !s.certificateId);

  if (loading) return <p className="text-ink-mute">Завантажуємо…</p>;

  return (
    <div className="flex flex-col gap-10">
      <section>
        <h2 className="text-xl text-ink">Пул номерів</h2>

        <div className="mt-4 flex flex-wrap gap-3">
          <span className="rounded-full bg-space-700 px-4 py-2 font-mono text-2xs text-success">
            ВІЛЬНИХ: {free.length}
          </span>
          <span className="rounded-full bg-space-700 px-4 py-2 font-mono text-2xs text-ink-mute">
            ВИКОРИСТАНИХ: {used.length}
          </span>
          {burned.length > 0 && (
            <span className="rounded-full bg-space-700 px-4 py-2 font-mono text-2xs text-warning">
              ЗГОРІЛИХ: {burned.length}
            </span>
          )}
        </div>

        {free.length === 0 && (
          <p className="mt-4 rounded-[var(--radius-sm)] bg-space-700 p-4 text-sm text-warning">
            Вільних номерів немає — видати сертифікат зараз неможливо. Внесіть номери нижче.
          </p>
        )}

        <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_300px]">
          <label className="flex flex-col gap-2">
            <span className="font-mono text-2xs tracking-widest text-ink-mute">
              НОМЕРИ — ПО ОДНОМУ В РЯДКУ
            </span>
            <textarea
              rows={8}
              value={paste}
              onChange={(e) => setPaste(e.target.value)}
              placeholder={'VRW-2026-0001\nVRW-2026-0002\nVRW-2026-0003'}
              className="w-full rounded-[var(--radius-sm)] border-0 bg-space-700 p-4 font-mono text-sm text-ink shadow-[inset_0_0_0_1px_var(--line)] outline-none placeholder:text-ink-dim focus:shadow-[var(--ring-focus)]"
            />
          </label>

          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-2">
              <span className="font-mono text-2xs tracking-widest text-ink-mute">
                ПОЗНАЧКА ПАРТІЇ
              </span>
              <input
                value={batch}
                onChange={(e) => setBatch(e.target.value)}
                placeholder="2026, весняний набір"
                className="w-full rounded-[var(--radius-sm)] border border-[var(--line-strong)] bg-space-900/60 px-4 py-3 text-md text-ink placeholder:text-ink-dim focus:border-cyan-400"
              />
            </label>

            {paste.trim() && (
              <p className="text-sm text-ink-soft">
                Додасться: <b className="text-ink">{parsed.fresh.length}</b>
                {parsed.dupes.length > 0 && <> · дублікатів пропущено: {parsed.dupes.length}</>}
              </p>
            )}

            <Button onClick={addNumbers} disabled={busy || !parsed.fresh.length}>
              {busy ? 'Додаємо…' : 'Внести в пул'}
            </Button>
          </div>
        </div>

        {error && <p className="mt-4 text-sm text-danger">{error}</p>}
        {notice && <p className="mt-4 text-sm text-success">{notice}</p>}

        {burned.length > 0 && (
          <div className="mt-6 rounded-[var(--radius-lg)] bg-space-800 p-5">
            <div className="font-mono text-2xs tracking-widest text-warning">ЗГОРІЛІ НОМЕРИ</div>
            <p className="mt-2 max-w-2xl text-sm text-ink-soft">
              Позначені використаними, але сертифіката за ними немає — видача перервалася між
              двома кроками. Поверніть у вільні, якщо впевнені, що документ не видавався.
            </p>
            <ul className="mt-3 flex list-none flex-wrap gap-2 p-0">
              {burned.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center gap-2 rounded-full bg-space-700 px-3 py-1.5"
                >
                  <span className="font-mono text-2xs text-ink">{s.number}</span>
                  <button
                    onClick={() => releaseBurned(s)}
                    disabled={busy}
                    className="cursor-pointer border-none bg-transparent font-mono text-2xs text-violet-300 hover:text-ink"
                  >
                    звільнити
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {free.length > 0 && (
          <details className="mt-6">
            <summary className="cursor-pointer font-mono text-2xs tracking-widest text-ink-mute">
              ПОКАЗАТИ ВІЛЬНІ ({free.length})
            </summary>
            <ul className="mt-3 flex list-none flex-wrap gap-2 p-0">
              {free.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center gap-2 rounded-full bg-space-700 px-3 py-1.5"
                >
                  <span className="font-mono text-2xs text-ink-soft">{s.number}</span>
                  <button
                    onClick={() => removeFree(s)}
                    disabled={busy}
                    aria-label={`Видалити ${s.number}`}
                    className="cursor-pointer border-none bg-transparent font-mono text-2xs text-ink-mute hover:text-danger"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          </details>
        )}
      </section>

      <section>
        <h2 className="text-xl text-ink">Видані сертифікати</h2>
        {certs.length === 0 ? (
          <p className="mt-3 text-ink-mute">Жодного ще не видано.</p>
        ) : (
          <ul className="mt-4 flex list-none flex-col gap-3 p-0">
            {certs.map((c) => (
              <li
                key={c.id}
                className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-[var(--radius-lg)] bg-space-800 p-5"
              >
                <span className="font-mono text-2xs text-gold">{c.certificateNumber}</span>
                <span className="text-ink">{c.studentFullName}</span>
                <span className="font-mono text-2xs text-ink-mute">
                  {c.totalPoints} / {c.maxPoints}
                </span>
                <span className="font-mono text-2xs text-ink-mute">
                  {new Date(c.issuedAt).toLocaleDateString('uk-UA')}
                </span>
                {c.revokedAt && <span className="font-mono text-2xs text-danger">ВІДКЛИКАНО</span>}
                <span className="ml-auto font-mono text-2xs text-violet-300">
                  {c.verificationCode}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
