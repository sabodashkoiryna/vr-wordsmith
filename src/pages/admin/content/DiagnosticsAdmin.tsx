import { useState } from 'react';
import CrudTable from '../../../components/admin/CrudTable';
import type { CrudField } from '../../../components/admin/CrudTable';
import { client } from '../../../lib/amplify-client';
import { unwrap } from '../../../lib/unwrap';

const instrumentFields: CrudField[] = [
  { key: 'code', label: 'Код (a1 / t1 / s1 / e1)', type: 'text' },
  { key: 'title', label: 'Назва', type: 'text' },
  { key: 'type', label: 'Тип', type: 'select', options: ['likert', 'test', 'rubric'] },
  { key: 'instructions', label: 'Інструкція', type: 'textarea' },
  { key: 'boundsLow', label: 'Межа "низький/середній"', type: 'number' },
  { key: 'boundsHigh', label: 'Межа "середній/високий"', type: 'number' },
];

const questionFields: CrudField[] = [
  { key: 'instrumentCode', label: 'Код інструмента (a1 / t1 / s1 / e1)', type: 'text' },
  { key: 'order', label: '№', type: 'number' },
  { key: 'block', label: 'Блок (для тесту Т-1)', type: 'text' },
  { key: 'text', label: 'Текст питання / критерію', type: 'textarea' },
  { key: 'options', label: 'Варіанти відповіді (по рядку, для тесту)', type: 'stringArray' },
  {
    key: 'correctIndex',
    label: 'Індекс правильної відповіді (0-based, лише для тесту Т-1 — бачить тільки Admins)',
    type: 'number',
  },
  { key: 'rubricCode', label: 'Код критерію рубрики (для Е-1, напр. А1)', type: 'text' },
  { key: 'maxPoints', label: 'Макс. балів (для Е-1)', type: 'number' },
];

export default function DiagnosticsAdmin() {
  const [tab, setTab] = useState<'instruments' | 'questions'>('instruments');

  return (
    <div>
      <div className="tag-tabs">
        <button className={tab === 'instruments' ? 'active' : ''} onClick={() => setTab('instruments')}>
          Інструменти
        </button>
        <button className={tab === 'questions' ? 'active' : ''} onClick={() => setTab('questions')}>
          Питання / критерії
        </button>
      </div>

      {tab === 'instruments' && (
        <CrudTable
          title="Діагностичні інструменти"
          fields={instrumentFields}
          list={() => unwrap(client.models.DiagInstrument.list())}
          create={(v) => unwrap(client.models.DiagInstrument.create(v as never))}
          update={(id, v) => unwrap(client.models.DiagInstrument.update({ id, ...v } as never))}
          remove={(id) => unwrap(client.models.DiagInstrument.delete({ id }))}
        />
      )}

      {tab === 'questions' && (
        <CrudTable
          title="Питання анкет / тесту / рубрики"
          fields={questionFields}
          orderKey="order"
          list={() => unwrap(client.models.DiagQuestion.list())}
          create={(v) => unwrap(client.models.DiagQuestion.create(v as never))}
          update={(id, v) => unwrap(client.models.DiagQuestion.update({ id, ...v } as never))}
          remove={(id) => unwrap(client.models.DiagQuestion.delete({ id }))}
        />
      )}
    </div>
  );
}
