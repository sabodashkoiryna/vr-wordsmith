import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { storage } from './storage/resource';
import { manageAdmins } from './functions/manage-admins/resource';
import { submitQuizAttempt } from './functions/submit-quiz-attempt/resource';
import { gradeAssignment } from './functions/grade-assignment/resource';
import { issueCertificate } from './functions/issue-certificate/resource';

defineBackend({
  auth,
  data,
  storage,
  manageAdmins,
  submitQuizAttempt,
  gradeAssignment,
  issueCertificate,
});
