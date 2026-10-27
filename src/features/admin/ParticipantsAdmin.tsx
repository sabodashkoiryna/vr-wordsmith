import { useCallback, useEffect, useState } from 'react';
import Button from '../../ui/Button';
import ProgressBar from '../../ui/ProgressBar';
import { client } from '../../lib/amplify-client';
import { unwrap } from '../../lib/unwrap';

type Row = {
  id: string;
  email: string;
  fullName: string;
  institution: string | null;
  quizPoints: number;
  assignmentPoints: number;
  totalPoints: number;
  lessonsDone: number;
  submissionStatus: string | null;
  certificateNumber: string | null;
};

/**
 * Зареєстровані учасники: прогрес, бали, стан роботи, видача сертифіката.
 *
 * Бали беруться з CourseEnrollment — кешу, який пишуть грейдинг-функції. У
 * того, кого ще жодного разу не оцінювали, запису немає взагалі: це не
 * помилка, а нормальний стан новачка, тож рядок показує нулі, а не зникає.
 */
export default function ParticipantsAdmin() {
  const [rows, setRows] = useState<Row[]>([]);
  const [passing, setPassing] = useState(70);
  const [total, setTotal] = useState(100);
  const [freeNumbers, setFreeNumbers] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setError(null);
      const [profiles, enrollments, progress, submissions, certs, courses, numbers] =
        await Promise.all([
          unwrap(client.models.UserProfile.list({ limit: 1000 })),
          unwrap(client.models.CourseEnrollment.list({ limit: 1000 })),
          unwrap(client.models.LessonProgress.list({ limit: 5000 })),
          unwrap(client.models.AssignmentSubmission.list({ limit: 1000 })),
          unwrap(client.models.Certificate.list({ limit: 1000 })),
          unwrap(client.models.Course.list({ limit: 2 })),
          unwrap(client.models.CertificateNumber.list({ limit: 1000 })),
        ]);

      const course = courses[0];
      setPassing(course?.passingPoints ?? 70);
      setTotal(course?.totalPoints ?? 100);
      setFreeNumbers(numbers.filter((n) => n.status === 'free').length);

      const enrollByStudent = new Map(enrollments.map((e) => [e.studentId, e]));
      const certByStudent = new Map(certs.filter((c) => !c.revokedAt).map((c) => [c.studentId, c]));
      const doneByStudent = new Map<string, number>();
      for (const p of progress) {
        if (p.status !== 'completed') continue;
        doneByStudent.set(p.studentId, (doneByStudent.get(p.studentId) ?? 0) + 1);
      }
      const subByStudent = new Map(submissions.map((s) => [s.studentId, s]));

      setRows(
        profiles
          .map((p) => {
            const e = enrollByStudent.get(p.id);
            return {
              id: p.id,
              email: p.email,
              fullName: p.fullName,
              institution: p.institution ?? null,
              quizPoints: e?.quizPoints ?? 0,
              assignmentPoints: e?.assignmentPoints ?? 0,
              totalPoints: e?.totalPoints ?? 0,
              lessonsDone: doneByStudent.get(p.id) ?? 0,
              submissionStatus: subByStudent.get(p.id)?.status ?? null,
              certificateNumber: certByStudent.get(p.id)?.certificateNumber ?? null,
            };
          })
          .sort((a, b) => b.totalPoints - a.totalPoints),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не вдалося завантажити учасників');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function issue(row: Row) {
    if (
      !window.confirm(
        `Видати сертифікат: ${row.fullName}?\n\n` +
          `Балів: ${row.totalPoints} з ${total}. Буде використано найменший вільний номер із пулу. ` +
          'Скасувати видачу можна лише відкликанням сертифіката.',
      )
    ) {
      return;
    }
    setBusyId(row.id);
    setError(null);
    setNotice(null);
    try {
      const result = await unwrap(client.mutations.issueCertificate({ studentId: row.id }));
      if (!result?.eligible) {
        setError(
          result?.reason === 'insufficient_points'
            ? `Недостатньо балів: ${result?.totalPoints ?? 0} з потрібних ${passing}.`
            : 'Сертифікат не видано.',
        );
      } else if (result.reason === 'no_numbers_left') {
        setError('У пулі не лишилось вільних номерів — внесіть нові у вкладці «Сертифікати».');
      } else if (result.reason === 'already_issued') {
        setNotice(`Сертифікат уже був виданий: ${result.certificateNumber}.`);
      } else {
        setNotice(`Видано сертифікат ${result.certificateNumber} для ${row.fullName}.`);
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не вдалося видати сертифікат');
    } finally {
      setBusyId(null);
    }
  }

  if (loading) return <p className="text-ink-mute">Завантажуємо учасників…</p>;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <span className="rounded-full bg-space-700 px-4 py-2 font-mono text-2xs text-ink-mute">
          УЧАСНИКІВ: {rows.length}
        </span>
        <span className="rounded-full bg-space-700 px-4 py-2 font-mono text-2xs text-ink-mute">
          ПОРІГ: {passing} З {total}
        </span>
        <span
          className={`rounded-full bg-space-700 px-4 py-2 font-mono text-2xs ${
            freeNumbers === 0 ? 'text-warning' : 'text-success'
          }`}
        >
          ВІЛЬНИХ НОМЕРІВ: {freeNumbers}
        </span>
      </div>

      {error && <p className="mt-4 text-sm text-danger">{error}</p>}
      {notice && <p className="mt-4 text-sm text-success">{notice}</p>}

      {rows.length === 0 ? (
        <p className="mt-8 text-ink-mute">Ще ніхто не зареєструвався.</p>
      ) : (
        <ul className="mt-6 flex list-none flex-col gap-3 p-0">
          {rows.map((r) => {
            const eligible = r.totalPoints >= passing;
            return (
              <li key={r.id} className="rounded-[var(--radius-lg)] bg-space-800 p-5">
                <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                  <span className="text-ink">{r.fullName}</span>
                  <span className="font-mono text-2xs text-ink-mute">{r.email}</span>
                  {r.institution && (
                    <span className="font-mono text-2xs text-ink-mute">{r.institution}</span>
                  )}
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div>
                    <div className="flex flex-wrap gap-x-5 gap-y-1 font-mono text-2xs text-ink-mute">
                      <span>
                        ТЕСТИ <b className="text-ink">{r.quizPoints}</b>
                      </span>
                      <span>
                        ПРОЄКТ <b className="text-ink">{r.assignmentPoints}</b>
                      </span>
                      <span>
                        РАЗОМ{' '}
                        <b className={eligible ? 'text-success' : 'text-ink'}>{r.totalPoints}</b> /{' '}
                        {total}
                      </span>
                      <span>
                        УРОКІВ <b className="text-ink">{r.lessonsDone}</b>
                      </span>
                      {r.submissionStatus && <span>РОБОТА · {r.submissionStatus}</span>}
                    </div>
                    <div className="relative mt-3 max-w-md">
                      <ProgressBar
                        value={r.totalPoints}
                        max={total}
                        label={`Бали: ${r.fullName}`}
                        tone="gold"
                      />
                      <span
                        aria-hidden="true"
                        className="absolute -top-1 h-3.5 w-0.5 rounded-full bg-ink-mute"
                        style={{ left: `${(passing / total) * 100}%` }}
                      />
                    </div>
                  </div>

                  <div className="shrink-0">
                    {r.certificateNumber ? (
                      <span className="font-mono text-2xs text-gold">
                        ✓ {r.certificateNumber}
                      </span>
                    ) : eligible ? (
                      <Button onClick={() => issue(r)} disabled={busyId === r.id || freeNumbers === 0}>
                        {busyId === r.id ? 'Видаємо…' : 'Видати сертифікат'}
                      </Button>
                    ) : (
                      <span className="font-mono text-2xs text-ink-mute">
                        ще {passing - r.totalPoints} балів
                      </span>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
