import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Button from '../../ui/Button';
import ProgressBar from '../../ui/ProgressBar';
import { client } from '../../lib/amplify-client';
import { unwrap } from '../../lib/unwrap';
import { useAuth } from '../../context/AuthContext';
import { useCourseTree, type ModuleNode } from './useCourseTree';
import { findLesson, flatten, KIND_LABEL, lessonHref } from './lessonMeta';
import { READING_THEMES, useReadingTheme } from './readingTheme';
import LessonContent from './LessonContent';

type LessonBody = { contentMarkdown: string | null; videoUrl: string | null };

/** Бічне дерево курсу. На мобільному згортається в <details>, щоб не з'їдати екран. */
function CourseSidebar({
  modules,
  currentId,
}: {
  modules: ModuleNode[];
  currentId: string;
}) {
  return (
    <nav aria-label="Структура курсу" className="flex flex-col gap-5">
      {modules.map((m) => (
        <div key={m.id}>
          <div className="flex items-center justify-between gap-2 px-3">
            <span className="font-mono text-2xs tracking-widest text-violet-300">{m.code}</span>
            <span className="font-mono text-2xs text-ink-mute">
              {m.completedCount}/{m.lessons.length}
            </span>
          </div>
          <p className="mt-1 px-3 text-sm text-ink-soft">{m.title}</p>
          <ul className="mt-2 list-none p-0">
            {m.lessons.map((l) => {
              const active = l.id === currentId;
              return (
                <li key={l.id}>
                  <Link
                    to={lessonHref(m, l)}
                    aria-current={active ? 'page' : undefined}
                    className={`flex items-start gap-2.5 rounded-[var(--radius-sm)] px-3 py-2 text-sm no-underline transition-colors ${
                      active ? 'bg-space-600 text-ink' : 'text-ink-soft hover:bg-space-700'
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full text-[9px] ${
                        l.completed ? 'bg-success text-space-900' : 'bg-space-500 text-ink-mute'
                      }`}
                    >
                      {l.completed ? '✓' : ''}
                    </span>
                    <span className="flex-1">{l.title}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export default function LessonPage() {
  const { moduleOrder, lessonSlug } = useParams();
  const { userId } = useAuth();
  const { tree, error, reload } = useCourseTree();
  const { theme, setTheme } = useReadingTheme();

  const [body, setBody] = useState<LessonBody | null>(null);
  const [bodyError, setBodyError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const found = tree ? findLesson(tree.modules, moduleOrder, lessonSlug) : null;
  const lessonId = found?.lesson.id ?? null;

  // Текст уроку тягнемо окремо: у дереві його немає навмисно, інакше список
  // модулів волочив би за собою всі лекції курсу цілком.
  useEffect(() => {
    if (!lessonId) return;
    let cancelled = false;
    (async () => {
      try {
        setBodyError(null);
        setBody(null);
        const data = await unwrap(client.models.Lesson.get({ id: lessonId }));
        if (!cancelled) {
          setBody({ contentMarkdown: data?.contentMarkdown ?? null, videoUrl: data?.videoUrl ?? null });
        }
      } catch (err) {
        if (!cancelled) setBodyError(err instanceof Error ? err.message : 'Не вдалося завантажити урок');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [lessonId]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [lessonId]);

  const markComplete = useCallback(async () => {
    if (!userId || !found) return;
    setSaving(true);
    setSaveError(null);
    try {
      const existing = await unwrap(
        client.models.LessonProgress.list({
          filter: { lessonId: { eq: found.lesson.id } },
          limit: 1,
        }),
      );
      const payload = {
        status: 'completed' as const,
        completedAt: new Date().toISOString(),
      };
      if (existing[0]) {
        await unwrap(client.models.LessonProgress.update({ id: existing[0].id, ...payload }));
      } else {
        await unwrap(
          client.models.LessonProgress.create({
            studentId: userId,
            lessonId: found.lesson.id,
            moduleId: found.module.id,
            ...payload,
          }),
        );
      }
      await reload();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Не вдалося зберегти прогрес');
    } finally {
      setSaving(false);
    }
  }, [userId, found, reload]);

  if (error) {
    return (
      <section className="container-content py-24">
        <h1 className="text-2xl text-ink">Курс не завантажився</h1>
        <p className="mt-3 text-ink-soft">{error}</p>
      </section>
    );
  }

  if (!tree) {
    return (
      <section className="container-content py-24">
        <p className="text-ink-mute">Завантажуємо урок…</p>
      </section>
    );
  }

  if (!found) {
    return (
      <section className="container-content py-24">
        <h1 className="text-2xl text-ink">Урок не знайдено</h1>
        <p className="mt-3 text-ink-soft">Можливо, його перейменували або прибрали з курсу.</p>
        <Button as={Link} to="/learn" className="mt-6">
          До структури курсу
        </Button>
      </section>
    );
  }

  const { module, lesson, index } = found;
  const flat = flatten(tree.modules);
  const prev = index > 0 ? flat[index - 1] : null;
  const next = index < flat.length - 1 ? flat[index + 1] : null;
  const notYetBuilt = lesson.kind === 'quiz' || lesson.kind === 'assignment';

  return (
    <div className="container-wide grid gap-8 py-10 lg:grid-cols-[280px_1fr] lg:py-14">
      <aside className="lg:sticky lg:top-24 lg:max-h-[calc(100vh-8rem)] lg:self-start lg:overflow-y-auto">
        <div className="mb-4 px-3">
          <Link to="/learn" className="font-mono text-2xs text-ink-mute no-underline hover:text-ink">
            ← Уся структура
          </Link>
          <ProgressBar
            value={tree.completedCount}
            max={tree.lessonCount}
            label="Загальний прогрес курсу"
            className="mt-3"
          />
        </div>

        {/* На вузькому екрані дерево згорнуте: інакше до самого уроку треба
            прокрутити весь курс. */}
        <details className="lg:hidden">
          <summary className="cursor-pointer rounded-[var(--radius-sm)] bg-space-800 px-3 py-2.5 font-mono text-2xs tracking-widest text-ink-soft">
            ЗМІСТ КУРСУ
          </summary>
          <div className="mt-3">
            <CourseSidebar modules={tree.modules} currentId={lesson.id} />
          </div>
        </details>
        <div className="hidden lg:block">
          <CourseSidebar modules={tree.modules} currentId={lesson.id} />
        </div>
      </aside>

      <main className="min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-space-600 px-2.5 py-1 font-mono text-2xs tracking-widest text-violet-300">
              {module.code}
            </span>
            <span className="font-mono text-2xs text-ink-mute">
              {KIND_LABEL[lesson.kind]}
              {lesson.durationMinutes ? ` · ${lesson.durationMinutes} хв` : ''}
            </span>
          </div>

          <div
            className="flex items-center gap-1 rounded-full bg-space-800 p-1"
            role="group"
            aria-label="Тема читання"
          >
            {READING_THEMES.map((t) => (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                aria-pressed={theme === t.id}
                className={`cursor-pointer rounded-full border-none px-3 py-1.5 font-mono text-2xs transition-colors ${
                  theme === t.id ? 'bg-space-500 text-ink' : 'bg-transparent text-ink-mute hover:text-ink'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <h1 className="mt-4 text-2xl text-ink">{lesson.title}</h1>
        {lesson.summary && <p className="mt-3 max-w-2xl text-ink-soft">{lesson.summary}</p>}

        {body?.videoUrl && (
          <div className="mt-7 aspect-video overflow-hidden rounded-[var(--radius-lg)] bg-space-800">
            <iframe
              src={body.videoUrl}
              title={lesson.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="h-full w-full border-0"
            />
          </div>
        )}
        {lesson.kind === 'video' && !body?.videoUrl && (
          <div className="mt-7 grid aspect-video place-items-center rounded-[var(--radius-lg)] bg-space-800 text-center">
            <p className="max-w-sm px-6 text-sm text-ink-mute">
              Відеоверсія цієї лекції ще записується. Нижче — той самий матеріал текстом.
            </p>
          </div>
        )}

        <div
          className="reading mt-7 rounded-[var(--radius-lg)] p-6 md:p-10"
          data-reading-theme={theme}
        >
          {bodyError && <p className="text-danger">{bodyError}</p>}
          {!bodyError && !body && <p className="text-ink-mute">Завантажуємо текст…</p>}
          {body?.contentMarkdown && <LessonContent markdown={body.contentMarkdown} />}
          {body && !body.contentMarkdown && (
            <p className="text-ink-mute">Текст цього уроку ще готується.</p>
          )}
        </div>

        {notYetBuilt && (
          <p className="mt-5 rounded-[var(--radius-sm)] bg-space-700 p-4 text-sm text-ink-soft">
            {lesson.kind === 'quiz'
              ? 'Проходження тесту з’явиться тут найближчим оновленням. Поки що ознайомтеся з умовами вище.'
              : 'Форма здачі практичної з’явиться тут найближчим оновленням. Поки що ознайомтеся із завданням і критеріями вище.'}
          </p>
        )}

        {saveError && <p className="mt-5 text-sm text-danger">{saveError}</p>}

        <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-[var(--line)] pt-6">
          {prev ? (
            <Button as={Link} to={lessonHref(prev.module, prev.lesson)} variant="ghost">
              ← Назад
            </Button>
          ) : (
            <span />
          )}

          {lesson.completed ? (
            <span className="font-mono text-2xs text-success">✓ Урок пройдено</span>
          ) : (
            <Button onClick={markComplete} disabled={saving}>
              {saving ? 'Зберігаємо…' : 'Позначити пройденим'}
            </Button>
          )}

          {next && (
            <Button
              as={Link}
              to={lessonHref(next.module, next.lesson)}
              variant="ghost"
              className="ml-auto"
            >
              Далі →
            </Button>
          )}
        </div>
      </main>
    </div>
  );
}
