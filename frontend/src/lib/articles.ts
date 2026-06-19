import { api } from "./api";
import type { ArticleCard, ArticleFull, CategoryMini } from "./types";

export interface ListMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
export interface ArticleListData {
  items: ArticleCard[];
  meta: ListMeta;
}
export interface CategoryWithCount extends CategoryMini {
  articleCount: number;
}
export interface ArticleQuery {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  type?: "FREE" | "PREMIUM";
}

export interface CommentNode {
  id: string;
  content: string;
  isDeleted: boolean;
  isEdited?: boolean;
  createdAt: string;
  author: { id: string; username: string; avatar: string | null; role: string };
  replies?: CommentNode[];
}

export async function fetchArticles(q: ArticleQuery): Promise<ArticleListData> {
  const res = await api.get("/articles", { params: q });
  return res.data.data;
}

export async function fetchCategories(): Promise<CategoryWithCount[]> {
  const res = await api.get("/categories");
  return res.data.data;
}

export async function fetchArticle(slug: string): Promise<ArticleFull> {
  const res = await api.get(`/articles/${slug}`);
  return res.data.data;
}

export async function toggleLike(
  id: string,
): Promise<{ liked: boolean; likeCount: number }> {
  const res = await api.post(`/articles/${id}/like`);
  return res.data.data;
}

export async function toggleSave(id: string): Promise<{ saved: boolean }> {
  const res = await api.post(`/articles/${id}/save`);
  return res.data.data;
}

export async function fetchComments(slug: string): Promise<CommentNode[]> {
  const res = await api.get(`/articles/${slug}/comments`);
  // Backend { data: { items, total } } qaytaradi — bizga items massivi kerak
  return res.data.data.items;
}

export async function addComment(
  slug: string,
  content: string,
): Promise<CommentNode> {
  const res = await api.post(`/articles/${slug}/comments`, { content });
  return res.data.data;
}

/** Izohga javob. POST /comments/:id/reply */
export async function replyComment(
  commentId: string,
  content: string,
): Promise<void> {
  await api.post(`/comments/${commentId}/reply`, { content });
}

/** O'z izohini tahrirlash. PUT /comments/:id */
export async function editComment(
  commentId: string,
  content: string,
): Promise<void> {
  await api.put(`/comments/${commentId}`, { content });
}

/** O'z izohini o'chirish (soft delete). DELETE /comments/:id */
export async function deleteComment(commentId: string): Promise<void> {
  await api.delete(`/comments/${commentId}`);
}

/** Izohni spam/shikoyat deb belgilash. POST /comments/:id/report */
export async function reportComment(
  commentId: string,
  reason?: string,
): Promise<void> {
  await api.post(`/comments/${commentId}/report`, reason ? { reason } : {});
}
