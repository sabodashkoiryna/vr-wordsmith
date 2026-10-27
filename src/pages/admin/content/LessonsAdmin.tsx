import { useCallback, useEffect, useState } from 'react';
import ResourceManager from '../../../features/admin/ui/ResourceManager';
import type { Field } from '../../../features/admin/ui/ResourceManager';
import { client } from '../../../lib/amplify-client';
import { unwrap } from '../../../lib/unwrap';

type ModuleRow = { id: string; order: number; code: string; title: string };

const FIELDS: Field[] = [
  { key: 'order', label: '№', type: 'number', inTable: true, width: '70px', required: true },
  { key: 'title', label: 'Назва', type: 'text', inTable: true, required: true },
  { key: 'kind', label: 'Тип', type: 'select', options: ['text', 'quiz'], inTable: true, width: '110px' },
  { key: 'durationMinutes', label: 'Хвилин', type: 'number', inTable: true, width: '100px' },
  {
    key: 'slug',
    label: 'Slug',
    type: 'text',
    required: true,
    hint: 'Унікальний НА ВЕСЬ КУРС, не лише в модулі: адреса уроку резолвиться і за самим slug’ом, щоб старі посилання працювали після перестановки модулів.',
  },
  { key: 'summary', label: 'Підзаголовок', type: 'textarea' },
  {
    key: 'videoUrl',
    label: 'Посилання на відео',
    type: 'text',
    hint: 'Необов’язкове. Плеєр з’являється лише коли поле заповнене — окремого типу «відео» немає.',
  },
  { key: 'contentMarkdown', label: 'Текст уроку', type: 'markdown' },
];

/**
 * Редактор уроків, по одному модулю за раз.
 *
 * Модуль обирається окремо: уроків 28, і плаский список без групування
 * перетворює редагування на пошук.
 */
export default function LessonsAdmin() {
  const [modules, setModules] = useState<ModuleRow[]>([]);
  const [moduleId, setModuleId] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const rows = await unwrap(client.models.Module.list({ limit: 200 }));
        const mapped = rows
          .map((m) => ({ id: m.id, order: m.order, code: m.code, title: m.title }))
          .sort((a, b) => a.order - b.order);
        setModules(mapped);
        setModuleId((p) => p || mapped[0]?.id || '');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Не вдалося завантажити модулі');
      }
    })();
  }, []);

  const list = useCallback(async () => {
    const rows = await unwrap(
      client.models.Lesson.listLessonByModuleIdAndOrder({ moduleId }, { limit: 200 }),
    );
    return rows as unknown as Record<string, unknown>[];
  }, [moduleId]);

  if (error) return <p className="text-sm text-danger">{error}</p>;
  if (!modules.length) return <p className="text-ink-mute">Спершу створіть модуль.</p>;

  const current = modules.find((m) => m.id === moduleId);

  return (
    <div>
      <div className="mb-6 flex flex-wrap gap-2">
        {modules.map((m) => (
          <button
            key={m.id}
            onClick={() => setModuleId(m.id)}
            className={`cursor-pointer rounded-full border-none px-4 py-2 font-mono text-2xs transition-colors ${
              m.id === moduleId
                ? 'bg-violet-500 text-white'
                : 'bg-space-700 text-ink-soft hover:bg-space-600 hover:text-ink'
            }`}
          >
            {m.code}
          </button>
        ))}
      </div>

      <ResourceManager
        /* key перемонтовує менеджер при зміні модуля — інакше в таблиці
           лишалися б рядки попереднього. */
        key={moduleId}
        title={current ? `Уроки · ${current.title}` : 'Уроки'}
        description="Клік по рядку відкриває урок у бічній панелі. Текст редагується у форматі Markdown."
        fields={FIELDS}
        orderKey="order"
        labelKey="title"
        list={list}
        create={(v) => unwrap(client.models.Lesson.create({ ...v, moduleId } as never))}
        update={(id, v) => unwrap(client.models.Lesson.update({ id, ...v } as never))}
        remove={(id) => unwrap(client.models.Lesson.delete({ id }))}
      />
    </div>
  );
}
