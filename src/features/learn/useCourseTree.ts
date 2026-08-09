import { useCallback, useEffect, useState } from 'react';
import { client } from '../../lib/amplify-client';
import { unwrap } from '../../lib/unwrap';
import { useAuth } from '../../context/AuthContext';

export type LessonNode = {
  id: string;
  moduleId: string;
  order: number;
  slug: string;
  title: string;
  kind: 'text' | 'video' | 'quiz' | 'assignment';
  summary: string | null;
  durationMinutes: number | null;
  completed: boolean;
};

export type ModuleNode = {
  id: string;
  order: number;
  code: string;
  title: string;
  summary: string | null;
  component: string | null;
  quizPoints: number;
  assignmentPoints: number;
  lessons: LessonNode[];
  completedCount: number;
};

export type CourseTree = {
  modules: ModuleNode[];
  lessonCount: number;
  completedCount: number;
  /** Бали з кешу CourseEnrollment. До першого оцінювання запису НЕМАЄ —
   *  це не помилка, а нормальний стан нового учасника. */
  points: { quiz: number; assignment: number; total: number } | null;
  /** Максимум і поріг сертифіката беруться з Course, а не з констант у
   *  компонентах: правила оцінювання змінюються, і кожне число, вписане в
   *  розмітку, довелося б потім вишукувати по всьому дереву. */
  totalPoints: number;
  passingPoints: number;
  /** Курсовий проєкт. Поза модулями: він підсумовує їх усі. */
  project: {
    id: string;
    title: string;
    maxPoints: number;
    status: 'not_started' | 'draft' | 'submitted' | 'returned' | 'graded';
    pointsAwarded: number | null;
  } | null;
};

const EMPTY: CourseTree = {
  modules: [],
  lessonCount: 0,
  completedCount: 0,
  points: null,
  totalPoints: 100,
  passingPoints: 70,
  project: null,
};

export const PROJECT_SLUG = 'course-project';

/**
 * Дерево курсу для кабінету: модулі → уроки + відмітки про проходження.
 *
 * `CourseEnrollment` свідомо не є обов'язковим. Його створюють лише грейдинг-
 * Lambda при першому оцінюванні, тож у щойно зареєстрованого учасника запису
 * не існує взагалі. Екран, який би на нього чекав, для новачка не завантажився
 * б ніколи — тому бали тут `null`, а не `0`, і вирішує це вже інтерфейс.
 */
export function useCourseTree() {
  const { userId } = useAuth();
  const [tree, setTree] = useState<CourseTree | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) return;
    try {
      setError(null);
      const [modules, lessons, progress, enrollments, courses, assignments, submissions, grades] =
        await Promise.all([
          unwrap(client.models.Module.list({ limit: 200 })),
          unwrap(client.models.Lesson.list({ limit: 500 })),
          unwrap(client.models.LessonProgress.list({ limit: 500 })),
          unwrap(client.models.CourseEnrollment.list({ limit: 2 })),
          unwrap(client.models.Course.list({ limit: 2 })),
          unwrap(client.models.Assignment.list({ limit: 20 })),
          unwrap(client.models.AssignmentSubmission.list({ limit: 20 })),
          unwrap(client.models.AssignmentGrade.list({ limit: 20 })),
        ]);

      const done = new Set(
        progress.filter((p) => p.status === 'completed').map((p) => p.lessonId),
      );

      const byModule = new Map<string, LessonNode[]>();
      for (const l of lessons) {
        const node: LessonNode = {
          id: l.id,
          moduleId: l.moduleId,
          order: l.order,
          slug: l.slug,
          title: l.title,
          kind: (l.kind ?? 'text') as LessonNode['kind'],
          summary: l.summary ?? null,
          durationMinutes: l.durationMinutes ?? null,
          completed: done.has(l.id),
        };
        const list = byModule.get(l.moduleId);
        if (list) list.push(node);
        else byModule.set(l.moduleId, [node]);
      }
      for (const list of byModule.values()) list.sort((a, b) => a.order - b.order);

      const moduleNodes: ModuleNode[] = modules
        .filter((m) => m.isPublished !== false)
        .sort((a, b) => a.order - b.order)
        .map((m) => {
          const own = byModule.get(m.id) ?? [];
          return {
            id: m.id,
            order: m.order,
            code: m.code,
            title: m.title,
            summary: m.summary ?? null,
            component: m.component ?? null,
            quizPoints: m.quizPoints ?? 8,
            assignmentPoints: m.assignmentPoints ?? 12,
            lessons: own,
            completedCount: own.filter((l) => l.completed).length,
          };
        });

      const e = enrollments[0];
      const course = courses[0];

      // Подання й оцінки видно лише власні (правило ownerDefinedIn), тож
      // фільтрувати за studentId тут не треба — база вже це зробила.
      const projectRow = assignments.find((a) => a.slug === PROJECT_SLUG) ?? assignments[0] ?? null;
      const submission = projectRow
        ? submissions.find((s) => s.assignmentId === projectRow.id)
        : undefined;
      const grade = projectRow ? grades.find((g) => g.assignmentId === projectRow.id) : undefined;

      setTree({
        modules: moduleNodes,
        lessonCount: moduleNodes.reduce((n, m) => n + m.lessons.length, 0),
        completedCount: moduleNodes.reduce((n, m) => n + m.completedCount, 0),
        points: e
          ? { quiz: e.quizPoints, assignment: e.assignmentPoints, total: e.totalPoints }
          : null,
        totalPoints: course?.totalPoints ?? EMPTY.totalPoints,
        passingPoints: course?.passingPoints ?? EMPTY.passingPoints,
        project: projectRow
          ? {
              id: projectRow.id,
              title: projectRow.title,
              maxPoints: projectRow.maxPoints,
              status: grade
                ? 'graded'
                : ((submission?.status as 'draft' | 'submitted' | 'returned') ?? 'not_started'),
              pointsAwarded: grade?.pointsAwarded ?? null,
            }
          : null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не вдалося завантажити курс');
      setTree(EMPTY);
    }
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  return { tree, error, reload: load };
}
