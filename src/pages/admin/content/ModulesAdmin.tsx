import CrudTable from '../../../components/admin/CrudTable';
import type { CrudField } from '../../../components/admin/CrudTable';
import { client } from '../../../lib/amplify-client';
import { unwrap } from '../../../lib/unwrap';

/* Поля звірені зі схемою. Раніше тут лишалися `tasks` і `controlNote` з PoC —
   їх у моделі вже немає, тож збереження падало б на кожному записі. */
const fields: CrudField[] = [
  { key: 'order', label: '№ (з нуля)', type: 'number' },
  { key: 'code', label: 'Код (напр. МОДУЛЬ 1)', type: 'text' },
  { key: 'component', label: 'Компонент', type: 'select', options: ['М', 'К', 'Д', 'Р'] },
  { key: 'title', label: 'Назва', type: 'text' },
  { key: 'summary', label: 'Короткий опис', type: 'textarea' },
  { key: 'weeks', label: 'Тижні / підпис', type: 'text' },
  { key: 'topics', label: 'Теми (по одній на рядок)', type: 'stringArray' },
  { key: 'quizPoints', label: 'Балів за тест', type: 'number' },
];

export default function ModulesAdmin() {
  return (
    <CrudTable
      title="Модулі курсу"
      fields={fields}
      orderKey="order"
      list={() => unwrap(client.models.Module.list({ limit: 200 }))}
      create={(values) => unwrap(client.models.Module.create(values as never))}
      update={(id, values) => unwrap(client.models.Module.update({ id, ...values } as never))}
      remove={(id) => unwrap(client.models.Module.delete({ id }))}
    />
  );
}
