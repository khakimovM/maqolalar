// Server (Node.js runtime) tomonidagi Sentry sozlamasi.
// DSN bo'lmasa — init chaqirilmaydi, ya'ni Sentry to'liq o'chiq (no-op).
import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,
    // Faqat xatolar kerak — performance tracing kvotani yeydi, shuning uchun 0.
    tracesSampleRate: 0,
    // Dev'da konsolni shovqinlamaslik uchun.
    enableLogs: false,
  });
}
