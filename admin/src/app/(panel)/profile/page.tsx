"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { ShieldCheck, BadgeCheck, Check } from "lucide-react";
import { AvatarUploader } from "@/components/avatar-uploader";
import { Field, FormError, SubmitButton } from "@/components/form";
import { updateProfile, changePassword } from "@/lib/profile";
import { apiError } from "@/lib/api";
import { useAuth } from "@/lib/store/auth";

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
    </div>
  );
}
