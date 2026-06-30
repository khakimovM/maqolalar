import { api } from "./api";
import type {
  ArticleType,
  ArticleStatus,
  AuthorMini,
  CategoryMini,
  User,
} from "./types";

// ── Tiplar ────────────────────────────────────────────────

export interface AdminArticle {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  coverImage: string | null;
  citationStyle?: string | null;
  type: ArticleType;
  status: ArticleStatus;
  viewCount: number;
  publishedAt: string | null;
  author: AuthorMini;
  category: CategoryMini;
  _count: { likes: number; comments: number };
}

export interface AdminArticleList {
  items: AdminArticle[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface MyAnalytics {
  totals: { views: number; likes: number; comments: number; articles: number };
  articles: {
    id: string;
    title: string;
    slug: string;
    status: ArticleStatus;
    type: ArticleType;
    views: number;
    likes: number;
    comments: number;
    publishedAt: string | null;
  }[];
}

export interface AdminStats {
  totals: {
    users: number;
    admins: number;
    articles: number;
    publishedArticles: number;
    comments: number;
    categories: number;
    views: number;
    emails: number;
  };
  range: { from: string; to: string; newUsers: number; newArticles: number };
}

export interface AdminUser extends User {
  _count?: { articles: number };
}

export interface ArticleInput {
  title: string;
  content: Record<string, unknown>;
  categoryId: string;
  type?: ArticleType;
  excerpt?: string;
  coverImage?: string;
  citationStyle?: string;
}

// ── Maqolalar ─────────────────────────────────────────────

export async function fetchMyArticles(params: {
  page?: number;
  limit?: number;
  search?: string;
  status?: ArticleStatus;
}): Promise<AdminArticleList> {
  const res = await api.get("/articles/my", { params });
  return res.data.data;
}

export async function fetchMyAnalytics(): Promise<MyAnalytics> {
  const res = await api.get("/articles/my/analytics");
  return res.data.data;
}

export async function fetchArticleForEdit(id: string) {
  const res = await api.get(`/articles/my/${id}`);
  return res.data.data;
}

export async function createArticle(dto: ArticleInput): Promise<AdminArticle> {
  const res = await api.post("/articles", dto);
  return res.data.data;
}

export async function updateArticle(
  id: string,
  dto: Partial<ArticleInput>,
): Promise<AdminArticle> {
  const res = await api.put(`/articles/${id}`, dto);
  return res.data.data;
}

export async function deleteArticle(id: string): Promise<void> {
  await api.delete(`/articles/${id}`);
}

export async function publishArticle(id: string): Promise<AdminArticle> {
  const res = await api.put(`/articles/${id}/publish`, {});
  return res.data.data;
}

export async function archiveArticle(id: string): Promise<AdminArticle> {
  const res = await api.put(`/articles/${id}/archive`, {});
  return res.data.data;
}

// ── Statistika (SUPERADMIN) ───────────────────────────────

export async function fetchStats(params?: {
  period?: "daily" | "monthly" | "yearly";
  from?: string;
  to?: string;
}): Promise<AdminStats> {
  const res = await api.get("/admin/stats", { params });
  return res.data.data;
}

export interface Timeseries {
  buckets: string[];
  series: {
    users: number[];
    articles: number[];
    emails: number[];
    views: number[];
    comments: number[];
  };
  email: {
    sent: number;
    failed: number;
    verification: number;
    reset: number;
    changeEmail: number;
  };
}

/** O'sish grafiklari uchun vaqt qatorlari (SUPERADMIN). */
export async function fetchTimeseries(params?: {
  period?: "daily" | "monthly" | "yearly";
  from?: string;
  to?: string;
}): Promise<Timeseries> {
  const res = await api.get("/admin/timeseries", { params });
  return res.data.data;
}

// ── Kategoriyalar (SUPERADMIN) ────────────────────────────

export async function createCategory(name: string) {
  const res = await api.post("/categories", { name });
  return res.data.data;
}
export async function updateCategory(id: string, name: string) {
  const res = await api.put(`/categories/${id}`, { name });
  return res.data.data;
}
export async function deleteCategory(id: string): Promise<void> {
  await api.delete(`/categories/${id}`);
}

// ── Adminlar (SUPERADMIN) ─────────────────────────────────

export async function fetchAdmins(): Promise<AdminUser[]> {
  const res = await api.get("/admin/admins");
  return res.data.data;
}
export async function createAdmin(dto: {
  email: string;
  username: string;
  password: string;
}): Promise<AdminUser> {
  const res = await api.post("/admin/create-admin", dto);
  return res.data.data;
}
export async function deactivateAdmin(id: string) {
  const res = await api.put(`/admin/admins/${id}/deactivate`, {});
  return res.data.data;
}
export async function activateAdmin(id: string) {
  const res = await api.put(`/admin/admins/${id}/activate`, {});
  return res.data.data;
}

// ── Cover yuklash (ADMIN) ─────────────────────────────────

export async function uploadCover(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const res = await api.post("/upload/cover", form);
  return res.data.data.url as string;
}

/** Zotero iqtibos uslubi (.csl) yuklash. POST /upload/citation-style */
export async function uploadCitationStyle(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const res = await api.post("/upload/citation-style", form);
  return res.data.data.url as string;
}

// ── Telegram "muallif bo'lish" arizalari (SUPERADMIN) ─────

export interface AdminRequestItem {
  id: string;
  name: string;
  telegramUsername: string | null;
  phone: string | null;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
}
export interface AdminRequestsData {
  counts: {
    pending: number;
    approved: number;
    rejected: number;
    total: number;
  };
  recent: AdminRequestItem[];
}
export interface AdminRequestSeries {
  buckets: string[];
  total: number[];
  approved: number[];
}

export async function fetchAdminRequests(): Promise<AdminRequestsData> {
  const res = await api.get("/admin/admin-requests");
  return res.data.data;
}

/** Arizalar vaqt qatori. ?period=daily|monthly|yearly yoki ?from=&to= */
export async function fetchAdminRequestSeries(params?: {
  period?: "daily" | "monthly" | "yearly";
  from?: string;
  to?: string;
}): Promise<AdminRequestSeries> {
  const res = await api.get("/admin/admin-requests/series", { params });
  return res.data.data;
}

// ── Kategoriyalar ro'yxati ─────────────────────────────────

export interface AdminCategory {
  id: string;
  name: string;
  slug: string;
  articleCount: number;
}

export async function fetchCategories(): Promise<AdminCategory[]> {
  const res = await api.get("/categories");
  return res.data.data;
}

/** Maqola ichidagi rasmni yuklash. POST /upload/article-image */
export async function uploadArticleImage(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const res = await api.post("/upload/article-image", form);
  return res.data.data.url as string;
}

// ── Shikoyat qilingan izohlar (moderatsiya) ──────────────

export interface ReportedComment {
  id: string;
  content: string;
  author: AuthorMini;
  article: { id: string; title: string; slug: string };
  reportCount: number;
  reports: {
    reason: string | null;
    reportedBy: { id: string; username: string };
    createdAt: string;
  }[];
  createdAt: string;
}

/** Shikoyat qilingan izohlar. GET /comments/reported */
export async function fetchReportedComments(): Promise<ReportedComment[]> {
  const res = await api.get("/comments/reported");
  return res.data.data.items;
}

/** Izohni moderatsiya bilan o'chirish. DELETE /comments/:id/admin */
export async function deleteCommentAdmin(id: string): Promise<void> {
  await api.delete(`/comments/${id}/admin`);
}
