"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import {
  ShieldCheck,
  BadgeCheck,
  Check,
  Mail,
  MailCheck,
  Pencil,
  ArrowLeft,
  ExternalLink,
  LogOut,
} from "lucide-react";
import { AvatarUploader } from "@/components/avatar-uploader";
import { Field, FormError, SubmitButton } from "@/components/form";
import { OtpInput } from "@/components/otp-input";
import {
  updateProfile,
  changePassword,
  requestEmailChange,
  confirmEmailChange,
} from "@/lib/profile";
import { apiError } from "@/lib/api";
import { useAuth } from "@/lib/store/auth";

const RESEND_SECONDS = 60;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3001";

function RoleBadge({ role }: { role: string }) {
  const label = role === "SUPERADMIN" ? "Super admin" : "Admin";
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-medium text-primary">
      <ShieldCheck className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}

export default function AdminProfilePage() {
  const router = useRouter();
  const user = useAuth((s) => s.user);
  const setUser = useAuth((s) => s.setUser);
  const logout = useAuth((s) => s.logout);

  const [username, setUsername] = useState(user?.username ?? "");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  // Email o'zgartirish
  const [emailMode, setEmailMode] = useState<"view" | "input" | "otp">("view");
  const [newEmail, setNewEmail] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [emailCooldown, setEmailCooldown] = useState(0);
  const [emailSaved, setEmailSaved] = useState(false);

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
      logout();
      router.replace("/login");
    },
  });

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

  if (!user) return null;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 font-serif text-3xl font-medium tracking-tight">Profil</h1>

      {/* Sarlavha karta */}
      <div className="mb-8 flex flex-col items-center gap-5 rounded-2xl border border-border bg-card p-6 text-center sm:flex-row sm:text-left">
        <AvatarUploader />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            <h2 className="font-serif text-2xl font-medium">{user.username}</h2>
            <RoleBadge role={user.role} />
            {user.isVerified && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                <BadgeCheck className="h-3.5 w-3.5" />
                Tasdiqlangan
              </span>
            )}
          </div>
          <p className="mt-1 truncate text-sm text-muted-foreground">{user.email}</p>
        </div>
      </div>

      {/* Username */}
      <section className="mb-6 rounded-xl border border-border bg-card p-5 sm:p-6">
        <h3 className="mb-1 font-medium">Foydalanuvchi nomi</h3>
        <p className="mb-4 text-sm text-muted-foreground">
          Maqolalaringizda muallif sifatida ko&apos;rinadi.
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
          <FormError message={nameMut.isError ? apiError(nameMut.error) : null} />
          <div className="flex items-center gap-3">
            <div className="w-40">
              <SubmitButton loading={nameMut.isPending} disabled={!nameChanged}>
                Saqlash
              </SubmitButton>
            </div>
            {nameMut.isSuccess && !nameChanged && (
              <span className="flex items-center gap-1 text-xs text-primary">
                <Check className="h-3.5 w-3.5" /> Saqlandi
              </span>
            )}
          </div>
        </form>
      </section>

      {/* Email */}
      <section className="mb-6 rounded-xl border border-border bg-card p-5 sm:p-6">
        <h3 className="mb-1 font-medium">Email manzil</h3>
        <p className="mb-4 text-sm text-muted-foreground">
          Email o&apos;zgartirilganda yangi manzilga tasdiqlash kodi yuboriladi.
        </p>

        {emailMode === "view" ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{user.email}</span>
              {emailSaved && (
                <span className="flex items-center gap-1 text-xs text-primary">
                  <Check className="h-3.5 w-3.5" /> Saqlandi
                </span>
              )}
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
                  disabled={!newEmail.trim() || newEmail.trim() === user.email}
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
          Parol yangilangach qaytadan kirish kerak bo&apos;ladi.
        </p>
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
      </section>

      {/* Mobil uchun hisob amallari (desktop'da yon panelda mavjud) */}
      <section className="mt-6 space-y-1 rounded-xl border border-border bg-card p-3 md:hidden">
        <a
          href={SITE_URL}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ExternalLink className="h-4 w-4" />
          Saytni ochish
        </a>
        <button
          type="button"
          onClick={() => {
            logout();
            router.replace("/login");
          }}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-destructive transition-colors hover:bg-destructive/10"
        >
          <LogOut className="h-4 w-4" />
          Chiqish
        </button>
      </section>
    </div>
  );
}
