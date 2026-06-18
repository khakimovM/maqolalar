"use client";

import { OAUTH_BASE } from "@/lib/auth-api";

function GithubIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
      <path d="M12 1.5A10.5 10.5 0 0 0 8.68 22a.79.79 0 0 0 .26-.41c0-.2.01-.86.01-1.56-2.92.63-3.54-1.25-3.54-1.25-.48-1.22-1.17-1.54-1.17-1.54-.95-.65.07-.64.07-.64 1.06.07 1.61 1.09 1.61 1.09.94 1.6 2.46 1.14 3.06.87.09-.68.37-1.14.67-1.4-2.33-.27-4.78-1.17-4.78-5.2 0-1.15.41-2.09 1.09-2.82-.11-.27-.47-1.34.1-2.8 0 0 .89-.28 2.92 1.08a10.1 10.1 0 0 1 5.32 0c2.02-1.36 2.91-1.08 2.91-1.08.58 1.46.21 2.53.1 2.8.68.73 1.09 1.67 1.09 2.82 0 4.04-2.46 4.93-4.8 5.19.38.33.71.97.71 1.96 0 1.42-.01 2.56-.01 2.91 0 .28.18.61.27.41A10.5 10.5 0 0 0 12 1.5Z" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.26 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
      <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z" />
    </svg>
  );
}

/**
 * OAuth tugmalari — to'liq sahifa yo'naltirishi (fetch emas).
 * Backend muvaffaqiyatda /oauth/callback ga token bilan qaytaradi.
 */
export function OAuthButtons() {
  const cls =
    "flex items-center justify-center gap-2 rounded-lg border border-input bg-background px-4 py-2.5 text-sm font-medium transition-colors hover:bg-muted/60";
  return (
    <div className="grid grid-cols-2 gap-3">
      <a href={`${OAUTH_BASE}/auth/google`} className={cls}>
        <GoogleIcon />
        Google
      </a>
      <a href={`${OAUTH_BASE}/auth/github`} className={cls}>
        <GithubIcon />
        GitHub
      </a>
    </div>
  );
}

/** "yoki" ajratuvchi chizig'i. */
export function OrDivider({ label = "yoki" }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 text-xs text-muted-foreground">
      <span className="h-px flex-1 bg-border" />
      {label}
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}
