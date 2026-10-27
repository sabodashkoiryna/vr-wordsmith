import { useEffect, useState } from 'react';
import CrudTable from '../../../components/admin/CrudTable';
import type { CrudField } from '../../../components/admin/CrudTable';
import { client } from '../../../lib/amplify-client';
import { unwrap } from '../../../lib/unwrap';

type ModuleRow = { id: string; order: number; code: string; title: string };

const fieldsFor = (moduleId: string): CrudField[] => [
  { key: 'order', label: '№ у модулі (з нуля)', type: 'number' },
  { key: 'slug', label: 'Slug (унікальний на весь курс)', type: 'text' },
  { key: 'title', label: 'Назва', type: 'text' },
  { key: 'kind', label: 'Тип', type: 'select', options: ['text', 'quiz'] },
  { key: 'summary', label: 'Підзаголовок', type: 'textarea' },
  { key: 'durationMinutes', label: 'Хвилин', type: 'number' },
  { key: 'videoUrl', label: 'Посилання на відео (необов’язково)', type: 'text' },
  { key: 'contentMarkdown', label: `Текст уроку — Markdown [${moduleId.slice(0, 6)}]`, type: 'textarea' },
];

/**
 * Редактор уроків, по одному модулю за раз.
 *
 * Модуль обирається окремо, а не показується все підряд: уроків 28, і
 * плаский список без групування перетворює редагування на пошук.
 *
 * `slug` має бути унікальним НА ВЕСЬ КУРС, а не в межах модуля: адреса уроку
 * резолвиться і за самим slug'ом теж, щоб стара адреса працювала після
 * перестановки модулів.
 */
export default function LessonsAdmin() {
  const [modules, setModules] = useState<ModuleRow[]>([]);
  const [moduleId, setModuleId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const rows = await unwrap(client.models.Module.list({ limit: 200 }));
        const mapped = rows
          .map((m) => ({ id: m.id, order: m.order, code: m.code, title: m.title }))
          .sort((a, b) => a.order - b.order);
        setModules(mapped);
        setModuleId((prev) => prev || mapped[0]?.id || '');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Не вдалося завантажити модулі');
      }
    })();
  }, []);

  if (error) return <p className="text-sm text-danger">{error}</p>;
  if (!modules.length) return <p className="text-ink-mute">Спершу створіть модуль.</p>;

  return (
    <div>
      <label className="flex max-w-md flex-col gap-2">
        <span className="font-mono text-2xs tracking-widest text-ink-mute">МОДУЛЬ</span>
        <select
          value={moduleId}
          onChange={(e) => setModuleId(e.target.value)}
          className="w-full rounded-[var(--radius-sm)] border border-[var(--line-strong)] bg-space-900/60 px-4 py-3 text-md text-ink focus:border-cyan-400"
        >
          {modules.map((m) => (
            <option key={m.id} value={m.id}>
              {m.code} · {m.title}
            </option>
          ))}
        </select>
      </label>

      <div className="mt-8">
        <CrudTable
          /* key змушує таблицю перемонтуватися при зміні модуля — інакше в
             ній лишалися б рядки попереднього. */
          key={moduleId}
          title="Уроки модуля"
          fields={fieldsFor(moduleId)}
          orderKey="order"
          list={async () => {
            const rows = await unwrap(
              client.models.Lesson.listLessonByModuleIdAndOrder({ moduleId }, { limit: 200 }),
            );
            return rows as unknown as Record<string, unknown>[];
          }}
          create={(values) =>
            unwrap(client.models.Lesson.create({ ...values, moduleId } as never))
          }
          update={(id, values) => unwrap(client.models.Lesson.update({ id, ...values } as never))}
          remove={(id) => unwrap(client.models.Lesson.delete({ id }))}
        />
      </div>
    </div>
  );
}
