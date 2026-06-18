import { api } from "./api";
import type { User } from "./types";

export interface AuthResult {
  user: User;
  accessToken: string;
  refreshToken: string;
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

/** 2-qadam: emailni OTP bilan tasdiqlash — tokenlar qaytadi. */
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

/** Tizimga kirish — tokenlar qaytadi. */
export async function login(
  email: string,
  password: string,
): Promise<AuthResult> {
  const res = await api.post("/auth/login", { email, password });
  return res.data.data;
}

/** Joriy foydalanuvchi (OAuth callback'da token o'rnatilgach chaqiriladi). */
export async function fetchMe(): Promise<User> {
  const res = await api.get("/users/me");
  return res.data.data;
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

/** OAuth boshlanish nuqtalari (to'liq sahifa yo'naltirilishi). */
export const OAUTH_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";
