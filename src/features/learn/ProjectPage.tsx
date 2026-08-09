import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../../ui/Button';
import ProgressBar from '../../ui/ProgressBar';
import { client } from '../../lib/amplify-client';
import { unwrap } from '../../lib/unwrap';
import { useCourseTree } from './useCourseTree';
import { READING_THEMES, useReadingTheme } from './readingTheme';
import LessonContent from './LessonContent';

type Criterion = { id: string; order: number; blockLabel: string | null; code: string; text: string; maxPoints: number };
type Loaded = { instructions: string | null; criteria: Criterion[] };

const STATUS_LABEL: Record<string, string> = {
  not_started: 'Не розпочато',
  draft: 'Чернетка',
  submitted: 'На перевірці',
  returned: 'Повернуто на доопрацювання',
  graded: 'Оцінено',
};

/**
 * Курсовий проєкт — 40 балів зі 100, поза модулями.
 *
 * Рубрику показуємо ДО здачі, а не після оцінювання: людина має бачити, за
 * чим її оцінюватимуть, поки ще може на це вплинути. Це та сама прозорість,
 * заради якої критерії взагалі винесені в окрему модель, а не сховані в
 * голові викладача.
 */
export default function ProjectPage() {
  const { tree, error } = useCourseTree();
  const { theme, setTheme } = useReadingTheme();
  const [body, setBody] = useState<Loaded | null>(null);
  const [bodyError, setBodyError] = useState<string | null>(null);

  const projectId = tree?.project?.id ?? null;

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    (async () => {
      try {
        setBodyError(null);
        const [assignment, criteria] = await Promise.all([
          unwrap(client.models.Assignment.get({ id: projectId })),
          unwrap(
            client.models.RubricCriterion.list({
              filter: { assignmentId: { eq: projectId } },
              limit: 100,
            }),
          ),
        ]);
        if (cancelled) return;
        setBody({
          instructions: assignment?.instructions ?? null,
          criteria: criteria
            .map((c) => ({
              id: c.id,
              order: c.order,
              blockLabel: c.blockLabel ?? null,
              code: c.code,
              text: c.text,
              maxPoints: c.maxPoints,
            }))
            .sort((a, b) => a.order - b.order),
        });
      } catch (err) {
        if (!cancelled) setBodyError(err instanceof Error ? err.message : 'Не вдалося завантажити проєкт');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  if (error) {
    return (
      <section className="container-content py-24">
        <h1 className="text-2xl text-ink">Проєкт не завантажився</h1>
        <p className="mt-3 text-ink-soft">{error}</p>
      </section>
    );
  }
  if (!tree) {
    return (
      <section className="container-content py-24">
        <p className="text-ink-mute">Завантажуємо…</p>
      </section>
    );
  }
  if (!tree.project) {
    return (
      <section className="container-content py-24">
        <h1 className="text-2xl text-ink">Курсовий проєкт ще не опубліковано</h1>
        <p className="mt-3 text-ink-soft">Він з’явиться тут, щойно викладач його відкриє.</p>
        <Button as={Link} to="/learn" className="mt-6">
          До структури курсу
        </Button>
      </section>
    );
  }

  const project = tree.project;
  const rawMax = (body?.criteria ?? []).reduce((s, c) => s + c.maxPoints, 0);

  // Критерії згруповані блоками рубрики — саме так їх читає і студент, і
  // адмін у черзі оцінювання.
  const blocks: { label: string; criteria: Criterion[] }[] = [];
  for (const c of body?.criteria ?? []) {
    const label = c.blockLabel ?? 'КРИТЕРІЇ';
    const last = blocks[blocks.length - 1];
    if (last && last.label === label) last.criteria.push(c);
    else blocks.push({ label, criteria: [c] });
  }

  return (
    <div className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -top-40 h-[420px]"
        style={{ background: 'var(--grad-glow-radial)' }}
      />

      <section className="container-content relative pt-14 pb-10 md:pt-20">
        <Link to="/learn" className="font-mono text-2xs text-ink-mute no-underline hover:text-ink">
          ← Уся структура
        </Link>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <span className="rounded-full bg-space-600 px-2.5 py-1 font-mono text-2xs tracking-widest text-gold">
            КУРСОВИЙ ПРОЄКТ
          </span>
          <span className="font-mono text-2xs text-ink-mute">
            {project.maxPoints} балів · оцінює викладач
          </span>
        </div>

        <h1 className="mt-4 text-3xl text-ink">{project.title}</h1>

        <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:max-w-3xl">
          <div className="rounded-[var(--radius-lg)] bg-space-800 p-6">
            <div className="font-mono text-2xs tracking-widest text-ink-mute">СТАН</div>
            <div className="mt-2 text-lg text-ink">{STATUS_LABEL[project.status]}</div>
            {project.status === 'not_started' && (
              <p className="mt-2 text-sm text-ink-mute">
                Форма здачі з’явиться тут найближчим оновленням.
              </p>
            )}
          </div>
          <div className="rounded-[var(--radius-lg)] bg-space-800 p-6">
            <div className="font-mono text-2xs tracking-widest text-ink-mute">БАЛ ЗА ПРОЄКТ</div>
            <div className="mt-2 font-display text-2xl text-ink">
              {project.pointsAwarded ?? 0}
              <span className="text-ink-mute"> / {project.maxPoints}</span>
            </div>
            <ProgressBar
              value={project.pointsAwarded ?? 0}
              max={project.maxPoints}
              label="Бал за курсовий проєкт"
              tone="gold"
              className="mt-4"
            />
          </div>
        </div>
      </section>

      <section className="container-content relative pb-10">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-xl text-ink">Завдання</h2>
          <div
            className="flex items-center gap-1 rounded-full bg-space-800 p-1"
            role="group"
            aria-label="Тема читання"
          >
            {READING_THEMES.map((t) => (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                aria-pressed={theme === t.id}
                className={`cursor-pointer rounded-full border-none px-3 py-1.5 font-mono text-2xs transition-colors ${
                  theme === t.id ? 'bg-space-500 text-ink' : 'bg-transparent text-ink-mute hover:text-ink'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="reading rounded-[var(--radius-lg)] p-6 md:p-10" data-reading-theme={theme}>
          {bodyError && <p className="text-danger">{bodyError}</p>}
          {!bodyError && !body && <p className="text-ink-mute">Завантажуємо…</p>}
          {body?.instructions && <LessonContent markdown={body.instructions} />}
        </div>
      </section>

      <section className="container-content relative pb-24">
        <h2 className="text-xl text-ink">Як оцінюється</h2>
        <p className="mt-2 max-w-2xl text-ink-soft">
          {rawMax > 0 && (
            <>
              Кожен критерій — від 0 до {blocks[0]?.criteria[0]?.maxPoints ?? 3} балів. Разом{' '}
              {rawMax} сирих, які переводяться в {project.maxPoints} балів курсу.
            </>
          )}
        </p>

        <div className="mt-6 flex flex-col gap-5">
          {blocks.map((b) => (
            <div key={b.label} className="rounded-[var(--radius-lg)] bg-space-800 p-6">
              <div className="font-mono text-2xs tracking-widest text-violet-300">{b.label}</div>
              <ul className="mt-4 flex list-none flex-col gap-3 p-0">
                {b.criteria.map((c) => (
                  <li key={c.id} className="flex items-start gap-3">
                    <span className="mt-0.5 shrink-0 rounded-[var(--radius-xs)] bg-space-600 px-2 py-0.5 font-mono text-2xs text-ink-soft">
                      {c.code}
                    </span>
                    <span className="flex-1 text-ink-soft">{c.text}</span>
                    <span className="shrink-0 font-mono text-2xs text-ink-mute">
                      0–{c.maxPoints}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
