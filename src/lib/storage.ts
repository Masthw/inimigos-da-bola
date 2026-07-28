import type { AuthResponse } from "../types/auth";

const STORAGE_KEY = "auth";

export function getStoredAuth(): AuthResponse | null {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return null;

  try {
    return JSON.parse(stored);
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function storeAuth(data: AuthResponse): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function clearAuth(): void {
  localStorage.removeItem(STORAGE_KEY);
}