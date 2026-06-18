"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { BookOpen } from "lucide-react";
import { fetchMe } from "@/lib/auth-api";
import { apiError } from "@/lib/api";
import { useAuth } from "@/lib/store/auth";

function CallbackInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const accessToken = params.get("accessToken");
    const refreshToken = params.get("refreshToken");

    if (!accessToken || !refreshToken) {
      setError("Token topilmadi — qaytadan urinib ko'ring.");
      return;
    }

    // Tokenlarni vaqtincha o'rnatamiz, so'ng /users/me dan foydalanuvchini olamiz
    useAuth.setState({ accessToken, refreshToken });

    fetchMe()
      .then((user) => {
        useAuth.getState().setAuth({ user, accessToken, refreshToken });
        router.replace("/articles");
      })
      .catch((err) => {
        useAuth.getState().logout();
        setError(apiError(err));
      });
  }, [params, router]);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background px-4 text-center text-foreground">
      <div className="flex items-center gap-2 text-lg font-medium tracking-tight">
        <BookOpen className="h-5 w-5 text-primary" />
        Maqolalar
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

export default function OAuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-dvh items-center justify-center bg-background">
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </main>
      }
    >
      <CallbackInner />
    </Suspense>
  );
}
