import { useCallback, useEffect, useState } from 'react';
import { client } from '../../lib/amplify-client';
import { unwrap } from '../../lib/unwrap';
import { useAuth } from '../../context/AuthContext';
import {
  AdminButton,
  Banner,
  EmptyState,
  PageHeader,
  SearchInput,
  Toolbar,
} from '../../features/admin/ui/adminUi';

type UserRow = {
  id: string;
  email: string;
  fullName: string;
  group: string | null;
  institution: string | null;
  course: string | null;
};

const GROUPS = ['EG', 'KG', 'UNASSIGNED'];

/**
 * Ролі та дослідницькі групи.
 *
 * Роль Admins змінює серверна функція, а не поле тут: зняти її із себе або з
 * останнього адміна неможливо — панель зачинилася б ізсередини, і повернути
 * доступ можна було б лише через AWS CLI. Це вже одного разу сталося.
 */
export default function UsersAdmin() {
  const { userId } = useAuth();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await unwrap(client.models.UserProfile.list({ limit: 1000 }));
      setUsers(
        data
          .map((u) => ({
            id: u.id,
            email: u.email,
            fullName: u.fullName,
            group: u.group ?? null,
            institution: u.institution ?? null,
            course: u.course ?? null,
          }))
          .sort((a, b) => a.fullName.localeCompare(b.fullName, 'uk')),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не вдалося завантажити користувачів');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveField(id: string, field: 'group' | 'institution' | 'course', value: string) {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, [field]: value } : u)));
    try {
      await unwrap(client.models.UserProfile.update({ id, [field]: value } as never));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не вдалося зберегти');
    }
  }

  async function changeRole(user: UserRow, action: 'promote' | 'demote') {
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
    setNotice(null);
    try {
      await unwrap(client.mutations.promoteToAdmin({ userId: user.id, action }));
      setNotice(action === 'promote' ? 'Роль надано.' : 'Роль знято.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не вдалося змінити роль.');
    } finally {
      setBusyId(null);
    }
  }

  const q = query.trim().toLowerCase();
  const visible = q
    ? users.filter(
        (u) =>
          u.fullName.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          (u.institution ?? '').toLowerCase().includes(q),
      )
    : users;

  const input =
    'w-full rounded-[var(--radius-sm)] border border-[var(--line-strong)] bg-space-900/60 px-3 py-2 text-sm text-ink focus:border-cyan-400 focus:outline-none';

  return (
    <div>
      <PageHeader
        title="Ролі та групи"
        description="Групу (ЕГ/КГ), заклад і курс призначайте вручну після реєстрації. Роль Admins виконує серверна функція, а не поле в таблиці."
        count={loading ? undefined : `${visible.length}`}
      />

      {error && <Banner tone="error">{error}</Banner>}
      {notice && <Banner tone="success">{notice}</Banner>}

      <Toolbar>
        <SearchInput value={query} onChange={setQuery} placeholder="Імʼя, email, заклад…" />
      </Toolbar>

      {loading ? (
        <p className="text-ink-mute">Завантажуємо…</p>
      ) : visible.length === 0 ? (
        <EmptyState title={q ? 'Нічого не знайдено' : 'Ще ніхто не зареєструвався'} />
      ) : (
        <ul className="flex list-none flex-col gap-3 p-0">
          {visible.map((u) => (
            <li key={u.id} className="rounded-[var(--radius-lg)] bg-space-800 p-5">
              <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                <span className="text-ink">{u.fullName}</span>
                <span className="font-mono text-2xs text-ink-mute">{u.email}</span>
                {u.id === userId && (
                  <span className="rounded-full bg-space-600 px-2.5 py-1 font-mono text-2xs text-violet-300">
                    це ви
                  </span>
                )}
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-[120px_1fr_1fr_auto] sm:items-end">
                <label className="flex flex-col gap-1.5">
                  <span className="font-mono text-2xs tracking-widest text-ink-mute">ГРУПА</span>
                  <select
                    value={u.group ?? 'UNASSIGNED'}
                    onChange={(e) => saveField(u.id, 'group', e.target.value)}
                    className={input}
                  >
                    {GROUPS.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className="font-mono text-2xs tracking-widest text-ink-mute">ЗАКЛАД</span>
                  <input
                    defaultValue={u.institution ?? ''}
                    onBlur={(e) => saveField(u.id, 'institution', e.target.value)}
                    className={input}
                  />
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className="font-mono text-2xs tracking-widest text-ink-mute">КУРС</span>
                  <input
                    defaultValue={u.course ?? ''}
                    onBlur={(e) => saveField(u.id, 'course', e.target.value)}
                    className={input}
                  />
                </label>

                <div className="flex gap-2">
                  {u.id === userId ? (
                    <span className="self-center font-mono text-2xs text-ink-mute">
                      роль не змінюється
                    </span>
                  ) : (
                    <>
                      <AdminButton
                        onClick={() => changeRole(u, 'promote')}
                        disabled={busyId === u.id}
                      >
                        + Admins
                      </AdminButton>
                      <AdminButton
                        variant="danger"
                        onClick={() => changeRole(u, 'demote')}
                        disabled={busyId === u.id}
                      >
                        − Admins
                      </AdminButton>
                    </>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
