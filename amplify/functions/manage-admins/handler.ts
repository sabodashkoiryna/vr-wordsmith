import type { Schema } from '../../data/resource';
import { env } from '$amplify/env/manage-admins';
import {
  CognitoIdentityProviderClient,
  AdminAddUserToGroupCommand,
  AdminRemoveUserFromGroupCommand,
  ListUsersInGroupCommand,
} from '@aws-sdk/client-cognito-identity-provider';

const client = new CognitoIdentityProviderClient();
const GROUP = 'Admins';

/**
 * Призначення і зняття ролі Admins.
 *
 * Дві відмови нижче — не перестраховка. Зняття ролі незворотне зсередини
 * продукту: єдиний спосіб повернути її — AWS CLI, бо сама адмінка вимагає
 * саме тієї ролі, якої вже немає. Це вже сталося одного разу — адмін зняв
 * роль сам із себе і замкнув панель ззовні, а разом з нею й сід контенту,
 * який теж пише лише від імені Admins.
 *
 * Перевірки живуть тут, а не в інтерфейсі, бо мутація доступна будь-якому
 * адміну напряму через API, і тому що екран адмінки ще буде переписаний —
 * а це обмеження має пережити переписування.
 */
export const handler: Schema['promoteToAdmin']['functionHandler'] = async (event) => {
  const { userId, action } = event.arguments as { userId: string; action: string };
  const callerId = event.identity && 'sub' in event.identity ? event.identity.sub : null;
  const userPoolId = env.AMPLIFY_AUTH_USERPOOL_ID;

  if (action === 'demote') {
    // 1. Себе зняти не можна: це замикає панель ізсередини.
    if (callerId && callerId === userId) {
      throw new Error(
        'Не можна зняти роль Admins із себе. Попросіть іншого адміністратора — ' +
          'інакше повернути доступ можна буде лише через AWS CLI.',
      );
    }

    // 2. Останнього адміна зняти не можна: тоді панель лишиться без жодного.
    const { Users } = await client.send(
      new ListUsersInGroupCommand({ GroupName: GROUP, UserPoolId: userPoolId, Limit: 60 }),
    );
    if ((Users?.length ?? 0) <= 1) {
      throw new Error('Це останній адміністратор — зняти роль нема кому передати.');
    }

    await client.send(
      new AdminRemoveUserFromGroupCommand({
        Username: userId,
        GroupName: GROUP,
        UserPoolId: userPoolId,
      }),
    );
    return { userId, isAdmin: false };
  }

  await client.send(
    new AdminAddUserToGroupCommand({ Username: userId, GroupName: GROUP, UserPoolId: userPoolId }),
  );
  return { userId, isAdmin: true };
};
