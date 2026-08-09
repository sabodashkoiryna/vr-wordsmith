/**
 * Гостьова половина матриці доступу.
 *
 * Окремо від verify-access.ts навмисно: цей скрипт НЕ потребує ані пароля, ані
 * створеного акаунта, тож його можна запускати після кожного деплою, а не лише
 * тоді, коли під рукою є облікові дані.
 *
 * Перевіряє обидва напрямки, і другий важливіший за перший. Збій тут
 * асиметричний: правило, написане так, що гість бачить зайве, виглядає
 * абсолютно нормально, поки дивишся на сайт залогіненим — а саме так його
 * зазвичай і дивляться. Тому «Lesson закритий» перевіряється явно, а не
 * припускається.
 *
 * Запуск (PowerShell, з кореня vr-wordsmith):
 *   .\node_modules\.bin\tsx.cmd scripts/verify-guest-access.ts amplify_outputs.master.json
 */

import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import { readFileSync } from 'node:fs';
import type { Schema } from '../amplify/data/resource';

const outputsPath = process.argv[2];
if (!outputsPath) {
  console.error('Використання: tsx scripts/verify-guest-access.ts <шлях-до-amplify_outputs.json>');
  process.exit(1);
}

Amplify.configure(JSON.parse(readFileSync(outputsPath, 'utf-8')));
// Гість ходить через identityPool — саме той режим, що його обирає
// usePublicAuthMode на клієнті для незалогіненого відвідувача.
const client = generateClient<Schema>({ authMode: 'identityPool' });

/** Публічні: лендінг і галерея мусять читатися без входу. */
const PUBLIC = ['Course', 'Module', 'CourseBenefit', 'Instructor', 'GalleryItem', 'Resource'] as const;

/** Курсові: доступні лише за логіном. QuizAnswerKey — найважливіший рядок. */
const MEMBER = ['Lesson', 'Quiz', 'QuizQuestion', 'QuizOption', 'QuizAnswerKey', 'Assignment', 'RubricCriterion'] as const;

/** Студентські: не видно нікому, крім власника й адміна. */
const PRIVATE = ['UserProfile', 'LessonProgress', 'QuizAttempt', 'CourseEnrollment', 'AssignmentSubmission', 'AssignmentGrade', 'Certificate'] as const;

let fail = 0;
function check(label: string, ok: boolean, detail = '') {
  if (ok) {
    console.log(`  ✓ ${label}`);
  } else {
    fail++;
    console.log(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`);
  }
}

type Listable = { list: (o?: Record<string, unknown>) => Promise<{ data: unknown[]; errors?: { message: string }[] | null }> };

async function probe(name: string) {
  const model = (client.models as unknown as Record<string, Listable>)[name];
  try {
    const res = await model.list({ limit: 5 });
    return { count: res.data?.length ?? 0, errors: (res.errors ?? []).map((e) => e.message) };
  } catch (err) {
    return { count: 0, errors: [err instanceof Error ? err.message : String(err)] };
  }
}

async function main() {
  console.log('\n── Гість МАЄ читати публічне ───────────────────────────');
  for (const name of PUBLIC) {
    const r = await probe(name);
    check(`${name} читається`, r.errors.length === 0, r.errors.join('; '));
  }

  console.log('\n── Гість НЕ МАЄ бачити курс ────────────────────────────');
  for (const name of MEMBER) {
    const r = await probe(name);
    check(`${name} закритий`, r.count === 0, `повернуто ${r.count} записів`);
  }

  console.log('\n── Гість НЕ МАЄ бачити студентські дані ────────────────');
  for (const name of PRIVATE) {
    const r = await probe(name);
    check(`${name} закритий`, r.count === 0, `повернуто ${r.count} записів`);
  }

  console.log(
    fail === 0
      ? '\nГостьова матриця чиста.\n'
      : `\n${fail} проблем(и). Гість бачить те, чого не має, або не бачить того, що має.\n`,
  );
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('\nПОМИЛКА:', err instanceof Error ? err.message : err);
  process.exit(1);
});
