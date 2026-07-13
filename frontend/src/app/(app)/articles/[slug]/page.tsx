import type { Metadata } from "next";
import { ArticleView } from "@/components/article-view";
import { fetchArticleMeta, absUrl, SITE_URL } from "@/lib/seo";

type Params = { slug: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const a = await fetchArticleMeta(slug);

  if (!a) {
    return {
      title: "Maqola topilmadi",
      robots: { index: false, follow: true },
    };
  }

  const description =
    a.excerpt ?? `${a.category.name} bo'yicha maqola — ${a.author.username}`;
  const url = `${SITE_URL}/articles/${a.slug}`;
  const cover = absUrl(a.coverImage);
  const images = cover ? [{ url: cover }] : undefined;

  return {
    // layout.tsx title.template "%s — Maqolalar" ni qo'shadi
    title: a.title,
    description,
    authors: [{ name: a.author.username }],
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      title: a.title,
      description,
      url,
      siteName: "Ilm Faktor",
      locale: "uz_UZ",
      publishedTime: a.publishedAt ?? undefined,
      modifiedTime: a.updatedAt,
      authors: [a.author.username],
      section: a.category.name,
      images,
    },
    twitter: {
      card: cover ? "summary_large_image" : "summary",
      title: a.title,
      description,
      images: cover ? [cover] : undefined,
    },
  };
}

export default function ArticlePage() {
  return <ArticleView />;
}
