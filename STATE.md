# Стан проєкту

Карта для продовження роботи в новій сесії. Оновлювати при завершенні етапу.

## Що це

**VR-Словесник** — безкоштовна платформа онлайн-курсу для вчителів української
мови та літератури про доцільне застосування VR/AR. React 19 + Vite 8 +
Tailwind v4, AWS Amplify Gen2 (Cognito, AppSync/DynamoDB, S3, Lambda).

Повний план (архітектура, рішення, ризики): [`docs/PLAN.md`](docs/PLAN.md)

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
2. **Додати рендерер Markdown** (`react-markdown`, у lazy-чанку кабінету).
   `Lesson.contentMarkdown` є, лекції markdown'ом у `src/content/course/modules.ts`,
   а перетворювати їх на HTML нічим — це блокує плеєр уроку.
3. **Полагодити `ensureUserProfile`** (`src/context/AuthContext.tsx:28`): ковтає
   помилки, а сертифікат бере звідти ПІБ із фолбеком «Учасник курсу».
4. Далі — етапи 6–12 у `docs/PLAN.md`, розділ «Актуалізація»: кабінет курсу →
   тести → практичні → сертифікат → адмінка → лендінг з бази → фінальний прохід.

Зарахування на курс окремою дією не існує: `CourseEnrollment` пишуть лише Lambda
при першому оцінюванні. У нового студента запису нема — прогрес до першого тесту
рахується з `LessonProgress`, бали показуються `0/100` з `null`-стану.

## Команди

Проєкт живе на Windows, тож нижче — PowerShell. Три речі, на які тут уже
наступали (див. пастку 14): `npx` без `.cmd` блокується політикою виконання,
префікса змінних перед командою в PowerShell не існує, і всі команди
виконуються **з кореня `vr-wordsmith`**, а не з `C:\project_nulp`.

```powershell
npm run dev                          # локальний фронтенд
npm run build                        # tsc + vite build
npx.cmd tsc -p amplify --noEmit      # тайпчек бекенду ($amplify/env — очікувані помилки)

npx.cmd ampx sandbox --once --identifier <name>   # ізольований бекенд для перевірок
npx.cmd ampx sandbox delete --identifier <name>   # прибрати його

# AWS_REGION обов'язковий, інакше скаже "Stack does not exist" (пастка 10)
$env:AWS_REGION = "us-east-1"
npx.cmd ampx generate outputs --app-id d1fmnqsgshywg2 --branch master --out-dir <dir>

# Пароль через Read-Host, щоб не осідав в історії команд; наприкінці — очистити.
$env:ADMIN_EMAIL = "<email>"; $env:ADMIN_PASSWORD = Read-Host "Пароль адміна"
.\node_modules\.bin\tsx.cmd scripts/seed-course.ts amplify_outputs.master.json
$env:ADMIN_PASSWORD = $null

$env:STUDENT_EMAIL = "<email>"; $env:STUDENT_PASSWORD = Read-Host "Пароль студента"
.\node_modules\.bin\tsx.cmd scripts/verify-access.ts amplify_outputs.master.json
$env:STUDENT_PASSWORD = $null; $env:ADMIN_PASSWORD = $null
```

Скинути пароль адміна (pool гілки `master` — `us-east-1_vyZTt69y0`):

```powershell
aws cognito-idp admin-set-user-password --user-pool-id us-east-1_vyZTt69y0 --username <email> --password "<новий>" --permanent --region us-east-1
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

11. **`as never` тут означав «вимкнено `strict`».** У tsconfig не було
    `"strict": true`, а без `strictNullChecks` згенеровані типи Amplify
    згортаються в індексний підпис `string[]` — тож кожен `create`/`update`
    виглядав помилковим і його заглушали кастом. Тепер `strict` увімкнено.
    Побачиш `as never` біля виклику Amplify — це не потреба, а замовчана
    помилка типів.

12. **Тест чанка мусить мати роздільник у кінці.** `/(react|...)/ ` без `[\\/]`
    ловить `react-markdown` як префікс і затягує парсер у чанк лендінгу
    (+116 КБ). Дивись коментар у `vite.config.ts`.

13. **Правило перезапису Amplify — `200`, а не `404-200`.** З `404-200` сайт
    віддавав правильний `index.html` зі статусом 404 на КОЖНОМУ маршруті, крім
    `/`: пошуковики бачили 404 усюди, моніторинг падав, CloudFront кешував це
    як помилку. Маска навмисно виключає розширення файлів — інакше зниклий
    `.js`-чанк повертав би HTML із кодом 200 і застосунок ламався б незрозуміло.
    Правило живе в налаштуваннях застосунку, не в репозиторії:
    `aws amplify get-app --app-id d1fmnqsgshywg2 --query "app.customRules"`.
    Копія — `docs/amplify-custom-rules.json`.

14. **Зняття ролі `Admins` незворотне з продукту.** Повернути її може лише той,
    хто вже адмін, — а якщо адмінів не лишилось, то тільки AWS CLI. Так уже
    сталося: `/admin/users` малювала «Зняти Admins» на кожному рядку, включно
    з рядком того, хто залогінений, і панель замкнулася зсередини. Разом з нею
    став неможливим і сід, бо контент теж пише лише група `Admins`. Тепер
    `manage-admins` відхиляє зняття ролі із себе та зняття останнього адміна,
    а екран не показує цих кнопок на власному рядку. Якщо все ж замкнулися:

    ```powershell
    aws cognito-idp admin-add-user-to-group --user-pool-id us-east-1_vyZTt69y0 --username <sub> --group-name Admins --region us-east-1
    ```

    Далі обов'язково **перезайти в акаунт**: група береться з ID-токена, і
    старий токен її не містить.

15. **Тут Windows, а не bash.** `npx` — це `npx.ps1`, і політика виконання
    PowerShell його блокує (`running scripts is disabled`): треба `npx.cmd`
    або прямо `.\node_modules\.bin\<tool>.cmd`. Політику виконання при цьому
    міняти НЕ треба — обмеження стосується лише `.ps1`-обгорток. Префікса
    змінних перед командою (`VAR=x cmd`) у PowerShell не існує взагалі:
    `$env:VAR = "x"` окремим виразом. І `&&` між командами теж немає — `;`.

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
