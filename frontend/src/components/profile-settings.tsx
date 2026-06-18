"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { Field, FormError, SubmitButton } from "@/components/auth-shell";
import { updateProfile, changePassword } from "@/lib/profile";
import { apiError } from "@/lib/api";
import { useAuth } from "@/lib/store/auth";

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
      // Backend barcha refresh tokenlarni bekor qiladi — qaytadan kirish kerak
      logout();
      router.replace("/login");
    },
  });

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

      {/* Parol */}
      <section className="rounded-xl border border-border bg-card p-5 sm:p-6">
        <h3 className="mb-1 font-medium">Parolni o&apos;zgartirish</h3>
        <p className="mb-4 text-sm text-muted-foreground">
          Parol yangilangach barcha qurilmalarda qaytadan kirish kerak bo&apos;ladi.
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
