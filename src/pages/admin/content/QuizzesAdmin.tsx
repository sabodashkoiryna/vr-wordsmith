import { useCallback, useEffect, useState } from 'react';
import { client } from '../../../lib/amplify-client';
import { unwrap } from '../../../lib/unwrap';
import {
  AdminButton,
  Banner,
  Drawer,
  EmptyState,
  PageHeader,
} from '../../../features/admin/ui/adminUi';

type ModuleRow = { id: string; order: number; code: string; title: string };

type QuizRow = {
  id: string;
  title: string;
  maxPoints: number;
  maxAttempts: number;
  showAnswersAfterSubmit: boolean;
  lessonId: string | null;
};

/** Варіант у редакторі. `id` порожній у щойно доданого — його ще немає в базі. */
type OptionDraft = { id: string; text: string; correct: boolean };

type QuestionRow = {
  id: string;
  order: number;
  prompt: string;
  block: string | null;
  weight: number;
  isMultiple: boolean;
  options: OptionDraft[];
  explanation: string;
};

const EMPTY_QUESTION = (order: number): QuestionRow => ({
  id: '',
  order,
  prompt: '',
  block: null,
  weight: 1,
  isMultiple: false,
  options: [
    { id: '', text: '', correct: false },
    { id: '', text: '', correct: false },
  ],
  explanation: '',
});

/**
 * Редактор тестів.
 *
 * Найтонше місце — ключ відповідей. `QuizAnswerKey.correctOptionIds` зберігає
 * **id варіантів**, а не їхні індекси: саме тому перестановка варіантів в
 * адмінці не ламає перевірку. Платня за це — порядок збереження, який не можна
 * переставляти: спершу записуємо варіанти й дістаємо їхні справжні id, і лише
 * потім переписуємо ключ. Варіант, видалений з питання, зникає і з ключа
 * автоматично, бо ключ збирається заново з того, що лишилось.
 *
 * `isMultiple` не редагується руками, а виводиться з кількості позначених
 * правильних. Якби ці дві речі розійшлися, питання з двома правильними
 * намалювалося б радіокнопками й стало б принципово нездаваним — мовчки,
 * бо грейдинг звіряє множини точно.
 */
