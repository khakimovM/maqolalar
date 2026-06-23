import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  /* config options here */
};

// Sentry faqat DSN o'rnatilgan bo'lsa ulanadi — aks holda toza build (no-op).
export default process.env.NEXT_PUBLIC_SENTRY_DSN
  ? withSentryConfig(nextConfig, {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      silent: !process.env.CI,
      widenClientFileUpload: true,
      disableLogger: true,
      sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
      tunnelRoute: "/monitoring",
    })
  : nextConfig;
