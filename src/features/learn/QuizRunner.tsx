import { useCallback, useEffect, useState } from 'react';
import Button from '../../ui/Button';
import ProgressBar from '../../ui/ProgressBar';
import { client } from '../../lib/amplify-client';
import { unwrap } from '../../lib/unwrap';
import { useAuth } from '../../context/AuthContext';
import { markLessonComplete } from './progress';

type Option = { id: string; order: number; text: string };
type Question = {
  id: string;
  order: number;
  block: string | null;
  prompt: string;
  isMultiple: boolean;
  options: Option[];
};
type Loaded = {
  quizId: string;
  title: string;
  maxPoints: number;
  maxAttempts: number;
  questions: Question[];
  attemptsUsed: number;
  bestPoints: number | null;
};

type QuestionResult = {
  questionId: string;
  correct: boolean;
  earned: number;
  possible: number;
  correctOptionIds?: (string | null)[] | null;
  explanation?: string | null;
};
type Grade = {
  attemptNumber: number;
  attemptsLeft: number;
  rawScore: number;
  maxRawScore: number;
  pct: number;
  pointsAwarded: number;
  maxPoints: number;
  isBest: boolean;
  revealAnswers: boolean;
  results?: (QuestionResult | null)[] | null;
  courseTotalPoints?: number | null;
};

/**
 * Проходження тесту.
 *
 * Бал рахує Lambda, не цей компонент: ключ відповідей студентові недосяжний
 * жодним запитом, і саме тому його тут ніде не видно навіть у проміжних
 * структурах. Звідси ж і те, що правильні варіанти малюються лише коли
 * сервер сам їх повернув — після останньої спроби.
 */
