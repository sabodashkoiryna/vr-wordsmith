import { useEffect, useState } from 'react';
import { client } from '../../lib/amplify-client';

type Counts = { modules: number; users: number; attempts: number; submissions: number };

export default function AdminDashboard() {
  const [counts, setCounts] = useState<Counts | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [modules, users, attempts, submissions] = await Promise.all([
          client.models.Module.list(),
          client.models.UserProfile.list(),
          client.models.Attempt.list(),
          client.models.AssignmentSubmission.list(),
        ]);
        setCounts({
          modules: modules.data.length,
          users: users.data.length,
          attempts: attempts.data.length,
          submissions: submissions.data.length,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Бекенд ще не розгорнуто.');
      }
    })();
  }, []);

  return (
    <div>
      <p className="instr-note">
        Керуйте контентом курсу, ролями користувачів і переглядайте результати діагностики.
      </p>
      {error && <p className="hint">{error}</p>}
      {counts && (
        <div className="threecol">
          <div className="tile">
            <b>{counts.modules}</b>
            <p>модулів курсу</p>
          </div>
          <div className="tile">
            <b>{counts.users}</b>
            <p>зареєстрованих користувачів</p>
          </div>
          <div className="tile">
            <b>{counts.attempts}</b>
            <p>пройдених діагностик</p>
          </div>
          <div className="tile">
            <b>{counts.submissions}</b>
            <p>поданих практичних робіт</p>
          </div>
        </div>
      )}
    </div>
  );
}
