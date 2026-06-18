import { api } from "./api";
import type { User, AuthorMini, CategoryMini, ArticleType } from "./types";

/** Saqlangan maqola (yengil — content yo'q) + saqlangan vaqti. */
export interface SavedArticle {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  coverImage: string | null;
  type: ArticleType;
  viewCount: number;
  publishedAt: string | null;
  author: AuthorMini;
  category: CategoryMini;
  _count: { likes: number; comments: number };
  savedAt: string;
}

/** Davom ettirilayotgan maqola + o'qish foizi. */
export interface ReadingArticle {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  coverImage: string | null;
  type: ArticleType;
  publishedAt: string | null;
  author: AuthorMini;
  category: CategoryMini;
  scrollPercent: number;
  lastMarkedAt: string;
}

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

/** Avatar faylini yuklash → URL qaytadi. POST /upload/avatar */
export async function uploadAvatar(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const res = await api.post("/upload/avatar", form);
  return res.data.data.url as string;
}

/** Saqlangan maqolalar ro'yxati. GET /users/me/saved */
export async function fetchSaved(): Promise<SavedArticle[]> {
  const res = await api.get("/users/me/saved");
  return res.data.data;
}

/** Davom ettirilayotgan maqolalar. GET /users/me/reading */
export async function fetchReading(): Promise<ReadingArticle[]> {
  const res = await api.get("/users/me/reading");
  return res.data.data;
}

/** O'qish belgisini o'chirish. DELETE /articles/:id/progress */
export async function removeReading(articleId: string): Promise<void> {
  await api.delete(`/articles/${articleId}/progress`);
}

/** O'qish foizini saqlash (upsert). POST /articles/:id/progress */
export async function saveProgress(
  articleId: string,
  scrollPercent: number,
): Promise<void> {
  const pct = Math.max(0, Math.min(100, Math.round(scrollPercent)));
  await api.post(`/articles/${articleId}/progress`, { scrollPercent: pct });
}
