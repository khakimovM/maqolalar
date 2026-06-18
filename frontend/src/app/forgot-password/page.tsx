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
import { OtpInput } from "@/components/otp-input";
import {
  forgotPassword,
  verifyResetOtp,
  resetPassword,
} from "@/lib/auth-api";
import { apiError } from "@/lib/api";

const RESEND_SECONDS = 60;

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "otp" | "reset">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const sendMut = useMutation({
    mutationFn: () => forgotPassword(email),
    onSuccess: () => {
      setStep("otp");
      setCooldown(RESEND_SECONDS);
    },
  });

  const verifyMut = useMutation({
    mutationFn: () => verifyResetOtp(email, code),
    onSuccess: (data) => {
      setResetToken(data.resetToken);
      setStep("reset");
    },
  });

  const resetMut = useMutation({
    mutationFn: () =>
      resetPassword({ email, token: resetToken, newPassword }),
    onSuccess: () => router.replace("/login"),
  });

  // ── 3-qadam: yangi parol ─────────────────────────────────
  if (step === "reset") {
    return (
      <AuthShell
        title="Yangi parol"
        subtitle="Hisobingiz uchun yangi parol o'rnating."
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            resetMut.mutate();
          }}
          className="space-y-4"
        >
          <Field
            id="newPassword"
            type="password"
            label="Yangi parol"
            placeholder="••••••••"
            autoComplete="new-password"
            required
            minLength={8}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            hint="Kamida 8 belgi"
          />
          <FormError
            message={resetMut.isError ? apiError(resetMut.error) : null}
          />
          <SubmitButton loading={resetMut.isPending}>
            Parolni saqlash
          </SubmitButton>
        </form>
      </AuthShell>
    );
  }

  // ── 2-qadam: OTP ─────────────────────────────────────────
  if (step === "otp") {
    return (
      <AuthShell
        title="Kodni kiriting"
        subtitle={`${email} manziliga yuborilgan 6 xonali kodni kiriting.`}
        footer={
          <button
            type="button"
            onClick={() => setStep("email")}
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
          <OtpInput value={code} onChange={setCode} disabled={verifyMut.isPending} />
          <FormError
            message={verifyMut.isError ? apiError(verifyMut.error) : null}
          />
          <SubmitButton loading={verifyMut.isPending} disabled={code.length !== 6}>
            Tasdiqlash
          </SubmitButton>
          <div className="text-center text-sm text-muted-foreground">
            {cooldown > 0 ? (
              <span>
                Qayta yuborish:{" "}
                <span className="tabular-nums">{cooldown}s</span>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => sendMut.mutate()}
                disabled={sendMut.isPending}
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

  // ── 1-qadam: email ───────────────────────────────────────
  return (
    <AuthShell
      title="Parolni tiklash"
      subtitle="Emailingizni kiriting — tiklash kodini yuboramiz."
      footer={
        <Link href="/login" className="font-medium text-primary hover:underline">
          ← Kirishga qaytish
        </Link>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          sendMut.mutate();
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
        <FormError message={sendMut.isError ? apiError(sendMut.error) : null} />
        <SubmitButton loading={sendMut.isPending}>Kod yuborish</SubmitButton>
      </form>
    </AuthShell>
  );
}
