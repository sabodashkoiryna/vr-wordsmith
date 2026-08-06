# VR-Wordsmith

Платформа підготовки майбутніх учителів української мови та літератури до використання VR/AR у навчанні. React + Vite SPA на фронтенді, AWS Amplify Gen2 (Cognito, AppSync/DynamoDB, S3) на бекенді.

## Розробка

```bash
npm install
npm run dev
```

## Backend (AWS Amplify Gen2)

```bash
npx ampx sandbox
```

Потребує налаштованих AWS-креденшлів (`aws configure`).

## Структура

- `src/` — React SPA (публічні сторінки, діагностика, у планах — auth і адмінка)
- `amplify/` — Amplify Gen2 backend definitions (auth, data, storage)
- `legacy/` — оригінальний статичний прототип, з якого перенесено контент і дизайн
