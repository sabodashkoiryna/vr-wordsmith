import { defineFunction } from '@aws-amplify/backend';

/** Див. коментар у submit-quiz-attempt/resource.ts щодо resourceGroupName. */
export const verifyCertificate = defineFunction({
  name: 'verify-certificate',
  entry: './handler.ts',
  resourceGroupName: 'data',
  timeoutSeconds: 20,
});
