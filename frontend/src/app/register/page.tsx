"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import {
  AuthShell,
  Field,
  FormError,
  SubmitButton,
} from "@/components/auth-shell";
import { OAuthButtons, OrDivider } from "@/components/oauth-buttons";
import { OtpInput } from "@/components/otp-input";
import { register, verifyEmail, resendOtp } from "@/lib/auth-api";
import { apiError } from "@/lib/api";
import { useAuth } from "@/lib/store/auth";

const RESEND_SECONDS = 60;

export default function RegisterPage() {
  const router = useRouter();
  const setAuth = useAuth((s) => s.setAuth);

  const [step, setStep] = useState<"form" | "otp">("form");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [cooldown, setCooldown] = useState(0);

  // Qayta yuborish taymeri
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const registerMut = useMutation({
    mutationFn: () => register({ email, username, password }),
    onSuccess: () => {
      setStep("otp");
      setCooldown(RESEND_SECONDS);
    },
  });

  const verifyMut = useMutation({
    mutationFn: () => verifyEmail(email, code),
    onSuccess: (data) => {
      setAuth(data);
      router.replace("/articles");
    },
  });

  const resendMut = useMutation({
    mutationFn: () => resendOtp(email),
    onSuccess: () => setCooldown(RESEND_SECONDS),
  });

  // ── 2-qadam: OTP tasdiqlash ──────────────────────────────
  if (step === "otp") {
    return (
      <AuthShell
        title="Emailni tasdiqlang"
        subtitle={`${email} manziliga 6 xonali kod yubordik. Kodni kiriting.`}
        footer={
          <button
            type="button"
            onClick={() => setStep("form")}
            className="font-medium text-primary hover:underline"
          >
            ← Emailni o&apos;zgartirish
          </button>
        }
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            verifyMut.mutate();
          }}
          className="space-y-5"
        >
          <OtpInput
            value={code}
            onChange={setCode}
            disabled={verifyMut.isPending}
          />

          <FormError
            message={verifyMut.isError ? apiError(verifyMut.error) : null}
          />

          <SubmitButton
            loading={verifyMut.isPending}
            disabled={code.length !== 6}
          >
            Tasdiqlash
          </SubmitButton>

          <div className="text-center text-sm text-muted-foreground">
            {cooldown > 0 ? (
              <span>
                Qayta yuborish: <span className="tabular-nums">{cooldown}s</span>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => resendMut.mutate()}
                disabled={resendMut.isPending}
                className="font-medium text-primary hover:underline disabled:opacity-60"
              >
                Kodni qayta yuborish
              </button>
            )}
          </div>
        </form>
      </AuthShell>
    );
  }

  // ── 1-qadam: ro'yxatdan o'tish formasi ───────────────────
  return (
    <AuthShell
      title="Ro'yxatdan o'tish"
      subtitle="Bepul hisob oching va maqolalarni o'qing."
      footer={
        <>
          Hisobingiz bormi?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Kirish
          </Link>
        </>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          registerMut.mutate();
        }}
        className="space-y-4"
      >
        <Field
          id="username"
          label="Foydalanuvchi nomi"
          placeholder="masalan: ali_valiyev"
          autoComplete="username"
          required
          minLength={3}
          maxLength={30}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          hint="3-30 belgi: harf, raqam va pastki chiziq (_)"
        />
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
        <Field
          id="password"
          type="password"
          label="Parol"
          placeholder="••••••••"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          hint="Kamida 8 belgi"
        />

        <FormError
          message={registerMut.isError ? apiError(registerMut.error) : null}
        />

        <SubmitButton loading={registerMut.isPending}>
          Davom etish
        </SubmitButton>
      </form>

      <div className="my-5">
        <OrDivider />
      </div>
      <OAuthButtons />
    </AuthShell>
  );
}
