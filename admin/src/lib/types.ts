export type Role = "USER" | "ADMIN" | "SUPERADMIN";
export type ArticleType = "FREE" | "PREMIUM";
export type ArticleStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export interface User {
  id: string;
  email: string;
  username: string;
  avatar: string | null;
  role: Role;
  isActive: boolean;
  isVerified: boolean;
  createdAt?: string;
}

export interface AuthorMini {
  id: string;
  username: string;
  avatar: string | null;
}

export interface CategoryMini {
  id: string;
  name: string;
  slug: string;
}

/** Ro'yxatdagi maqola (content YO'Q — yengil). */
export interface ArticleCard {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  coverImage: string | null;
  type: ArticleType;
  status?: ArticleStatus;
  viewCount: number;
  publishedAt: string | null;
  createdAt: string;
  author: AuthorMini;
  category: CategoryMini;
  _count: { likes: number; comments: number };
}

/** Bitta maqola (to'liq content bilan). */
export interface ArticleFull extends ArticleCard {
  content: unknown; // Tiptap JSON
}

/**
 * ArticleCard komponenti uchun minimal shakl —
 * ro'yxat, saqlangan va boshqa joylardan kelgan yengil maqolalar mos keladi.
 */
export type CardArticle = Pick<
  ArticleCard,
  | "title"
  | "slug"
  | "excerpt"
  | "coverImage"
  | "type"
  | "viewCount"
  | "author"
  | "category"
  | "_count"
>;

/** Backend javob konverti: { statusCode, message, data }. */
export interface ApiEnvelope<T> {
  statusCode: number;
  message: string;
  data: T;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages?: number;
}
