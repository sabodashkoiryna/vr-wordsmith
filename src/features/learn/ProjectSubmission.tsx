import { useCallback, useEffect, useState } from 'react';
import Button from '../../ui/Button';
import Field from '../../ui/Field';
import { client } from '../../lib/amplify-client';
import { unwrap } from '../../lib/unwrap';
import { useAuth } from '../../context/AuthContext';

type Submission = {
  id: string;
  title: string;
  description: string | null;
  externalUrl: string | null;
  fileKeys: string[];
  status: string;
  submittedAt: string | null;
};

type Upload = { name: string; key: string };

const MAX_MB = 50;

/**
 * Імпорт динамічний, хоча сьогодні виграшу в вазі не дає: storage усе одно
 * потрапляє в чанк vendor-amplify, який прелоадиться з index.html (див.
 * коментар у vite.config.ts). Лишаємо саме таким, бо щойно amplify-client
 * перейде на ліниву getClient(), цей рядок почне відколювати ~36 КБ gz без
 * жодних додаткових змін — а зворотний перехід довелося б помітити й зробити.
 */
const storage = () => import('aws-amplify/storage');

/**
 * Здача курсового проєкту.
 *
 * Матеріали лежать у `submissions/{entity_id}/*`, де {entity_id} — identityId
 * з Identity Pool, а НЕ Cognito sub. Тому реальні ключі зберігаються в
 * AssignmentSubmission.fileKeys: відновити шлях із самого лише studentId
 * неможливо, і без цього списку викладач не знайшов би, що перевіряти.
 *
 * Оцінки тут немає й бути не може: AssignmentSubmission взагалі не має поля
 * з балом (на відміну від PoC, де власник міг вписати собі оцінку). Бал живе
 * в AssignmentGrade, який пише лише Lambda.
 */
