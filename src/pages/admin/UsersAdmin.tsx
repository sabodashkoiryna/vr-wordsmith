import { useEffect, useState } from 'react';
import { client } from '../../lib/amplify-client';
import { unwrap } from '../../lib/unwrap';
import { useAuth } from '../../context/AuthContext';

type UserRow = {
  id: string;
  email: string;
  fullName: string;
  group?: string | null;
  institution?: string | null;
  course?: string | null;
};

const GROUP_OPTIONS = ['EG', 'KG', 'UNASSIGNED'];

export default function UsersAdmin() {
  const { userId } = useAuth();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await unwrap(client.models.UserProfile.list());
      setUsers(data as UserRow[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Бекенд ще не розгорнуто.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function saveField(id: string, field: 'group' | 'institution' | 'course', value: string) {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, [field]: value } : u)));
    try {
      await unwrap(client.models.UserProfile.update({ id, [field]: value } as never));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не вдалося зберегти.');
    }
  }

  async function changeRole(user: UserRow, action: 'promote' | 'demote') {
    // Зняття ролі незворотне з продукту: повернути її може лише той, хто вже
    // адмін, або AWS CLI. Тому — підтвердження, а не тиха дія по кліку.
    if (
      action === 'demote' &&
      !window.confirm(
        `Зняти роль Admins із ${user.email}?\n\n` +
          'Ця людина втратить доступ до адмін-панелі. Повернути роль зможе лише інший адміністратор.',
      )
    ) {
      return;
    }

    setBusyId(user.id);
    setError(null);
    try {
      await unwrap(client.mutations.promoteToAdmin({ userId: user.id, action }));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не вдалося змінити роль.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <p className="instr-note">
        Групу (ЕГ/КГ), заклад і курс призначайте вручну після реєстрації. Роль Admins — окрема дія
        нижче (виконує серверна функція, а не пряме поле).
      </p>
      {error && <p className="error">{error}</p>}
      {loading ? (
        <p className="instr-note">Завантаження…</p>
      ) : (
        <div className="tablewrap">
          <table>
            <thead>
              <tr>
                <th>Email</th>
                <th>Ім'я</th>
                <th>Група</th>
                <th>Заклад</th>
                <th>Курс</th>
                <th>Роль</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.email}</td>
                  <td>{u.fullName}</td>
                  <td>
                    <select value={u.group ?? 'UNASSIGNED'} onChange={(e) => saveField(u.id, 'group', e.target.value)}>
                      {GROUP_OPTIONS.map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      defaultValue={u.institution ?? ''}
                      onBlur={(e) => saveField(u.id, 'institution', e.target.value)}
                    />
                  </td>
                  <td>
                    <input defaultValue={u.course ?? ''} onBlur={(e) => saveField(u.id, 'course', e.target.value)} />
                  </td>
                  <td>
                    {u.id === userId ? (
                      // Власний рядок: зняти роль із себе означає замкнути
                      // панель ізсередини — повернути її можна буде лише
                      // через AWS CLI. Сервер це теж відхиляє.
                      <span className="instr-note">це ви</span>
                    ) : (
                      <>
                        <button
                          className="btn ghost"
                          disabled={busyId === u.id}
                          onClick={() => changeRole(u, 'promote')}
                        >
                          Зробити Admins
                        </button>{' '}
                        <button
                          className="btn ghost"
                          disabled={busyId === u.id}
                          onClick={() => changeRole(u, 'demote')}
                        >
                          Зняти Admins
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={6}>Немає зареєстрованих користувачів.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
