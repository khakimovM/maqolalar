"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { Check, ArrowLeft, MailCheck, Mail, Pencil } from "lucide-react";
import { Field, FormError, SubmitButton } from "@/components/auth-shell";
import { OtpInput } from "@/components/otp-input";
import { updateProfile, changePassword } from "@/lib/profile";
import {
  forgotPassword,
  verifyResetOtp,
  resetPassword,
  requestEmailChange,
  confirmEmailChange,
} from "@/lib/auth-api";
import { apiError } from "@/lib/api";
import { useAuth } from "@/lib/store/auth";

const RESEND_SECONDS = 60;

function Saved({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <span className="flex items-center gap-1 text-xs text-primary">
      <Check className="h-3.5 w-3.5" /> Saqlandi
    </span>
  );
}

export function ProfileSettings() {
  const router = useRouter();
  const user = useAuth((s) => s.user);
  const setUser = useAuth((s) => s.setUser);
  const logout = useAuth((s) => s.logout);
  const email = user?.email ?? "";

  const [username, setUsername] = useState(user?.username ?? "");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  // Parol bo'limi rejimi: oddiy o'zgartirish yoki email orqali tiklash
  const [mode, setMode] = useState<"change" | "reset">("change");
  const [resetStep, setResetStep] = useState<"otp" | "new">("otp");
  const [code, setCode] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [resetPass, setResetPass] = useState("");
  const [cooldown, setCooldown] = useState(0);

  // Email o'zgartirish bo'limi
  const [emailMode, setEmailMode] = useState<"view" | "input" | "otp">("view");
  const [newEmail, setNewEmail] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [emailCooldown, setEmailCooldown] = useState(0);
  const [emailSaved, setEmailSaved] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  useEffect(() => {
    if (emailCooldown <= 0) return;
    const t = setInterval(() => setEmailCooldown((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [emailCooldown]);

  const nameMut = useMutation({
    mutationFn: () => updateProfile({ username }),
    onSuccess: (u) => setUser(u),
  });

  const passMut = useMutation({
    mutationFn: () => changePassword({ oldPassword, newPassword }),
    onSuccess: () => {
      // Backend barcha refresh tokenlarni bekor qiladi — qaytadan kirish kerak
      logout();
      router.replace("/login");
    },
  });

  // ── Parolni tiklash (email orqali) ──────────────────────────
  const sendMut = useMutation({
    mutationFn: () => forgotPassword(email),
    onSuccess: () => {
      setMode("reset");
      setResetStep("otp");
      setCode("");
      setCooldown(RESEND_SECONDS);
    },
  });

  const verifyMut = useMutation({
    mutationFn: () => verifyResetOtp(email, code),
    onSuccess: (data) => {
      setResetToken(data.resetToken);
      setResetStep("new");
    },
  });

  const resetMut = useMutation({
    mutationFn: () =>
      resetPassword({ email, token: resetToken, newPassword: resetPass }),
    onSuccess: () => {
      logout();
      router.replace("/login");
    },
  });

  function cancelReset() {
    setMode("change");
    setResetStep("otp");
    setCode("");
    setResetToken("");
    setResetPass("");
    setCooldown(0);
  }

  // ── Email o'zgartirish ──────────────────────────────────────
  const emailReqMut = useMutation({
    mutationFn: () => requestEmailChange(newEmail.trim()),
    onSuccess: () => {
      setEmailMode("otp");
      setEmailCode("");
      setEmailCooldown(RESEND_SECONDS);
    },
  });

  const emailConfirmMut = useMutation({
    mutationFn: () => confirmEmailChange(newEmail.trim(), emailCode),
    onSuccess: (u) => {
      setUser(u);
      setEmailMode("view");
      setNewEmail("");
      setEmailCode("");
      setEmailCooldown(0);
      setEmailSaved(true);
    },
  });

  function cancelEmail() {
    setEmailMode("view");
    setNewEmail("");
    setEmailCode("");
    setEmailCooldown(0);
    emailReqMut.reset();
    emailConfirmMut.reset();
  }

  const nameChanged = username.trim() !== "" && username !== user?.username;

  return (
    <div className="space-y-8">
      {/* Username */}
      <section className="rounded-xl border border-border bg-card p-5 sm:p-6">
        <h3 className="mb-1 font-medium">Profil ma&apos;lumotlari</h3>
        <p className="mb-4 text-sm text-muted-foreground">
          Foydalanuvchi nomingiz boshqa o&apos;quvchilarga ko&apos;rinadi.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            nameMut.mutate();
          }}
          className="space-y-4"
        >
          <Field
            id="username"
            label="Foydalanuvchi nomi"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            minLength={3}
            maxLength={30}
            required
            hint="3-30 belgi: harf, raqam va pastki chiziq (_)"
          />
          <div className="space-y-2">
            <FormError message={nameMut.isError ? apiError(nameMut.error) : null} />
            <div className="flex items-center gap-3">
              <div className="w-40">
                <SubmitButton loading={nameMut.isPending} disabled={!nameChanged}>
                  Saqlash
                </SubmitButton>
              </div>
              <Saved show={nameMut.isSuccess && !nameChanged} />
            </div>
          </div>
        </form>
      </section>

      {/* Email */}
      <section className="rounded-xl border border-border bg-card p-5 sm:p-6">
        <h3 className="mb-1 font-medium">Email manzil</h3>
        <p className="mb-4 text-sm text-muted-foreground">
          Email o&apos;zgartirilganda yangi manzilga tasdiqlash kodi yuboriladi.
        </p>

        {emailMode === "view" ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{email}</span>
              <Saved show={emailSaved} />
            </div>
            <button
              type="button"
              onClick={() => {
                setEmailSaved(false);
                setEmailMode("input");
              }}
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              <Pencil className="h-3.5 w-3.5" />
              O&apos;zgartirish
            </button>
          </div>
        ) : emailMode === "input" ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              emailReqMut.mutate();
            }}
            className="space-y-4"
          >
            <Field
              id="newEmail"
              type="email"
              label="Yangi email"
              placeholder="yangi@example.com"
              autoComplete="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              required
              hint="Tasdiqlash kodi shu manzilga yuboriladi"
            />
            <FormError
              message={emailReqMut.isError ? apiError(emailReqMut.error) : null}
            />
            <div className="flex items-center gap-4">
              <div className="w-44">
                <SubmitButton
                  loading={emailReqMut.isPending}
                  disabled={!newEmail.trim() || newEmail.trim() === email}
                >
                  Kod yuborish
                </SubmitButton>
              </div>
              <button
                type="button"
                onClick={cancelEmail}
                className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Bekor qilish
              </button>
            </div>
          </form>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              emailConfirmMut.mutate();
            }}
            className="space-y-4"
          >
            <p className="flex items-start gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2.5 text-sm text-muted-foreground">
              <MailCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>
                <span className="font-medium text-foreground">
                  {newEmail.trim()}
                </span>{" "}
                manziliga 6 xonali tasdiqlash kodi yuborildi.
              </span>
            </p>
            <OtpInput
              value={emailCode}
              onChange={setEmailCode}
              disabled={emailConfirmMut.isPending}
            />
            <FormError
              message={
                emailConfirmMut.isError ? apiError(emailConfirmMut.error) : null
              }
            />
            <div className="w-56">
              <SubmitButton
                loading={emailConfirmMut.isPending}
                disabled={emailCode.length !== 6}
              >
                Tasdiqlab, yangilash
              </SubmitButton>
            </div>
            <div className="flex items-center gap-4 text-sm">
              {emailCooldown > 0 ? (
                <span className="text-muted-foreground">
                  Qayta yuborish:{" "}
                  <span className="tabular-nums">{emailCooldown}s</span>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => emailReqMut.mutate()}
                  disabled={emailReqMut.isPending}
                  className="font-medium text-primary hover:underline disabled:opacity-60"
                >
                  Kodni qayta yuborish
                </button>
              )}
              <button
                type="button"
                onClick={cancelEmail}
                className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Bekor qilish
              </button>
            </div>
          </form>
        )}
      </section>

      {/* Parol */}
      <section className="rounded-xl border border-border bg-card p-5 sm:p-6">
        <h3 className="mb-1 font-medium">Parolni o&apos;zgartirish</h3>
        <p className="mb-4 text-sm text-muted-foreground">
          Parol yangilangach barcha qurilmalarda qaytadan kirish kerak bo&apos;ladi.
        </p>

        {mode === "change" ? (
          <>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                passMut.mutate();
              }}
              className="space-y-4"
            >
              <Field
                id="oldPassword"
                type="password"
                label="Joriy parol"
                autoComplete="current-password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                required
              />
              <Field
                id="newPassword"
                type="password"
                label="Yangi parol"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={8}
                required
                hint="Kamida 8 belgi"
              />
              <FormError message={passMut.isError ? apiError(passMut.error) : null} />
              <div className="w-56">
                <SubmitButton
                  loading={passMut.isPending}
                  disabled={!oldPassword || newPassword.length < 8}
                >
                  Parolni yangilash
                </SubmitButton>
              </div>
            </form>

            {/* Parolni unutgan bo'lsa — email orqali tiklash */}
            <div className="mt-4 border-t border-border pt-4">
              <p className="text-sm text-muted-foreground">
                Joriy parolingizni eslay olmayapsizmi?
              </p>
              <button
                type="button"
                onClick={() => sendMut.mutate()}
                disabled={sendMut.isPending || !email}
                className="mt-1 text-sm font-medium text-primary hover:underline disabled:opacity-60"
              >
                {sendMut.isPending
                  ? "Kod yuborilmoqda..."
                  : "Parolni email orqali tiklash"}
              </button>
              <FormError message={sendMut.isError ? apiError(sendMut.error) : null} />
            </div>
          </>
        ) : resetStep === "otp" ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              verifyMut.mutate();
            }}
            className="space-y-4"
          >
            <p className="flex items-start gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2.5 text-sm text-muted-foreground">
              <MailCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>
                <span className="font-medium text-foreground">{email}</span>{" "}
                manziliga 6 xonali tiklash kodi yuborildi.
              </span>
            </p>
            <OtpInput value={code} onChange={setCode} disabled={verifyMut.isPending} />
            <FormError message={verifyMut.isError ? apiError(verifyMut.error) : null} />
            <div className="w-56">
              <SubmitButton loading={verifyMut.isPending} disabled={code.length !== 6}>
                Kodni tasdiqlash
              </SubmitButton>
            </div>
            <div className="flex items-center gap-4 text-sm">
              {cooldown > 0 ? (
                <span className="text-muted-foreground">
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
              <button
                type="button"
                onClick={cancelReset}
                className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Bekor qilish
              </button>
            </div>
          </form>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              resetMut.mutate();
            }}
            className="space-y-4"
          >
            <Field
              id="resetPass"
              type="password"
              label="Yangi parol"
              autoComplete="new-password"
              value={resetPass}
              onChange={(e) => setResetPass(e.target.value)}
              minLength={8}
              required
              hint="Kamida 8 belgi"
            />
            <FormError message={resetMut.isError ? apiError(resetMut.error) : null} />
            <div className="flex items-center gap-4">
              <div className="w-56">
                <SubmitButton
                  loading={resetMut.isPending}
                  disabled={resetPass.length < 8}
                >
                  Parolni saqlash
                </SubmitButton>
              </div>
              <button
                type="button"
                onClick={cancelReset}
                className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Bekor qilish
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
