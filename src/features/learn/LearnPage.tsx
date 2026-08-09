import { Link } from 'react-router-dom';
import ProgressBar from '../../ui/ProgressBar';
import { Reveal } from '../../ui/motion/Reveal';
import { useAuth } from '../../context/AuthContext';
import { useCourseTree, type LessonNode, type ModuleNode } from './useCourseTree';
import { KIND_LABEL, lessonHref } from './lessonMeta';

const COMPONENT_TONE: Record<string, string> = {
  М: 'var(--color-chip-m)',
  К: 'var(--color-chip-k)',
  Д: 'var(--color-chip-d)',
  Р: 'var(--color-chip-r)',
};

function LessonRow({ module, lesson }: { module: ModuleNode; lesson: LessonNode }) {
  return (
    <li>
      <Link
        to={lessonHref(module, lesson)}
        className="flex items-center gap-3 rounded-[var(--radius-sm)] px-3 py-2.5 no-underline transition-colors hover:bg-space-600"
      >
        <span
          aria-hidden="true"
          className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] ${
            lesson.completed ? 'bg-success text-space-900' : 'bg-space-500 text-ink-mute'
          }`}
        >
          {lesson.completed ? '✓' : ''}
        </span>
        <span className="flex-1 text-md text-ink">{lesson.title}</span>
        <span className="font-mono text-2xs whitespace-nowrap text-ink-mute">
          {KIND_LABEL[lesson.kind]}
          {lesson.durationMinutes ? ` · ${lesson.durationMinutes} хв` : ''}
        </span>
      </Link>
    </li>
  );
}

function ModuleCard({ module, index }: { module: ModuleNode; index: number }) {
  const total = module.lessons.length;
  return (
    <Reveal delay={index} as="section" className="rounded-[var(--radius-lg)] bg-space-800 p-6 md:p-7">
      <div className="flex flex-wrap items-center gap-3">
        <span
          className="rounded-full px-2.5 py-1 font-mono text-2xs tracking-widest"
          style={{
            color: COMPONENT_TONE[module.component ?? ''] ?? 'var(--color-violet-300)',
            background: 'var(--color-space-600)',
          }}
        >
          {module.code}
        </span>
        <span className="font-mono text-2xs text-ink-mute">
          {module.quizPoints + module.assignmentPoints} балів
        </span>
      </div>

      <h2 className="mt-3 text-xl text-ink">{module.title}</h2>
      {module.summary && <p className="mt-2 max-w-2xl text-ink-soft">{module.summary}</p>}

      <div className="mt-5 flex items-center gap-3">
        <ProgressBar
          value={module.completedCount}
          max={total}
          label={`Прогрес модуля ${module.code}`}
          className="flex-1"
        />
        <span className="font-mono text-2xs whitespace-nowrap text-ink-mute">
          {module.completedCount}/{total}
        </span>
      </div>

      {total > 0 ? (
        <ul className="mt-4 -mx-3 list-none p-0">
          {module.lessons.map((l) => (
            <LessonRow key={l.id} module={module} lesson={l} />
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-ink-mute">Уроки цього модуля ще готуються.</p>
      )}
    </Reveal>
  );
}

export default function LearnPage() {
  const { fullName, profileError } = useAuth();
  const { tree, error } = useCourseTree();

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
        <p className="text-ink-mute">Завантажуємо курс…</p>
      </section>
    );
  }

  // Перший непройдений урок у порядку курсу — те, куди веде «Продовжити».
  let next: { module: ModuleNode; lesson: LessonNode } | null = null;
  for (const m of tree.modules) {
    const l = m.lessons.find((x) => !x.completed);
    if (l) {
      next = { module: m, lesson: l };
      break;
    }
  }

  const started = tree.completedCount > 0;

  return (
    <div className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -top-40 h-[420px]"
        style={{ background: 'var(--grad-glow-radial)' }}
      />

      <section className="container-content relative pt-14 pb-10 md:pt-20">
        <div className="font-mono text-2xs tracking-widest text-violet-300">Мій курс</div>
        <h1 className="mt-3 text-3xl text-ink">
          {fullName ? `Вітаємо, ${fullName.split(' ')[0]}` : 'Вітаємо'}
        </h1>

        {profileError && (
          <p className="mt-4 max-w-2xl rounded-[var(--radius-sm)] bg-space-700 p-4 text-sm text-warning">
            Профіль не зберігся: {profileError}. Курс працює, але сертифікат буде без
            вашого імені — перезайдіть в акаунт, щоб повторити спробу.
          </p>
        )}

        {tree.modules.length === 0 ? (
          <p className="mt-6 max-w-2xl text-ink-soft">
            Курс ще наповнюється. Щойно з'являться модулі, вони будуть тут.
          </p>
        ) : (
          <>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:max-w-3xl">
              <div className="rounded-[var(--radius-lg)] bg-space-800 p-6">
                <div className="font-mono text-2xs tracking-widest text-ink-mute">УРОКИ</div>
                <div className="mt-2 font-display text-2xl text-ink">
                  {tree.completedCount}
                  <span className="text-ink-mute"> / {tree.lessonCount}</span>
                </div>
                <ProgressBar
                  value={tree.completedCount}
                  max={tree.lessonCount}
                  label="Загальний прогрес курсу"
                  className="mt-4"
                />
              </div>

              <div className="rounded-[var(--radius-lg)] bg-space-800 p-6">
                <div className="font-mono text-2xs tracking-widest text-ink-mute">БАЛИ</div>
                <div className="mt-2 font-display text-2xl text-ink">
                  {tree.points?.total ?? 0}
                  <span className="text-ink-mute"> / {tree.totalPoints}</span>
                </div>
                <ProgressBar
                  value={tree.points?.total ?? 0}
                  max={tree.totalPoints}
                  label="Набрані бали"
                  tone="gold"
                  className="mt-4"
                />
                <p className="mt-3 text-sm text-ink-mute">
                  Сертифікат — від {tree.passingPoints} балів. Тести оцінюються автоматично,
                  проєкт — викладачем.
                </p>
              </div>
            </div>

            {next ? (
              /* Картка, а не самотня кнопка: «Продовжити» без назви уроку не
                 каже, куди веде, і людина натискає наосліп. Тут одразу видно
                 модуль, урок і скільки він триває. */
              <Link
                to={lessonHref(next.module, next.lesson)}
                className="group mt-8 flex flex-col gap-5 rounded-[var(--radius-lg)] bg-space-800 p-6 no-underline transition-colors hover:bg-space-700 sm:flex-row sm:items-center sm:justify-between md:p-7 lg:max-w-3xl"
              >
                <div className="min-w-0">
                  <div className="font-mono text-2xs tracking-widest text-violet-300">
                    {started ? 'ПРОДОВЖИТИ З МІСЦЯ' : 'ПОЧАТИ КУРС'}
                  </div>
                  <div className="mt-2.5 text-lg text-ink">{next.lesson.title}</div>
                  <div className="mt-1.5 font-mono text-2xs text-ink-mute">
                    {next.module.code} · {KIND_LABEL[next.lesson.kind]}
                    {next.lesson.durationMinutes ? ` · ${next.lesson.durationMinutes} хв` : ''}
                  </div>
                </div>
                <span
                  aria-hidden="true"
                  className="btn-aurora inline-flex shrink-0 items-center gap-2 rounded-full px-6 py-3.5 font-mono text-xs tracking-[0.04em] whitespace-nowrap text-white transition-[filter] group-hover:brightness-115"
                >
                  {started ? 'Продовжити' : 'Почати'} →
                </span>
              </Link>
            ) : (
              <div className="mt-8 rounded-[var(--radius-lg)] bg-space-800 p-6 md:p-7 lg:max-w-3xl">
                <div className="font-mono text-2xs tracking-widest text-success">
                  УСІ УРОКИ ПРОЙДЕНО
                </div>
                <p className="mt-2.5 text-ink-soft">
                  {(tree.points?.total ?? 0) >= tree.passingPoints
                    ? 'Порогу сертифіката досягнуто.'
                    : `Лишилось набрати ${tree.passingPoints - (tree.points?.total ?? 0)} балів до сертифіката.`}
                </p>
              </div>
            )}
          </>
        )}
      </section>

      <section className="container-content relative flex flex-col gap-5 pb-24">
        {tree.modules.map((m, i) => (
          <ModuleCard key={m.id} module={m} index={i} />
        ))}

        {/* Проєкт окремим блоком, а не шостим модулем: він не додає знань, він
            їх підсумовує — і саме він вирішує, буде сертифікат чи ні. */}
        {tree.project && (
          <Reveal as="section" className="rounded-[var(--radius-lg)] bg-space-800 p-6 md:p-7">
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-space-600 px-2.5 py-1 font-mono text-2xs tracking-widest text-gold">
                КУРСОВИЙ ПРОЄКТ
              </span>
              <span className="font-mono text-2xs text-ink-mute">
                {tree.project.maxPoints} балів · оцінює викладач
              </span>
            </div>

            <h2 className="mt-3 text-xl text-ink">{tree.project.title}</h2>
            <p className="mt-2 max-w-2xl text-ink-soft">
              Підсумок курсу. Тести дають щонайбільше{' '}
              {tree.totalPoints - tree.project.maxPoints} балів, а сертифікат — від{' '}
              {tree.passingPoints}, тож без проєкту його не отримати.
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-4">
              <Link
                to="/learn/project"
                className="btn-aurora inline-flex items-center gap-2 rounded-full px-6 py-3.5 font-mono text-xs tracking-[0.04em] whitespace-nowrap text-white no-underline transition-[filter] hover:brightness-115"
              >
                {tree.project.status === 'not_started' ? 'Відкрити завдання' : 'До проєкту'} →
              </Link>
              <span className="font-mono text-2xs text-ink-mute">
                {tree.project.pointsAwarded !== null
                  ? `Оцінено: ${tree.project.pointsAwarded} з ${tree.project.maxPoints}`
                  : 'Рубрику видно до здачі'}
              </span>
            </div>
          </Reveal>
        )}
      </section>
    </div>
  );
}
