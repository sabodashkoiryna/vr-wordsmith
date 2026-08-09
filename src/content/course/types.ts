/** Форма навчального контенту. Збігається зі схемою Amplify, тож seed-скрипт
 *  переносить її 1:1, а адмінка далі редагує вже записи в базі. */

export type LessonKind = 'text' | 'video' | 'quiz' | 'assignment';

export type LessonSeed = {
  slug: string;
  title: string;
  kind: LessonKind;
  summary?: string;
  /** Markdown. Для kind: 'quiz' | 'assignment' — це вступ перед завданням. */
  contentMarkdown?: string;
  videoUrl?: string;
  durationMinutes?: number;
};

export type QuestionSeed = {
  prompt: string;
  block?: string;
  options: string[];
  /** Індекси правильних варіантів. Сід перетворює їх на id опцій —
   *  у базі ключ зберігається як id, тож перестановка варіантів в адмінці
   *  його не ламає. */
  correct: number[];
  explanation?: string;
};

export type QuizSeed = {
  title: string;
  maxPoints: number;
  maxAttempts: number;
  questions: QuestionSeed[];
};

export type RubricBlockSeed = {
  label: string;
  criteria: { code: string; text: string }[];
};

/**
 * Курсовий проєкт. Один на весь курс і поза модулями: він підсумовує їх усі,
 * оцінюється викладачем і саме він може потрапити в публічну галерею.
 *
 * `slug` дає сталу адресу (`/learn/project`), незалежну від того, скільки
 * завдань з'явиться згодом.
 */
export type ProjectSeed = {
  slug: string;
  title: string;
  summary: string;
  instructions: string;
  maxPoints: number;
  allowExternalLink: boolean;
  rubric: RubricBlockSeed[];
};

export type ModuleSeed = {
  code: string;
  title: string;
  summary: string;
  weeks: string;
  component: 'М' | 'К' | 'Д' | 'Р';
  /** Анонс тем для секції «Програма» на лендінгу. */
  topics: string[];
  lessons: LessonSeed[];
  quiz: QuizSeed;
};
