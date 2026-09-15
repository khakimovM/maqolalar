import type { Metadata } from "next";
import { Geist, Geist_Mono, Lora } from "next/font/google";
import "./globals.css";
import "katex/dist/katex.min.css";
import { Providers } from "@/components/providers";

const geistSans = Geist({ variable: "--font-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const lora = Lora({ variable: "--font-serif", subsets: ["latin", "cyrillic"] });

export const metadata: Metadata = {
  title: "Ilm Faktor — Admin",
  description: "Ilm Faktor platformasi boshqaruv paneli.",
  robots: { index: false, follow: false },
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
      {/* suppressHydrationWarning: brauzer kengaytmalari (ColorZilla, Gemini va h.k.)
          <body> ga o'z atributlarini qo'shadi va React hydration mismatch beradi.
          Frontend ilovasida ham shunday qilingan. */}
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
