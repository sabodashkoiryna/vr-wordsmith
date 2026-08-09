import type { Schema } from '../../data/resource';
import { env } from '$amplify/env/issue-certificate';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime';

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env);
Amplify.configure(resourceConfig, libraryOptions);
const data = generateClient<Schema>({ authMode: 'iam' });

export const handler: Schema['issueCertificate']['functionHandler'] = async (event) => {
  const callerSub = event.identity && 'sub' in event.identity ? event.identity.sub : null;
  if (!callerSub) throw new Error('Не автентифіковано');

  const groups =
    event.identity && 'groups' in event.identity ? (event.identity.groups ?? []) : [];
  const isAdmin = Array.isArray(groups) && groups.includes('Admins');

  // Не-адмін може видати сертифікат лише собі, хай би що передав аргументом.
  const studentId = isAdmin ? (event.arguments.studentId ?? callerSub) : callerSub;

  const { data: courses } = await data.models.Course.list({ limit: 1 });
  const course = courses[0];
  const passingPoints = course?.passingPoints ?? 70;
  const maxPoints = course?.totalPoints ?? 100;

  // Свідомо перераховуємо з першоджерел, а НЕ довіряємо CourseEnrollment:
  // той запис — кеш, який оновлюють дві різні Lambda і який теоретично
  // може розійтися при одночасному записі.
  const [{ data: attempts }, { data: grades }] = await Promise.all([
    data.models.QuizAttempt.list({ filter: { studentId: { eq: studentId } }, limit: 500 }),
    data.models.AssignmentGrade.list({ filter: { studentId: { eq: studentId } }, limit: 500 }),
  ]);
  const bestByQuiz = new Map<string, number>();
  for (const a of attempts) {
    bestByQuiz.set(a.quizId, Math.max(bestByQuiz.get(a.quizId) ?? 0, a.pointsAwarded ?? 0));
  }
  const totalPoints =
    Math.round(
      ([...bestByQuiz.values()].reduce((s, v) => s + v, 0) +
        grades.reduce((s, g) => s + (g.pointsAwarded ?? 0), 0)) *
        100,
    ) / 100;

  if (totalPoints < passingPoints) {
    return {
      eligible: false,
      reason: 'insufficient_points',
      totalPoints,
      maxPoints,
    };
  }

  const { data: existing } = await data.models.Certificate.list({
    filter: { studentId: { eq: studentId } },
    limit: 5,
  });
  const active = existing.find((c) => !c.revokedAt);
  if (active) {
    return {
      eligible: true,
      reason: 'already_issued',
      certificateId: active.id,
      certificateNumber: active.certificateNumber,
      verificationCode: active.verificationCode,
      issuedAt: active.issuedAt,
      totalPoints: active.totalPoints,
      maxPoints: active.maxPoints,
    };
  }

  const { data: profile } = await data.models.UserProfile.get({ id: studentId });
  const now = new Date();
  const seq = String(existing.length + Date.now() % 10000).padStart(4, '0');
  const certificateNumber = `VRW-${now.getFullYear()}-${seq}`;
  const verificationCode = `${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`.toUpperCase();

  // Знімаємо снапшот: пізніша зміна назви курсу чи ПІБ у профілі не повинна
  // переписувати вже виданий документ.
  const { data: cert } = await data.models.Certificate.create({
    studentId,
    certificateNumber,
    verificationCode,
    studentFullName: profile?.fullName ?? 'Учасник курсу',
    courseTitle: course?.title ?? 'VR-Словесник',
    hours: course?.hours ?? null,
    totalPoints,
    maxPoints,
    issuedAt: now.toISOString(),
  });

  const { data: enrollments } = await data.models.CourseEnrollment.list({
    filter: { studentId: { eq: studentId } },
    limit: 1,
  });
  if (enrollments[0]) {
    await data.models.CourseEnrollment.update({ id: enrollments[0].id, status: 'certified' });
  }

  return {
    eligible: true,
    certificateId: cert?.id,
    certificateNumber,
    verificationCode,
    issuedAt: cert?.issuedAt,
    totalPoints,
    maxPoints,
  };
};
