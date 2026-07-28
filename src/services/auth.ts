import type { User, AuthResponse, ResetToken } from "../types/auth";
import { MOCK_USERS } from "../mocks/users";

const users = [...MOCK_USERS];
let resetTokens: ResetToken[] = [];

function generateToken(): string {
  return crypto.randomUUID();
}

function sanitizeUser({ password, ...rest }: User): Omit<User, "password"> {
  void password;
  return rest;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function login(
  email: string,
  password: string
): Promise<AuthResponse> {
  await delay(800);

  const user = users.find(
    (u) => u.email === email && u.password === password
  );

  if (!user) {
    throw new Error("Email ou senha incorretos");
  }

  return {
    user: sanitizeUser(user),
    token: generateToken(),
  };
}

export async function register(
  name: string,
  email: string,
  password: string
): Promise<AuthResponse> {
  await delay(800);

  if (users.some((u) => u.email === email)) {
    throw new Error("Email já cadastrado");
  }

  const newUser: User = {
    id: crypto.randomUUID(),
    name,
    email,
    password,
    createdAt: new Date().toISOString(),
  };

  users.push(newUser);

  return {
    user: sanitizeUser(newUser),
    token: generateToken(),
  };
}

export async function forgotPassword(
  email: string
): Promise<{ message: string }> {
  await delay(800);

  const user = users.some((u) => u.email === email);

  if (!user) {
    return {
      message:
        "Se o email estiver cadastrado, você receberá um link de redefinição.",
    };
  }

  const token = generateToken();

  resetTokens = resetTokens.filter((t) => t.email !== email);

  resetTokens.push({
    email,
    token,
    expiresAt: Date.now() + 15 * 60 * 1000,
  });

  console.log(`[RESET TOKEN] ${email}: ${token}`);

  return {
    message:
      "Se o email estiver cadastrado, você receberá um link de redefinição.",
  };
}

export async function resetPassword(
  token: string,
  newPassword: string
): Promise<{ message: string }> {
  await delay(800);

  const resetToken = resetTokens.find(
    (t) => t.token === token && t.expiresAt > Date.now()
  );

  if (!resetToken) {
    throw new Error("Token inválido ou expirado");
  }

  const userIndex = users.findIndex((u) => u.email === resetToken.email);

  if (userIndex === -1) {
    throw new Error("Usuário não encontrado");
  }

  users[userIndex] = { ...users[userIndex], password: newPassword };

  resetTokens = resetTokens.filter((t) => t.token !== token);

  return { message: "Senha redefinida com sucesso" };
}
