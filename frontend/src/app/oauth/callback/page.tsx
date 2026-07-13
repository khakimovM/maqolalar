"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookOpen } from "lucide-react";
import { refreshSession, fetchMe } from "@/lib/auth-api";
import { apiError } from "@/lib/api";
import { useAuth } from "@/lib/store/auth";

export default function OAuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    // OAuth callback'da refresh token allaqachon httpOnly cookie'da o'rnatilgan.
    // Uni access token'ga almashtirib, foydalanuvchini olamiz.
    (async () => {
      try {
        const accessToken = await refreshSession();
        useAuth.getState().setAccessToken(accessToken);
        const user = await fetchMe();
        useAuth.getState().setAuth({ user, accessToken });
        router.replace("/articles");
      } catch (err) {
        useAuth.getState().logout();
        setError(apiError(err));
      }
    })();
  }, [router]);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background px-4 text-center text-foreground">
      <div className="flex items-center gap-2 text-lg font-medium tracking-tight">
        <BookOpen className="h-5 w-5 text-primary" />
        Ilm Faktor
      </div>

      {error ? (
        <>
          <p className="max-w-sm text-sm text-destructive">{error}</p>
          <Link
            href="/login"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Kirishga qaytish
          </Link>
        </>
      ) : (
        <>
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Hisobingizga kiritilmoqda…</p>
        </>
      )}
    </main>
  );
}
