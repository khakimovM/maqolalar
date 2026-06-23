// Brauzer (client) tomonidagi Sentry sozlamasi.
// Bu fayl Next.js tomonidan client bundle'ga avtomatik kiritiladi.
// DSN bo'lmasa — Sentry o'chiq (no-op), shuning uchun dev'da hech narsa yuborilmaydi.
import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,
    // Faqat xatolar kerak — tracing va replay kvotani tez tugatadi.
    tracesSampleRate: 0,
    enableLogs: false,

    // Shovqinni filtrlash — bular bizning kodimiz xatosi emas, kvotani behuda yeydi.
    ignoreErrors: [
      "ResizeObserver loop limit exceeded",
      "ResizeObserver loop completed with undelivered notifications.",
      "Non-Error promise rejection captured",
      "Network Error",
      "Failed to fetch",
      "Load failed",
      "AbortError",
      "TypeError: Failed to fetch",
      "TypeError: NetworkError when attempting to fetch resource.",
      "TypeError: cancelled",
      "Non-Error exception captured",
      "top.GLOBALS",
    ],

    // Brauzer kengaytmalari va tashqi skriptlardan kelgan xatolarni rad etish.
    denyUrls: [
      /extensions\//i,
      /^chrome:\/\//i,
      /^chrome-extension:\/\//i,
      /^moz-extension:\/\//i,
      /^safari-extension:\/\//i,
      /^safari-web-extension:\/\//i,
    ],
  });
}

// App Router'da sahifalararo o'tishlarni Sentry'ga bog'lash (navigation breadcrumb).
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
