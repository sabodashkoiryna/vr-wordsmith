import CrudTable from '../../../components/admin/CrudTable';
import type { CrudField } from '../../../components/admin/CrudTable';
import { client } from '../../../lib/amplify-client';
import { unwrap } from '../../../lib/unwrap';

const fields: CrudField[] = [
  { key: 'order', label: '№', type: 'number' },
  { key: 'code', label: 'Код (напр. МОДУЛЬ 1)', type: 'text' },
  { key: 'component', label: 'Компонент', type: 'select', options: ['М', 'К', 'Д', 'Р'] },
  { key: 'title', label: 'Назва', type: 'text' },
  { key: 'weeks', label: 'Тижні / підпис', type: 'text' },
  { key: 'topics', label: 'Теми (по одній на рядок)', type: 'stringArray' },
  { key: 'tasks', label: 'Завдання — JSON [{"code":"З-1.1","text":"..."}]', type: 'json' },
  { key: 'controlNote', label: 'Контроль', type: 'textarea' },
];

export default function ModulesAdmin() {
  return (
    <CrudTable
      title="Модулі курсу"
      fields={fields}
      orderKey="order"
      list={() => unwrap(client.models.Module.list())}
      create={(values) => unwrap(client.models.Module.create(values as never))}
      update={(id, values) => unwrap(client.models.Module.update({ id, ...values } as never))}
      remove={(id) => unwrap(client.models.Module.delete({ id }))}
    />
  );
}
