"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  FileText,
  FolderTree,
  Users,
  ExternalLink,
  LogOut,
  Flag,
  User,
  Inbox,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { NotificationBell } from "@/components/notification-bell";
import { useAuth } from "@/lib/store/auth";
import { logoutApi } from "@/lib/auth";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3001";

const NAV = [
  { href: "/", label: "Boshqaruv", short: "Asosiy", icon: LayoutDashboard, exact: true },
  { href: "/articles", label: "Maqolalar", short: "Maqola", icon: FileText },
  { href: "/reported", label: "Shikoyatlar", short: "Shikoyat", icon: Flag },
  { href: "/requests", label: "Arizalar", short: "Ariza", icon: Inbox, super: true },
  { href: "/categories", label: "Kategoriyalar", short: "Bo'lim", icon: FolderTree, super: true },
  { href: "/admins", label: "Adminlar", short: "Admin", icon: Users, super: true },
  { href: "/profile", label: "Profil", short: "Profil", icon: User },
];

export default function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuth((s) => s.user);
  const hydrated = useAuth((s) => s.hydrated);
  const logout = useAuth((s) => s.logout);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const isAdmin = user?.role === "ADMIN" || user?.role === "SUPERADMIN";
  const isSuper = user?.role === "SUPERADMIN";

  // Sessiya tiklash (bootstrap) tugagach gate qilamiz — access token xotirada,
  // yangilanishda cookie orqali tiklanadi.
  useEffect(() => {
    if (!mounted || !hydrated) return;
    if (!user || !isAdmin) {
      router.replace("/login");
    }
  }, [mounted, hydrated, user, isAdmin, router]);

  if (!mounted || !hydrated || !user || !isAdmin) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const links = NAV.filter((n) => !n.super || isSuper);
  const bottomLinks = links.filter((n) => n.href !== "/profile");
  const profileActive = pathname.startsWith("/profile");
  const isActive = (n: (typeof NAV)[number]) =>
    n.exact ? pathname === n.href : pathname.startsWith(n.href);

  return (
    <div className="flex min-h-dvh bg-background text-foreground">
      {/* Desktop yon panel */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-border bg-card/40 px-4 py-6 md:flex">
        <div className="mb-8 flex items-center justify-between px-2">
          <Link href="/" className="flex items-center gap-2 text-lg font-medium tracking-tight">
            <LayoutDashboard className="h-5 w-5 text-primary" />
            Admin
          </Link>
          <div className="flex items-center gap-1">
            <NotificationBell align="left" />
            <ThemeToggle />
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1">
          {links.map((n) => {
            const active = isActive(n);
            return (
              <Link
                key={n.href}
                href={n.href}
                className={
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors " +
                  (active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground")
                }
              >
                <n.icon className="h-4 w-4" />
                {n.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-4 space-y-1 border-t border-border pt-4">
          <p className="px-3 pb-1 text-xs text-muted-foreground">
            {user.username} · {isSuper ? "Super admin" : "Admin"}
          </p>
          <a
            href={SITE_URL}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ExternalLink className="h-4 w-4" />
            Saytni ochish
          </a>
          <button
            type="button"
            onClick={async () => {
              await logoutApi();
              logout();
              router.replace("/login");
            }}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
            Chiqish
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobil yuqori bar */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-card/80 px-4 py-3 backdrop-blur md:hidden">
          <Link href="/" className="flex items-center gap-2 text-base font-medium tracking-tight">
            <LayoutDashboard className="h-5 w-5 text-primary" />
            Admin
          </Link>
          <div className="flex items-center gap-1">
            <NotificationBell />
            <ThemeToggle />
            <Link
              href="/profile"
              aria-label="Profil"
              className={
                "flex h-9 w-9 items-center justify-center rounded-full transition-colors " +
                (profileActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground")
              }
            >
              <User className="h-5 w-5" />
            </Link>
          </div>
        </header>

        <main className="min-w-0 flex-1 px-5 py-8 pb-28 sm:px-8 md:pb-8">
          {children}
        </main>
      </div>

      {/* Mobil pastki navigatsiya — suzuvchi panel */}
      <nav className="fixed inset-x-0 bottom-0 z-40 md:hidden">
        <div className="mx-3 mb-3 flex items-stretch justify-around gap-1 rounded-2xl border border-border bg-card/90 p-1.5 shadow-lg shadow-black/10 backdrop-blur-xl">
          {bottomLinks.map((n) => {
            const active = isActive(n);
            return (
              <Link
                key={n.href}
                href={n.href}
                aria-label={n.label}
                className="relative flex flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2"
              >
                {active && (
                  <motion.span
                    layoutId="nav-active-pill"
                    className="absolute inset-0 rounded-xl bg-primary/12"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <n.icon
                  className={
                    "relative z-10 h-[22px] w-[22px] transition-colors " +
                    (active ? "text-primary" : "text-muted-foreground")
                  }
                />
                <span
                  className={
                    "relative z-10 text-[10px] leading-none transition-colors " +
                    (active ? "font-semibold text-primary" : "text-muted-foreground")
                  }
                >
                  {n.short}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
