import { useCallback, useMemo, useState, type ReactNode } from "react";
import type { User } from "../types/auth";
import * as api from "../services/auth";
import { getStoredAuth, storeAuth, clearAuth } from "../lib/storage";
import { AuthContext } from "./AuthContext";

function getInitialAuth() {
  const stored = getStoredAuth();
  return {
    user: stored?.user ?? null,
    token: stored?.token ?? null,
  };
}

const initialAuth = getInitialAuth();

async function forgotPassword(email: string) {
  const response = await api.forgotPassword(email);
  return response.message;
}

async function resetPassword(token: string, newPassword: string) {
  const response = await api.resetPassword(token, newPassword);
  return response.message;
}

export function AuthProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [user, setUser] = useState<Omit<User, "password"> | null>(initialAuth.user);
  const [token, setToken] = useState<string | null>(initialAuth.token);

  const login = useCallback(async (email: string, password: string) => {
    const response = await api.login(email, password);
    setUser(response.user);
    setToken(response.token);
    storeAuth(response);
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const response = await api.register(name, email, password);
    setUser(response.user);
    setToken(response.token);
    storeAuth(response);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    clearAuth();
  }, []);

  const value = useMemo(
    () => ({
      user,
      token,
      login,
      register,
      forgotPassword,
      resetPassword,
      logout,
    }),
    [user, token, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
