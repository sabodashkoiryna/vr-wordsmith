import { defineFunction } from '@aws-amplify/backend';

/** Див. коментар у submit-quiz-attempt/resource.ts щодо resourceGroupName. */
export const issueCertificate = defineFunction({
  name: 'issue-certificate',
  entry: './handler.ts',
  resourceGroupName: 'data',
  timeoutSeconds: 30,
});
