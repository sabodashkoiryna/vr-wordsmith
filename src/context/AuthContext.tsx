import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import {
  getCurrentUser,
  fetchAuthSession,
  signIn as amplifySignIn,
  signOut as amplifySignOut,
} from 'aws-amplify/auth';
import { client } from '../lib/amplify-client';
import { unwrap } from '../lib/unwrap';

type AuthState = {
  loading: boolean;
  userId: string | null;
  email: string | null;
  fullName: string | null;
  isAdmin: boolean;
  /** Профіль не створився. Не блокує роботу, але сертифікат вийде без імені,
   *  тож екрани курсу показують це, а не мовчать. */
  profileError: string | null;
};

type AuthContextValue = AuthState & {
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Заводить UserProfile при першому вході (owner-запис із власним id = Cognito sub)
 * і підтягує ПІБ, якщо він змінився в Cognito.
 *
 * Помилка тут навмисно НЕ ламає логін, але й не зникає: issue-certificate бере
 * ПІБ саме звідси й підставляє «Учасник курсу», якщо запису немає. Раніше ця
 * функція робила `create({...} as never)` всередині порожнього `catch` — тобто
 * відхилений запис проходив тихо, а виявилося б це аж на видачі сертифіката,
 * коли причину вже не відтворити. Тому: `unwrap`, жодного `as never`, і текст
 * помилки повертається наверх.
 */
async function ensureUserProfile(id: string, email: string, fullName: string): Promise<string | null> {
  try {
    const existing = await unwrap(client.models.UserProfile.get({ id }));
    if (!existing) {
      await unwrap(client.models.UserProfile.create({ id, email, fullName, group: 'UNASSIGNED' }));
    } else if (fullName && existing.fullName !== fullName) {
      await unwrap(client.models.UserProfile.update({ id, fullName }));
    }
    return null;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Не вдалося зберегти профіль';
    console.error('[UserProfile]', message);
    return message;
  }
}

async function loadAuthState(): Promise<AuthState> {
  try {
    const user = await getCurrentUser();
    const session = await fetchAuthSession();
    const groups = (session.tokens?.idToken?.payload['cognito:groups'] as string[]) ?? [];
    const email = (session.tokens?.idToken?.payload.email as string) ?? '';
    const fullName = (session.tokens?.idToken?.payload.name as string) ?? '';
    return {
      loading: false,
      userId: user.userId,
      email: email || null,
      fullName: fullName || null,
      isAdmin: groups.includes('Admins'),
      profileError: null,
    };
  } catch {
    return {
      loading: false,
      userId: null,
      email: null,
      fullName: null,
      isAdmin: false,
      profileError: null,
    };
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    loading: true,
    userId: null,
    email: null,
    fullName: null,
    isAdmin: false,
    profileError: null,
  });

  // Профіль перевіряємо ПІСЛЯ того, як стан авторизації вже виставлено:
  // інакше кожне завантаження сторінки залогіненим чекало б на зайвий запит,
  // тримаючи гарди в стані «Перевірка доступу…».
  const refresh = useCallback(async () => {
    const next = await loadAuthState();
    setState(next);
    if (!next.userId) return;
    const profileError = await ensureUserProfile(next.userId, next.email ?? '', next.fullName ?? '');
    if (profileError) setState((prev) => (prev.userId === next.userId ? { ...prev, profileError } : prev));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function signIn(email: string, password: string) {
    await amplifySignIn({ username: email, password });
    await refresh();
  }

  async function signOut() {
    await amplifySignOut();
    await refresh();
  }

  return (
    <AuthContext.Provider value={{ ...state, signIn, signOut, refresh }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
