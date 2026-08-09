# Стан проєкту

Карта для продовження роботи в новій сесії. Оновлювати при завершенні етапу.

## Що це

**VR-Словесник** — безкоштовна платформа онлайн-курсу для вчителів української
мови та літератури про доцільне застосування VR/AR. React 19 + Vite 8 +
Tailwind v4, AWS Amplify Gen2 (Cognito, AppSync/DynamoDB, S3, Lambda).

Повний план: `C:\Users\Iryna\.claude\plans\happy-beaming-sunset.md`

## Розгорнуте

| Що | Де |
|---|---|
| MVP (гілка `master`) | https://master.d1fmnqsgshywg2.amplifyapp.com |
| PoC заморожений (гілка `poc`) | https://poc.d1fmnqsgshywg2.amplifyapp.com |
| Amplify app | `d1fmnqsgshywg2`, регіон **us-east-1** |
| Репозиторій | github.com/sabodashkoiryna/vr-wordsmith |

Кожна гілка має **власний окремий бекенд** (Cognito, AppSync, DynamoDB) — так
влаштований Amplify Gen2. Тобто адмін і контент на `poc` і `master` різні.

Облікові дані адмінів не зберігаються в репозиторії. Скинути пароль:
`aws cognito-idp admin-set-user-password --user-pool-id <pool> --username <email> --password <new> --permanent --region us-east-1`

## Готово

- Етап 0 — PoC заморожено на гілці `poc`, задеплоєно, засіяно, адмін створено
- Етап 1 — Tailwind v4, темні токени, self-hosted шрифти, розділення бандла
- Етап 2 — примітиви UI + motion (Reveal, паралакс від курсора)
- Етап 3 — лендінг (односторінковий, з якорями)
- Етап 4 — галерея `/gallery` (поки на мок-даних, форма збігається з `GalleryItem`)
- Етап 5 — **бекенд MVP**: схема, 3 Lambda, сід, тест доступу. Перевірено в sandbox.
- Етап 5а — бекенд **задеплоєно на `master`** (9 серпня). Таблиці старих моделей
  (`MatrixRow`, `ExperimentStage`, `TimelineEntry`, `EvidenceTile`,
  `ProjectSubmission`, `ModuleProgress`) видалено, дані лежать у
  `../backup-20260809/`. Таблицю `Module` не перестворювало — 5 рядків PoC живі,
  сід оновить їх на місці, бо коди збігаються (`МОДУЛЬ 1…5`). Адмін
  `iryna.v.sabodashko@lpnu.ua` у групі `Admins` уцілів.
- Екрани PoC на видалених моделях (`MatrixPage`, `ExperimentPage`, `MatrixAdmin`,
  `ExperimentAdmin`, `ResultsAdmin`) прибрано разом з маршрутами — вони три білди
  поспіль валили фронтенд. Лишились на гілці `poc`.

## Далі

1. **Засіяти базу `master` і прогнати `verify-access`.** База порожня:
   `Course=0`, `Lesson=0`, `Quiz=0`, `GalleryItem=0`. Виводи гілки лежать у
   `amplify_outputs.master.json` (у .gitignore). Для `verify-access` потрібен
   ще й тестовий студент — у пулі `master` його нема, лише адмін.
2. **Підключити лендінг і галерею до бази** (`usePublicList` уже написано,
   `src/lib/usePublicList.ts`). Зараз програма курсу в `src/content/landing.ts`,
   галерея в `src/features/gallery/galleryData.ts` — обидва мають читатися з
   `Module` і `GalleryItem`, щоб редагувались з адмінки. **Це вимога користувача.**
3. Кабінет курсу: структура, плеєр уроку, QuizRunner, здача практичних
4. Сертифікат (SVG + друк) і сторінка верифікації
5. Адмінка: редактор уроків/тестів, черга оцінювання, публікація в галерею
6. Фінальний прохід: a11y, Lighthouse, мобільний, бюджет бандла

## Команди

