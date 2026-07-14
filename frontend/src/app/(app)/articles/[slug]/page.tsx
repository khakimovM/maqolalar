import type { Metadata } from "next";
import { ArticleView } from "@/components/article-view";
import { JsonLd } from "@/components/json-ld";
import { articleSchema, breadcrumbSchema } from "@/lib/schema";
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
  // Muqova bo'lmasa — brendli standart OG rasmga tushamiz (ijtimoiy ulashish uchun)
  const cover = absUrl(a.coverImage) ?? `${SITE_URL}/og.png`;
  const images = [{ url: cover }];

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
      card: "summary_large_image",
      title: a.title,
      description,
      images: [cover],
    },
  };
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const a = await fetchArticleMeta(slug); // generateMetadata bilan bir xil fetch — dedup qilinadi
  const url = `${SITE_URL}/articles/${slug}`;
  const image = a ? (absUrl(a.coverImage) ?? `${SITE_URL}/og.png`) : undefined;

  return (
    <>
      {a && <JsonLd data={articleSchema(a, url, image)} />}
      {a && <JsonLd data={breadcrumbSchema(a.title, url)} />}
      <ArticleView />
    </>
  );
}
