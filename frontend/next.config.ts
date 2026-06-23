import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  /* config options here */
};

// Sentry faqat DSN o'rnatilgan bo'lsa ulanadi — aks holda toza build (no-op).
export default process.env.NEXT_PUBLIC_SENTRY_DSN
  ? withSentryConfig(nextConfig, {
      // Manba-xaritalarni (source map) yuklash uchun: Sentry org va loyiha slug'i.
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      // Build log'larini jim qiladi (CI'da ko'rinadi).
      silent: !process.env.CI,
      // Client bundle uchun source map qamrovini kengaytiradi.
      widenClientFileUpload: true,
      // Sentry SDK log'larini production'da o'chiradi (bundle kichikroq).
      disableLogger: true,
      // SENTRY_AUTH_TOKEN bo'lmasa source map yuklanmaydi (build baribir ishlaydi).
      sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
      // Adblocker'lar sentry.io'ni bloklaydi — eventlarni o'z domeningiz orqali tunnel qiladi.
      tunnelRoute: "/monitoring",
    })
  : nextConfig;
