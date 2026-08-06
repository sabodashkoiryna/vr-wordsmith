import { type ClientSchema, a, defineData } from '@aws-amplify/backend';
import { manageAdmins } from '../functions/manage-admins/resource';

/*
 * Схема відповідає моделі даних з архітектурного плану:
 * - контент (Module..DiagQuestion) керує група Admins, читають усі,
 *   включно з гостями — публічні сторінки курсу видно без логіну;
 * - користувацькі дані (UserProfile..ProjectSubmission) — власник
 *   пише/читає свій запис, Admins читають (і, де потрібно, пишуть) усі.
 *
 * correctIndex у DiagQuestion має власне, суворіше правило на рівні поля:
 * лише Admins можуть його читати, тож відповідь тесту Т-1 не потрапляє
 * у публічний бандл (на відміну від поточного legacy HTML). Оцінює тест
 * custom-мутація gradeTest (Lambda, крок 5 плану), яка читає це поле
 * на сервері.
 */
const schema = a.schema({
  // ---------- Контент курсу (Admins CRUD, читають усі) ----------
  Module: a
    .model({
      order: a.integer().required(),
      code: a.string().required(),
      component: a.string().required(), // 'М' | 'К' | 'Д' | 'Р'
      title: a.string().required(),
      weeks: a.string().required(),
      topics: a.string().array(),
      tasks: a.json(), // [{code, text}]
      controlNote: a.string(),
    })
    .authorization((allow) => [allow.guest().to(['read']), allow.groups(['Admins'])]),

  MatrixRow: a
    .model({
      order: a.integer().required(),
      condition: a.string().required(),
      moduleRef: a.string().required(),
      component: a.string().required(),
      criterion: a.string().required(),
      instrument: a.string().required(),
    })
    .authorization((allow) => [allow.guest().to(['read']), allow.groups(['Admins'])]),

  ReadinessLevel: a
    .model({
      order: a.integer().required(),
      level: a.string().required(),
      description: a.string().required(),
      boundsPct: a.string().required(),
    })
    .authorization((allow) => [allow.guest().to(['read']), allow.groups(['Admins'])]),

  Resource: a
    .model({
      order: a.integer().required(),
      type: a.enum(['project', 'tool']),
      category: a.string().required(),
      title: a.string().required(),
      text: a.string().required(),
    })
    .authorization((allow) => [allow.guest().to(['read']), allow.groups(['Admins'])]),

  ExperimentStage: a
    .model({
      order: a.integer().required(),
      n: a.string().required(),
      title: a.string().required(),
      text: a.string().required(),
    })
    .authorization((allow) => [allow.guest().to(['read']), allow.groups(['Admins'])]),

  TimelineEntry: a
    .model({
      order: a.integer().required(),
      period: a.string().required(),
      text: a.string().required(),
    })
    .authorization((allow) => [allow.guest().to(['read']), allow.groups(['Admins'])]),

  EvidenceTile: a
    .model({
      order: a.integer().required(),
      title: a.string().required(),
      text: a.string().required(),
    })
    .authorization((allow) => [allow.guest().to(['read']), allow.groups(['Admins'])]),

  DiagInstrument: a
    .model({
      code: a.string().required(), // 'a1' | 't1' | 's1' | 'e1'
      title: a.string().required(),
      type: a.enum(['likert', 'test', 'rubric']),
      instructions: a.string(),
      boundsLow: a.integer(),
      boundsHigh: a.integer(),
    })
    .authorization((allow) => [allow.guest().to(['read']), allow.groups(['Admins'])]),

  DiagQuestion: a
    .model({
      instrumentCode: a.string().required(),
      order: a.integer().required(),
      block: a.string(),
      text: a.string().required(),
      options: a.string().array(),
      rubricCode: a.string(), // для Е-1: 'А1'..'В4'
      maxPoints: a.integer(),
      correctIndex: a.integer().authorization((allow) => [allow.groups(['Admins'])]),
    })
    .authorization((allow) => [allow.guest().to(['read']), allow.groups(['Admins'])]),

  // ---------- Користувацькі дані (owner-based) ----------
  UserProfile: a
    .model({
      id: a.id().required(), // = Cognito sub, встановлюється клієнтом при створенні
      email: a.string().required(),
      fullName: a.string().required(),
      group: a.enum(['EG', 'KG', 'UNASSIGNED']),
      institution: a.string(),
      course: a.string(),
    })
    .authorization((allow) => [allow.owner(), allow.groups(['Admins'])]),

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

  ModuleProgress: a
    .model({
      moduleCode: a.string().required(),
      status: a.enum(['viewed', 'done']),
    })
    .authorization((allow) => [allow.owner(), allow.groups(['Admins']).to(['read'])]),

  // MVP: за рішенням користувача картку Е-1 оцінює лише викладач/адмін
  // (без peer-review логіки) — teacherScores заповнює Admins-панель.
  ProjectSubmission: a
    .model({
      title: a.string().required(),
      description: a.string(),
      linkOrFileKey: a.string(),
      videoKey: a.string(),
      status: a.enum(['draft', 'submitted', 'reviewed']),
      teacherScores: a.json(), // {"А1": 0-3, ..., "В4": 0-3}
      teacherComment: a.string(),
      totalScore: a.integer(),
      level: a.enum(['low', 'mid', 'high']),
    })
    .authorization((allow) => [allow.owner(), allow.groups(['Admins'])]),

  // ---------- Керування ролями (виконує manage-admins Lambda) ----------
  promoteToAdmin: a
    .mutation()
    .arguments({
      userId: a.string().required(),
      action: a.string(), // 'promote' (default) | 'demote'
    })
    .returns(a.json())
    .authorization((allow) => [allow.groups(['Admins'])])
    .handler(a.handler.function(manageAdmins)),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
  },
});
