import { defineFunction } from '@aws-amplify/backend';

/**
 * resourceGroupName: 'data' обов'язковий. Функція одночасно є обробником
 * кастомної мутації В ТІЙ САМІЙ схемі, дані якої читає через allow.resource() —
 * без прив'язки до data-стека це дає циклічну залежність між стеками.
 */
export const submitQuizAttempt = defineFunction({
  name: 'submit-quiz-attempt',
  entry: './handler.ts',
  resourceGroupName: 'data',
  timeoutSeconds: 30,
});
