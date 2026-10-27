import { useState } from 'react';
import ResourceManager from '../../../features/admin/ui/ResourceManager';
import type { Field } from '../../../features/admin/ui/ResourceManager';
import { client } from '../../../lib/amplify-client';
import { unwrap } from '../../../lib/unwrap';

/* Поля звірені зі схемою. Раніше тут редагувалися `type`, `options`,
   `correctIndex`, `rubricCode` і `maxPoints` — усе це лишилося від PoC, у
   моделях їх немає, тож будь-яке збереження падало б.

   Ключ правильної відповіді сюди не повернеться: для курсових тестів він
   живе в окремій моделі QuizAnswerKey, недосяжній студентові. */

const INSTRUMENT_FIELDS: Field[] = [
  { key: 'code', label: 'Код', type: 'text', inTable: true, width: '110px', required: true },
  { key: 'title', label: 'Назва', type: 'text', inTable: true, required: true },
  { key: 'isActive', label: 'Активний', type: 'boolean', inTable: true, width: '110px' },
  { key: 'instructions', label: 'Інструкція', type: 'textarea' },
  { key: 'boundsLow', label: 'Межа «низький / середній»', type: 'number' },
  { key: 'boundsHigh', label: 'Межа «середній / високий»', type: 'number' },
];

const QUESTION_FIELDS: Field[] = [
  {
    key: 'instrumentCode',
    label: 'Код інструмента',
    type: 'text',
    inTable: true,
    width: '150px',
    required: true,
  },
  { key: 'order', label: '№', type: 'number', inTable: true, width: '70px', required: true },
  { key: 'text', label: 'Текст', type: 'textarea', inTable: true, required: true },
];

export default function DiagnosticsAdmin() {
  const [tab, setTab] = useState<'instruments' | 'questions'>('instruments');

  return (
    <div>
      <div className="mb-6 flex flex-wrap gap-2">
        {(
          [
            ['instruments', 'Інструменти'],
            ['questions', 'Питання'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`cursor-pointer rounded-full border-none px-4 py-2 font-mono text-2xs transition-colors ${
              tab === id
                ? 'bg-violet-500 text-white'
                : 'bg-space-700 text-ink-soft hover:bg-space-600 hover:text-ink'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'instruments' ? (
        <ResourceManager
          title="Інструменти діагностики"
          description="Анкети самозвіту дисертаційного дослідження. До балів курсу не входять."
          fields={INSTRUMENT_FIELDS}
          orderKey="code"
          labelKey="title"
          list={() => unwrap(client.models.DiagInstrument.list({ limit: 200 }))}
          create={(v) => unwrap(client.models.DiagInstrument.create(v as never))}
          update={(id, v) => unwrap(client.models.DiagInstrument.update({ id, ...v } as never))}
          remove={(id) => unwrap(client.models.DiagInstrument.delete({ id }))}
        />
      ) : (
        <ResourceManager
          title="Питання діагностики"
          description="Код інструмента звʼязує питання з анкетою."
          fields={QUESTION_FIELDS}
          orderKey="order"
          labelKey="text"
          list={() => unwrap(client.models.DiagQuestion.list({ limit: 500 }))}
          create={(v) => unwrap(client.models.DiagQuestion.create(v as never))}
          update={(id, v) => unwrap(client.models.DiagQuestion.update({ id, ...v } as never))}
          remove={(id) => unwrap(client.models.DiagQuestion.delete({ id }))}
        />
      )}
    </div>
  );
}
