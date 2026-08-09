import type { LessonNode, ModuleNode } from './useCourseTree';

export const KIND_LABEL: Record<LessonNode['kind'], string> = {
  text: 'Лекція',
  video: 'Відео',
  quiz: 'Тест',
  assignment: 'Практичне',
};

/**
 * Адреса уроку: `/learn/<номер модуля>/<slug уроку>`.
 *
 * Код модуля («МОДУЛЬ 1») у шляху виглядав би як `%D0%9C%D0%9E%D0%94...` —
 * тому в URL іде порядковий номер. Він може змінитись, якщо модулі
 * переставити в адмінці, тому пошук уроку робиться і за slug'ом окремо:
 * стара адреса тоді все одно відкриє правильний урок.
 */
export function lessonHref(module: ModuleNode, lesson: LessonNode) {
  return `/learn/${module.order + 1}/${lesson.slug}`;
}

export type LessonLocation = { module: ModuleNode; lesson: LessonNode; index: number };

/** Плоский порядок уроків за курсом — для навігації «далі/назад». */
export function flatten(modules: ModuleNode[]): LessonLocation[] {
  const out: LessonLocation[] = [];
  for (const module of modules) {
    for (const lesson of module.lessons) out.push({ module, lesson, index: out.length });
  }
  return out;
}

export function findLesson(
  modules: ModuleNode[],
  moduleParam: string | undefined,
  slug: string | undefined,
): LessonLocation | null {
  if (!slug) return null;
  const flat = flatten(modules);
  const order = Number(moduleParam) - 1;
  return (
    flat.find((x) => x.module.order === order && x.lesson.slug === slug) ??
    flat.find((x) => x.lesson.slug === slug) ??
    null
  );
}
