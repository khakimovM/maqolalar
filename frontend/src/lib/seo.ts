/** Server-side SEO yordamchilari — auth'siz, viewCount oshirmaydigan fetch. */

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3001";

export interface ArticleMeta {
  title: string;
  slug: string;
  excerpt: string | null;
  coverImage: string | null;
  type: "FREE" | "PREMIUM";
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  author: { username: string };
  category: { name: string; slug: string };
}

/** Nisbiy rasm yo'lini absolyut URL'ga aylantiradi (OG uchun shart). */
export function absUrl(path: string | null | undefined): string | undefined {
  if (!path) return undefined;
  if (/^https?:\/\//i.test(path)) return path;
  return `${API}${path.startsWith("/") ? "" : "/"}${path}`;
}

/** Maqola metasi — viewCount oshmaydi (/:slug/meta). Topilmasa null. */
export async function fetchArticleMeta(
  slug: string,
): Promise<ArticleMeta | null> {
  try {
    const res = await fetch(
      `${API}/articles/${encodeURIComponent(slug)}/meta`,
      { next: { revalidate: 300 } },
    );
    if (!res.ok) return null;
    const json = await res.json();
    return (json.data ?? null) as ArticleMeta | null;
  } catch {
    return null;
  }
}

export interface SitemapArticle {
  slug: string;
  lastmod: string;
}

/** Sitemap uchun e'lon qilingan maqolalar (public ro'yxat — FREE). */
export async function fetchSitemapArticles(): Promise<SitemapArticle[]> {
  try {
    const res = await fetch(`${API}/articles?limit=1000`, {
      next: { revalidate: 600 },
    });
    if (!res.ok) return [];
    const json = await res.json();
    const items: Array<{
      slug: string;
      publishedAt: string | null;
      createdAt: string;
    }> = json.data?.items ?? [];
    return items.map((a) => ({
      slug: a.slug,
      lastmod: a.publishedAt ?? a.createdAt,
    }));
  } catch {
    return [];
  }
}
