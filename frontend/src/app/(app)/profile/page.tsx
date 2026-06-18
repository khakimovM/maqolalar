"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ShieldCheck, BadgeCheck, LogOut, CalendarDays } from "lucide-react";
import { AvatarUploader } from "@/components/avatar-uploader";
import { ProfileSettings } from "@/components/profile-settings";
import { SavedList } from "@/components/saved-list";
import { ReadingList } from "@/components/reading-list";
import { fetchMe } from "@/lib/auth-api";
import { useAuth } from "@/lib/store/auth";

type Tab = "saved" | "reading" | "settings";

const TABS: { id: Tab; label: string }[] = [
  { id: "saved", label: "Saqlangan" },
  { id: "reading", label: "O'qilayotgan" },
  { id: "settings", label: "Sozlamalar" },
];

function fmtDate(s?: string) {
  if (!s) return null;
  return new Date(s).toLocaleDateString("uz-UZ", {
    year: "numeric",
    month: "long",
  });
}

function RoleBadge({ role }: { role: string }) {
  if (role === "USER") return null;
  const label = role === "SUPERADMIN" ? "Super admin" : "Admin";
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-medium text-primary">
      <ShieldCheck className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const user = useAuth((s) => s.user);
  const token = useAuth((s) => s.accessToken);
  const setUser = useAuth((s) => s.setUser);
  const logout = useAuth((s) => s.logout);

  const [mounted, setMounted] = useState(false);
  const [tab, setTab] = useState<Tab>("saved");

  useEffect(() => setMounted(true), []);

  // persist hydratsiyadan keyin token bo'lmasa — loginga
  useEffect(() => {
    if (mounted && !token) {
      router.replace("/login?next=/profile");
    }
  }, [mounted, token, router]);

  // Profilni yangilab olamiz (avatar/role o'zgargan bo'lsa)
  const { data: me } = useQuery({
    queryKey: ["me"],
    queryFn: fetchMe,
    enabled: mounted && !!token,
  });
  useEffect(() => {
    if (me) setUser(me);
  }, [me, setUser]);

  if (!mounted || !token || !user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-10 sm:px-8">
      {/* Sarlavha karta */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col items-center gap-5 rounded-2xl border border-border bg-card p-6 text-center sm:flex-row sm:items-center sm:gap-7 sm:p-8 sm:text-left"
      >
        <AvatarUploader />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            <h1 className="font-serif text-2xl font-medium tracking-tight">
              {user.username}
            </h1>
            <RoleBadge role={user.role} />
            {user.isVerified && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                <BadgeCheck className="h-3.5 w-3.5" />
                Tasdiqlangan
              </span>
            )}
          </div>
          <p className="mt-1 truncate text-sm text-muted-foreground">{user.email}</p>
          {fmtDate(user.createdAt) && (
            <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <CalendarDays className="h-3.5 w-3.5" />
              {fmtDate(user.createdAt)} dan beri a&apos;zo
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={() => {
            logout();
            router.replace("/");
          }}
          className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
        >
          <LogOut className="h-4 w-4" />
          Chiqish
        </button>
      </motion.div>

      {/* Tablar */}
      <div className="mt-8 flex gap-1 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={
              "relative px-4 py-2.5 text-sm font-medium transition-colors " +
              (tab === t.id
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground")
            }
          >
            {t.label}
            {tab === t.id && (
              <motion.span
                layoutId="profile-tab"
                className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-primary"
              />
            )}
          </button>
        ))}
      </div>

      {/* Tab kontenti */}
      <div className="mt-6">
        {tab === "saved" && <SavedList />}
        {tab === "reading" && <ReadingList />}
        {tab === "settings" && <ProfileSettings />}
      </div>
    </main>
  );
}
