import { type ClientSchema, a, defineData } from '@aws-amplify/backend';
import { manageAdmins } from '../functions/manage-admins/resource';
import { submitQuizAttempt } from '../functions/submit-quiz-attempt/resource';
import { gradeAssignment } from '../functions/grade-assignment/resource';
import { issueCertificate } from '../functions/issue-certificate/resource';

/*
 * ТРИ АРХЕТИПИ АВТОРИЗАЦІЇ. Правил на рівні ПОЛЯ немає навмисно: клієнт
 * Amplify за замовчуванням вибирає всі скалярні поля, тож обмежене поле
 * перетворюється на видиму GraphQL-помилку, а не на тихий null. Скрізь, де
 * кортіло поставити field-level правило, замість нього — окрема модель.
 *
 *  PUBLIC   guest().to(['read']) + authenticated().to(['read']) + groups(['Admins'])
 *           Контент лендінгу. НЕ allow.authenticated('identityPool'):
 *           Identity Pool мапить групу Admins на окрему IAM-роль без прав на
 *           AppSync, тож адміни отримували Unauthorized. Гість ходить через
 *           identityPool (usePublicAuthMode), решта — через userPool.
 *
 *  MEMBER   authenticated().to(['read']) + groups(['Admins'])
 *           Уроки й тести. Гість не бачить нічого — тому часткові
 *           auth-помилки тут структурно неможливі.
 *
 *  SYSTEM   ownerDefinedIn('studentId') read + Admins read + allow.resource(lambda)
 *           Усе, що впливає на бали. Студент ЧИТАЄ своє, пише лише Lambda.
 *           Це закриває дірку PoC, де allow.owner() на ProjectSubmission
 *           дозволяв студентові вписати собі totalScore.
 *
 * a.json() зберігається як РЯДОК: JSON.stringify на запис, JSON.parse на читання.
 */
