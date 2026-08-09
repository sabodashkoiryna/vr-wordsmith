import { useCallback, useEffect, useState } from 'react';
import Button from '../../ui/Button';
import { client } from '../../lib/amplify-client';
import { unwrap } from '../../lib/unwrap';

type Submission = {
  id: string;
  studentId: string;
  assignmentId: string;
  title: string;
  description: string | null;
  externalUrl: string | null;
  fileKeys: string[];
  status: string;
  submittedAt: string | null;
};

type Criterion = {
  id: string;
  order: number;
  blockLabel: string | null;
  code: string;
  text: string;
  maxPoints: number;
};

type Grade = {
  id: string;
  rubricScores: unknown;
  rubricRawTotal: number | null;
  pointsAwarded: number;
  maxPoints: number;
  comment: string | null;
  gradedByName: string | null;
  gradedAt: string;
};

const STATUS: Record<string, { label: string; tone: string }> = {
  submitted: { label: 'На перевірці', tone: 'text-warning' },
  returned: { label: 'Повернуто', tone: 'text-ink-mute' },
  graded: { label: 'Оцінено', tone: 'text-success' },
  draft: { label: 'Чернетка', tone: 'text-ink-dim' },
};

const storage = () => import('aws-amplify/storage');

/**
 * Черга оцінювання курсових проєктів.
 *
 * Бали виставляє Lambda `gradeAssignment`, а не цей екран: вона обрізає кожну
 * оцінку по максимуму критерію, нормалізує сиру суму до балів курсу й
 * перераховує агрегат. Тут лише збираються сирі значення рубрики — саме тому
 * жодне поле з підсумковим балом не редагується вручну.
 */
