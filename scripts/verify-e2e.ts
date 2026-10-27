/**
 * Наскрізна перевірка платформи.
 *
 * Проганяє весь шлях: контент → доступ студента → проходження тесту →
 * здача проєкту → оцінювання → сертифікат із пулу номерів. Перевіряє саме
 * те, що ламається тихо: межі доступу, ліміт спроб, приховування ключа
 * відповідей, подвійне нарахування балів при повторному оцінюванні.
 *
 * УВАГА: тест ЗАПИСУЄ дані — спроби тестів, подання, оцінки, сертифікат.
 * Запускати лише на пісочниці. Спроби й оцінки прибрати неможливо: моделі
 * навмисно доступні адмінові лише на читання, бо це дані про оцінювання.
 * Сертифікат і внесені номери скрипт прибирає за собою сам.
 *
 * Запуск (PowerShell, з кореня vr-wordsmith):
 *   $env:ADMIN_EMAIL="..."; $env:ADMIN_PASSWORD=Read-Host "Пароль адміна"
 *   $env:STUDENT_EMAIL="..."; $env:STUDENT_PASSWORD=Read-Host "Пароль студента"
 *   .\node_modules\.bin\tsx.cmd scripts/verify-e2e.ts amplify_outputs.master.json
 */

import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import { signIn, signOut } from 'aws-amplify/auth';
import { readFileSync } from 'node:fs';
import type { Schema } from '../amplify/data/resource';

const outputsPath = process.argv[2];
if (!outputsPath) {
  console.error('Використання: tsx scripts/verify-e2e.ts <amplify_outputs.json>');
  process.exit(1);
}

Amplify.configure(JSON.parse(readFileSync(outputsPath, 'utf-8')));
const client = generateClient<Schema>();

const ADMIN = { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD };
const STUDENT = { email: process.env.STUDENT_EMAIL, password: process.env.STUDENT_PASSWORD };

if (!ADMIN.email || !ADMIN.password || !STUDENT.email || !STUDENT.password) {
  console.error(
    'Потрібні ADMIN_EMAIL, ADMIN_PASSWORD, STUDENT_EMAIL, STUDENT_PASSWORD.\n' +
      'Студентський акаунт — звичайний, БЕЗ ролі Admins: інакше перевірки меж доступу\n' +
      'пройдуть «успішно» просто тому, що адмінові дозволено все.',
  );
  process.exit(1);
}

/* ── інфраструктура перевірок ─────────────────────────────────────────── */

let pass = 0;
const failures: string[] = [];
let section = '';

function head(title: string) {
  section = title;
  console.log(`\n── ${title} ${'─'.repeat(Math.max(0, 62 - title.length))}`);
}

