import type { Metadata } from "next";
import { Geist, Geist_Mono, Lora } from "next/font/google";
import "./globals.css";
import "katex/dist/katex.min.css";
import { Providers } from "@/components/providers";
import { JsonLd } from "@/components/json-ld";
import { siteGraph } from "@/lib/schema";
import { SITE_URL } from "@/lib/seo";

const geistSans = Geist({ variable: "--font-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const lora = Lora({ variable: "--font-serif", subsets: ["latin", "cyrillic"] });

const TITLE = "Ilm Faktor — bilim har bir sahifada";
const DESCRIPTION =
  "Kimyo, matematika, qurilish va boshqa yo'nalishlarda chuqur, ishonchli maqolalar to'plami.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE,
    template: "%s — Ilm Faktor",
  },
  description: DESCRIPTION,
  applicationName: "Ilm Faktor",
  alternates: { canonical: "/" },
  keywords: [
    "Ilm Faktor",
    "maqolalar",
    "ilmiy maqolalar",
    "kimyo",
    "matematika",
    "qurilish",
    "bilim",
    "o'zbek tilida maqolalar",
  ],
  authors: [{ name: "Ilm Faktor" }],
  creator: "Ilm Faktor",
  publisher: "Ilm Faktor",
  openGraph: {
    type: "website",
    siteName: "Ilm Faktor",
    locale: "uz_UZ",
    title: TITLE,
    description: DESCRIPTION,
    url: SITE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="uz"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${lora.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <JsonLd data={siteGraph()} />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
