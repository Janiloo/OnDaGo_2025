import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api, TOKEN_KEY } from "../api/client";

export type AdminKind = "super" | "company" | "none";

export interface AdminUser {
  email: string;
  role: string;
  companyId: string | null;
  isPlatformAdmin: boolean;
  mustChangePassword: boolean;
  kind: AdminKind;
}

interface AuthState {
  user: AdminUser | null;
  initializing: boolean;
  signIn: (email: string, password: string) => Promise<AdminUser>;
  /** Swap in a freshly-issued token (e.g. after changing a temp password). */
  applyToken: (token: string) => AdminUser;
  signOut: () => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

/** Decode a JWT payload (claims) without verifying — the server already verified it. */
function decodeJwt(token: string): Record<string, any> {
  try {
    const payload = token.split(".")[1];
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json);
  } catch {
    return {};
  }
}

function userFromToken(token: string): AdminUser {
  const c = decodeJwt(token);
  const role = c.role ?? c["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] ?? "";
  const email = c.email ?? c["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"] ?? "";
  const isPlatformAdmin = c.platform_admin === "true" || c.platform_admin === true;
  const mustChangePassword = c.must_change_password === "true" || c.must_change_password === true;
  const companyId = c.companyId ?? null;
  // Web console is admin-only: platform super admins, then company admins.
  const kind: AdminKind = isPlatformAdmin ? "super" : role === "Admin" ? "company" : "none";
  return { email, role, companyId, isPlatformAdmin, mustChangePassword, kind };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      const u = userFromToken(token);
      if (u.kind !== "none") setUser(u);
      else localStorage.removeItem(TOKEN_KEY);
    }
    setInitializing(false);
  }, []);

  const signIn = async (email: string, password: string) => {
    // Backend DTO names the field passwordHash but expects the PLAIN password.
    const { data } = await api.post("/api/Users/login", { email, passwordHash: password });
    const token: string = data.token ?? data.Token;
    if (!token) throw new Error("No token returned.");
    const u = userFromToken(token);
    if (u.kind === "none") {
      const err: any = new Error("not-admin");
      err.response = { status: 403 };
      throw err;
    }
    localStorage.setItem(TOKEN_KEY, token);
    setUser(u);
    return u;
  };

  const applyToken = (token: string) => {
    const u = userFromToken(token);
    localStorage.setItem(TOKEN_KEY, token);
    setUser(u);
    return u;
  };

  const signOut = () => {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  };

  const value = useMemo(() => ({ user, initializing, signIn, applyToken, signOut }), [user, initializing]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
