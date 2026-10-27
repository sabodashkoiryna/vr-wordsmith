import ResourceManager from '../../../features/admin/ui/ResourceManager';
import type { Field } from '../../../features/admin/ui/ResourceManager';
import { client } from '../../../lib/amplify-client';
import { unwrap } from '../../../lib/unwrap';

/* Поля звірені зі схемою. Раніше тут лишалися `tasks` і `controlNote` з PoC —
   їх у моделі вже немає, тож збереження падало б на кожному записі. */
const FIELDS: Field[] = [
  { key: 'order', label: '№', type: 'number', inTable: true, width: '70px', required: true },
  { key: 'code', label: 'Код', type: 'text', inTable: true, width: '130px', required: true },
  { key: 'title', label: 'Назва', type: 'text', inTable: true, required: true },
  { key: 'quizPoints', label: 'Балів за тест', type: 'number', inTable: true, width: '130px' },
  {
    key: 'component',
    label: 'Компонент',
    type: 'select',
    options: ['М', 'К', 'Д', 'Р'],
    hint: 'Мотиваційний, когнітивний, діяльнісний, рефлексійний.',
  },
  { key: 'summary', label: 'Короткий опис', type: 'textarea' },
  { key: 'weeks', label: 'Тижні', type: 'text' },
  {
    key: 'topics',
    label: 'Теми',
    type: 'stringArray',
    hint: 'По одній на рядок. Живлять секцію «Програма» на лендінгу.',
  },
  { key: 'isPublished', label: 'Опубліковано', type: 'boolean' },
];

export default function ModulesAdmin() {
  return (
    <ResourceManager
      title="Модулі курсу"
      description="Порядок визначає і структуру кабінету, і адресу уроків."
      fields={FIELDS}
      orderKey="order"
      labelKey="title"
      list={() => unwrap(client.models.Module.list({ limit: 200 }))}
      create={(v) => unwrap(client.models.Module.create(v as never))}
      update={(id, v) => unwrap(client.models.Module.update({ id, ...v } as never))}
      remove={(id) => unwrap(client.models.Module.delete({ id }))}
    />
  );
}