export default function QuizzesAdmin() {
  const [modules, setModules] = useState<ModuleRow[]>([]);
  const [moduleId, setModuleId] = useState('');
  const [quiz, setQuiz] = useState<QuizRow | null>(null);
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [draft, setDraft] = useState<QuestionRow | null>(null);

  /* ── завантаження ──────────────────────────────────────────────────── */

  useEffect(() => {
    (async () => {
      try {
        const rows = await unwrap(client.models.Module.list({ limit: 200 }));
        const mapped = rows
          .map((m) => ({ id: m.id, order: m.order, code: m.code, title: m.title }))
          .sort((a, b) => a.order - b.order);
        setModules(mapped);
        setModuleId((p) => p || mapped[0]?.id || '');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Не вдалося завантажити модулі');
      }
    })();
  }, []);

  const load = useCallback(async () => {
    if (!moduleId) return;
    setLoading(true);
    setError(null);
    try {
      const quizzes = await unwrap(
        client.models.Quiz.listQuizByModuleId({ moduleId }, { limit: 10 }),
      );
      const q = quizzes[0];
      if (!q) {
        setQuiz(null);
        setQuestions([]);
        return;
      }
      setQuiz({
        id: q.id,
        title: q.title,
        maxPoints: q.maxPoints,
        maxAttempts: q.maxAttempts ?? 2,
        showAnswersAfterSubmit: q.showAnswersAfterSubmit !== false,
        lessonId: q.lessonId ?? null,
      });

      const [qs, opts, keys] = await Promise.all([
        unwrap(client.models.QuizQuestion.listQuizQuestionByQuizIdAndOrder({ quizId: q.id }, { limit: 200 })),
        unwrap(client.models.QuizOption.listQuizOptionByQuizId({ quizId: q.id }, { limit: 500 })),
        unwrap(client.models.QuizAnswerKey.listQuizAnswerKeyByQuizId({ quizId: q.id }, { limit: 200 })),
      ]);

      const keyByQuestion = new Map(keys.map((k) => [k.questionId, k]));
      setQuestions(
        qs
          .sort((a, b) => a.order - b.order)
          .map((x) => {
            const key = keyByQuestion.get(x.id);
            const correct = new Set((key?.correctOptionIds ?? []).filter(Boolean) as string[]);
            return {
              id: x.id,
              order: x.order,
              prompt: x.prompt,
              block: x.block ?? null,
              weight: x.weight ?? 1,
              isMultiple: x.isMultiple === true,
              explanation: key?.explanation ?? '',
              options: opts
                .filter((o) => o.questionId === x.id)
                .sort((a, b) => a.order - b.order)
                .map((o) => ({ id: o.id, text: o.text, correct: correct.has(o.id) })),
            };
          }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не вдалося завантажити тест');
    } finally {
      setLoading(false);
    }
  }, [moduleId]);

  useEffect(() => {
    void load();
  }, [load]);

  /* ── збереження ────────────────────────────────────────────────────── */

  async function createQuiz() {
    const m = modules.find((x) => x.id === moduleId);
    if (!m) return;
    setBusy(true);
    setError(null);
    try {
      // Прив'язуємо до уроку типу quiz, якщо такий у модулі є: саме за
      // lessonId кабінет знаходить тест, відкриваючи урок.
      const lessons = await unwrap(
        client.models.Lesson.listLessonByModuleIdAndOrder({ moduleId }, { limit: 200 }),
      );
      const quizLesson = lessons.find((l) => l.kind === 'quiz');
      await unwrap(
        client.models.Quiz.create({
          moduleId,
          lessonId: quizLesson?.id ?? null,
          title: `Тест модуля: ${m.title}`,
          maxPoints: 12,
          maxAttempts: 2,
          showAnswersAfterSubmit: true,
        }),
      );
      setNotice(
        quizLesson
          ? 'Тест створено й привʼязано до уроку.'
          : 'Тест створено. У модулі немає уроку типу «quiz» — додайте його, інакше тест не відкриється в кабінеті.',
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не вдалося створити тест');
    } finally {
      setBusy(false);
    }
  }

  async function saveQuizSettings(patch: Partial<QuizRow>) {
    if (!quiz) return;
    const next = { ...quiz, ...patch };
    setQuiz(next);
    try {
      await unwrap(
        client.models.Quiz.update({
          id: quiz.id,
          title: next.title,
          maxPoints: next.maxPoints,
          maxAttempts: next.maxAttempts,
          showAnswersAfterSubmit: next.showAnswersAfterSubmit,
        }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не вдалося зберегти налаштування');
    }
  }

  function validate(d: QuestionRow): string | null {
    if (!d.prompt.trim()) return 'Питання не може бути порожнім.';
    const filled = d.options.filter((o) => o.text.trim());
    if (filled.length < 2) return 'Потрібно щонайменше два варіанти відповіді.';
    if (d.options.some((o) => !o.text.trim())) return 'Порожні варіанти треба прибрати або заповнити.';
    if (!d.options.some((o) => o.correct)) {
      return 'Позначте хоча б один правильний варіант — інакше питання завжди даватиме нуль.';
    }
    return null;
  }

  async function saveQuestion() {
    if (!draft || !quiz) return;
    const problem = validate(draft);
    if (problem) {
      setError(problem);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const correctCount = draft.options.filter((o) => o.correct).length;

      // 1. Саме питання. isMultiple виводимо, а не питаємо.
      const payload = {
        quizId: quiz.id,
        order: draft.order,
        prompt: draft.prompt.trim(),
        block: draft.block?.trim() || null,
        weight: draft.weight,
        isMultiple: correctCount > 1,
      };
      const question = draft.id
        ? await unwrap(client.models.QuizQuestion.update({ id: draft.id, ...payload }))
        : await unwrap(client.models.QuizQuestion.create(payload));
      const questionId = question!.id;

      // 2. Варіанти. Спершу прибираємо ті, яких більше немає в редакторі —
      //    інакше вони лишаться в базі й малюватимуться студентові.
      const existing = (
        await unwrap(
          client.models.QuizOption.listQuizOptionByQuestionIdAndOrder({ questionId }, { limit: 100 }),
        )
      ).map((o) => o.id);
      const kept = new Set(draft.options.map((o) => o.id).filter(Boolean));
      for (const id of existing) {
        if (!kept.has(id)) await client.models.QuizOption.delete({ id });
      }

      // 3. Записуємо варіанти й ЗБИРАЄМО ЇХНІ СПРАВЖНІ ID — ключ будується
      //    саме з них, тож цей крок мусить завершитись до кроку 4.
      const correctIds: string[] = [];
      for (const [i, o] of draft.options.entries()) {
        const data = { questionId, quizId: quiz.id, order: i, text: o.text.trim() };
        const saved = o.id
          ? await unwrap(client.models.QuizOption.update({ id: o.id, ...data }))
          : await unwrap(client.models.QuizOption.create(data));
        if (o.correct && saved?.id) correctIds.push(saved.id);
      }

      // 4. Ключ переписуємо повністю: так він не може посилатися на варіант,
      //    якого вже немає.
      const oldKeys = await unwrap(
        client.models.QuizAnswerKey.listQuizAnswerKeyByQuestionId({ questionId }, { limit: 10 }),
      );
      for (const k of oldKeys) await client.models.QuizAnswerKey.delete({ id: k.id });
      await unwrap(
        client.models.QuizAnswerKey.create({
          questionId,
          quizId: quiz.id,
          correctOptionIds: correctIds,
          explanation: draft.explanation.trim() || null,
          points: 1,
        }),
      );

      setNotice(draft.id ? 'Питання збережено.' : 'Питання додано.');
      setDraft(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не вдалося зберегти питання');
    } finally {
      setBusy(false);
    }
  }

  async function deleteQuestion() {
    if (!draft?.id || !quiz) return;
    if (!window.confirm('Видалити питання разом із варіантами й ключем? Дію не скасувати.')) return;
    setBusy(true);
    try {
      const questionId = draft.id;
      const [opts, keys] = await Promise.all([
        unwrap(client.models.QuizOption.listQuizOptionByQuestionIdAndOrder({ questionId }, { limit: 100 })),
        unwrap(client.models.QuizAnswerKey.listQuizAnswerKeyByQuestionId({ questionId }, { limit: 10 })),
      ]);
      for (const k of keys) await client.models.QuizAnswerKey.delete({ id: k.id });
      for (const o of opts) await client.models.QuizOption.delete({ id: o.id });
      await unwrap(client.models.QuizQuestion.delete({ id: questionId }));
      setNotice('Питання видалено.');
      setDraft(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не вдалося видалити');
    } finally {
      setBusy(false);
    }
  }

  /* ── розмітка ──────────────────────────────────────────────────────── */

  const current = modules.find((m) => m.id === moduleId);
  const input =
    'w-full rounded-[var(--radius-sm)] border border-[var(--line-strong)] bg-space-900/60 px-3 py-2.5 text-sm text-ink focus:border-cyan-400 focus:outline-none';

  if (!modules.length && !error) return <p className="text-ink-mute">Завантажуємо…</p>;

  const draftCorrect = draft?.options.filter((o) => o.correct).length ?? 0;

  return (
    <div>
      <PageHeader
        title={current ? `Тест · ${current.title}` : 'Тести'}
        description="Правильні відповіді зберігаються як посилання на варіанти, тому їх можна переставляти без ризику зламати перевірку."
        count={quiz ? `${questions.length} питань` : undefined}
        actions={
          quiz ? (
            <AdminButton
              variant="primary"
              onClick={() => setDraft(EMPTY_QUESTION(questions.length))}
            >
              + Питання
            </AdminButton>
          ) : undefined
        }
      />

      <div className="mb-6 flex flex-wrap gap-2">
        {modules.map((m) => (
          <button
            key={m.id}
            onClick={() => setModuleId(m.id)}
            className={`cursor-pointer rounded-full border-none px-4 py-2 font-mono text-2xs transition-colors ${
              m.id === moduleId
                ? 'bg-violet-500 text-white'
                : 'bg-space-700 text-ink-soft hover:bg-space-600 hover:text-ink'
            }`}
          >
            {m.code}
          </button>
        ))}
      </div>

      {error && <Banner tone="error">{error}</Banner>}
      {notice && <Banner tone="success">{notice}</Banner>}

      {loading ? (
        <p className="text-ink-mute">Завантажуємо…</p>
      ) : !quiz ? (
        <div>
          <EmptyState
            title="У цього модуля ще немає тесту"
            hint="Створіть його — далі можна буде додавати питання."
          />
          <div className="mt-4">
            <AdminButton variant="primary" onClick={createQuiz} disabled={busy}>
              {busy ? 'Створюємо…' : 'Створити тест'}
            </AdminButton>
          </div>
        </div>
      ) : (
        <>
          <div className="mb-6 grid gap-4 rounded-[var(--radius-lg)] bg-space-800 p-5 sm:grid-cols-4">
            <label className="flex flex-col gap-1.5 sm:col-span-2">
              <span className="font-mono text-2xs tracking-widest text-ink-mute">НАЗВА</span>
              <input
                defaultValue={quiz.title}
                onBlur={(e) => saveQuizSettings({ title: e.target.value })}
                className={input}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="font-mono text-2xs tracking-widest text-ink-mute">БАЛІВ</span>
              <input
                type="number"
                defaultValue={quiz.maxPoints}
                onBlur={(e) => saveQuizSettings({ maxPoints: Number(e.target.value) })}
                className={input}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="font-mono text-2xs tracking-widest text-ink-mute">СПРОБ</span>
              <input
                type="number"
                defaultValue={quiz.maxAttempts}
                onBlur={(e) => saveQuizSettings({ maxAttempts: Number(e.target.value) })}
                className={input}
              />
            </label>
            {!quiz.lessonId && (
              <p className="sm:col-span-4 text-sm text-warning">
                Тест не привʼязаний до уроку — у кабінеті його не відкрити. Створіть у модулі
                урок типу «quiz» і пересійте або привʼяжіть вручну.
              </p>
            )}
          </div>

          {questions.length === 0 ? (
            <EmptyState title="Питань ще немає" hint="Додайте перше через «+ Питання»." />
          ) : (
            <ul className="flex list-none flex-col gap-2 p-0">
              {questions.map((q, i) => (
                <li key={q.id}>
                  <button
                    onClick={() => setDraft({ ...q, options: q.options.map((o) => ({ ...o })) })}
                    className="w-full cursor-pointer rounded-[var(--radius-md)] border-none bg-space-800 p-4 text-left transition-colors hover:bg-space-700"
                  >
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 font-mono text-2xs text-ink-mute">{i + 1}</span>
                      <span className="flex-1 text-sm text-ink">{q.prompt}</span>
                      <span className="shrink-0 font-mono text-2xs text-ink-mute">
                        {q.options.length} вар. · {q.options.filter((o) => o.correct).length} прав.
                        {q.isMultiple ? ' · кілька' : ''}
                      </span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <Drawer
        open={!!draft}
        title={draft?.id ? 'Питання' : 'Нове питання'}
        onClose={() => setDraft(null)}
        wide
        footer={
          <>
            <AdminButton variant="primary" onClick={saveQuestion} disabled={busy}>
              {busy ? 'Зберігаємо…' : 'Зберегти'}
            </AdminButton>
            <AdminButton onClick={() => setDraft(null)} disabled={busy}>
              Скасувати
            </AdminButton>
            {draft?.id && (
              <span className="ml-auto">
                <AdminButton variant="danger" onClick={deleteQuestion} disabled={busy}>
                  Видалити
                </AdminButton>
              </span>
            )}
          </>
        }
      >
        {draft && (
          <div className="flex flex-col gap-5">
            {error && <Banner tone="error">{error}</Banner>}

            <label className="flex flex-col gap-2">
              <span className="font-mono text-2xs tracking-widest text-ink-mute">ПИТАННЯ</span>
              <textarea
                rows={3}
                value={draft.prompt}
                onChange={(e) => setDraft({ ...draft, prompt: e.target.value })}
                className={`${input} resize-y`}
              />
            </label>

            <div>
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-mono text-2xs tracking-widest text-ink-mute">
                  ВАРІАНТИ — ПОЗНАЧТЕ ПРАВИЛЬНІ
                </span>
                <span className="font-mono text-2xs text-ink-mute">
                  {draftCorrect === 0
                    ? 'жодного не позначено'
                    : draftCorrect === 1
                      ? 'одна правильна — радіокнопки'
                      : `${draftCorrect} правильні — галочки`}
                </span>
              </div>

              <ul className="mt-3 flex list-none flex-col gap-2 p-0">
                {draft.options.map((o, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        const next = [...draft.options];
                        next[i] = { ...o, correct: !o.correct };
                        setDraft({ ...draft, options: next });
                      }}
                      aria-pressed={o.correct}
                      title={o.correct ? 'Правильний' : 'Позначити правильним'}
                      className={`h-9 w-9 shrink-0 cursor-pointer rounded-full border-none font-mono text-sm transition-colors ${
                        o.correct
                          ? 'bg-success text-space-900'
                          : 'bg-space-600 text-ink-mute hover:bg-space-500'
                      }`}
                    >
                      {o.correct ? '✓' : '○'}
                    </button>
                    <input
                      value={o.text}
                      onChange={(e) => {
                        const next = [...draft.options];
                        next[i] = { ...o, text: e.target.value };
                        setDraft({ ...draft, options: next });
                      }}
                      placeholder={`Варіант ${i + 1}`}
                      className={input}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setDraft({ ...draft, options: draft.options.filter((_, n) => n !== i) })
                      }
                      disabled={draft.options.length <= 2}
                      aria-label="Прибрати варіант"
                      className="shrink-0 cursor-pointer border-none bg-transparent px-2 font-mono text-2xs text-ink-mute hover:text-danger disabled:opacity-30"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>

              <div className="mt-3">
                <AdminButton
                  onClick={() =>
                    setDraft({ ...draft, options: [...draft.options, { id: '', text: '', correct: false }] })
                  }
                >
                  + Варіант
                </AdminButton>
              </div>
            </div>

            <label className="flex flex-col gap-2">
              <span className="font-mono text-2xs tracking-widest text-ink-mute">
                ПОЯСНЕННЯ — ВІДКРИЄТЬСЯ ПІСЛЯ ОСТАННЬОЇ СПРОБИ
              </span>
              <textarea
                rows={3}
                value={draft.explanation}
                onChange={(e) => setDraft({ ...draft, explanation: e.target.value })}
                className={`${input} resize-y`}
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-2">
                <span className="font-mono text-2xs tracking-widest text-ink-mute">ПОРЯДОК</span>
                <input
                  type="number"
                  value={draft.order}
                  onChange={(e) => setDraft({ ...draft, order: Number(e.target.value) })}
                  className={input}
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="font-mono text-2xs tracking-widest text-ink-mute">БЛОК</span>
                <input
                  value={draft.block ?? ''}
                  onChange={(e) => setDraft({ ...draft, block: e.target.value })}
                  className={input}
                />
              </label>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
