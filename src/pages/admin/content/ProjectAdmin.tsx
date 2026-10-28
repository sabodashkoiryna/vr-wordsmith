import { useCallback, useEffect, useState } from 'react';
import ResourceManager from '../../../features/admin/ui/ResourceManager';
import type { Field } from '../../../features/admin/ui/ResourceManager';
import { client } from '../../../lib/amplify-client';
import { unwrap } from '../../../lib/unwrap';
import { AdminButton, Banner, EmptyState, PageHeader } from '../../../features/admin/ui/adminUi';

const PROJECT_SLUG = 'course-project';

type ProjectRow = { id: string; title: string; maxPoints: number; instructions: string };

const CRITERION_FIELDS: Field[] = [
  { key: 'order', label: '№', type: 'number', inTable: true, width: '70px', required: true },
  { key: 'code', label: 'Код', type: 'text', inTable: true, width: '100px', required: true },
  { key: 'text', label: 'Критерій', type: 'textarea', inTable: true, required: true },
  {
    key: 'maxPoints',
    label: 'Максимум',
    type: 'number',
    inTable: true,
    width: '120px',
    required: true,
  },
  { key: 'blockLabel', label: 'Блок', type: 'text', hint: 'Критерії з однаковим блоком групуються разом.' },
];

/**
 * Курсовий проєкт і його рубрика.
 *
 * Бал за проєкт не ставиться руками: Lambda бере сиру суму рубрики й
 * нормалізує її до `maxPoints`. Тому тут важливі дві речі, які екран і
 * показує: скільки сирих балів дає рубрика зараз і в що вони перетворяться.
 *
 * Код критерію — не оздоба. Виставлені оцінки зберігаються в
 * `AssignmentGrade.rubricScores` саме за кодами, тож перейменування коду
 * відвʼязує вже виставлену оцінку від критерію. Про це сказано прямо в
 * підказці, бо наслідок нічим не видно.
 */
