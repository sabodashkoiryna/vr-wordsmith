import ResourceManager from '../../../features/admin/ui/ResourceManager';
import type { Field } from '../../../features/admin/ui/ResourceManager';
import { client } from '../../../lib/amplify-client';
import { unwrap } from '../../../lib/unwrap';

/**
 * Галерея робіт.
 *
 * `publishState` і `consentGiven` навмисно не зведені в один прапорець: робота
 * може бути вартою показу, але без згоди автора на публічне ім'я. Поки згоди
 * немає — або приберіть ім'я, або не публікуйте.
 */
const FIELDS: Field[] = [
  { key: 'order', label: '№', type: 'number', inTable: true, width: '70px', required: true },
  { key: 'title', label: 'Назва роботи', type: 'text', inTable: true, required: true },
  {
    key: 'publishState',
    label: 'Стан',
    type: 'select',
    options: ['hidden', 'published'],
    inTable: true,
    width: '120px',
    required: true,
  },
  { key: 'authorDisplayName', label: 'Автор', type: 'text', inTable: true, width: '180px' },
  {
    key: 'consentGiven',
    label: 'Згода автора на публічне ім’я',
    type: 'boolean',
    hint: 'Без згоди публікувати з іменем не можна — приберіть ім’я або отримайте згоду.',
  },
  { key: 'description', label: 'Опис', type: 'textarea' },
  { key: 'subject', label: 'Предмет і клас', type: 'text' },
  { key: 'tool', label: 'Інструмент', type: 'text' },
  { key: 'moduleCode', label: 'Модуль', type: 'text' },
  { key: 'externalUrl', label: 'Посилання на роботу', type: 'text' },
  {
    key: 'coverImageKey',
    label: 'Обкладинка',
    type: 'text',
    hint: 'Ключ файлу в public/gallery/ — єдиний префікс, доступний гостям.',
  },
];

export default function GalleryAdmin() {
  return (
    <ResourceManager
      title="Галерея робіт"
      description="Опубліковані роботи видно всім, зокрема незалогіненим."
      fields={FIELDS}
      orderKey="order"
      labelKey="title"
      list={() => unwrap(client.models.GalleryItem.list({ limit: 500 }))}
      create={(v) => unwrap(client.models.GalleryItem.create(v as never))}
      update={(id, v) => unwrap(client.models.GalleryItem.update({ id, ...v } as never))}
      remove={(id) => unwrap(client.models.GalleryItem.delete({ id }))}
    />
  );
}
