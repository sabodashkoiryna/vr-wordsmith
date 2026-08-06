import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import {
  getCurrentUser,
  fetchAuthSession,
  signIn as amplifySignIn,
  signOut as amplifySignOut,
} from 'aws-amplify/auth';
import { client } from '../lib/amplify-client';

type AuthState = {
  loading: boolean;
  userId: string | null;
  email: string | null;
  isAdmin: boolean;
};

type AuthContextValue = AuthState & {
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

// Створює UserProfile при першому вході (owner-запис із власним id=sub) —
// зроблено "best effort": помилка тут не має ламати сам логін.
async function ensureUserProfile(id: string, email: string, fullName: string) {
  try {
    const { data: existing } = await client.models.UserProfile.get({ id });
    if (!existing) {
      await client.models.UserProfile.create({ id, email, fullName, group: 'UNASSIGNED' } as never);
    }
  } catch {
    // ignore — профіль можна створити пізніше, це не має блокувати вхід
  }
}

async function loadAuthState(): Promise<AuthState> {
  try {
    const user = await getCurrentUser();
    const session = await fetchAuthSession();
    const groups = (session.tokens?.idToken?.payload['cognito:groups'] as string[]) ?? [];
    const email = (session.tokens?.idToken?.payload.email as string) ?? '';
    const fullName = (session.tokens?.idToken?.payload.name as string) ?? '';
    void ensureUserProfile(user.userId, email, fullName);
    return {
      loading: false,
      userId: user.userId,
      email: email || null,
      isAdmin: groups.includes('Admins'),
    };
  } catch {
    return { loading: false, userId: null, email: null, isAdmin: false };
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ loading: true, userId: null, email: null, isAdmin: false });

  const refresh = useCallback(async () => {
    setState(await loadAuthState());
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
