import axios from "axios";
import { api } from "./api";
import type { User } from "./types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

export interface AuthResult {
  user: User;
  accessToken: string;
  // refresh token endi httpOnly cookie'da
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

/** Sessiyani tiklash — refresh cookie orqali yangi access token oladi. */
export async function refreshSession(): Promise<string> {
  const res = await axios.post(
    `${BASE_URL}/auth/refresh`,
    {},
    { withCredentials: true },
  );
  return res.data.data.accessToken as string;
}

/** Logout — server refresh tokenni bekor qiladi va cookie'ni tozalaydi. */
export async function logoutApi(): Promise<void> {
  try {
    await api.post("/auth/logout");
  } catch {
    // logout har doim muvaffaqiyatli (cookie baribir tozalanadi)
  }
}
