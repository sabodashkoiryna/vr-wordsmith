import type { Schema } from '../../data/resource';
import { env } from '$amplify/env/manage-admins';
import {
  CognitoIdentityProviderClient,
  AdminAddUserToGroupCommand,
  AdminRemoveUserFromGroupCommand,
} from '@aws-sdk/client-cognito-identity-provider';

const client = new CognitoIdentityProviderClient();

// Одна функція обслуговує обидві custom-мутації (promoteToAdmin / demoteFromAdmin) —
// різниця лише в тому, яку Cognito-команду виконати.
export const handler: Schema['promoteToAdmin']['functionHandler'] = async (event) => {
  const { userId, action } = event.arguments as { userId: string; action: string };

  const command =
    action === 'demote'
      ? new AdminRemoveUserFromGroupCommand({
          Username: userId,
          GroupName: 'Admins',
          UserPoolId: env.AMPLIFY_AUTH_USERPOOL_ID,
        })
      : new AdminAddUserToGroupCommand({
          Username: userId,
          GroupName: 'Admins',
          UserPoolId: env.AMPLIFY_AUTH_USERPOOL_ID,
        });

  await client.send(command);
  return { userId, isAdmin: action !== 'demote' };
};
