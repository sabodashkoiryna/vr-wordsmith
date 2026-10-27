import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { client } from '../../lib/amplify-client';
import { unwrap } from '../../lib/unwrap';
import { Banner, PageHeader } from '../../features/admin/ui/adminUi';

type Stats = {
  modules: number;
  lessons: number;
  questions: number;
  participants: number;
  toGrade: number;
  certificates: number;
  freeNumbers: number;
  galleryPublished: number;
};

/**
 * Огляд. Показує не «скільки чого є», а що зараз потребує дії: роботи в
 * черзі й залишок номерів. Решта лічильників — для контролю, що контент на
 * місці після сіду чи правок.
 */
export default function AdminDashboard() {
  const [s, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [modules, lessons, questions, profiles, submissions, certs, numbers, gallery] =
          await Promise.all([
            unwrap(client.models.Module.list({ limit: 200 })),
            unwrap(client.models.Lesson.list({ limit: 500 })),
            unwrap(client.models.QuizQuestion.list({ limit: 500 })),
            unwrap(client.models.UserProfile.list({ limit: 1000 })),
            unwrap(client.models.AssignmentSubmission.list({ limit: 1000 })),
            unwrap(client.models.Certificate.list({ limit: 1000 })),
            unwrap(client.models.CertificateNumber.list({ limit: 1000 })),
            unwrap(client.models.GalleryItem.list({ limit: 500 })),
          ]);
        setStats({
          modules: modules.length,
          lessons: lessons.length,
          questions: questions.length,
          participants: profiles.length,
          toGrade: submissions.filter((x) => x.status === 'submitted').length,
          certificates: certs.filter((c) => !c.revokedAt).length,
          freeNumbers: numbers.filter((n) => n.status === 'free').length,
          galleryPublished: gallery.filter((g) => g.publishState === 'published').length,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Не вдалося завантажити зведення');
      }
    })();
  }, []);

  return (
    <div>
      <PageHeader
        title="Огляд"
        description="Стан курсу й те, що чекає на вашу дію."
      />

      {error && <Banner tone="error">{error}</Banner>}

      {!s ? (
        <p className="text-ink-mute">Завантажуємо…</p>
      ) : (
        <>
          {(s.toGrade > 0 || s.freeNumbers === 0) && (
            <div className="mb-8 flex flex-col gap-3">
              {s.toGrade > 0 && (
                <Link
                  to="/admin/grading"
                  className="flex items-center gap-4 rounded-[var(--radius-lg)] bg-space-800 p-5 no-underline transition-colors hover:bg-space-700"
                >
                  <span className="font-display text-2xl text-warning">{s.toGrade}</span>
                  <span className="flex-1 text-ink-soft">
                    {s.toGrade === 1 ? 'робота чекає' : 'робіт чекають'} на перевірку
                  </span>
                  <span className="font-mono text-2xs text-violet-300">до черги →</span>
                </Link>
              )}
              {s.freeNumbers === 0 && (
                <Link
                  to="/admin/certificates"
                  className="flex items-center gap-4 rounded-[var(--radius-lg)] bg-space-800 p-5 no-underline transition-colors hover:bg-space-700"
                >
                  <span className="font-display text-2xl text-danger">0</span>
                  <span className="flex-1 text-ink-soft">
                    вільних номерів сертифікатів — видача недоступна
                  </span>
                  <span className="font-mono text-2xs text-violet-300">внести номери →</span>
                </Link>
              )}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Tile label="УЧАСНИКІВ" value={s.participants} to="/admin/participants" />
            <Tile label="СЕРТИФІКАТІВ ВИДАНО" value={s.certificates} to="/admin/certificates" />
            <Tile label="ВІЛЬНИХ НОМЕРІВ" value={s.freeNumbers} to="/admin/certificates" />
            <Tile label="У ГАЛЕРЕЇ" value={s.galleryPublished} to="/admin/gallery" />
            <Tile label="МОДУЛІВ" value={s.modules} to="/admin/modules" />
            <Tile label="УРОКІВ" value={s.lessons} to="/admin/lessons" />
            <Tile label="ПИТАНЬ У ТЕСТАХ" value={s.questions} />
            <Tile label="НА ПЕРЕВІРЦІ" value={s.toGrade} to="/admin/grading" />
          </div>
        </>
      )}
    </div>
  );
}

function Tile({ label, value, to }: { label: string; value: number; to?: string }) {
  const body = (
    <>
      <div className="font-mono text-2xs tracking-widest text-ink-mute">{label}</div>
      <div className="mt-2 font-display text-2xl text-ink">{value}</div>
    </>
  );
  return to ? (
    <Link
      to={to}
      className="rounded-[var(--radius-lg)] bg-space-800 p-5 no-underline transition-colors hover:bg-space-700"
    >
      {body}
    </Link>
  ) : (
    <div className="rounded-[var(--radius-lg)] bg-space-800 p-5">{body}</div>
  );
}
