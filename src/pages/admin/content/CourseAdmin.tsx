import { useState } from 'react';
import ResourceManager from '../../../features/admin/ui/ResourceManager';
import type { Field } from '../../../features/admin/ui/ResourceManager';
import { client } from '../../../lib/amplify-client';
import { unwrap } from '../../../lib/unwrap';

/**
 * Метадані курсу, переваги й викладач — усе, що живить лендінг і сертифікат.
 *
 * `totalPoints` і `passingPoints` тут редаговані навмисно: вони визначають,
 * коли видається сертифікат, і досі змінювалися лише сідом. Але правило, на
 * якому тримається курс, має лишатися: поріг МУСИТЬ бути вищим за суму балів
 * за тести, інакше сертифікат можна взяти, не здавши проєкт. Екран рахує цю
 * суму з самих тестів і попереджає, а не покладається на памʼять.
 */

const COURSE_FIELDS: Field[] = [
  { key: 'title', label: 'Назва', type: 'text', inTable: true, required: true },
  { key: 'slug', label: 'Slug', type: 'text', inTable: true, width: '160px', required: true },
  { key: 'totalPoints', label: 'Усього балів', type: 'number', inTable: true, width: '140px', required: true },
  {
    key: 'passingPoints',
    label: 'Поріг сертифіката',
    type: 'number',
    inTable: true,
    width: '170px',
    required: true,
    hint: 'Має бути ВИЩИМ за суму балів за всі тести — інакше сертифікат можна отримати, не здавши курсовий проєкт.',
  },
  { key: 'subtitle', label: 'Підзаголовок', type: 'textarea' },
  { key: 'summary', label: 'Опис', type: 'textarea' },
  { key: 'hours', label: 'Годин', type: 'number' },
  { key: 'ectsCredits', label: 'Кредитів ЄКТС', type: 'number' },
  { key: 'isPublished', label: 'Опубліковано', type: 'boolean' },
];

const BENEFIT_FIELDS: Field[] = [
  { key: 'order', label: '№', type: 'number', inTable: true, width: '70px', required: true },
  { key: 'title', label: 'Заголовок', type: 'text', inTable: true, required: true },
  { key: 'text', label: 'Текст', type: 'textarea', inTable: true, required: true },
];

const INSTRUCTOR_FIELDS: Field[] = [
  { key: 'order', label: '№', type: 'number', inTable: true, width: '70px', required: true },
  { key: 'fullName', label: 'ПІБ', type: 'text', inTable: true, required: true },
  { key: 'position', label: 'Посада', type: 'text', inTable: true },
  { key: 'affiliation', label: 'Заклад', type: 'text' },
  { key: 'bio', label: 'Про викладача', type: 'textarea' },
  { key: 'initials', label: 'Ініціали', type: 'text', hint: 'Запасний варіант, якщо фото немає.' },
  {
    key: 'photoKey',
    label: 'Фото',
    type: 'image',
    prefix: 'public/media/',
    hint: 'Лягає в public/media/ — префікс, відкритий гостям на читання.',
  },
];

export default function CourseAdmin() {
  const [tab, setTab] = useState<'course' | 'benefits' | 'instructors'>('course');
  const [quizTotal, setQuizTotal] = useState<number | null>(null);

  return (
    <div>
      <div className="mb-6 flex flex-wrap gap-2">
        {(
          [
            ['course', 'Курс'],
            ['benefits', 'Переваги'],
            ['instructors', 'Викладачі'],
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

      {tab === 'course' && quizTotal !== null && (
        <p className="mb-4 rounded-[var(--radius-sm)] bg-space-700 p-3.5 text-sm text-ink-soft">
          Тести зараз дають разом <b className="text-ink">{quizTotal}</b> балів. Поріг нижчий або
          рівний цьому числу зробить курсовий проєкт необовʼязковим.
        </p>
      )}

      {tab === 'course' ? (
        <ResourceManager
          title="Курс"
          description="Один запис. Назва й години потрапляють у сертифікат — зміна не переписує вже видані, вони зберігають снапшот."
          fields={COURSE_FIELDS}
          labelKey="title"
          list={async () => {
            // Заразом рахуємо суму балів за тести — без неї поріг
            // редагувався б наосліп.
            const [courses, quizzes] = await Promise.all([
              unwrap(client.models.Course.list({ limit: 5 })),
              unwrap(client.models.Quiz.list({ limit: 200 })),
            ]);
            setQuizTotal(quizzes.reduce((s, q) => s + q.maxPoints, 0));
            return courses;
          }}
          create={(v) => unwrap(client.models.Course.create(v as never))}
          update={(id, v) => unwrap(client.models.Course.update({ id, ...v } as never))}
          remove={(id) => unwrap(client.models.Course.delete({ id }))}
        />
      ) : tab === 'benefits' ? (
        <ResourceManager
          title="Переваги курсу"
          description="Плитки «що ви отримаєте» на лендінгу."
          fields={BENEFIT_FIELDS}
          orderKey="order"
          labelKey="title"
          list={() => unwrap(client.models.CourseBenefit.list({ limit: 100 }))}
          create={(v) => unwrap(client.models.CourseBenefit.create(v as never))}
          update={(id, v) => unwrap(client.models.CourseBenefit.update({ id, ...v } as never))}
          remove={(id) => unwrap(client.models.CourseBenefit.delete({ id }))}
        />
      ) : (
        <ResourceManager
          title="Викладачі"
          description="Перший за порядком підписує сертифікат."
          fields={INSTRUCTOR_FIELDS}
          orderKey="order"
          labelKey="fullName"
          list={() => unwrap(client.models.Instructor.list({ limit: 100 }))}
          create={(v) => unwrap(client.models.Instructor.create(v as never))}
          update={(id, v) => unwrap(client.models.Instructor.update({ id, ...v } as never))}
          remove={(id) => unwrap(client.models.Instructor.delete({ id }))}
        />
      )}
    </div>
  );
}
