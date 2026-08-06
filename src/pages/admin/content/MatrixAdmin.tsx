import { useState } from 'react';
import CrudTable from '../../../components/admin/CrudTable';
import type { CrudField } from '../../../components/admin/CrudTable';
import { client } from '../../../lib/amplify-client';
import { unwrap } from '../../../lib/unwrap';

const matrixFields: CrudField[] = [
  { key: 'order', label: '№', type: 'number' },
  { key: 'condition', label: 'Педагогічна умова', type: 'textarea' },
  { key: 'moduleRef', label: 'Модуль платформи', type: 'text' },
  { key: 'component', label: 'Компонент готовності', type: 'text' },
  { key: 'criterion', label: 'Критерій', type: 'text' },
  { key: 'instrument', label: 'Інструмент', type: 'text' },
];

const levelFields: CrudField[] = [
  { key: 'order', label: '№', type: 'number' },
  { key: 'level', label: 'Рівень', type: 'text' },
  { key: 'description', label: 'Характеристика', type: 'textarea' },
  { key: 'boundsPct', label: 'Межі (%)', type: 'text' },
];

export default function MatrixAdmin() {
  const [tab, setTab] = useState<'rows' | 'levels'>('rows');

  return (
    <div>
      <div className="tag-tabs">
        <button className={tab === 'rows' ? 'active' : ''} onClick={() => setTab('rows')}>
          Матриця відповідності
        </button>
        <button className={tab === 'levels' ? 'active' : ''} onClick={() => setTab('levels')}>
          Рівні готовності
        </button>
      </div>

      {tab === 'rows' && (
        <CrudTable
          title="Матриця «умова — модуль — компонент — діагностика»"
          fields={matrixFields}
          orderKey="order"
          list={() => unwrap(client.models.MatrixRow.list())}
          create={(v) => unwrap(client.models.MatrixRow.create(v as never))}
          update={(id, v) => unwrap(client.models.MatrixRow.update({ id, ...v } as never))}
          remove={(id) => unwrap(client.models.MatrixRow.delete({ id }))}
        />
      )}

      {tab === 'levels' && (
        <CrudTable
          title="Рівні готовності"
          fields={levelFields}
          orderKey="order"
          list={() => unwrap(client.models.ReadinessLevel.list())}
          create={(v) => unwrap(client.models.ReadinessLevel.create(v as never))}
          update={(id, v) => unwrap(client.models.ReadinessLevel.update({ id, ...v } as never))}
          remove={(id) => unwrap(client.models.ReadinessLevel.delete({ id }))}
        />
      )}
    </div>
  );
}
