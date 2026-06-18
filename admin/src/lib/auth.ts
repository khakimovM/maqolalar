import { api } from "./api";
import type { User } from "./types";

export interface AuthResult {
  user: User;
  accessToken: string;
  refreshToken: string;
}

/** Tizimga kirish. POST /auth/login */
export async function login(
  email: string,
  password: string,
): Promise<AuthResult> {
  const res = await api.post("/auth/login", { email, password });
  return res.data.data;
}

/** Joriy foydalanuvchi. GET /users/me */
export async function fetchMe(): Promise<User> {
  const res = await api.get("/users/me");
  return res.data.data;
}
