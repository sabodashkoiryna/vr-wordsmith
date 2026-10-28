import type { Schema } from '../../data/resource';
import { env } from '$amplify/env/verify-certificate';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime';

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env);
Amplify.configure(resourceConfig, libraryOptions);
const data = generateClient<Schema>({ authMode: 'iam' });

/**
 * Публічна перевірка сертифіката за кодом.
 *
 * Через Lambda, а не через правило доступу до моделі. `allow.guest().to(['read'])`
 * на `Certificate` відкрив би гостям УСІ сертифікати списком — авторизація
 * AppSync діє на рівні моделі, а не рядка, тож «читати лише свій за кодом»
 * нею не висловити. Та сама причина, через яку галерея є окремою моделлю, а
 * не прапорцем на поданні.
 *
 * Повертаємо рівно те, що має бути на самому документі, і нічого більше:
 * жодного studentId, email чи внутрішніх ідентифікаторів. Відповідь на
 * невідомий код і на відкликаний сертифікат різна — друге має бути видно,
 * інакше відкликаний документ виглядав би просто неіснуючим.
 */
export const handler: Schema['verifyCertificate']['functionHandler'] = async (event) => {
  const raw = String(event.arguments.code ?? '').trim().toUpperCase();
  if (!raw) return { found: false };

  const { data: matches } = await data.models.Certificate.listCertificateByVerificationCode({
    verificationCode: raw,
  });
  const cert = matches[0];
  if (!cert) return { found: false };

  return {
    found: true,
    revoked: !!cert.revokedAt,
    certificateNumber: cert.certificateNumber,
    studentFullName: cert.studentFullName,
    courseTitle: cert.courseTitle,
    hours: cert.hours ?? null,
    totalPoints: cert.totalPoints,
    maxPoints: cert.maxPoints,
    issuedAt: cert.issuedAt,
  };
};
