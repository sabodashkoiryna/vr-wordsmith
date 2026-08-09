/**
 * Сід навчального контенту MVP.
 *
 * Три речі, яких НЕ робив старий seed-content.ts і які тут принципові:
 *
 *  1. ПРОТЯГУЄ ID по ланцюжку Module → Lesson → Quiz → Question → Option →
 *     AnswerKey. Ключ відповідей зберігається як id опцій, тому кожен create
 *     має повернути результат, а не бути «випущеним у порожнечу».
 *
 *  2. НЕ КОВТАЄ ПОМИЛОК. Старий скрипт робив `create({...} as never)` і
 *     ігнорував {data, errors} — відхилений запис проходив тихо. Саме так ми
 *     свого часу отримали порожню таблицю при «успішному» сіді. Тут кожен
 *     виклик іде через must(), який кидає виняток.
 *
 *  3. UPSERT ЗА ПРИРОДНИМ КЛЮЧЕМ, а не clearModel(). Видаляти все стане
 *     катастрофою, щойно з'являться подання й спроби студентів. Контент
 *     звіряється за Module.code / Lesson.slug; студентські дані не чіпаються
 *     взагалі.
 *
 *  Плюс перевірка інваріанта балів: Σ тестів = 40, Σ практичних = 60.
 *  Якщо сума розійшлася — падаємо, бо на ній тримається поріг сертифіката.
 *
 * Запуск:
 *   ADMIN_EMAIL=... ADMIN_PASSWORD=... npx tsx scripts/seed-course.ts <outputs.json>
 */

import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import { signIn, signOut } from 'aws-amplify/auth';
import { readFileSync } from 'node:fs';
import type { Schema } from '../amplify/data/resource';
import { modules } from '../src/content/course/modules';
import { courseMeta, benefits, instructors, galleryPlaceholders } from '../src/content/course/meta';

const outputsPath = process.argv[2];
if (!outputsPath) {
  console.error('Використання: npx tsx scripts/seed-course.ts <шлях-до-amplify_outputs.json>');
  process.exit(1);
}

Amplify.configure(JSON.parse(readFileSync(outputsPath, 'utf-8')));
const client = generateClient<Schema>();

/** Розгортає {data, errors} і падає на помилці. Мовчазний збій тут
 *  небезпечніший за гучний: він лишає базу в напівзаповненому стані. */
async function must<T>(
  label: string,
  p: Promise<{ data: T | null; errors?: { message: string }[] | null }>,
): Promise<T> {
  const { data, errors } = await p;
  if (errors?.length) throw new Error(`${label}: ${errors.map((e) => e.message).join('; ')}`);
  if (!data) throw new Error(`${label}: порожня відповідь`);
  return data;
}

