import type { Metadata } from "next";

// /articles ro'yxat sahifasi client component — meta shu segment layout'ida.
// /articles/[slug] o'z generateMetadata'si bilan buni qoplaydi (title/canonical).
export const metadata: Metadata = {
  title: "Maqolalar",
  description:
    "Kimyo, matematika, qurilish va boshqa yo'nalishlarda chuqur va ishonchli maqolalar to'plami. Bilim olamiga sayohatni shu yerdan boshlang.",
  alternates: { canonical: "/articles" },
  openGraph: {
    title: "Maqolalar — Ilm Faktor",
    description:
      "Kimyo, matematika, qurilish va boshqa yo'nalishlarda chuqur, ishonchli maqolalar.",
    url: "/articles",
    type: "website",
  },
};

export default function ArticlesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