export default function QuizRunner({
  lessonId,
  moduleId,
  onCompleted,
}: {
  lessonId: string;
  moduleId: string;
  onCompleted: () => void;
}) {
  const { userId } = useAuth();
  const [quiz, setQuiz] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [grade, setGrade] = useState<Grade | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      // limit БЕЗ фільтра означав би «поверни N записів», але разом із
      // фільтром він обмежує кількість ПЕРЕГЛЯНУТИХ рядків, і фільтр
      // накладається вже на них. З `limit: 1` на таблиці з пʼятьма тестами
      // це майже завжди порожня відповідь — саме через це тести не
      // відкривалися взагалі. Індексу за lessonId у Quiz немає, тож беремо
      // запас, якого вистачає на всю таблицю.
      const quizzes = await unwrap(
        client.models.Quiz.list({ filter: { lessonId: { eq: lessonId } }, limit: 200 }),
      );
      const q = quizzes[0];
      if (!q) {
        setError('Тест для цього уроку ще не створено.');
        return;
      }

      const [questions, options, attempts] = await Promise.all([
        unwrap(client.models.QuizQuestion.list({ filter: { quizId: { eq: q.id } }, limit: 200 })),
        unwrap(client.models.QuizOption.list({ filter: { quizId: { eq: q.id } }, limit: 500 })),
        unwrap(client.models.QuizAttempt.list({ filter: { quizId: { eq: q.id } }, limit: 50 })),
      ]);

      const byQuestion = new Map<string, Option[]>();
      for (const o of options) {
        const item = { id: o.id, order: o.order, text: o.text };
        const list = byQuestion.get(o.questionId);
        if (list) list.push(item);
        else byQuestion.set(o.questionId, [item]);
      }
      for (const list of byQuestion.values()) list.sort((a, b) => a.order - b.order);

      setQuiz({
        quizId: q.id,
        title: q.title,
        maxPoints: q.maxPoints,
        maxAttempts: q.maxAttempts ?? 2,
        questions: questions
          .sort((a, b) => a.order - b.order)
          .map((x) => ({
            id: x.id,
            order: x.order,
            block: x.block ?? null,
            prompt: x.prompt,
            isMultiple: x.isMultiple === true,
            options: byQuestion.get(x.id) ?? [],
          })),
        attemptsUsed: attempts.length,
        bestPoints: attempts.length
          ? Math.max(...attempts.map((a) => a.pointsAwarded ?? 0))
          : null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не вдалося завантажити тест');
    }
  }, [lessonId]);

  useEffect(() => {
    void load();
  }, [load]);

  function choose(question: Question, optionId: string) {
    setAnswers((prev) => {
      const current = prev[question.id] ?? [];
      if (!question.isMultiple) return { ...prev, [question.id]: [optionId] };
      return {
        ...prev,
        [question.id]: current.includes(optionId)
          ? current.filter((x) => x !== optionId)
          : [...current, optionId],
      };
    });
  }

  async function submit() {
    if (!quiz || !userId) return;
    setBusy(true);
    setError(null);
    try {
      const payload = quiz.questions.map((q) => ({
        questionId: q.id,
        selectedOptionIds: answers[q.id] ?? [],
      }));
      const result = await unwrap(
        client.mutations.submitQuizAttempt({ quizId: quiz.quizId, answers: JSON.stringify(payload) }),
      );
      setGrade(result as Grade);
      // Тест здано — урок пройдено. Просити ще й натиснути кнопку означало б
      // лишати прогрес неповним щоразу, коли людина просто пішла далі.
      await markLessonComplete(userId, lessonId, moduleId);
      onCompleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не вдалося зарахувати спробу');
    } finally {
      setBusy(false);
    }
  }

  function retry() {
    setGrade(null);
    setAnswers({});
    void load();
  }

  if (error && !quiz) {
    return <p className="rounded-[var(--radius-sm)] bg-space-700 p-4 text-sm text-danger">{error}</p>;
  }
  if (!quiz) {
    return <p className="text-ink-mute">Завантажуємо тест…</p>;
  }

  const attemptsLeft = Math.max(0, quiz.maxAttempts - quiz.attemptsUsed);
  const unanswered = quiz.questions.filter((q) => (answers[q.id] ?? []).length === 0).length;
  const resultById = new Map((grade?.results ?? []).filter(Boolean).map((r) => [r!.questionId, r!]));

  // ── Результат спроби ──────────────────────────────────────────────────
  if (grade) {
    return (
      <div className="rounded-[var(--radius-lg)] bg-space-800 p-6 md:p-8">
        <div className="font-mono text-2xs tracking-widest text-violet-300">
            СПРОБА {grade.attemptNumber} З {quiz.maxAttempts}
        </div>
        <h2 className="mt-3 font-display text-2xl text-ink">
          {grade.pointsAwarded} <span className="text-ink-mute">/ {grade.maxPoints} балів</span>
        </h2>
        <p className="mt-2 text-ink-soft">
          Правильних {grade.rawScore} з {grade.maxRawScore} · {grade.pct}%
          {grade.isBest && quiz.attemptsUsed > 0 ? ' · це ваш найкращий результат' : ''}
        </p>
        <ProgressBar
          value={grade.pointsAwarded}
          max={grade.maxPoints}
          label="Бал за тест"
          tone="gold"
          className="mt-4"
        />

        {!grade.revealAnswers && (
          <p className="mt-5 rounded-[var(--radius-sm)] bg-space-700 p-4 text-sm text-ink-soft">
            Правильні відповіді й пояснення відкриються після останньої спроби —
            інакше перша спроба перетворилася б на підказку до другої.
            {grade.attemptsLeft > 0 && ` Лишилось спроб: ${grade.attemptsLeft}.`}
          </p>
        )}

        <ol className="mt-6 flex list-none flex-col gap-4 p-0">
          {quiz.questions.map((q, i) => {
            const r = resultById.get(q.id);
            const correctIds = (r?.correctOptionIds ?? []).filter(Boolean) as string[];
            const chosen = answers[q.id] ?? [];
            return (
              <li key={q.id} className="rounded-[var(--radius-md)] bg-space-700 p-5">
                <div className="flex items-start gap-3">
                  <span
                    aria-hidden="true"
                    className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] ${
                      r?.correct ? 'bg-success text-space-900' : 'bg-danger text-space-900'
                    }`}
                  >
                    {r?.correct ? '✓' : '✕'}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-ink">
                      {i + 1}. {q.prompt}
                    </p>
                    <ul className="mt-3 flex list-none flex-col gap-1.5 p-0">
                      {q.options.map((o) => {
                        const picked = chosen.includes(o.id);
                        const isRight = correctIds.includes(o.id);
                        return (
                          <li
                            key={o.id}
                            className={`rounded-[var(--radius-xs)] px-3 py-1.5 text-sm ${
                              isRight
                                ? 'bg-success/15 text-ink'
                                : picked
                                  ? 'bg-danger/15 text-ink'
                                  : 'text-ink-mute'
                            }`}
                          >
                            {picked ? '● ' : '○ '}
                            {o.text}
                            {isRight && (
                              <span className="ml-2 font-mono text-2xs text-success">правильно</span>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                    {r?.explanation && (
                      <p className="mt-3 text-sm text-ink-soft">{r.explanation}</p>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>

        {grade.attemptsLeft > 0 && (
          <div className="mt-7">
            <Button onClick={retry} variant="ghost">
              Пройти ще раз ({grade.attemptsLeft} з {quiz.maxAttempts})
            </Button>
            <p className="mt-2 text-sm text-ink-mute">Зараховується найкращий результат.</p>
          </div>
        )}
      </div>
    );
  }

  // ── Спроби вичерпані ──────────────────────────────────────────────────
  if (attemptsLeft === 0) {
    return (
      <div className="rounded-[var(--radius-lg)] bg-space-800 p-6 md:p-8">
        <h2 className="text-xl text-ink">Спроби вичерпано</h2>
        <p className="mt-3 text-ink-soft">
          Ви використали {quiz.attemptsUsed} з {quiz.maxAttempts} спроб.
          {quiz.bestPoints !== null && ` Зараховано ${quiz.bestPoints} з ${quiz.maxPoints} балів.`}
        </p>
      </div>
    );
  }

  // ── Проходження ───────────────────────────────────────────────────────
  return (
    <div className="rounded-[var(--radius-lg)] bg-space-800 p-6 md:p-8">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-xl text-ink">{quiz.title}</h2>
        <span className="font-mono text-2xs text-ink-mute">
          {quiz.maxPoints} балів · спроба {quiz.attemptsUsed + 1} з {quiz.maxAttempts}
        </span>
      </div>
      {quiz.attemptsUsed > 0 && quiz.bestPoints !== null && (
        <p className="mt-2 text-sm text-ink-mute">
          Попередній результат — {quiz.bestPoints} з {quiz.maxPoints}. Зараховується найкращий.
        </p>
      )}

      <ol className="mt-6 flex list-none flex-col gap-5 p-0">
        {quiz.questions.map((q, i) => (
          <li key={q.id}>
            <fieldset className="rounded-[var(--radius-md)] border-0 bg-space-700 p-5">
              <legend className="text-ink">
                {i + 1}. {q.prompt}
                {q.isMultiple && (
                  <span className="ml-2 font-mono text-2xs text-violet-300">
                    кілька відповідей
                  </span>
                )}
              </legend>
              <div className="mt-3 flex flex-col gap-1">
                {q.options.map((o) => {
                  const picked = (answers[q.id] ?? []).includes(o.id);
                  return (
                    <label
                      key={o.id}
                      className={`flex cursor-pointer items-start gap-3 rounded-[var(--radius-xs)] px-3 py-2 text-sm transition-colors ${
                        picked ? 'bg-space-500 text-ink' : 'text-ink-soft hover:bg-space-600'
                      }`}
                    >
                      <input
                        type={q.isMultiple ? 'checkbox' : 'radio'}
                        name={q.id}
                        checked={picked}
                        onChange={() => choose(q, o.id)}
                        className="mt-1 accent-[var(--color-violet-400)]"
                      />
                      <span>{o.text}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          </li>
        ))}
      </ol>

      {error && <p className="mt-5 text-sm text-danger">{error}</p>}

      <div className="mt-7 flex flex-wrap items-center gap-4">
        <Button onClick={submit} disabled={busy || unanswered > 0} size="lg">
          {busy ? 'Перевіряємо…' : 'Здати тест'}
        </Button>
        <span className="text-sm text-ink-mute">
          {unanswered > 0
            ? `Без відповіді: ${unanswered} з ${quiz.questions.length}`
            : `Спроб лишиться: ${attemptsLeft - 1}`}
        </span>
      </div>
    </div>
  );
}
