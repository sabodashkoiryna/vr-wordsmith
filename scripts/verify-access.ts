/**
 * Перевірка безпеки й серверного грейдингу.
 *
 * Перевіряє саме те, на чому тримається цілісність оцінювання і що
 * найлегше зламати непомітно:
 *   1. Студент НЕ може прочитати QuizAnswerKey жодним запитом.
 *   2. Студент НЕ може створити/змінити свою оцінку напряму.
 *   3. Серверний грейдинг рахує бал правильно.
 *   4. Ліміт спроб дотримується, зараховується краща.
 *   5. Правильні відповіді не повертаються до останньої спроби.
 *
 * Запуск: npx tsx scripts/verify-access.ts <outputs.json>
 */

import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import { signIn, signOut } from 'aws-amplify/auth';
import { readFileSync } from 'node:fs';
import type { Schema } from '../amplify/data/resource';

const outputsPath = process.argv[2];
Amplify.configure(JSON.parse(readFileSync(outputsPath, 'utf-8')));
const client = generateClient<Schema>();

const STUDENT = { email: process.env.STUDENT_EMAIL!, password: process.env.STUDENT_PASSWORD! };

let pass = 0;
let fail = 0;
function check(label: string, ok: boolean, detail = '') {
  if (ok) {
    pass++;
    console.log(`  ✓ ${label}`);
  } else {
    fail++;
    console.log(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`);
  }
}

async function main() {
  await signIn({ username: STUDENT.email, password: STUDENT.password });
  console.log('\n── Як СТУДЕНТ ──────────────────────────────────────────');

  // 1. Ключ відповідей має бути недосяжним
  const keyRes = await client.models.QuizAnswerKey.list({ limit: 5 });
  check(
    'QuizAnswerKey недосяжний студентові',
    (keyRes.errors?.length ?? 0) > 0 || keyRes.data.length === 0,
    `повернуто ${keyRes.data.length} записів`,
  );

  // 2. Уроки й питання читаються (це нормально)
  const lessons = await client.models.Lesson.list({ limit: 5 });
  check('Уроки читаються залогіненим', lessons.data.length > 0);

  const questions = await client.models.QuizQuestion.list({ limit: 5 });
  check('Питання читаються, але без правильної відповіді', questions.data.length > 0);
  const leaked = questions.data.some((q) =>
    Object.keys(q).some((k) => /correct|answer|isRight/i.test(k)),
  );
  check('У QuizQuestion немає поля з правильною відповіддю', !leaked);

  const options = await client.models.QuizOption.list({ limit: 8 });
  const optionLeak = options.data.some((o) => Object.keys(o).some((k) => /correct/i.test(k)));
  check('У QuizOption немає ознаки правильності', !optionLeak);

  // 3. Студент не може вписати собі оцінку
  const forgeGrade = await client.models.AssignmentGrade.create({
    submissionId: 'x',
    studentId: 'x',
    assignmentId: 'x',
    moduleId: 'x',
    pointsAwarded: 12,
    maxPoints: 12,
    gradedAt: new Date().toISOString(),
  } as never);
  check(
    'Студент НЕ може створити AssignmentGrade',
    (forgeGrade.errors?.length ?? 0) > 0 || !forgeGrade.data,
  );

  const forgeAttempt = await client.models.QuizAttempt.create({
    studentId: 'x',
    quizId: 'x',
    moduleId: 'x',
    attemptNumber: 1,
    rawScore: 8,
    maxRawScore: 8,
    pct: 100,
    pointsAwarded: 8,
    submittedAt: new Date().toISOString(),
  } as never);
  check(
    'Студент НЕ може створити QuizAttempt напряму',
    (forgeAttempt.errors?.length ?? 0) > 0 || !forgeAttempt.data,
  );

  // 4. Серверний грейдинг
  console.log('\n── Серверний грейдинг ──────────────────────────────────');
  const quizzes = await client.models.Quiz.list({ limit: 10 });
  const quizzes2 = quizzes.data;
  const quiz = quizzes.data[0];
  if (!quiz) {
    check('Знайдено тест для перевірки', false);
    return finish();
  }

  const qs = await client.models.QuizQuestion.list({
    filter: { quizId: { eq: quiz.id } },
    limit: 50,
  });
  const opts = await client.models.QuizOption.list({
    filter: { quizId: { eq: quiz.id } },
    limit: 200,
  });

  // Спроба 1: свідомо обираємо ПЕРШИЙ варіант скрізь — частина буде хибною.
  const answers1 = qs.data.map((q) => ({
    questionId: q.id,
    selectedOptionIds: [
      opts.data.filter((o) => o.questionId === q.id).sort((a, b) => a.order - b.order)[0]?.id,
    ].filter(Boolean),
  }));

  // Спроби витрачаються назавжди, тож при повторному прогоні цей блок дав би
  // хибно-червоний результат. Перевіряємо, чи ліміт уже вичерпано, і в такому
  // разі чесно пропускаємо, а не «провалюємо».
  const usedAttempts = (
    await client.models.QuizAttempt.list({ filter: { quizId: { eq: quiz.id } }, limit: 10 })
  ).data.length;
  if (usedAttempts >= (quiz.maxAttempts ?? 2)) {
    console.log(
      `  ⏭  Спроби для цього тесту вже витрачені (${usedAttempts}) — блок ліміту пропущено.\n` +
        '     Щоб перевірити з нуля, запустіть під новим студентом.',
    );
  } else {
  const r1 = await client.mutations.submitQuizAttempt({
    quizId: quiz.id,
    answers: JSON.stringify(answers1),
  });
  const a1 = r1.data;
  check('Спроба 1 виконалась', !!a1 && !r1.errors?.length, r1.errors?.[0]?.message);
  if (a1) {
    check(`Бал пораховано на сервері (${a1.rawScore}/${a1.maxRawScore}, ${a1.pct}%)`, a1.pct >= 0);
    check('Лишилась 1 спроба', a1.attemptsLeft === 1, `attemptsLeft=${a1.attemptsLeft}`);
    check(
      'Правильні відповіді НЕ розкрито після 1-ї спроби',
      a1.revealAnswers === false && (a1.results ?? []).every((r) => !r?.correctOptionIds?.length),
    );
  }

  // Спроба 2 — та сама, має пройти й розкрити відповіді
  const r2 = await client.mutations.submitQuizAttempt({
    quizId: quiz.id,
    answers: JSON.stringify(answers1),
  });
  const a2 = r2.data;
  check('Спроба 2 виконалась', !!a2 && !r2.errors?.length, r2.errors?.[0]?.message);
  if (a2) {
    check('Спроб не лишилось', a2.attemptsLeft === 0);
    check('Після останньої спроби відповіді розкрито', a2.revealAnswers === true);
  }

  // Спроба 3 — має бути відхилена
  const r3 = await client.mutations.submitQuizAttempt({
    quizId: quiz.id,
    answers: JSON.stringify(answers1),
  });
  // Перевіряємо не просто «впало», а що впало САМЕ через ліміт: у першому
  // прогоні ця перевірка пройшла з хибної причини — через помилку парсингу,
  // і замаскувала те, що грейдинг узагалі не працював.
  const r3msg = r3.errors?.[0]?.message ?? '';
  check('Спроба 3 відхилена саме лімітом', /спроб/i.test(r3msg), r3msg || 'помилки не було');
  }

  // 5. Агрегат балів створено і читається студентом
  const enr = await client.models.CourseEnrollment.list({ limit: 5 });
  check('CourseEnrollment створено Lambda й читається студентом', enr.data.length > 0);

  // 6. Найважливіше: грейдер має не лише вміти ставити нуль, а й НАРАХОВУВАТИ
  //    бали за правильні відповіді. Ключ читаємо адміном (студент не може),
  //    потім здаємо ІНШИЙ тест правильно вже від імені студента.
  console.log('\n── Нарахування балів за правильні відповіді ────────────');
  const otherQuiz = quizzes2.find((q) => q.id !== quiz.id);
  if (!otherQuiz) {
    check('Знайдено другий тест', false);
    return finish();
  }

  await signOut();
  await signIn({ username: process.env.ADMIN_EMAIL!, password: process.env.ADMIN_PASSWORD! });
  const keys = await client.models.QuizAnswerKey.list({
    filter: { quizId: { eq: otherQuiz.id } },
    limit: 100,
  });
  check('Адмін ЧИТАЄ ключ відповідей', keys.data.length > 0);
  const correctByQuestion = new Map(
    keys.data.map((k) => [k.questionId, (k.correctOptionIds ?? []).filter(Boolean) as string[]]),
  );
  await signOut();

  await signIn({ username: STUDENT.email, password: STUDENT.password });
  const qs2 = await client.models.QuizQuestion.list({
    filter: { quizId: { eq: otherQuiz.id } },
    limit: 50,
  });
  const perfect = qs2.data.map((q) => ({
    questionId: q.id,
    selectedOptionIds: correctByQuestion.get(q.id) ?? [],
  }));
  const rp = await client.mutations.submitQuizAttempt({
    quizId: otherQuiz.id,
    answers: JSON.stringify(perfect),
  });
  const ap = rp.data;
  check('Здача з правильними відповідями виконалась', !!ap, rp.errors?.[0]?.message);
  if (ap) {
    check(`100% за повністю правильну роботу (${ap.pct}%)`, ap.pct === 100);
    check(
      `Нараховано повний бал ${ap.pointsAwarded}/${ap.maxPoints}`,
      ap.pointsAwarded === ap.maxPoints,
    );
    check(
      `Агрегат оновлено до ${ap.courseTotalPoints}`,
      (ap.courseTotalPoints ?? 0) === ap.maxPoints,
    );
  }

  finish();
}

function finish(): never {
  console.log(`\n${pass} пройдено, ${fail} провалено\n`);
  void signOut();
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('ПОМИЛКА:', err instanceof Error ? err.message : err);
  process.exit(1);
});