async function listAll<T>(model: {
  list: (o?: Record<string, unknown>) => Promise<{ data: T[]; errors?: { message: string }[] | null }>;
}): Promise<T[]> {
  const { data, errors } = await model.list({ limit: 1000 });
  if (errors?.length) throw new Error(errors.map((e) => e.message).join('; '));
  return data;
}

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    console.error('Потрібні ADMIN_EMAIL і ADMIN_PASSWORD: контент пише лише група Admins.');
    process.exit(1);
  }
  await signIn({ username: email, password });

  // ── 0. Інваріант балів перевіряємо ДО запису, а не після ────────────────
  const quizTotal = modules.reduce((s, m) => s + m.quiz.maxPoints, 0);
  const assignmentTotal = modules.reduce((s, m) => s + m.assignment.maxPoints, 0);
  if (quizTotal !== 40 || assignmentTotal !== 60) {
    throw new Error(
      `Інваріант балів порушено: тести ${quizTotal} (очікується 40), ` +
        `практичні ${assignmentTotal} (очікується 60). Курс не засіяно.`,
    );
  }
  if (courseMeta.totalPoints !== quizTotal + assignmentTotal) {
    throw new Error(`Course.totalPoints=${courseMeta.totalPoints} ≠ ${quizTotal + assignmentTotal}`);
  }
  console.log(`✓ Інваріант балів: ${quizTotal} + ${assignmentTotal} = ${courseMeta.totalPoints}`);

  // ── 1. Курс ─────────────────────────────────────────────────────────────
  const existingCourses = await listAll<{ id: string; slug: string }>(client.models.Course);
  const course = existingCourses.find((c) => c.slug === courseMeta.slug);
  if (course) {
    await must('Course.update', client.models.Course.update({ id: course.id, ...courseMeta }));
    console.log('✓ Course оновлено');
  } else {
    await must('Course.create', client.models.Course.create(courseMeta));
    console.log('✓ Course створено');
  }

  // ── 2. Переваги та викладачі (звіряємо за order) ────────────────────────
  const existingBenefits = await listAll<{ id: string; order: number }>(client.models.CourseBenefit);
  for (const b of benefits) {
    const hit = existingBenefits.find((x) => x.order === b.order);
    await must(
      `CourseBenefit[${b.order}]`,
      hit
        ? client.models.CourseBenefit.update({ id: hit.id, ...b })
        : client.models.CourseBenefit.create(b),
    );
  }
  console.log(`✓ CourseBenefit: ${benefits.length}`);

  const existingInstructors = await listAll<{ id: string; order: number }>(client.models.Instructor);
  for (const i of instructors) {
    const hit = existingInstructors.find((x) => x.order === i.order);
    await must(
      `Instructor[${i.order}]`,
      hit ? client.models.Instructor.update({ id: hit.id, ...i }) : client.models.Instructor.create(i),
    );
  }
  console.log(`✓ Instructor: ${instructors.length}`);

  // ── 3. Модулі та все, що всередині ──────────────────────────────────────
  const existingModules = await listAll<{ id: string; code: string }>(client.models.Module);
  const existingLessons = await listAll<{ id: string; slug: string }>(client.models.Lesson);
  const existingQuizzes = await listAll<{ id: string; moduleId: string }>(client.models.Quiz);
  const existingAssignments = await listAll<{ id: string; moduleId: string }>(
    client.models.Assignment,
  );

  for (const [mi, m] of modules.entries()) {
    const modulePayload = {
      order: mi,
      code: m.code,
      title: m.title,
      summary: m.summary,
      weeks: m.weeks,
      topics: m.topics,
      component: m.component,
      quizPoints: m.quiz.maxPoints,
      assignmentPoints: m.assignment.maxPoints,
      isPublished: true,
    };
    const hitModule = existingModules.find((x) => x.code === m.code);
    const moduleRow = hitModule
      ? await must(`Module ${m.code}`, client.models.Module.update({ id: hitModule.id, ...modulePayload }))
      : await must(`Module ${m.code}`, client.models.Module.create(modulePayload));
    const moduleId = moduleRow.id;

    // 3a. Уроки
    for (const [li, l] of m.lessons.entries()) {
      const payload = {
        moduleId,
        order: li,
        slug: l.slug,
        title: l.title,
        kind: l.kind,
        summary: l.summary ?? null,
        contentMarkdown: l.contentMarkdown ?? null,
        videoUrl: l.videoUrl ?? null,
        durationMinutes: l.durationMinutes ?? null,
      };
      const hit = existingLessons.find((x) => x.slug === l.slug);
      await must(
        `Lesson ${l.slug}`,
        hit ? client.models.Lesson.update({ id: hit.id, ...payload }) : client.models.Lesson.create(payload),
      );
    }
    console.log(`  ${m.code}: уроків ${m.lessons.length}`);

    // 3b. Тест. Питання й опції пересіваємо повністю: ключ відповідей
    //     прив'язаний до id опцій, тож часткове оновлення лишило б
    //     «висячі» ключі, що вказують на видалені варіанти.
    const quizLesson = m.lessons.find((l) => l.kind === 'quiz');
    const quizPayload = {
      moduleId,
      title: m.quiz.title,
      maxPoints: m.quiz.maxPoints,
      maxAttempts: m.quiz.maxAttempts,
      showAnswersAfterSubmit: true,
      lessonId: null as string | null,
    };
    if (quizLesson) {
      const lessonRow = (await listAll<{ id: string; slug: string }>(client.models.Lesson)).find(
        (x) => x.slug === quizLesson.slug,
      );
      quizPayload.lessonId = lessonRow?.id ?? null;
    }
    const hitQuiz = existingQuizzes.find((x) => x.moduleId === moduleId);
    const quizRow = hitQuiz
      ? await must(`Quiz ${m.code}`, client.models.Quiz.update({ id: hitQuiz.id, ...quizPayload }))
      : await must(`Quiz ${m.code}`, client.models.Quiz.create(quizPayload));

    if (hitQuiz) {
      const oldQ = (await listAll<{ id: string; quizId: string }>(client.models.QuizQuestion)).filter(
        (x) => x.quizId === quizRow.id,
      );
      const oldO = (await listAll<{ id: string; quizId: string }>(client.models.QuizOption)).filter(
        (x) => x.quizId === quizRow.id,
      );
      const oldK = (await listAll<{ id: string; quizId: string }>(client.models.QuizAnswerKey)).filter(
        (x) => x.quizId === quizRow.id,
      );
      for (const k of oldK) await client.models.QuizAnswerKey.delete({ id: k.id });
      for (const o of oldO) await client.models.QuizOption.delete({ id: o.id });
      for (const q of oldQ) await client.models.QuizQuestion.delete({ id: q.id });
    }

    for (const [qi, q] of m.quiz.questions.entries()) {
      const question = await must(
        `QuizQuestion ${m.code}#${qi}`,
        client.models.QuizQuestion.create({
          quizId: quizRow.id,
          order: qi,
          block: q.block ?? null,
          prompt: q.prompt,
          weight: 1,
          // Виводимо з самого контенту, щоб ознака не могла розійтися з ключем.
          isMultiple: q.correct.length > 1,
        }),
      );

      const optionIds: string[] = [];
      for (const [oi, text] of q.options.entries()) {
        const opt = await must(
          `QuizOption ${m.code}#${qi}.${oi}`,
          client.models.QuizOption.create({
            questionId: question.id,
            quizId: quizRow.id,
            order: oi,
            text,
          }),
        );
        optionIds.push(opt.id);
      }

      await must(
        `QuizAnswerKey ${m.code}#${qi}`,
        client.models.QuizAnswerKey.create({
          questionId: question.id,
          quizId: quizRow.id,
          // Індекси з контенту перетворюємо на id — саме тому потрібне
          // протягування id, а не просто послідовність create.
          correctOptionIds: q.correct.map((idx) => optionIds[idx]),
          explanation: q.explanation ?? null,
          points: 1,
        }),
      );
    }
    console.log(`  ${m.code}: питань ${m.quiz.questions.length}, ключів стільки ж`);

    // 3c. Практичне й рубрика
    const assignmentLesson = m.lessons.find((l) => l.kind === 'assignment');
    let assignmentLessonId: string | null = null;
    if (assignmentLesson) {
      const lessonRow = (await listAll<{ id: string; slug: string }>(client.models.Lesson)).find(
        (x) => x.slug === assignmentLesson.slug,
      );
      assignmentLessonId = lessonRow?.id ?? null;
    }
    const assignmentPayload = {
      moduleId,
      lessonId: assignmentLessonId,
      title: m.assignment.title,
      instructions: m.assignment.instructions,
      maxPoints: m.assignment.maxPoints,
      allowExternalLink: m.assignment.allowExternalLink,
      maxFileSizeMb: 50,
    };
    const hitAssignment = existingAssignments.find((x) => x.moduleId === moduleId);
    const assignmentRow = hitAssignment
      ? await must(
          `Assignment ${m.code}`,
          client.models.Assignment.update({ id: hitAssignment.id, ...assignmentPayload }),
        )
      : await must(`Assignment ${m.code}`, client.models.Assignment.create(assignmentPayload));

    const oldCriteria = (
      await listAll<{ id: string; assignmentId: string }>(client.models.RubricCriterion)
    ).filter((x) => x.assignmentId === assignmentRow.id);
    for (const c of oldCriteria) await client.models.RubricCriterion.delete({ id: c.id });

    let order = 0;
    let criteriaCount = 0;
    for (const block of m.assignment.rubric) {
      for (const c of block.criteria) {
        await must(
          `RubricCriterion ${m.code} ${c.code}`,
          client.models.RubricCriterion.create({
            assignmentId: assignmentRow.id,
            order: order++,
            blockLabel: block.label,
            code: c.code,
            text: c.text,
            maxPoints: 3,
          }),
        );
        criteriaCount++;
      }
    }
    console.log(`  ${m.code}: критеріїв рубрики ${criteriaCount}`);
  }

  // ── 4. Заготовки галереї ────────────────────────────────────────────────
  const existingGallery = await listAll<{ id: string; title: string }>(client.models.GalleryItem);
  for (const g of galleryPlaceholders) {
    const hit = existingGallery.find((x) => x.title === g.title);
    await must(
      `GalleryItem ${g.order}`,
      hit ? client.models.GalleryItem.update({ id: hit.id, ...g }) : client.models.GalleryItem.create(g),
    );
  }
  console.log(`✓ GalleryItem: ${galleryPlaceholders.length} (у стані hidden)`);

  await signOut();
  console.log('\nСід завершено.');
}

main().catch(async (err) => {
  console.error('\nПОМИЛКА:', err instanceof Error ? err.message : err);
  process.exit(1);
});