export default function ProjectSubmission({
  assignmentId,
  allowExternalLink,
  onChanged,
}: {
  assignmentId: string;
  allowExternalLink: boolean;
  onChanged: () => void;
}) {
  const { userId } = useAuth();
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [externalUrl, setExternalUrl] = useState('');
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      // Через індекс, а не list із фільтром: із фільтром `limit` обмежує
      // кількість переглянутих рядків, і малий ліміт повернув би порожньо —
      // тобто здача створювала б друге подання замість оновлення першого.
      const rows = await unwrap(
        client.models.AssignmentSubmission.listAssignmentSubmissionByStudentIdAndAssignmentId({
          studentId: userId ?? '',
          assignmentId: { eq: assignmentId },
        }),
      );
      const row = rows[0];
      if (row) {
        const keys = (row.fileKeys ?? []).filter((k): k is string => !!k);
        setSubmission({
          id: row.id,
          title: row.title,
          description: row.description ?? null,
          externalUrl: row.externalUrl ?? null,
          fileKeys: keys,
          status: row.status,
          submittedAt: row.submittedAt ?? null,
        });
        setTitle(row.title);
        setDescription(row.description ?? '');
        setExternalUrl(row.externalUrl ?? '');
        setUploads(keys.map((k) => ({ name: k.split('/').pop() ?? k, key: k })));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не вдалося завантажити подання');
    } finally {
      setLoaded(true);
    }
  }, [assignmentId, userId]);

  useEffect(() => {
    void load();
  }, [load]);

  // Після здачі редагувати не можна — інакше робота могла б змінитися вже
  // під час перевірки. Повернуту на доопрацювання відкриваємо знову.
  const locked = submission?.status === 'submitted' || submission?.status === 'graded';

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    for (const file of Array.from(files)) {
      if (file.size > MAX_MB * 1024 * 1024) {
        setError(`«${file.name}» більший за ${MAX_MB} МБ — завантажте меншим або дайте посилання.`);
        continue;
      }
      try {
        setUploading(file.name);
        // Ім'я файлу лишаємо в ключі: без нього викладач бачив би набір
        // хешів. Мітка часу спереду розводить однойменні файли з різних
        // спроб — інакше друге завантаження мовчки затерло б перше.
        const name = `${Date.now()}-${file.name}`;
        const { uploadData } = await storage();
        const result = await uploadData({
          path: ({ identityId }) => `submissions/${identityId}/${name}`,
          data: file,
        }).result;
        setUploads((prev) => [...prev, { name: file.name, key: result.path }]);
      } catch (err) {
        setError(err instanceof Error ? err.message : `Не вдалося завантажити «${file.name}»`);
      } finally {
        setUploading(null);
      }
    }
  }

  async function dropFile(u: Upload) {
    setError(null);
    try {
      const { remove } = await storage();
      await remove({ path: u.key });
    } catch {
      // Файл міг не долетіти або вже зникнути — зі списку прибираємо все одно,
      // інакше подання посилалося б на те, чого немає.
    }
    setUploads((prev) => prev.filter((x) => x.key !== u.key));
  }

  async function save(status: 'draft' | 'submitted') {
    if (!userId) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        externalUrl: externalUrl.trim() || null,
        fileKeys: uploads.map((u) => u.key),
        status,
        submittedAt: status === 'submitted' ? new Date().toISOString() : null,
      };
      if (submission) {
        await unwrap(client.models.AssignmentSubmission.update({ id: submission.id, ...payload }));
      } else {
        await unwrap(
          client.models.AssignmentSubmission.create({
            studentId: userId,
            assignmentId,
            ...payload,
          }),
        );
      }
      setNotice(status === 'submitted' ? 'Роботу здано на перевірку.' : 'Чернетку збережено.');
      await load();
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не вдалося зберегти');
    } finally {
      setBusy(false);
    }
  }

  if (!loaded) return <p className="text-ink-mute">Завантажуємо…</p>;

  const nothingToSubmit = !title.trim() || (uploads.length === 0 && !externalUrl.trim());

  return (
    <div className="rounded-[var(--radius-lg)] bg-space-800 p-6 md:p-8">
      <h2 className="text-xl text-ink">Здати роботу</h2>

      {locked ? (
        <p className="mt-3 text-ink-soft">
          {submission?.status === 'graded'
            ? 'Роботу перевірено. Щоб здати нову версію, зверніться до викладача.'
            : 'Роботу здано й вона чекає на перевірку. Змінити її вже не можна.'}
        </p>
      ) : (
        <p className="mt-3 max-w-2xl text-ink-soft">
          Прикріпіть технологічну карту файлом, а VR-продукт і відеозапис —
          посиланнями. Поки не натиснете «Здати», робота лишається чернеткою і
          видима лише вам.
        </p>
      )}

      <div className="mt-6 flex flex-col gap-5">
        <Field
          label="НАЗВА РОБОТИ"
          required
          disabled={locked}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          hint="Наприклад: «Тіні забутих предків»: VR-мандрівка Карпатами"
        />

        <label className="flex flex-col gap-2">
          <span className="font-mono text-2xs tracking-widest text-ink-mute">ОПИС</span>
          <textarea
            rows={5}
            disabled={locked}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Тема уроку, клас, що саме робить VR-епізод і чому саме він."
            className="w-full rounded-[var(--radius-sm)] border-0 bg-space-700 p-4 text-ink shadow-[inset_0_0_0_1px_var(--line)] outline-none placeholder:text-ink-dim focus:shadow-[var(--ring-focus)] disabled:opacity-60"
          />
        </label>

        {allowExternalLink && (
          <Field
            label="ПОСИЛАННЯ НА VR-ПРОДУКТ І ВІДЕО"
            disabled={locked}
            value={externalUrl}
            onChange={(e) => setExternalUrl(e.target.value)}
            hint="CoSpaces Edu / ThingLink / 360°-тур, і посилання на відеозапис мікровикладання"
          />
        )}

        <div>
          <span className="font-mono text-2xs tracking-widest text-ink-mute">
            ФАЙЛИ · ДО {MAX_MB} МБ КОЖЕН
          </span>

          {uploads.length > 0 && (
            <ul className="mt-3 flex list-none flex-col gap-2 p-0">
              {uploads.map((u) => (
                <li
                  key={u.key}
                  className="flex items-center gap-3 rounded-[var(--radius-sm)] bg-space-700 px-4 py-2.5"
                >
                  <span className="flex-1 truncate text-sm text-ink">{u.name}</span>
                  {!locked && (
                    <button
                      type="button"
                      onClick={() => dropFile(u)}
                      className="cursor-pointer border-none bg-transparent font-mono text-2xs text-ink-mute hover:text-danger"
                    >
                      прибрати
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}

          {!locked && (
            <label className="mt-3 flex cursor-pointer items-center justify-center rounded-[var(--radius-sm)] border-2 border-dashed border-[var(--line-strong)] px-4 py-6 text-sm text-ink-soft transition-colors hover:border-[var(--line-glow)] hover:bg-space-700">
              <input
                type="file"
                multiple
                className="sr-only"
                onChange={(e) => {
                  void handleFiles(e.target.files);
                  e.target.value = '';
                }}
              />
              {uploading ? `Завантажуємо «${uploading}»…` : 'Обрати файли'}
            </label>
          )}
        </div>
      </div>

      {error && <p className="mt-5 text-sm text-danger">{error}</p>}
      {notice && <p className="mt-5 text-sm text-success">{notice}</p>}

      {!locked && (
        <div className="mt-7 flex flex-wrap items-center gap-3">
          <Button onClick={() => save('submitted')} disabled={busy || nothingToSubmit} size="lg">
            {busy ? 'Зберігаємо…' : 'Здати на перевірку'}
          </Button>
          <Button onClick={() => save('draft')} disabled={busy || !title.trim()} variant="ghost">
            Зберегти чернетку
          </Button>
          {nothingToSubmit && (
            <span className="text-sm text-ink-mute">
              Потрібні назва і хоча б один файл або посилання.
            </span>
          )}
        </div>
      )}
    </div>
  );
}