export default function GradingQueue() {
  const [rows, setRows] = useState<Submission[]>([]);
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [grades, setGrades] = useState<Record<string, Grade>>({});
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [openId, setOpenId] = useState<string | null>(null);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [subs, crits, gr, profs] = await Promise.all([
        unwrap(client.models.AssignmentSubmission.list({ limit: 500 })),
        unwrap(client.models.RubricCriterion.list({ limit: 200 })),
        unwrap(client.models.AssignmentGrade.list({ limit: 500 })),
        unwrap(client.models.UserProfile.list({ limit: 500 })),
      ]);

      setRows(
        subs
          .filter((s) => s.status !== 'draft')
          .map((s) => ({
            id: s.id,
            studentId: s.studentId,
            assignmentId: s.assignmentId,
            title: s.title,
            description: s.description ?? null,
            externalUrl: s.externalUrl ?? null,
            fileKeys: (s.fileKeys ?? []).filter((k): k is string => !!k),
            status: s.status,
            submittedAt: s.submittedAt ?? null,
          }))
          // Найдавніші зверху: черга, а не стос.
          .sort((a, b) => (a.submittedAt ?? '').localeCompare(b.submittedAt ?? '')),
      );

      setCriteria(
        crits
          .map((c) => ({
            id: c.id,
            order: c.order,
            blockLabel: c.blockLabel ?? null,
            code: c.code,
            text: c.text,
            maxPoints: c.maxPoints,
          }))
          .sort((a, b) => a.order - b.order),
      );

      const bySubmission: Record<string, Grade> = {};
      for (const g of gr) {
        bySubmission[g.submissionId] = {
          id: g.id,
          rubricScores: g.rubricScores,
          rubricRawTotal: g.rubricRawTotal ?? null,
          pointsAwarded: g.pointsAwarded,
          maxPoints: g.maxPoints,
          comment: g.comment ?? null,
          gradedByName: g.gradedByName ?? null,
          gradedAt: g.gradedAt,
        };
      }
      setGrades(bySubmission);
      setProfiles(Object.fromEntries(profs.map((p) => [p.id, p.fullName])));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не вдалося завантажити чергу');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function open(s: Submission) {
    setOpenId(s.id);
    setError(null);
    setNotice(null);
    const existing = grades[s.id];
    // Перевідкриваючи вже оцінену роботу, показуємо виставлене раніше —
    // інакше повторне збереження мовчки обнулило б частину критеріїв.
    // a.json() приходить рядком; якщо він зіпсований — відкриваємо порожню
    // рубрику, а не валимо екран: краще виставити оцінку заново, ніж
    // втратити доступ до черги через один битий запис.
    const raw = existing?.rubricScores;
    let parsed: Record<string, number> | null = null;
    if (typeof raw === 'string') {
      try {
        parsed = JSON.parse(raw) as Record<string, number>;
      } catch {
        setError('Попередні оцінки цієї роботи не читаються — виставте рубрику заново.');
      }
    } else if (raw && typeof raw === 'object') {
      parsed = raw as Record<string, number>;
    }
    setScores(parsed ?? {});
    setComment(existing?.comment ?? '');
  }

  async function openFile(key: string) {
    try {
      const { getUrl } = await storage();
      const { url } = await getUrl({ path: key });
      window.open(url.toString(), '_blank', 'noopener');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не вдалося відкрити файл');
    }
  }

  async function submitGrade(returnForRevision: boolean) {
    if (!openId) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const result = await unwrap(
        client.mutations.gradeAssignment({
          submissionId: openId,
          rubricScores: JSON.stringify(scores),
          comment: comment.trim() || undefined,
          returnForRevision,
        }),
      );
      setNotice(
        returnForRevision
          ? 'Роботу повернуто на доопрацювання.'
          : `Оцінено: ${result?.pointsAwarded ?? 0} балів. Разом у курсі — ${result?.courseTotalPoints ?? 0}.`,
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не вдалося зберегти оцінку');
    } finally {
      setBusy(false);
    }
  }

  async function publishToGallery(s: Submission) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const existing = await unwrap(client.models.GalleryItem.list({ limit: 500 }));
      if (existing.some((g) => g.submissionId === s.id)) {
        setNotice('Цю роботу вже додано в галерею.');
        return;
      }
      await unwrap(
        client.models.GalleryItem.create({
          order: existing.length,
          // Створюємо ПРИХОВАНОЮ навмисно: згода автора на публічне ім'я і
          // сама публікація — різні рішення, і друге має лишатися свідомим.
          publishState: 'hidden',
          title: s.title,
          description: s.description,
          authorDisplayName: profiles[s.studentId] ?? null,
          consentGiven: false,
          externalUrl: s.externalUrl,
          submissionId: s.id,
        }),
      );
      setNotice('Додано в галерею як приховану. Опублікуйте після згоди автора.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не вдалося додати в галерею');
    } finally {
      setBusy(false);
    }
  }

  const rawMax = criteria.reduce((s, c) => s + c.maxPoints, 0);
  const rawTotal = criteria.reduce(
    (s, c) => s + Math.min(Math.max(Number(scores[c.code] ?? 0), 0), c.maxPoints),
    0,
  );
  const openRow = rows.find((r) => r.id === openId) ?? null;

  const blocks: { label: string; items: Criterion[] }[] = [];
  for (const c of criteria) {
    const label = c.blockLabel ?? 'КРИТЕРІЇ';
    const last = blocks[blocks.length - 1];
    if (last && last.label === label) last.items.push(c);
    else blocks.push({ label, items: [c] });
  }

  if (loading) return <p className="text-ink-mute">Завантажуємо чергу…</p>;

  return (
    <div>
      <p className="max-w-2xl text-ink-soft">
        Роботи, здані на перевірку. Бал рахує сервер: ви виставляєте лише сирі значення
        рубрики, а нормалізацію до {rawMax > 0 ? `${rawMax} → ` : ''}балів курсу й перерахунок
        підсумку робить функція оцінювання.
      </p>

      {error && <p className="mt-4 text-sm text-danger">{error}</p>}
      {notice && <p className="mt-4 text-sm text-success">{notice}</p>}

      {rows.length === 0 ? (
        <p className="mt-8 text-ink-mute">Поки нічого не здано.</p>
      ) : (
        <ul className="mt-6 flex list-none flex-col gap-3 p-0">
          {rows.map((s) => {
            const g = grades[s.id];
            const st = STATUS[s.status] ?? { label: s.status, tone: 'text-ink-mute' };
            return (
              <li key={s.id} className="rounded-[var(--radius-lg)] bg-space-800 p-5">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <span className={`font-mono text-2xs tracking-widest ${st.tone}`}>{st.label}</span>
                  <span className="font-mono text-2xs text-ink-mute">
                    {profiles[s.studentId] ?? s.studentId.slice(0, 8)}
                  </span>
                  {s.submittedAt && (
                    <span className="font-mono text-2xs text-ink-mute">
                      {new Date(s.submittedAt).toLocaleDateString('uk-UA')}
                    </span>
                  )}
                  {g && (
                    <span className="font-mono text-2xs text-gold">
                      {g.pointsAwarded} / {g.maxPoints}
                    </span>
                  )}
                  <button
                    onClick={() => (openId === s.id ? setOpenId(null) : open(s))}
                    className="ml-auto cursor-pointer rounded-full border-none bg-space-600 px-4 py-2 font-mono text-2xs text-ink transition-colors hover:bg-space-500"
                  >
                    {openId === s.id ? 'Згорнути' : g ? 'Переглянути' : 'Оцінити'}
                  </button>
                </div>

                <h3 className="mt-3 text-lg text-ink">{s.title}</h3>

                {openId === s.id && openRow && (
                  <div className="mt-5 border-t border-[var(--line)] pt-5">
                    {s.description && (
                      <p className="max-w-2xl whitespace-pre-wrap text-ink-soft">{s.description}</p>
                    )}

                    <div className="mt-4 flex flex-wrap gap-3">
                      {s.externalUrl && (
                        <a
                          href={s.externalUrl}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="rounded-full bg-space-600 px-4 py-2 font-mono text-2xs text-violet-300 no-underline hover:bg-space-500"
                        >
                          Відкрити VR-продукт ↗
                        </a>
                      )}
                      {s.fileKeys.map((k) => (
                        <button
                          key={k}
                          onClick={() => openFile(k)}
                          className="cursor-pointer rounded-full border-none bg-space-600 px-4 py-2 font-mono text-2xs text-ink transition-colors hover:bg-space-500"
                        >
                          {k.split('/').pop()?.replace(/^\d+-/, '')} ↓
                        </button>
                      ))}
                    </div>

                    <div className="mt-6 flex flex-col gap-5">
                      {blocks.map((b) => (
                        <div key={b.label}>
                          <div className="font-mono text-2xs tracking-widest text-violet-300">
                            {b.label}
                          </div>
                          <ul className="mt-3 flex list-none flex-col gap-2 p-0">
                            {b.items.map((c) => (
                              <li key={c.id} className="flex items-start gap-3">
                                <span className="mt-1 shrink-0 rounded-[var(--radius-xs)] bg-space-600 px-2 py-0.5 font-mono text-2xs text-ink-soft">
                                  {c.code}
                                </span>
                                <span className="flex-1 text-sm text-ink-soft">{c.text}</span>
                                <div className="flex shrink-0 gap-1" role="group" aria-label={c.text}>
                                  {Array.from({ length: c.maxPoints + 1 }, (_, n) => (
                                    <button
                                      key={n}
                                      onClick={() => setScores((p) => ({ ...p, [c.code]: n }))}
                                      aria-pressed={(scores[c.code] ?? -1) === n}
                                      className={`h-8 w-8 cursor-pointer rounded-full border-none font-mono text-2xs transition-colors ${
                                        (scores[c.code] ?? -1) === n
                                          ? 'bg-violet-500 text-white'
                                          : 'bg-space-600 text-ink-mute hover:bg-space-500'
                                      }`}
                                    >
                                      {n}
                                    </button>
                                  ))}
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>

                    <div className="mt-5 font-mono text-2xs text-ink-mute">
                      СИРА СУМА: {rawTotal} / {rawMax}
                    </div>

                    <label className="mt-5 flex flex-col gap-2">
                      <span className="font-mono text-2xs tracking-widest text-ink-mute">
                        КОМЕНТАР ДЛЯ СТУДЕНТА
                      </span>
                      <textarea
                        rows={4}
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="Що вдалося, що ні — з механізмом, і одна пропозиція."
                        className="w-full rounded-[var(--radius-sm)] border-0 bg-space-700 p-4 text-ink shadow-[inset_0_0_0_1px_var(--line)] outline-none placeholder:text-ink-dim focus:shadow-[var(--ring-focus)]"
                      />
                    </label>

                    <div className="mt-5 flex flex-wrap items-center gap-3">
                      <Button onClick={() => submitGrade(false)} disabled={busy}>
                        {busy ? 'Зберігаємо…' : 'Виставити оцінку'}
                      </Button>
                      <Button onClick={() => submitGrade(true)} disabled={busy} variant="ghost">
                        Повернути на доопрацювання
                      </Button>
                      {grades[s.id] && (
                        <Button onClick={() => publishToGallery(s)} disabled={busy} variant="ghost">
                          Додати в галерею
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