const schema = a.schema({
  // ======================= A. ЛЕНДІНГ (PUBLIC) =============================

  /** Синглтон метаданих курсу. Редагується з адмінки. */
  Course: a
    .model({
      slug: a.string().required(),
      title: a.string().required(),
      subtitle: a.string(),
      summary: a.string(),
      hours: a.integer(),
      ectsCredits: a.float(),
      totalPoints: a.integer().required(), // 100
      passingPoints: a.integer().required(), // 60
      isPublished: a.boolean(),
    })
    .authorization((allow) => [
      allow.guest().to(['read']),
      allow.authenticated().to(['read']),
      allow.groups(['Admins']),
    ]),

  /** Плитки «що ви отримаєте». Окремою моделлю, щоб CrudTable працював як є. */
  CourseBenefit: a
    .model({
      order: a.integer().required(),
      title: a.string().required(),
      text: a.string().required(),
    })
    .authorization((allow) => [
      allow.guest().to(['read']),
      allow.authenticated().to(['read']),
      allow.groups(['Admins']),
    ]),

  Instructor: a
    .model({
      order: a.integer().required(),
      fullName: a.string().required(),
      position: a.string(),
      affiliation: a.string(),
      bio: a.string(),
      photoKey: a.string(),
      initials: a.string(),
    })
    .authorization((allow) => [
      allow.guest().to(['read']),
      allow.authenticated().to(['read']),
      allow.groups(['Admins']),
    ]),

  /** Ім'я збережено з PoC: перейменування = нова таблиця = втрата даних.
   *  summary/weeks/topics живлять секцію «Програма» на лендінгу — тому модель
   *  лишається PUBLIC, хоча самі уроки всередині вже за логіном. */
  Module: a
    .model({
      order: a.integer().required(),
      code: a.string().required(),
      title: a.string().required(),
      summary: a.string(),
      weeks: a.string(),
      topics: a.string().array(),
      component: a.string(),
      quizPoints: a.integer(), // 8
      assignmentPoints: a.integer(), // 12
      isPublished: a.boolean(),
    })
    .authorization((allow) => [
      allow.guest().to(['read']),
      allow.authenticated().to(['read']),
      allow.groups(['Admins']),
    ]),

  /** Публічна галерея. ОКРЕМА модель, а не прапорець на поданні: авторизація
   *  AppSync діє на рівні моделі, а не рядка — «гість читає лише опубліковані»
   *  виразити неможливо, тож прапорець відкрив би гостям усі подання.
   *  Бонус: адмін сам вирішує, яке ім'я автора стає публічним. */
  GalleryItem: a
    .model({
      order: a.integer().required(),
      publishState: a.string().required(), // 'published' | 'hidden'
      title: a.string().required(),
      description: a.string(),
      authorDisplayName: a.string(),
      consentGiven: a.boolean(),
      subject: a.string(), // 'Література · 8 клас'
      tool: a.string(), // CoSpaces Edu / ThingLink / 360°-відео / AR
      moduleCode: a.string(),
      coverImageKey: a.string(),
      externalUrl: a.string(),
      submissionId: a.id(),
    })
    .authorization((allow) => [
      allow.guest().to(['read']),
      allow.authenticated().to(['read']),
      allow.groups(['Admins']),
    ]),

  Resource: a
    .model({
      order: a.integer().required(),
      type: a.enum(['project', 'tool']),
      category: a.string().required(),
      title: a.string().required(),
      text: a.string().required(),
      url: a.string(),
    })
    .authorization((allow) => [
      allow.guest().to(['read']),
      allow.authenticated().to(['read']),
      allow.groups(['Admins']),
    ]),

  // ======================= B. КУРС (MEMBER) ================================

  Lesson: a
    .model({
      moduleId: a.id().required(),
      order: a.integer().required(),
      slug: a.string().required(),
      title: a.string().required(),
      kind: a.enum(['text', 'video', 'quiz', 'assignment']),
      summary: a.string(),
      contentMarkdown: a.string(),
      videoUrl: a.string(), // закладено вже зараз під цифрового аватара
      durationMinutes: a.integer(),
    })
    .secondaryIndexes((index) => [index('moduleId').sortKeys(['order'])])
    .authorization((allow) => [allow.authenticated().to(['read']), allow.groups(['Admins'])]),

  Quiz: a
    .model({
      moduleId: a.id().required(),
      lessonId: a.id(),
      title: a.string().required(),
      maxPoints: a.float().required(), // 8
      maxAttempts: a.integer(), // 2
      showAnswersAfterSubmit: a.boolean(),
    })
    .secondaryIndexes((index) => [index('moduleId')])
    .authorization((allow) => [
      allow.authenticated().to(['read']),
      allow.groups(['Admins']),
    ]),

  QuizQuestion: a
    .model({
      quizId: a.id().required(),
      order: a.integer().required(),
      block: a.string(),
      prompt: a.string().required(),
      weight: a.float(),
      /** Скільки варіантів обирати. Ознака потрібна саме тут, бо ключ
       *  відповідей студентові недосяжний — без неї інтерфейс не може знати,
       *  малювати радіокнопки чи галочки. А грейдинг звіряє множини точно:
       *  питання з двома правильними, показане радіокнопками, було б
       *  принципово нездаваним, і мовчки. */
      isMultiple: a.boolean(),
      // Правильної відповіді тут НЕМАЄ — див. QuizAnswerKey.
    })
    .secondaryIndexes((index) => [index('quizId').sortKeys(['order'])])
    .authorization((allow) => [
      allow.authenticated().to(['read']),
      allow.groups(['Admins']),
    ]),

  QuizOption: a
    .model({
      questionId: a.id().required(),
      quizId: a.id().required(),
      order: a.integer().required(),
      text: a.string().required(),
      // isCorrect НАВМИСНО відсутнє.
    })
    .secondaryIndexes((index) => [index('questionId').sortKeys(['order']), index('quizId')])
    .authorization((allow) => [
      allow.authenticated().to(['read']),
      allow.groups(['Admins']),
    ]),

  /** Ключ відповідей. Окрема таблиця, недосяжна студентові жодним запитом,
   *  підпискою чи selectionSet. Зберігаємо id опцій, а не індекси — тоді
   *  перестановка варіантів в адмінці не ламає ключ. */
  QuizAnswerKey: a
    .model({
      questionId: a.id().required(),
      quizId: a.id().required(),
      correctOptionIds: a.string().array().required(),
      explanation: a.string(),
      points: a.float(),
    })
    .secondaryIndexes((index) => [index('quizId'), index('questionId')])
    .authorization((allow) => [allow.groups(["Admins"])]),

  /** Курсовий проєкт. Один на весь курс, 40 балів, оцінює викладач, і саме
   *  він може потрапити в галерею. Тому `moduleId` НЕ обов'язковий: проєкт
   *  не належить жодному модулю, він підсумовує їх усі. `slug` дає сталу
   *  адресу (`/learn/project`), яка не залежить від того, скільки завдань
   *  з'явиться згодом. */
  Assignment: a
    .model({
      slug: a.string(),
      moduleId: a.id(),
      lessonId: a.id(),
      title: a.string().required(),
      instructions: a.string(),
      maxPoints: a.float().required(), // 40
      allowExternalLink: a.boolean(),
      maxFileSizeMb: a.integer(),
    })
    .secondaryIndexes((index) => [index('moduleId')])
    .authorization((allow) => [
      allow.authenticated().to(['read']),
      allow.groups(['Admins']),
    ]),

  /** Рубрика Е-1 з PoC: 12 критеріїв × 0–3 = 36, нормалізується до 12 балів.
   *  Студент бачить її ДО здачі — прозорість оцінювання навмисна. */
  RubricCriterion: a
    .model({
      assignmentId: a.id().required(),
      order: a.integer().required(),
      blockLabel: a.string(),
      code: a.string().required(), // 'А1'..'В4'
      text: a.string().required(),
      maxPoints: a.integer().required(), // 3
    })
    .secondaryIndexes((index) => [index('assignmentId').sortKeys(['order'])])
    .authorization((allow) => [
      allow.authenticated().to(['read']),
      allow.groups(['Admins']),
    ]),

  // ======================= C. ДАНІ СТУДЕНТА ================================

  UserProfile: a
    .model({
      id: a.id().required(), // = Cognito sub
      email: a.string().required(),
      fullName: a.string().required(),
      group: a.enum(['EG', 'KG', 'UNASSIGNED']), // для дисертаційного експерименту
      institution: a.string(),
      course: a.string(),
    })
    .authorization((allow) => [
      allow.owner(),
      allow.groups(['Admins']),
    ]),

  /** Завершення уроку балів не дає, тож писати може сам студент. */
  LessonProgress: a
    .model({
      studentId: a.id().required(),
      lessonId: a.id().required(),
      moduleId: a.id().required(),
      status: a.enum(['in_progress', 'completed']),
      lastPositionSec: a.integer(),
      completedAt: a.datetime(),
    })
    .secondaryIndexes((index) => [index('studentId').sortKeys(['lessonId'])])
    .authorization((allow) => [
      allow.ownerDefinedIn('studentId').identityClaim('sub'),
      allow.groups(['Admins']).to(['read']),
    ]),

  /** КЕШ балів. Джерело істини — QuizAttempt + AssignmentGrade;
   *  issue-certificate перераховує з них, а не довіряє цьому запису. */
  CourseEnrollment: a
    .model({
      studentId: a.id().required(),
      quizPoints: a.float().required(),
      assignmentPoints: a.float().required(),
      totalPoints: a.float().required(),
      status: a.enum(['active', 'completed', 'certified']),
      lastActivityAt: a.datetime(),
    })
    .secondaryIndexes((index) => [index('studentId')])
    .authorization((allow) => [
      allow.ownerDefinedIn('studentId').identityClaim('sub').to(['read']),
      allow.groups(['Admins']).to(['read']),
    ]),

  QuizAttempt: a
    .model({
      studentId: a.id().required(),
      quizId: a.id().required(),
      moduleId: a.id().required(),
      attemptNumber: a.integer().required(),
      answers: a.json(),
      rawScore: a.float().required(),
      maxRawScore: a.float().required(),
      pct: a.integer().required(),
      pointsAwarded: a.float().required(),
      isBest: a.boolean(),
      submittedAt: a.datetime().required(),
    })
    .secondaryIndexes((index) => [index('studentId').sortKeys(['quizId']), index('quizId')])
    .authorization((allow) => [
      allow.ownerDefinedIn('studentId').identityClaim('sub').to(['read']),
      allow.groups(['Admins']).to(['read']),
    ]),

  /** ЛИШЕ матеріали студента. Жодного поля з оцінкою — на відміну від
   *  PoC-ProjectSubmission, де власник міг вписати собі бал. */
  AssignmentSubmission: a
    .model({
      studentId: a.id().required(),
      assignmentId: a.id().required(),
      moduleId: a.id(), // курсовий проєкт не належить модулю
      title: a.string().required(),
      description: a.string(),
      externalUrl: a.string(),
      fileKeys: a.string().array(),
      status: a.string().required(), // 'draft'|'submitted'|'returned'|'graded'
      submittedAt: a.datetime(),
    })
    .secondaryIndexes((index) => [
      index('studentId').sortKeys(['assignmentId']),
      index('status').sortKeys(['submittedAt']), // черга оцінювання в адмінці
    ])
    .authorization((allow) => [
      allow.ownerDefinedIn('studentId').identityClaim('sub'),
      allow.groups(['Admins']).to(['read']),
    ]),

  /** Оцінка окремо від подання, щоб студент фізично не міг її змінити.
   *  Адмін теж лише читає: виставлення йде через мутацію, аби агрегат
   *  CourseEnrollment завжди лишався узгодженим. */
  AssignmentGrade: a
    .model({
      submissionId: a.id().required(),
      studentId: a.id().required(),
      assignmentId: a.id().required(),
      moduleId: a.id(), // курсовий проєкт не належить модулю
      rubricScores: a.json(), // {"А1":3,...}
      rubricRawTotal: a.float(), // сира сума рубрики — для дисертаційної статистики
      pointsAwarded: a.float().required(), // 0..40
      maxPoints: a.float().required(),
      comment: a.string(),
      gradedByName: a.string(),
      gradedAt: a.datetime().required(),
    })
    /* Сортувальним ключем був moduleId. У DynamoDB елемент без ключа індексу
       в індекс просто не потрапляє — тобто оцінки за курсовий проєкт, який
       модуля не має, тихо зникли б з нього. Індекс за studentId цього
       не потребує. */
    .secondaryIndexes((index) => [index('studentId'), index('submissionId')])
    .authorization((allow) => [
      allow.ownerDefinedIn('studentId').identityClaim('sub').to(['read']),
      allow.groups(['Admins']).to(['read']),
    ]),

  /** Снапшот усіх даних для рендерингу: зміна назви курсу чи ПІБ у профілі
   *  не має переписувати вже виданий документ. */
  Certificate: a
    .model({
      studentId: a.id().required(),
      certificateNumber: a.string().required(),
      verificationCode: a.string().required(),
      studentFullName: a.string().required(),
      courseTitle: a.string().required(),
      hours: a.integer(),
      totalPoints: a.float().required(),
      maxPoints: a.float().required(),
      issuedAt: a.datetime().required(),
      revokedAt: a.datetime(),
    })
    .secondaryIndexes((index) => [index('studentId'), index('verificationCode')])
    .authorization((allow) => [
      allow.ownerDefinedIn('studentId').identityClaim('sub').to(['read']),
      allow.groups(['Admins']).to(['read', 'delete']),
    ]),

  // ======= D. ДОСЛІДНИЦЬКІ АНКЕТИ А-1 / С-1 (окремо від курсу) =============
  // Т-1 переїхав у Quiz (та сама механіка), Е-1 — у RubricCriterion.
  // А-1 і С-1 — самозвіт за Лікертом: балів не дають, ключа відповідей немає,
  // тож серверний грейдинг їм не потрібен.

  DiagInstrument: a
    .model({
      code: a.string().required(), // 'a1' | 's1'
      title: a.string().required(),
      instructions: a.string(),
      boundsLow: a.integer(),
      boundsHigh: a.integer(),
      isActive: a.boolean(),
    })
    .authorization((allow) => [allow.authenticated().to(['read']), allow.groups(['Admins'])]),

  DiagQuestion: a
    .model({
      instrumentCode: a.string().required(),
      order: a.integer().required(),
      text: a.string().required(),
    })
    .authorization((allow) => [allow.authenticated().to(['read']), allow.groups(['Admins'])]),

  Attempt: a
    .model({
      instrumentCode: a.string().required(),
      phase: a.enum(['pretest', 'posttest']),
      answers: a.json(),
      score: a.integer().required(),
      maxScore: a.integer().required(),
      pct: a.integer().required(),
      level: a.enum(['low', 'mid', 'high']),
      submittedAt: a.datetime().required(),
    })
    .authorization((allow) => [
      allow.owner().to(['create', 'read']),
      allow.groups(['Admins']).to(['read']),
    ]),

  ReadinessLevel: a
    .model({
      order: a.integer().required(),
      level: a.string().required(),
      description: a.string().required(),
      boundsPct: a.string().required(),
    })
    .authorization((allow) => [
      allow.guest().to(['read']),
      allow.authenticated().to(['read']),
      allow.groups(['Admins']),
    ]),

  // ======================= E. МУТАЦІЇ ======================================
  // Повертаємо customType, а не a.json(): AWSJSON приходить рядком, і клієнту
  // довелося б його парсити — та сама пастка, що вже коштувала часу.

  QuizQuestionResult: a.customType({
    questionId: a.id().required(),
    correct: a.boolean().required(),
    earned: a.float().required(),
    possible: a.float().required(),
    correctOptionIds: a.string().array(), // лише після ОСТАННЬОЇ спроби
    explanation: a.string(),
  }),

  QuizGradeResult: a.customType({
    attemptId: a.id().required(),
    attemptNumber: a.integer().required(),
    attemptsLeft: a.integer().required(),
    rawScore: a.float().required(),
    maxRawScore: a.float().required(),
    pct: a.integer().required(),
    pointsAwarded: a.float().required(),
    maxPoints: a.float().required(),
    isBest: a.boolean().required(),
    revealAnswers: a.boolean().required(),
    results: a.ref('QuizQuestionResult').array(),
    courseTotalPoints: a.float(),
  }),

  AssignmentGradeResult: a.customType({
    gradeId: a.id().required(),
    pointsAwarded: a.float().required(),
    rubricRawTotal: a.float(),
    courseTotalPoints: a.float().required(),
    certificateEligible: a.boolean().required(),
  }),

  CertificateResult: a.customType({
    eligible: a.boolean().required(),
    reason: a.string(),
    certificateId: a.id(),
    certificateNumber: a.string(),
    verificationCode: a.string(),
    issuedAt: a.datetime(),
    totalPoints: a.float(),
    maxPoints: a.float(),
  }),

  /** studentId береться з event.identity.sub, НЕ з аргументу. */
  submitQuizAttempt: a
    .mutation()
    .arguments({
      quizId: a.id().required(),
      answers: a.json().required(), // [{questionId, selectedOptionIds:[...]}]
    })
    .returns(a.ref('QuizGradeResult'))
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(submitQuizAttempt)),

  gradeAssignment: a
    .mutation()
    .arguments({
      submissionId: a.id().required(),
      rubricScores: a.json().required(),
      comment: a.string(),
      returnForRevision: a.boolean(),
    })
    .returns(a.ref('AssignmentGradeResult'))
    .authorization((allow) => [allow.groups(['Admins'])])
    .handler(a.handler.function(gradeAssignment)),

  /** Не-адмінам studentId примусово замінюється на власний sub. */
  issueCertificate: a
    .mutation()
    .arguments({ studentId: a.id() })
    .returns(a.ref('CertificateResult'))
    .authorization((allow) => [allow.authenticated(), allow.groups(['Admins'])])
    .handler(a.handler.function(issueCertificate)),

  promoteToAdmin: a
    .mutation()
    .arguments({ userId: a.string().required(), action: a.string() })
    .returns(a.json())
    .authorization((allow) => [allow.groups(['Admins'])])
    .handler(a.handler.function(manageAdmins)),
})
  // allow.resource доступний ЛИШЕ на рівні схеми: у моделей тип
  // BaseAllowModifier його не містить. Ця секція видає трьом обробникам
  // IAM-доступ до Data API; правила окремих моделей для решти принципалів
  // лишаються чинними (напр. QuizAnswerKey і далі закритий для студентів).
  .authorization((allow) => [
    allow.resource(submitQuizAttempt),
    allow.resource(gradeAssignment),
    allow.resource(issueCertificate),
  ]);

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: { defaultAuthorizationMode: 'userPool' },
});
