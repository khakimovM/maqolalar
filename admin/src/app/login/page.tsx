"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { LayoutDashboard } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Field, FormError, SubmitButton } from "@/components/form";
import { login } from "@/lib/auth";
import { apiError } from "@/lib/api";
import { useAuth } from "@/lib/store/auth";

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const setAuth = useAuth((s) => s.setAuth);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [denied, setDenied] = useState(false);

  const next = params.get("next") || "/";

  const mutation = useMutation({
    mutationFn: () => login(email, password),
    onSuccess: (data) => {
      // Faqat ADMIN/SUPERADMIN admin paneliga kira oladi
      if (data.user.role !== "ADMIN" && data.user.role !== "SUPERADMIN") {
        setDenied(true);
        return;
      }
      setAuth(data);
      router.replace(next);
    },
  });

  return (
    <main className="relative flex min-h-dvh items-center justify-center bg-background px-4 text-foreground">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex items-center gap-2 text-lg font-medium tracking-tight">
            <LayoutDashboard className="h-5 w-5 text-primary" />
            Maqolalar Admin
          </div>
          <h1 className="font-serif text-2xl font-medium tracking-tight">
            Boshqaruv paneliga kirish
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Faqat administratorlar uchun.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setDenied(false);
              mutation.mutate();
            }}
            className="space-y-4"
          >
            <Field
              id="email"
              type="email"
              label="Email"
              placeholder="admin@example.com"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Field
              id="password"
              type="password"
              label="Parol"
              placeholder="••••••••"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <FormError
              message={
                denied
                  ? "Bu hisobda admin huquqlari yo'q."
                  : mutation.isError
                    ? apiError(mutation.error)
                    : null
              }
            />

            <SubmitButton loading={mutation.isPending}>Kirish</SubmitButton>
          </form>
        </div>
      </div>
    </main>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-dvh items-center justify-center bg-background">
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </main>
      }
    >
      <LoginInner />
    </Suspense>
  );
}
