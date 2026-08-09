import type { Schema } from '../../data/resource';
import { env } from '$amplify/env/submit-quiz-attempt';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime';

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env);
Amplify.configure(resourceConfig, libraryOptions);
const data = generateClient<Schema>({ authMode: 'iam' });

type Submitted = { questionId: string; selectedOptionIds: string[] };

const sameSet = (a: string[], b: string[]) =>
  a.length === b.length && [...a].sort().join('|') === [...b].sort().join('|');

export const handler: Schema['submitQuizAttempt']['functionHandler'] = async (event) => {
  // Джерело істини — токен, НЕ аргумент: інакше студент здав би тест за іншого.
  const studentId = event.identity && 'sub' in event.identity ? event.identity.sub : null;
  if (!studentId) throw new Error('Не автентифіковано');

  const { quizId } = event.arguments;
  // AWSJSON-АРГУМЕНТ доходить до Lambda вже розпарсеним об'єктом — на відміну
  // від AWSJSON-ПОЛЯ моделі, яке зберігається рядком. Ця асиметрія неочевидна,
  // тож приймаємо обидва варіанти й не залежимо від неї.
  const rawAnswers = event.arguments.answers as unknown;
  const submitted: Submitted[] =
    typeof rawAnswers === 'string' ? JSON.parse(rawAnswers) : (rawAnswers as Submitted[]);

  const { data: quiz } = await data.models.Quiz.get({ id: quizId });
  if (!quiz) throw new Error('Тест не знайдено');

  const maxAttempts = quiz.maxAttempts ?? 2;

  const { data: prior } = await data.models.QuizAttempt.list({
    filter: { studentId: { eq: studentId }, quizId: { eq: quizId } },
    limit: 50,
  });
  if (prior.length >= maxAttempts) throw new Error('Вичерпано кількість спроб');
  const attemptNumber = prior.length + 1;

  const [{ data: questions }, { data: keys }] = await Promise.all([
    data.models.QuizQuestion.list({ filter: { quizId: { eq: quizId } }, limit: 200 }),
    data.models.QuizAnswerKey.list({ filter: { quizId: { eq: quizId } }, limit: 200 }),
  ]);
  const keyByQuestion = new Map(keys.map((k) => [k.questionId, k]));

  // Пояснення й правильні відповіді відкриваємо лише після ОСТАННЬОЇ спроби —
  // інакше перша спроба перетворює тест на шпаргалку для другої.
  const isLastAttempt = attemptNumber >= maxAttempts;
  const revealAnswers = isLastAttempt && quiz.showAnswersAfterSubmit !== false;

  let rawScore = 0;
  let maxRawScore = 0;
  const results = questions.map((q) => {
    const weight = q.weight ?? 1;
    maxRawScore += weight;
    const key = keyByQuestion.get(q.id);
    const correctIds = (key?.correctOptionIds ?? []).filter((x: string | null): x is string => x != null);
    const chosen = submitted.find((s) => s.questionId === q.id)?.selectedOptionIds ?? [];
    const correct = correctIds.length > 0 && sameSet(chosen, correctIds);
    if (correct) rawScore += weight;
    return {
      questionId: q.id,
      correct,
      earned: correct ? weight : 0,
      possible: weight,
      correctOptionIds: revealAnswers ? correctIds : null,
      explanation: revealAnswers ? (key?.explanation ?? null) : null,
    };
  });

  const pct = maxRawScore > 0 ? Math.round((rawScore / maxRawScore) * 100) : 0;
  const pointsAwarded = Math.round((pct / 100) * quiz.maxPoints * 100) / 100;
  const bestPrior = Math.max(0, ...prior.map((p) => p.pointsAwarded ?? 0));
  const isBest = pointsAwarded >= bestPrior;

  const { data: attempt } = await data.models.QuizAttempt.create({
    studentId,
    quizId,
    moduleId: quiz.moduleId,
    attemptNumber,
    answers: JSON.stringify(submitted), // a.json() зберігається рядком
    rawScore,
    maxRawScore,
    pct,
    pointsAwarded,
    isBest,
    submittedAt: new Date().toISOString(),
  });

  const courseTotalPoints = await recomputeEnrollment(studentId);

  return {
    attemptId: attempt?.id ?? '',
    attemptNumber,
    attemptsLeft: Math.max(0, maxAttempts - attemptNumber),
    rawScore,
    maxRawScore,
    pct,
    pointsAwarded,
    maxPoints: quiz.maxPoints,
    isBest,
    revealAnswers,
    results,
    courseTotalPoints,
  };
};

/** Перераховує агрегат із першоджерел: краща спроба на кожен тест + оцінки практичних. */
async function recomputeEnrollment(studentId: string): Promise<number> {
  const [{ data: attempts }, { data: grades }] = await Promise.all([
    data.models.QuizAttempt.list({ filter: { studentId: { eq: studentId } }, limit: 500 }),
    data.models.AssignmentGrade.list({ filter: { studentId: { eq: studentId } }, limit: 500 }),
  ]);

  const bestByQuiz = new Map<string, number>();
  for (const a of attempts) {
    bestByQuiz.set(a.quizId, Math.max(bestByQuiz.get(a.quizId) ?? 0, a.pointsAwarded ?? 0));
  }
  const quizPoints = [...bestByQuiz.values()].reduce((s, v) => s + v, 0);
  const assignmentPoints = grades.reduce((s, g) => s + (g.pointsAwarded ?? 0), 0);
  const totalPoints = Math.round((quizPoints + assignmentPoints) * 100) / 100;

  const { data: existing } = await data.models.CourseEnrollment.list({
    filter: { studentId: { eq: studentId } },
    limit: 1,
  });
  const payload = {
    studentId,
    quizPoints,
    assignmentPoints,
    totalPoints,
    lastActivityAt: new Date().toISOString(),
  };
  if (existing[0]) {
    await data.models.CourseEnrollment.update({ id: existing[0].id, ...payload });
  } else {
    await data.models.CourseEnrollment.create({ ...payload, status: 'active' });
  }
  return totalPoints;
}
