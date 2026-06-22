import axios from "axios";
import { api } from "./api";
import type { User } from "./types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

export interface AuthResult {
  user: User;
  accessToken: string;
  // refresh token endi httpOnly cookie'da — javob body'sida bo'lmaydi
}

/** 1-qadam: ro'yxatdan o'tish — OTP emailga (dev'da konsolga) yuboriladi. */
export async function register(dto: {
  email: string;
  username: string;
  password: string;
}): Promise<{ email: string }> {
  const res = await api.post("/auth/register", dto);
  return res.data.data;
}

/** 2-qadam: emailni OTP bilan tasdiqlash — access token qaytadi (refresh cookie'da). */
export async function verifyEmail(
  email: string,
  code: string,
): Promise<AuthResult> {
  const res = await api.post("/auth/verify-email", { email, code });
  return res.data.data;
}

/** OTP kodini qayta yuborish. */
export async function resendOtp(email: string): Promise<void> {
  await api.post("/auth/resend-otp", { email });
}

/** Tizimga kirish — access token qaytadi (refresh cookie'da). */
export async function login(
  email: string,
  password: string,
): Promise<AuthResult> {
  const res = await api.post("/auth/login", { email, password });
  return res.data.data;
}

/** Joriy foydalanuvchi. */
export async function fetchMe(): Promise<User> {
  const res = await api.get("/users/me");
  return res.data.data;
}

/**
 * Sessiyani tiklash — refresh cookie orqali yangi access token oladi.
 * Bootstrap va OAuth callback'da ishlatiladi. Bare axios (interceptorsiz).
 */
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
    // logout har doim muvaffaqiyatli hisoblanadi (cookie baribir tozalanadi)
  }
}

/** Parolni tiklash — 1-qadam: emailga kod yuborish. */
export async function forgotPassword(email: string): Promise<void> {
  await api.post("/auth/forgot-password", { email });
}

/** Parolni tiklash — 2-qadam: OTP tasdiqlash, resetToken qaytadi. */
export async function verifyResetOtp(
  email: string,
  code: string,
): Promise<{ resetToken: string }> {
  const res = await api.post("/auth/verify-reset-otp", { email, code });
  return res.data.data;
}

/** Parolni tiklash — 3-qadam: yangi parol o'rnatish. */
export async function resetPassword(dto: {
  email: string;
  token: string;
  newPassword: string;
}): Promise<void> {
  await api.post("/auth/reset-password", dto);
}

/** Email o'zgartirish — 1-qadam: joriy parol + yangi emailga tasdiqlash kodi. */
export async function requestEmailChange(
  newEmail: string,
  currentPassword: string,
): Promise<void> {
  await api.post("/auth/change-email/request", { newEmail, currentPassword });
}

/** Email o'zgartirish — 2-qadam: kodni tasdiqlab emailni yangilash. */
export async function confirmEmailChange(
  newEmail: string,
  code: string,
): Promise<User> {
  const res = await api.post("/auth/change-email/confirm", { newEmail, code });
  return res.data.data;
}

/** OAuth boshlanish nuqtalari (to'liq sahifa yo'naltirilishi). */
export const OAUTH_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";
