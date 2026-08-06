import CrudTable from '../../../components/admin/CrudTable';
import type { CrudField } from '../../../components/admin/CrudTable';
import { client } from '../../../lib/amplify-client';
import { unwrap } from '../../../lib/unwrap';

const fields: CrudField[] = [
  { key: 'order', label: '№', type: 'number' },
  { key: 'type', label: 'Тип', type: 'select', options: ['project', 'tool'] },
  { key: 'category', label: 'Категорія', type: 'text' },
  { key: 'title', label: 'Назва', type: 'text' },
  { key: 'text', label: 'Опис', type: 'textarea' },
];

export default function ResourcesAdmin() {
  return (
    <CrudTable
      title="Теми проєктів і банк ресурсів"
      fields={fields}
      orderKey="order"
      list={() => unwrap(client.models.Resource.list())}
      create={(v) => unwrap(client.models.Resource.create(v as never))}
      update={(id, v) => unwrap(client.models.Resource.update({ id, ...v } as never))}
      remove={(id) => unwrap(client.models.Resource.delete({ id }))}
    />
  );
}
