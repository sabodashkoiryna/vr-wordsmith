import { defineAuth } from '@aws-amplify/backend';
import { manageAdmins } from '../functions/manage-admins/resource';

/**
 * Email+пароль реєстрація. Мінімум полів (email + ім'я) — група ЕГ/КГ,
 * заклад, курс адмін призначає вручну пізніше (UserProfile у data/resource.ts).
 *
 * Група `Admins` створюється тут; перший адмін додається одноразовим
 * seed-скриптом (крок 7 плану). Подальших адмінів призначає/знімає
 * адмін-панель через custom-мутацію promoteToAdmin (manage-admins Lambda,
 * якій тут видано право на addUserToGroup/removeUserFromGroup).
 *
 * @see https://docs.amplify.aws/react/build-a-backend/auth/
 */
export const auth = defineAuth({
  loginWith: {
    email: true,
  },
  userAttributes: {
    fullname: {
      required: true,
      mutable: true,
    },
  },
  groups: ['Admins'],
  access: (allow) => [allow.resource(manageAdmins).to(['addUserToGroup', 'removeUserFromGroup'])],
});
