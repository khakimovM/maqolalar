// Edge runtime (middleware, edge route) uchun Sentry sozlamasi.
// DSN bo'lmasa — init chaqirilmaydi (no-op).
import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0,
    enableLogs: false,
  });
}
