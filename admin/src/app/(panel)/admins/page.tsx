"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Users,
  UserPlus,
  ShieldCheck,
  ShieldOff,
  FileText,
  X,
} from "lucide-react";
import {
  fetchAdmins,
  createAdmin,
  deactivateAdmin,
  activateAdmin,
  type AdminUser,
} from "@/lib/admin";
import { Field, FormError, SubmitButton } from "@/components/form";
import { apiError } from "@/lib/api";
import { useAuth } from "@/lib/store/auth";

function fmtDate(s?: string) {
  if (!s) return "";
  const d = new Date(s);
  if (isNaN(d.getTime())) return "";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}.${mm}.${d.getFullYear()}`;
}

export default function AdminsPage() {
  const me = useAuth((s) => s.user);
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["admins"],
    queryFn: fetchAdmins,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admins"] });

  const toggleMut = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      active ? activateAdmin(id) : deactivateAdmin(id),
    onSuccess: invalidate,
  });

  if (me?.role !== "SUPERADMIN") {
    return (
      <div className="mx-auto max-w-2xl py-20 text-center text-sm text-muted-foreground">
        Bu bo&apos;lim faqat super admin uchun.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Users className="h-6 w-6 text-primary" />
          <h1 className="font-serif text-3xl font-medium tracking-tight">Adminlar</h1>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          <UserPlus className="h-4 w-4" />
          Yangi admin
        </button>
      </header>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-muted/40" />
          ))}
        </div>
      ) : !data || data.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
          Hozircha admin yo&apos;q.
        </p>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
          {data.map((a: AdminUser) => (
            <li key={a.id} className="flex items-center gap-3 bg-card px-4 py-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                {a.username.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate font-medium">{a.username}</p>
                  {a.isActive ? (
                    <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                      Faol
                    </span>
                  ) : (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                      Bloklangan
                    </span>
                  )}
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {a.email} · <FileText className="inline h-3 w-3" /> {a._count?.articles ?? 0} maqola · {fmtDate(a.createdAt)}
                </p>
              </div>
              {a.isActive ? (
                <button
                  type="button"
                  onClick={() => toggleMut.mutate({ id: a.id, active: false })}
                  disabled={toggleMut.isPending}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50"
                  title="Bloklash"
                >
                  <ShieldOff className="h-4 w-4" />
                  Bloklash
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => toggleMut.mutate({ id: a.id, active: true })}
                  disabled={toggleMut.isPending}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-primary/40 px-3 py-1.5 text-sm text-primary transition-colors hover:bg-primary/10 disabled:opacity-50"
                  title="Faollashtirish"
                >
                  <ShieldCheck className="h-4 w-4" />
                  Faollashtirish
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {open && <CreateAdminModal onClose={() => setOpen(false)} onDone={invalidate} />}
    </div>
  );
}

function CreateAdminModal({
  onClose,
  onDone,
}: {
  onClose: () => void;
  onDone: () => void;
}) {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const mut = useMutation({
    mutationFn: () => createAdmin({ email, username, password }),
    onSuccess: () => {
      onDone();
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-medium">Yangi admin yaratish</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted"
            aria-label="Yopish"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            mut.mutate();
          }}
          className="space-y-4"
        >
          <Field
            id="username"
            label="Foydalanuvchi nomi"
            placeholder="masalan: admin_ali"
            required
            minLength={3}
            maxLength={30}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <Field
            id="email"
            type="email"
            label="Email"
            placeholder="admin@example.com"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Field
            id="password"
            type="password"
            label="Parol"
            placeholder="••••••••"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            hint="Kamida 8 belgi"
          />
          <FormError message={mut.isError ? apiError(mut.error) : null} />
          <SubmitButton loading={mut.isPending}>Yaratish</SubmitButton>
        </form>
      </div>
    </div>
  );
}
