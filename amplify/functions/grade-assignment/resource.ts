import { defineFunction } from '@aws-amplify/backend';

/** Див. коментар у submit-quiz-attempt/resource.ts щодо resourceGroupName. */
export const gradeAssignment = defineFunction({
  name: 'grade-assignment',
  entry: './handler.ts',
  resourceGroupName: 'data',
  timeoutSeconds: 30,
});