```bash
# усі команди з кореня vr-wordsmith, PATH має містити node і aws cli
npm run dev                      # локальний фронтенд
npm run build                    # tsc + vite build
npx tsc -p amplify --noEmit      # тайпчек бекенду ($amplify/env — очікувані помилки)

npx ampx sandbox --once --identifier <name>   # ізольований бекенд для перевірок
npx ampx sandbox delete --identifier <name>   # прибрати його

# AWS_REGION обов'язковий, інакше скаже "Stack does not exist" (пастка 10)
AWS_REGION=us-east-1 npx ampx generate outputs --app-id d1fmnqsgshywg2 --branch master --out-dir <dir>

ADMIN_EMAIL=... ADMIN_PASSWORD=... npx tsx scripts/seed-course.ts <outputs.json>
STUDENT_EMAIL=... STUDENT_PASSWORD=... ADMIN_EMAIL=... ADMIN_PASSWORD=... \
  npx tsx scripts/verify-access.ts <outputs.json>
```

## Пастки, що вже коштували часу

Кожна з них уже одного разу зламала проєкт. Не наступати вдруге.

1. **`allow.authenticated('identityPool')` ламає доступ адмінам.** Identity Pool
   мапить групу `Admins` на окрему IAM-роль без прав на AppSync. Публічні моделі
   мають `allow.guest()` + звичайний `allow.authenticated()` (userPool). Клієнт
   обирає режим через `usePublicAuthMode` / `usePublicList` — гість іде через
   identityPool, залогінений через userPool. Пропустиш один виклик — Unauthorized
   отримає або гість, або адмін, і збій асиметричний: тестуючи лише залогіненим,
   його не побачиш.

2. **`a.json()` асиметричний.** ПОЛЕ моделі зберігається рядком → `JSON.stringify`
   на запис, `JSON.parse` на читання. А от АРГУМЕНТ мутації приходить у Lambda вже
   розпарсеним об'єктом. Обробники приймають обидва варіанти.

3. **`allow.resource()` існує лише на рівні СХЕМИ**, не моделі (`BaseAllowModifier`
   його не містить). Lambda-обробникам доступ видається в кінці `data/resource.ts`.

4. **Правила на рівні ПОЛЯ не приховують дані.** Клієнт Amplify вибирає всі
   скалярні поля, тож обмежене поле дає видиму GraphQL-помилку, а не тихий null.
   Тому ключ відповідей — окрема модель `QuizAnswerKey`, а не поле.

5. **Зміна auth-правил може перестворити AppSync API** з порожніми таблицями.
   Перед деплоєм на master — експорт даних, після — сід.

6. **Vite 8 на Rolldown**: `manualChunks` в об'єктній формі прибрано, використовується
   `rolldownOptions.output.codeSplitting.groups`.

7. **Amplify Hosting використовує `npm install`, не `npm ci`** (див. `amplify.yml`):
   CDK CLI тягне в `node_modules` пакети, яких немає в `package.json`, і строгий
   `npm ci` через це падає.

8. **Інлайновий стиль не перекривається утилітами.** Заливка головної кнопки —
   клас `.btn-aurora`, а не `style={{background}}`, інакше кнопку неможливо
   перефарбувати під конкретний фон.

9. **Бекенд деплоїться сам, фронтенд може при цьому падати — і це тихо.** Кожен
   пуш у гілку запускає `ampx pipeline-deploy` ПЕРЕД `npm run build`. Тобто
   бекенд уже перебудовано, а сайт лишається на старому бандлі, який звертається
   до моделей, яких більше нема. Статус гілки в Amplify показує FAILED, але
   інфраструктура при цьому вже змінена. Так сталося з job 16, 17 і 18.

10. **`ampx` мовчки бере не той регіон.** Без `AWS_REGION=us-east-1`
    `npx ampx generate outputs` каже `Stack does not exist` для стека, який
    існує. Це помилка регіону, а не відсутній стек.

## Структура

```
amplify/          бекенд: data/resource.ts (схема), auth, storage, functions/
scripts/          seed-course.ts, verify-access.ts, fetch-fonts.mjs
src/content/      landing.ts (маркетинг, статика) + course/ (контент курсу для сіду)
src/features/     landing/, gallery/, auth/
src/ui/           примітиви + motion/
src/styles/       tokens → base → motion → hero → legacy(шар) → legacy-bridge
legacy/           початковий HTML-прототип, довідково
```

`legacy.css` лежить у CSS-шарі найнижчого пріоритету й порожнішає з кожним
перенесеним екраном; `legacy-bridge.css` перефарбовує рештки PoC у темну тему.
Обидва видаляються разом із рефакторингом адмінки.
