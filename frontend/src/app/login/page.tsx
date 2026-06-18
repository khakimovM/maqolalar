"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import {
  AuthShell,
  Field,
  FormError,
  SubmitButton,
} from "@/components/auth-shell";
import { OAuthButtons, OrDivider } from "@/components/oauth-buttons";
import { login } from "@/lib/auth-api";
import { apiError } from "@/lib/api";
import { useAuth } from "@/lib/store/auth";

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const setAuth = useAuth((s) => s.setAuth);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Login uchun keyin qaytib boriladigan manzil (masalan premium maqoladan kelgan bo'lsa)
  const next = params.get("next") || "/articles";

  const mutation = useMutation({
    mutationFn: () => login(email, password),
    onSuccess: (data) => {
      setAuth(data);
      router.replace(next);
    },
  });

  return (
    <AuthShell
      title="Xush kelibsiz"
      subtitle="Hisobingizga kiring va o'qishda davom eting."
      footer={
        <>
          Hisobingiz yo&apos;qmi?{" "}
          <Link href="/register" className="font-medium text-primary hover:underline">
            Ro&apos;yxatdan o&apos;ting
          </Link>
        </>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
        className="space-y-4"
      >
        <Field
          id="email"
          type="email"
          label="Email"
          placeholder="siz@example.com"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="block text-sm font-medium">
              Parol
            </label>
            <Link
              href="/forgot-password"
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Unutdingizmi?
            </Link>
          </div>
          <input
            id="password"
            type="password"
            placeholder="••••••••"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-primary focus:ring-2 focus:ring-primary/25"
          />
        </div>

        <FormError
          message={mutation.isError ? apiError(mutation.error) : null}
        />

        <SubmitButton loading={mutation.isPending}>Kirish</SubmitButton>
      </form>

      <div className="my-5">
        <OrDivider />
      </div>
      <OAuthButtons />
    </AuthShell>
  );
}

export default function LoginPage() {
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