function check(label: string, ok: boolean, detail = '') {
  if (ok) {
    pass++;
    console.log(`  ✓ ${label}`);
  } else {
    failures.push(`[${section}] ${label}${detail ? ` — ${detail}` : ''}`);
    console.log(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`);
  }
}

async function unwrap<T>(p: Promise<{ data: T; errors?: { message: string }[] | null }>): Promise<T> {
  const { data, errors } = await p;
  if (errors?.length) throw new Error(errors.map((e) => e.message).join('; '));
  return data;
}

/** Очікуємо, що дія ЗАБОРОНЕНА. Повертає true, якщо її справді відхилено. */
async function denied(fn: () => Promise<unknown>): Promise<boolean> {
  try {
    const res = (await fn()) as { errors?: unknown[]; data?: unknown };
    if (res && typeof res === 'object' && 'errors' in res && (res.errors?.length ?? 0) > 0) return true;
    if (res && typeof res === 'object' && 'data' in res && res.data == null) return true;
    return false;
  } catch {
    return true;
  }
}

async function as(who: 'admin' | 'student') {
  try {
    await signOut();
  } catch {
    /* не було сесії */
  }
  const c = who === 'admin' ? ADMIN : STUDENT;
  try {
    await signIn({ username: c.email!, password: c.password! });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(
      [
        `Вхід як ${who} (${c.email}) не вдався: ${msg}`,
        '  • перевірте пароль — підказка Read-Host не приховує введеного, тож',
        '    його легко не помітити й лишити плейсхолдер;',
        '  • щойно створеному користувачеві потрібен ПОСТІЙНИЙ пароль:',
        '    aws cognito-idp admin-set-user-password ... --permanent',
        '    без нього статус лишається FORCE_CHANGE_PASSWORD, і вхід повертає',
        '    виклик зміни пароля замість сесії.',
      ].join('\n'),
    );
  }
}

const sum = (xs: number[]) => xs.reduce((s, v) => s + v, 0);

/* ── основний сценарій ────────────────────────────────────────────────── */

/**
 * Клієнт будує список моделей із amplify_outputs.json, а не зі схеми. Файл,
 * згенерований до появи нової моделі, дає `client.models.X === undefined` —
 * і падіння виглядає як «Cannot read properties of undefined (reading
 * 'list')», що про справжню причину не каже нічого.
 */
function preflight() {
  const expected = [
    'Course', 'Module', 'Lesson', 'Quiz', 'QuizQuestion', 'QuizOption', 'QuizAnswerKey',
    'Assignment', 'RubricCriterion', 'UserProfile', 'LessonProgress', 'CourseEnrollment',
    'QuizAttempt', 'AssignmentSubmission', 'AssignmentGrade', 'Certificate',
    'CertificateNumber', 'GalleryItem',
  ];
  const missing = expected.filter((m) => !(client.models as Record<string, unknown>)[m]);
  if (missing.length) {
    throw new Error(
      [
        `У файлі виводів немає моделей: ${missing.join(', ')}.`,
        'Це не помилка схеми — застарілий amplify_outputs. Перегенеруйте:',
        '  $env:AWS_REGION = "us-east-1"',
        '  npx.cmd ampx generate outputs --app-id d1fmnqsgshywg2 --branch master --out-dir .',
        '  mv amplify_outputs.json amplify_outputs.master.json',
      ].join('\n'),
    );
  }
}

async function main() {
  preflight();

  // ===================================================================== //
  head('A. Контент на місці (адмін)');
  await as('admin');

  const courses = await unwrap(client.models.Course.list({ limit: 5 }));
  const course = courses[0];
  check('курс існує', !!course);
  check('максимум 100 балів', course?.totalPoints === 100, String(course?.totalPoints));
  check('поріг сертифіката 70', course?.passingPoints === 70, String(course?.passingPoints));

  const modules = await unwrap(client.models.Module.list({ limit: 200 }));
  const lessons = await unwrap(client.models.Lesson.list({ limit: 500 }));
  const quizzes = await unwrap(client.models.Quiz.list({ limit: 200 }));
  const questions = await unwrap(client.models.QuizQuestion.list({ limit: 500 }));
  const keys = await unwrap(client.models.QuizAnswerKey.list({ limit: 500 }));
  const options = await unwrap(client.models.QuizOption.list({ limit: 1000 }));
  const assignments = await unwrap(client.models.Assignment.list({ limit: 50 }));
  const criteria = await unwrap(client.models.RubricCriterion.list({ limit: 200 }));

  check('5 модулів', modules.length === 5, String(modules.length));
  check('усі уроки належать наявним модулям',
    lessons.every((l) => modules.some((m) => m.id === l.moduleId)));
  check('slug уроків унікальні',
    new Set(lessons.map((l) => l.slug)).size === lessons.length);
  check('5 тестів', quizzes.length === 5, String(quizzes.length));
  check('кожен тест привʼязаний до уроку типу quiz',
    quizzes.every((q) => lessons.some((l) => l.id === q.lessonId && l.kind === 'quiz')));
  check('сума балів за тести = 60', sum(quizzes.map((q) => q.maxPoints)) === 60,
    String(sum(quizzes.map((q) => q.maxPoints))));
  check('у кожного питання є ключ', questions.every((q) => keys.some((k) => k.questionId === q.id)));
  check('жоден ключ не порожній', keys.every((k) => (k.correctOptionIds ?? []).length > 0));
  check('ключі вказують на варіанти СВОГО питання',
    keys.every((k) =>
      (k.correctOptionIds ?? []).every((id) =>
        options.some((o) => o.id === id && o.questionId === k.questionId))));
  check('isMultiple збігається з довжиною ключа',
    questions.every((q) => {
      const k = keys.find((x) => x.questionId === q.id);
      return !!k && (q.isMultiple === true) === ((k.correctOptionIds ?? []).length > 1);
    }));

  const project = assignments.find((a) => a.slug === 'course-project') ?? assignments[0];
  check('курсовий проєкт існує', !!project);
  check('проєкт на 40 балів', project?.maxPoints === 40, String(project?.maxPoints));
  check('проєкт поза модулями', !project?.moduleId);
  const projectCriteria = criteria.filter((c) => c.assignmentId === project?.id);
  check('рубрика з 12 критеріїв', projectCriteria.length === 12, String(projectCriteria.length));
  check('сира сума рубрики 36', sum(projectCriteria.map((c) => c.maxPoints)) === 36);
  check('60 + 40 = 100', sum(quizzes.map((q) => q.maxPoints)) + (project?.maxPoints ?? 0) === 100);
  check('поріг ВИЩИЙ за суму тестів — проєкт обовʼязковий',
    (course?.passingPoints ?? 0) > sum(quizzes.map((q) => q.maxPoints)));

  // ===================================================================== //
  head('B. Межі доступу студента');
  await as('student');

  const sLessons = await unwrap(client.models.Lesson.list({ limit: 10 }));
  check('уроки читаються', sLessons.length > 0);
  const sQuestions = await unwrap(client.models.QuizQuestion.list({ limit: 10 }));
  check('питання читаються', sQuestions.length > 0);
  check('у питанні немає поля з правильною відповіддю',
    !sQuestions.some((q) => Object.keys(q).some((k) => /correct|answer|isRight/i.test(k))));

  const keyRes = await client.models.QuizAnswerKey.list({ limit: 5 });
  check('QuizAnswerKey недосяжний', (keyRes.errors?.length ?? 0) > 0 || keyRes.data.length === 0,
    `повернуто ${keyRes.data.length}`);

  check('не може створити QuizAttempt напряму', await denied(() =>
    client.models.QuizAttempt.create({
      studentId: 'x', quizId: 'x', moduleId: 'x', attemptNumber: 1,
      rawScore: 99, maxRawScore: 99, pct: 100, submittedAt: new Date().toISOString(),
    } as never)));

  check('не може створити AssignmentGrade напряму', await denied(() =>
    client.models.AssignmentGrade.create({
      submissionId: 'x', studentId: 'x', assignmentId: 'x',
      pointsAwarded: 40, maxPoints: 40, gradedAt: new Date().toISOString(),
    } as never)));

  check('не може створити Certificate напряму', await denied(() =>
    client.models.Certificate.create({
      studentId: 'x', certificateNumber: 'ПІДРОБКА', verificationCode: 'X',
      studentFullName: 'X', courseTitle: 'X', totalPoints: 100, maxPoints: 100,
      issuedAt: new Date().toISOString(),
    } as never)));

  check('не може сам видати собі сертифікат (мутація лише для адмінів)',
    await denied(() => client.mutations.issueCertificate({})));

  check('не бачить пул номерів',
    await denied(() => client.models.CertificateNumber.list({ limit: 5 })));

  // ===================================================================== //
  head('C. Проходження тесту');

  const quiz = quizzes[0];
  const quizQuestions = questions
    .filter((q) => q.quizId === quiz.id)
    .sort((a, b) => a.order - b.order);
  const keyByQuestion = new Map(keys.map((k) => [k.questionId, k]));

  const priorAttempts = await unwrap(
    client.models.QuizAttempt.listQuizAttemptByStudentIdAndQuizId({
      studentId: (await currentSub()) ?? '',
      quizId: { eq: quiz.id },
    }),
  );
  if (priorAttempts.length > 0) {
    console.log(`  ! Спроби вже витрачено (${priorAttempts.length}) — блок C пропущено.`);
    console.log('    Для повної перевірки потрібен студент, який цей тест ще не складав.');
  } else {
    // Спроба 1: свідомо НЕПРАВИЛЬНО, щоб перевірити і бал, і приховування ключа.
    const wrong = quizQuestions.map((q) => {
      const correct = new Set(keyByQuestion.get(q.id)?.correctOptionIds ?? []);
      const opts = options.filter((o) => o.questionId === q.id);
      const bad = opts.find((o) => !correct.has(o.id));
      return { questionId: q.id, selectedOptionIds: bad ? [bad.id] : [] };
    });
    const a1 = await unwrap(
      client.mutations.submitQuizAttempt({ quizId: quiz.id, answers: JSON.stringify(wrong) }),
    );
    check('спроба 1 зарахована', a1?.attemptNumber === 1, String(a1?.attemptNumber));
    check('навмисно неправильні відповіді дають 0', a1?.rawScore === 0, String(a1?.rawScore));
    check('лишилась 1 спроба', a1?.attemptsLeft === 1, String(a1?.attemptsLeft));
    check('ПІСЛЯ 1-Ї СПРОБИ КЛЮЧ НЕ РОЗКРИТО', a1?.revealAnswers === false);
    check('правильні варіанти не повернуто',
      (a1?.results ?? []).every((r) => !r?.correctOptionIds?.length));
    check('пояснення не повернуто', (a1?.results ?? []).every((r) => !r?.explanation));

    // Спроба 2: повністю ПРАВИЛЬНО.
    const right = quizQuestions.map((q) => ({
      questionId: q.id,
      selectedOptionIds: (keyByQuestion.get(q.id)?.correctOptionIds ?? []).filter(
        (x): x is string => !!x,
      ),
    }));
    const a2 = await unwrap(
      client.mutations.submitQuizAttempt({ quizId: quiz.id, answers: JSON.stringify(right) }),
    );
    check('спроба 2 зарахована', a2?.attemptNumber === 2);
    check('повністю правильна робота дає 100%', a2?.pct === 100, String(a2?.pct));
    check('нараховано повний бал за тест', a2?.pointsAwarded === quiz.maxPoints,
      `${a2?.pointsAwarded} з ${quiz.maxPoints}`);
    check('друга спроба краща за першу', a2?.isBest === true);
    check('ПІСЛЯ ОСТАННЬОЇ СПРОБИ КЛЮЧ РОЗКРИТО', a2?.revealAnswers === true);
    check('правильні варіанти повернуто', (a2?.results ?? []).some((r) => !!r?.correctOptionIds?.length));
    check('спроб не лишилось', a2?.attemptsLeft === 0);

    // Спроба 3 має бути відхилена.
    check('ТРЕТЯ СПРОБА ВІДХИЛЕНА', await denied(() =>
      client.mutations.submitQuizAttempt({ quizId: quiz.id, answers: JSON.stringify(right) })));
  }

  // ===================================================================== //
  head('D. Прогрес уроку');

  const lesson = lessons.find((l) => l.kind !== 'quiz');
  const studentSub = (await currentSub()) ?? '';
  if (lesson) {
    const before = await unwrap(
      client.models.LessonProgress.listLessonProgressByStudentIdAndLessonId({
        studentId: studentSub, lessonId: { eq: lesson.id },
      }),
    );
    for (const row of before) await client.models.LessonProgress.delete({ id: row.id });

    const mark = async () => {
      const ex = await unwrap(
        client.models.LessonProgress.listLessonProgressByStudentIdAndLessonId({
          studentId: studentSub, lessonId: { eq: lesson.id },
        }),
      );
      const payload = { status: 'completed' as const, completedAt: new Date().toISOString() };
      if (ex[0]) await unwrap(client.models.LessonProgress.update({ id: ex[0].id, ...payload }));
      else await unwrap(client.models.LessonProgress.create({
        studentId: studentSub, lessonId: lesson.id, moduleId: lesson.moduleId, ...payload,
      }));
    };
    await mark();
    await mark();
    const after = await unwrap(
      client.models.LessonProgress.listLessonProgressByStudentIdAndLessonId({
        studentId: studentSub, lessonId: { eq: lesson.id },
      }),
    );
    check('повторне позначення НЕ дублює запис прогресу', after.length === 1, `${after.length} записів`);
    check('урок позначено пройденим', after[0]?.status === 'completed');
  }

  // ===================================================================== //
  head('E. Здача проєкту');

  const mySubs = await unwrap(
    client.models.AssignmentSubmission.listAssignmentSubmissionByStudentIdAndAssignmentId({
      studentId: studentSub, assignmentId: { eq: project!.id },
    }),
  );
  let submissionId: string | null = mySubs[0]?.id ?? null;
  if (!submissionId) {
    const created = await unwrap(
      client.models.AssignmentSubmission.create({
        studentId: studentSub,
        assignmentId: project!.id,
        title: 'Перевірочна робота (E2E)',
        description: 'Створено наскрізним тестом.',
        externalUrl: 'https://example.org/vr-scene',
        status: 'submitted',
        submittedAt: new Date().toISOString(),
      }),
    );
    submissionId = created?.id ?? null;
  } else {
    await unwrap(client.models.AssignmentSubmission.update({
      id: submissionId, status: 'submitted', submittedAt: new Date().toISOString(),
    }));
  }
  check('подання створено', !!submissionId);
  check('у поданні немає поля з балом',
    !Object.keys(mySubs[0] ?? {}).some((k) => /points|score|grade|mark/i.test(k)));

  // ===================================================================== //
  head('F. Оцінювання (адмін)');
  await as('admin');

  const queue = await unwrap(client.models.AssignmentSubmission.list({ limit: 500 }));
  check('адмін бачить подання в черзі', queue.some((s) => s.id === submissionId));

  const fullScores: Record<string, number> = {};
  for (const c of projectCriteria) fullScores[c.code] = c.maxPoints;

  const g1 = await unwrap(client.mutations.gradeAssignment({
    submissionId: submissionId!, rubricScores: JSON.stringify(fullScores), comment: 'E2E',
  }));
  check('повна рубрика 36 → 40 балів', g1?.pointsAwarded === 40, String(g1?.pointsAwarded));
  check('сиру суму збережено окремо', g1?.rubricRawTotal === 36, String(g1?.rubricRawTotal));

  const totalAfterFirst = g1?.courseTotalPoints ?? 0;
  const g2 = await unwrap(client.mutations.gradeAssignment({
    submissionId: submissionId!, rubricScores: JSON.stringify(fullScores), comment: 'E2E повторно',
  }));
  check('ПОВТОРНЕ ОЦІНЮВАННЯ НЕ ПОДВОЮЄ БАЛИ',
    g2?.courseTotalPoints === totalAfterFirst,
    `${totalAfterFirst} → ${g2?.courseTotalPoints}`);

  const grades = await unwrap(client.models.AssignmentGrade.listAssignmentGradeBySubmissionId({
    submissionId: submissionId!,
  }));
  check('на подання рівно одна оцінка', grades.length === 1, `${grades.length}`);

  const overLimit: Record<string, number> = {};
  for (const c of projectCriteria) overLimit[c.code] = 99;
  const g3 = await unwrap(client.mutations.gradeAssignment({
    submissionId: submissionId!, rubricScores: JSON.stringify(overLimit),
  }));
  check('оцінка понад максимум критерію обрізається', g3?.pointsAwarded === 40, String(g3?.pointsAwarded));

  // ===================================================================== //
  head('G. Сертифікат і пул номерів');

  const stamp = Date.now();
  const testNumbers = [`E2E-${stamp}-1`, `E2E-${stamp}-2`];
  const createdNumbers: string[] = [];

  const freeBefore = (await unwrap(client.models.CertificateNumber.list({ limit: 1000 })))
    .filter((n) => n.status === 'free');

  // Якщо вільних номерів немає — перевіряємо саме цей стан.
  if (freeBefore.length === 0) {
    const noNum = await unwrap(client.mutations.issueCertificate({ studentId: studentSub }));
    check('без вільних номерів видача відмовляє зрозуміло',
      noNum?.reason === 'no_numbers_left', String(noNum?.reason));
  }

  for (const number of testNumbers) {
    const n = await unwrap(client.models.CertificateNumber.create({ number, status: 'free', batchLabel: 'E2E' }));
    if (n?.id) createdNumbers.push(n.id);
  }
  check('номери внесено в пул', createdNumbers.length === 2);

  const enrollment = (await unwrap(client.models.CourseEnrollment.listCourseEnrollmentByStudentId({
    studentId: studentSub,
  })))[0];
  const studentTotal = enrollment?.totalPoints ?? 0;
  console.log(`    (балів у студента: ${studentTotal} з порогом ${course?.passingPoints})`);

  const issued = await unwrap(client.mutations.issueCertificate({ studentId: studentSub }));
  if (studentTotal >= (course?.passingPoints ?? 70)) {
    check('сертифікат видано', issued?.eligible === true && !!issued?.certificateNumber);
    check('номер узято з пулу, а не вигадано',
      testNumbers.includes(issued?.certificateNumber ?? '') ||
        freeBefore.some((f) => f.number === issued?.certificateNumber),
      String(issued?.certificateNumber));

    const slots = await unwrap(client.models.CertificateNumber.list({ limit: 1000 }));
    const usedSlot = slots.find((s) => s.number === issued?.certificateNumber);
    check('номер позначено використаним', usedSlot?.status === 'used');
    check('номер звʼязано з документом', !!usedSlot?.certificateId);

    const again = await unwrap(client.mutations.issueCertificate({ studentId: studentSub }));
    check('ПОВТОРНА ВИДАЧА НЕ СТВОРЮЄ ДРУГИЙ СЕРТИФІКАТ',
      again?.reason === 'already_issued' && again?.certificateNumber === issued?.certificateNumber);

    const stillFree = (await unwrap(client.models.CertificateNumber.list({ limit: 1000 })))
      .filter((n) => n.status === 'free' && testNumbers.includes(n.number));
    check('другий номер не витрачено', stillFree.length === 1, `${stillFree.length}`);

    // Прибираємо за собою: сертифікат і внесені номери.
    if (issued?.certificateId) {
      await client.models.Certificate.delete({ id: issued.certificateId });
      console.log('    (тестовий сертифікат видалено)');
    }
  } else {
    check('нижче порогу сертифікат НЕ видається',
      issued?.eligible === false && issued?.reason === 'insufficient_points',
      String(issued?.reason));
  }

  for (const id of createdNumbers) {
    await client.models.CertificateNumber.delete({ id });
  }
  console.log('    (тестові номери прибрано з пулу)');

  // ===================================================================== //
  head('H. Галерея');

  const gallery = await unwrap(client.models.GalleryItem.list({ limit: 500 }));
  check('є записи галереї', gallery.length > 0);
  check('опубліковані записи мають посилання або обкладинку',
    gallery.filter((g) => g.publishState === 'published')
      .every((g) => !!g.externalUrl || !!g.coverImageKey));
  check('жоден опублікований запис не має імені автора без згоди',
    !gallery.some((g) => g.publishState === 'published' && g.authorDisplayName && g.consentGiven !== true));

  await signOut();

  /* ── підсумок ───────────────────────────────────────────────────────── */
  console.log(`\n${'═'.repeat(66)}`);
  if (failures.length === 0) {
    console.log(`УСЕ ЧИСТО · перевірок пройдено: ${pass}\n`);
    process.exit(0);
  }
  console.log(`ПРОЙДЕНО: ${pass} · ПРОВАЛЕНО: ${failures.length}\n`);
  for (const f of failures) console.log(`  ✗ ${f}`);
  console.log('');
  process.exit(1);
}

/** Cognito sub поточної сесії — саме він є studentId в усіх моделях. */
async function currentSub(): Promise<string | null> {
  const { fetchAuthSession } = await import('aws-amplify/auth');
  const session = await fetchAuthSession();
  return (session.tokens?.idToken?.payload.sub as string) ?? null;
}

main().catch((err) => {
  // signOut тут НЕ викликаємо: якщо впав саме вхід, сесії не існує, а спроба
  // вийти з неї під час завершення процесу валила node з assertion у libuv
  // (`!(handle->flags & UV_HANDLE_CLOSING)`) — помилка вгорі ставала
  // непомітною за цим шумом.
  console.error('\nПОМИЛКА:', err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
