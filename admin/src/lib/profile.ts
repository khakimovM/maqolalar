import { api } from "./api";
import type { User } from "./types";

/** Profilni yangilash (username va/yoki avatar). PUT /users/me */
export async function updateProfile(dto: {
  username?: string;
  avatar?: string;
}): Promise<User> {
  const res = await api.put("/users/me", dto);
  return res.data.data;
}

/** Parolni o'zgartirish. PUT /users/me/password */
export async function changePassword(dto: {
  oldPassword: string;
  newPassword: string;
}): Promise<void> {
  await api.put("/users/me/password", dto);
}

/** Avatar faylini yuklash → URL. POST /upload/avatar */
export async function uploadAvatar(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const res = await api.post("/upload/avatar", form);
  return res.data.data.url as string;
}
