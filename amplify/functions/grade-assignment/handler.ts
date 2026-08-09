import type { Schema } from '../../data/resource';
import { env } from '$amplify/env/grade-assignment';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime';

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env);
Amplify.configure(resourceConfig, libraryOptions);
const data = generateClient<Schema>({ authMode: 'iam' });

/** Поріг сертифіката живе в Course, а не константою тут: правила оцінювання
 *  вже мінялися, і константа в Lambda — те місце, куди при зміні не заглянуть.
 *  issue-certificate читає його звідти ж, тож обидві функції не розійдуться. */
async function passingPoints(): Promise<number> {
  const { data: courses } = await data.models.Course.list({ limit: 1 });
  return courses[0]?.passingPoints ?? 70;
}

export const handler: Schema['gradeAssignment']['functionHandler'] = async (event) => {
  const { submissionId, comment, returnForRevision } = event.arguments;
  // Див. коментар у submit-quiz-attempt: AWSJSON-аргумент приходить об'єктом.
  const rawScores = event.arguments.rubricScores as unknown;
  const scores: Record<string, number> =
    typeof rawScores === 'string' ? JSON.parse(rawScores) : (rawScores as Record<string, number>);
  const graderName =
    event.identity && 'claims' in event.identity
      ? ((event.identity.claims as Record<string, unknown>)?.email as string) ?? 'admin'
      : 'admin';

  const { data: submission } = await data.models.AssignmentSubmission.get({ id: submissionId });
  if (!submission) throw new Error('Подання не знайдено');

  const { data: assignment } = await data.models.Assignment.get({ id: submission.assignmentId });
  if (!assignment) throw new Error('Завдання не знайдено');

  const { data: criteria } = await data.models.RubricCriterion.list({
    filter: { assignmentId: { eq: submission.assignmentId } },
    limit: 100,
  });

  // Кожен бал обрізаємо по maxPoints критерію: адмін не має змоги поставити
  // 5 за критерій з максимумом 3 і тим зламати нормалізацію.
  let rubricRawTotal = 0;
  let rubricMax = 0;
  for (const c of criteria) {
    rubricMax += c.maxPoints;
    const raw = Number(scores[c.code] ?? 0);
    rubricRawTotal += Math.min(Math.max(raw, 0), c.maxPoints);
  }

  const pointsAwarded =
    rubricMax > 0 ? Math.round((rubricRawTotal / rubricMax) * assignment.maxPoints * 100) / 100 : 0;

  const { data: existing } = await data.models.AssignmentGrade.list({
    filter: { submissionId: { eq: submissionId } },
    limit: 1,
  });

  const payload = {
    submissionId,
    studentId: submission.studentId,
    assignmentId: submission.assignmentId,
    moduleId: submission.moduleId,
    rubricScores: JSON.stringify(scores),
    rubricRawTotal, // сирі 0..36 зберігаємо для дисертаційної статистики
    pointsAwarded,
    maxPoints: assignment.maxPoints,
    comment: comment ?? null,
    gradedByName: graderName,
    gradedAt: new Date().toISOString(),
  };

  const grade = existing[0]
    ? (await data.models.AssignmentGrade.update({ id: existing[0].id, ...payload })).data
    : (await data.models.AssignmentGrade.create(payload)).data;

  await data.models.AssignmentSubmission.update({
    id: submissionId,
    status: returnForRevision ? 'returned' : 'graded',
  });

  const courseTotalPoints = await recomputeEnrollment(submission.studentId);

  return {
    gradeId: grade?.id ?? '',
    pointsAwarded,
    rubricRawTotal,
    courseTotalPoints,
    certificateEligible: courseTotalPoints >= (await passingPoints()),
  };
};

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
