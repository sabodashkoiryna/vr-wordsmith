import CrudTable from '../../../components/admin/CrudTable';
import type { CrudField } from '../../../components/admin/CrudTable';
import { client } from '../../../lib/amplify-client';
import { unwrap } from '../../../lib/unwrap';

/**
 * Галерея робіт.
 *
 * `publishState` і `consentGiven` — два окремі рішення, і їх навмисно не
 * зведено в один прапорець: робота може бути вартою показу, але без згоди
 * автора на публічне ім'я. Поки `consentGiven` не стоїть, публікувати з
 * іменем не можна — приберіть `authorDisplayName` або отримайте згоду.
 */
const fields: CrudField[] = [
  { key: 'order', label: '№', type: 'number' },
  { key: 'publishState', label: 'Стан', type: 'select', options: ['hidden', 'published'] },
  { key: 'title', label: 'Назва роботи', type: 'text' },
  { key: 'description', label: 'Опис', type: 'textarea' },
  { key: 'authorDisplayName', label: 'Ім’я автора (публічне)', type: 'text' },
  { key: 'consentGiven', label: 'Згода автора — true/false', type: 'text' },
  { key: 'subject', label: 'Предмет і клас', type: 'text' },
  { key: 'tool', label: 'Інструмент', type: 'text' },
  { key: 'moduleCode', label: 'Модуль', type: 'text' },
  { key: 'externalUrl', label: 'Посилання на роботу', type: 'text' },
  { key: 'coverImageKey', label: 'Ключ обкладинки у public/gallery/', type: 'text' },
];

export default function GalleryAdmin() {
  return (
    <CrudTable
      title="Галерея робіт"
      fields={fields}
      orderKey="order"
      list={() => unwrap(client.models.GalleryItem.list({ limit: 500 }))}
      create={(values) => unwrap(client.models.GalleryItem.create(values as never))}
      update={(id, values) => unwrap(client.models.GalleryItem.update({ id, ...values } as never))}
      remove={(id) => unwrap(client.models.GalleryItem.delete({ id }))}
    />
  );
}
