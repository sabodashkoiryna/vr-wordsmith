import { client } from '../../lib/amplify-client';
import { unwrap } from '../../lib/unwrap';

/**
 * Позначає урок пройденим.
 *
 * Спільна для кнопки «Позначити пройденим» і для здачі тесту: здавши тест,
 * студент уже зробив усе, що від нього вимагав цей урок, і просити його ще
 * й натиснути кнопку означало б лишати прогрес неповним у половині випадків.
 *
 * Ідемпотентна: правило доступу до LessonProgress — власник за studentId,
 * тож list бачить лише власні записи, і повторний виклик оновлює наявний.
 */
export async function markLessonComplete(studentId: string, lessonId: string, moduleId: string) {
  const existing = await unwrap(
    client.models.LessonProgress.list({ filter: { lessonId: { eq: lessonId } }, limit: 1 }),
  );
  const payload = { status: 'completed' as const, completedAt: new Date().toISOString() };
  if (existing[0]) {
    await unwrap(client.models.LessonProgress.update({ id: existing[0].id, ...payload }));
  } else {
    await unwrap(client.models.LessonProgress.create({ studentId, lessonId, moduleId, ...payload }));
  }
}
