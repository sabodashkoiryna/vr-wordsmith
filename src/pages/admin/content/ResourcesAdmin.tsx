import ResourceManager from '../../../features/admin/ui/ResourceManager';
import type { Field } from '../../../features/admin/ui/ResourceManager';
import { client } from '../../../lib/amplify-client';
import { unwrap } from '../../../lib/unwrap';

const FIELDS: Field[] = [
  { key: 'order', label: '№', type: 'number', inTable: true, width: '70px', required: true },
  { key: 'category', label: 'Категорія', type: 'text', inTable: true, width: '200px', required: true },
  { key: 'title', label: 'Назва', type: 'text', inTable: true, required: true },
  { key: 'type', label: 'Тип', type: 'select', options: ['project', 'tool'], inTable: true, width: '110px' },
  { key: 'text', label: 'Опис', type: 'textarea', required: true },
  { key: 'url', label: 'Посилання', type: 'text' },
];

export default function ResourcesAdmin() {
  return (
    <ResourceManager
      title="Ресурси"
      description="Інструменти й матеріали, на які посилаються уроки та курсовий проєкт."
      fields={FIELDS}
      orderKey="order"
      labelKey="title"
      list={() => unwrap(client.models.Resource.list({ limit: 500 }))}
      create={(v) => unwrap(client.models.Resource.create(v as never))}
      update={(id, v) => unwrap(client.models.Resource.update({ id, ...v } as never))}
      remove={(id) => unwrap(client.models.Resource.delete({ id }))}
    />
  );
}
