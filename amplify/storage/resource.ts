import { defineStorage } from '@aws-amplify/backend';

/**
 * `public/media/*`      — курсовий контент (зображення, обкладинки), який
 *                          завантажує Admins; читають усі, включно з гостями.
 *                          Сам VR/AR-контент (CoSpaces, ThingLink, 360°-тури)
 *                          лишається зовнішніми посиланнями — не файлами тут.
 * `submissions/{entity_id}/*` — файли/відео проєкту модуля 4 (Е-1), які
 *                          завантажує студент; читає/пише лише він сам,
 *                          Admins читають усі (перевірка робіт).
 *
 * @see https://docs.amplify.aws/react/build-a-backend/storage/
 */
export const storage = defineStorage({
  name: 'vrWordsmithFiles',
  access: (allow) => ({
    'public/media/*': [allow.guest.to(['read']), allow.groups(['Admins']).to(['read', 'write', 'delete'])],
    'submissions/{entity_id}/*': [
      allow.entity('identity').to(['read', 'write', 'delete']),
      allow.groups(['Admins']).to(['read']),
    ],
  }),
});
