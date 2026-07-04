import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import * as SecureStore from "expo-secure-store";
import { setUnauthorizedHandler, TOKEN_KEY, USER_KEY } from "../services/client";
import * as authApi from "../services/authApi";
import { User } from "../types";

interface AuthState {
  user: User | null;
  initializing: boolean;
  signIn: (email: string, password: string) => Promise<User>;
  signOut: () => Promise<void>;
  updateUser: (patch: Partial<User>) => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);

  // Restore session (token + user live in secure storage, not AsyncStorage).
  useEffect(() => {
    (async () => {
      try {
        const [token, storedUser] = await Promise.all([
          SecureStore.getItemAsync(TOKEN_KEY),
          SecureStore.getItemAsync(USER_KEY),
        ]);
        if (token && storedUser) {
          setUser(JSON.parse(storedUser));
        }
      } catch {
        // Corrupt session — fall through to logged-out state.
      } finally {
        setInitializing(false);
      }
    })();
  }, []);

  const signOut = useCallback(async () => {
    await authApi.logout();
    await Promise.all([
      SecureStore.deleteItemAsync(TOKEN_KEY),
      SecureStore.deleteItemAsync(USER_KEY),
    ]);
    setUser(null);
  }, []);

  // Any 401 from the API invalidates the session.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      SecureStore.deleteItemAsync(TOKEN_KEY);
      SecureStore.deleteItemAsync(USER_KEY);
      setUser(null);
    });
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { token, user: loggedIn } = await authApi.login(email, password);
    await Promise.all([
      SecureStore.setItemAsync(TOKEN_KEY, token),
      SecureStore.setItemAsync(USER_KEY, JSON.stringify(loggedIn)),
    ]);
    setUser(loggedIn);
    return loggedIn;
  }, []);

  const updateUser = useCallback((patch: Partial<User>) => {
    setUser((current) => {
      if (!current) return current;
      const next = { ...current, ...patch };
      SecureStore.setItemAsync(USER_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ user, initializing, signIn, signOut, updateUser }),
    [user, initializing, signIn, signOut, updateUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