export default function ProjectAdmin() {
  const [project, setProject] = useState<ProjectRow | null>(null);
  const [rawTotal, setRawTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const assignments = await unwrap(client.models.Assignment.list({ limit: 50 }));
      // Курсовим проєктом вважається завдання поза модулем — воно може бути
      // лише одне. Та сама ознака, що й у сіді.
      const row =
        assignments.find((a) => a.slug === PROJECT_SLUG) ??
        assignments.find((a) => !a.moduleId) ??
        null;
      if (!row) {
        setProject(null);
        return;
      }
      setProject({
        id: row.id,
        title: row.title,
        maxPoints: row.maxPoints,
        instructions: row.instructions ?? '',
      });
      const criteria = await unwrap(
        client.models.RubricCriterion.listRubricCriterionByAssignmentIdAndOrder(
          { assignmentId: row.id },
          { limit: 200 },
        ),
      );
      setRawTotal(criteria.reduce((s, c) => s + c.maxPoints, 0));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не вдалося завантажити проєкт');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function createProject() {
    setBusy(true);
    try {
      await unwrap(
        client.models.Assignment.create({
          slug: PROJECT_SLUG,
          moduleId: null,
          lessonId: null,
          title: 'Курсовий проєкт',
          instructions: '',
          maxPoints: 40,
          allowExternalLink: false,
          maxFileSizeMb: 50,
        }),
      );
      setNotice('Проєкт створено. Додайте опис і критерії рубрики.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не вдалося створити проєкт');
    } finally {
      setBusy(false);
    }
  }

  async function saveProject(patch: Partial<ProjectRow>) {
    if (!project) return;
    const next = { ...project, ...patch };
    setProject(next);
    try {
      await unwrap(
        client.models.Assignment.update({
          id: project.id,
          title: next.title,
          maxPoints: next.maxPoints,
          instructions: next.instructions,
        }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не вдалося зберегти');
    }
  }

  const input =
    'w-full rounded-[var(--radius-sm)] border border-[var(--line-strong)] bg-space-900/60 px-3 py-2.5 text-sm text-ink focus:border-cyan-400 focus:outline-none';

  if (loading) return <p className="text-ink-mute">Завантажуємо…</p>;

  if (!project) {
    return (
      <div>
        <PageHeader title="Курсовий проєкт" />
        {error && <Banner tone="error">{error}</Banner>}
        <EmptyState
          title="Курсового проєкту ще немає"
          hint="Це єдине завдання курсу поза модулями — на нього припадають 40 балів зі 100."
        />
        <div className="mt-4">
          <AdminButton variant="primary" onClick={createProject} disabled={busy}>
            {busy ? 'Створюємо…' : 'Створити проєкт'}
          </AdminButton>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Курсовий проєкт"
        description="Бал рахує сервер: сира сума рубрики нормалізується до балів проєкту. Руками підсумок не виставляється ніде."
      />

      {error && <Banner tone="error">{error}</Banner>}
      {notice && <Banner tone="success">{notice}</Banner>}

      <div className="mb-6 rounded-[var(--radius-lg)] bg-space-800 p-5">
        <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
          <label className="flex flex-col gap-1.5">
            <span className="font-mono text-2xs tracking-widest text-ink-mute">НАЗВА</span>
            <input
              defaultValue={project.title}
              onBlur={(e) => saveProject({ title: e.target.value })}
              className={input}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="font-mono text-2xs tracking-widest text-ink-mute">БАЛІВ</span>
            <input
              type="number"
              defaultValue={project.maxPoints}
              onBlur={(e) => saveProject({ maxPoints: Number(e.target.value) })}
              className={input}
            />
          </label>
        </div>

        <label className="mt-4 flex flex-col gap-1.5">
          <span className="flex items-baseline gap-2">
            <span className="font-mono text-2xs tracking-widest text-ink-mute">ЗАВДАННЯ</span>
            <span className="ml-auto font-mono text-2xs text-ink-mute">
              {project.instructions.trim()
                ? `${project.instructions.trim().split(/\s+/).length} слів`
                : 'порожньо'}
            </span>
          </span>
          <textarea
            defaultValue={project.instructions}
            onBlur={(e) => saveProject({ instructions: e.target.value })}
            className={`${input} min-h-[40vh] resize-y font-mono leading-relaxed`}
          />
        </label>

        <p className="mt-4 text-sm text-ink-soft">
          Рубрика дає <b className="text-ink">{rawTotal}</b> сирих балів, які переводяться в{' '}
          <b className="text-ink">{project.maxPoints}</b> балів курсу.
          {rawTotal === 0 && ' Поки критеріїв немає, будь-яка робота отримає нуль.'}
        </p>
      </div>

      <ResourceManager
        key={project.id}
        title="Критерії рубрики"
        description="Студент бачить рубрику ДО здачі — прозорість оцінювання тут навмисна."
        fields={CRITERION_FIELDS.map((f) =>
          f.key === 'code'
            ? {
                ...f,
                hint: 'Виставлені оцінки зберігаються за КОДОМ критерію. Перейменування відвʼяже вже виставлені бали від цього критерію.',
              }
            : f,
        )}
        orderKey="order"
        labelKey="code"
        list={async () => {
          const rows = await unwrap(
            client.models.RubricCriterion.listRubricCriterionByAssignmentIdAndOrder(
              { assignmentId: project.id },
              { limit: 200 },
            ),
          );
          setRawTotal(rows.reduce((s, c) => s + c.maxPoints, 0));
          return rows as unknown as Record<string, unknown>[];
        }}
        create={(v) =>
          unwrap(client.models.RubricCriterion.create({ ...v, assignmentId: project.id } as never))
        }
        update={(id, v) => unwrap(client.models.RubricCriterion.update({ id, ...v } as never))}
        remove={(id) => unwrap(client.models.RubricCriterion.delete({ id }))}
      />
    </div>
  );
}
