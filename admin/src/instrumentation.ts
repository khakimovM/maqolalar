// Next.js server boshlanganda mos runtime config'ni yuklaydi.
import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}

// Server-side render xatolarini (RSC, route handler) Sentry'ga yuboradi.
export const onRequestError = Sentry.captureRequestError;
