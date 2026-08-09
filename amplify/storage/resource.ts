import { defineStorage } from '@aws-amplify/backend';

/**
 * `public/media/*`   — обкладинки курсу й фото викладачів (адмін завантажує).
 * `public/gallery/*` — обкладинки ОПУБЛІКОВАНИХ робіт. Окремий префікс, бо
 *                      файли студента лежать під submissions/{entity_id}/*, куди
 *                      гість доступу не має — і відкривати той префікс не можна,
 *                      бо це відкрило б роботи всіх студентів.
 * `lessons/*`        — роздатки уроків, лише за логіном.
 * `submissions/{entity_id}/*` — VR-роботи студентів. {entity_id} — це identityId
 *                      з Identity Pool, а НЕ Cognito sub, тому реальний ключ
 *                      треба зберігати в AssignmentSubmission.fileKeys.
 */
export const storage = defineStorage({
  name: 'vrWordsmithFiles',
  access: (allow) => ({
    'public/media/*': [
      allow.guest.to(['read']),
      allow.authenticated.to(['read']),
      allow.groups(['Admins']).to(['read', 'write', 'delete']),
    ],
    'public/gallery/*': [
      allow.guest.to(['read']),
      allow.authenticated.to(['read']),
      allow.groups(['Admins']).to(['read', 'write', 'delete']),
    ],
    'lessons/*': [
      allow.authenticated.to(['read']),
      allow.groups(['Admins']).to(['read', 'write', 'delete']),
    ],
    'submissions/{entity_id}/*': [
      allow.entity('identity').to(['read', 'write', 'delete']),
      allow.groups(['Admins']).to(['read', 'delete']),
    ],
  }),
});
