export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  createdAt: string;
}

export interface AuthResponse {
  user: Omit<User, "password">;
  token: string;
}

export interface ResetToken {
  email: string;
  token: string;
  expiresAt: number;
}

export interface AuthContextType {
  user: Omit<User, "password"> | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<string>;
  resetPassword: (token: string, newPassword: string) => Promise<string>;
  logout: () => void;
}