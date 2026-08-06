import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import {
  getCurrentUser,
  fetchAuthSession,
  signIn as amplifySignIn,
  signOut as amplifySignOut,
} from 'aws-amplify/auth';

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

async function loadAuthState(): Promise<AuthState> {
  try {
    const user = await getCurrentUser();
    const session = await fetchAuthSession();
    const groups = (session.tokens?.idToken?.payload['cognito:groups'] as string[]) ?? [];
    return {
      loading: false,
      userId: user.userId,
      email: (session.tokens?.idToken?.payload.email as string) ?? null,
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
