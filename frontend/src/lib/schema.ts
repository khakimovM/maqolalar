/**
 * Schema.org (JSON-LD) yordamchilari — Google "rich results" uchun.
 * SITE_URL absolyut URL'lar uchun ishlatiladi.
 */
import { SITE_URL, type ArticleMeta } from "./seo";

const ORG_ID = `${SITE_URL}/#organization`;
const LOGO_URL = `${SITE_URL}/icon.png`;

/** Tashkilot (nashriyot) — logo sifatida daraxt ikonasi. */
export function organizationSchema() {
  return {
    "@type": "Organization",
    "@id": ORG_ID,
    name: "Ilm Faktor",
    url: SITE_URL,
    logo: {
      "@type": "ImageObject",
      url: LOGO_URL,
      width: 512,
      height: 512,
    },
  };
}

/** Sayt — WebSite sxemasi (Organization'ga bog'langan). */
export function websiteSchema() {
  return {
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    name: "Ilm Faktor",
    alternateName: "ilmfaktor.uz",
    url: SITE_URL,
    inLanguage: "uz",
    publisher: { "@id": ORG_ID },
  };
}

/** Sayt darajasidagi graf — layoutда bir marta chiqadi. */
export function siteGraph() {
  return {
    "@context": "https://schema.org",
    "@graph": [organizationSchema(), websiteSchema()],
  };
}

/** Maqola sxemasi (Article) — muallif, sana, rasm, nashriyot. */
export function articleSchema(
  a: ArticleMeta,
  url: string,
  imageUrl?: string,
) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: a.title,
    description: a.excerpt ?? undefined,
    image: imageUrl ? [imageUrl] : undefined,
    datePublished: a.publishedAt ?? a.createdAt,
    dateModified: a.updatedAt,
    inLanguage: "uz",
    articleSection: a.category?.name,
    author: { "@type": "Person", name: a.author.username },
    publisher: {
      "@type": "Organization",
      name: "Ilm Faktor",
      logo: { "@type": "ImageObject", url: LOGO_URL },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
  };
}

/** Yo'lakcha (breadcrumb): Bosh sahifa › Maqolalar › [sarlavha]. */
export function breadcrumbSchema(title: string, url: string) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Bosh sahifa", item: SITE_URL },
      {
        "@type": "ListItem",
        position: 2,
        name: "Maqolalar",
        item: `${SITE_URL}/articles`,
      },
      { "@type": "ListItem", position: 3, name: title, item: url },
    ],
  };
}
