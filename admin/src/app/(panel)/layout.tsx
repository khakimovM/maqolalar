"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  FolderTree,
  Users,
  ExternalLink,
  LogOut,
  Flag,
  User,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { NotificationBell } from "@/components/notification-bell";
import { useAuth } from "@/lib/store/auth";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3001";

const NAV = [
  { href: "/", label: "Boshqaruv", icon: LayoutDashboard, exact: true },
  { href: "/articles", label: "Maqolalar", icon: FileText },
  { href: "/reported", label: "Shikoyatlar", icon: Flag },
  { href: "/categories", label: "Kategoriyalar", icon: FolderTree, super: true },
  { href: "/admins", label: "Adminlar", icon: Users, super: true },
  { href: "/profile", label: "Profil", icon: User },
];

export default function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuth((s) => s.user);
  const token = useAuth((s) => s.accessToken);
  const logout = useAuth((s) => s.logout);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const isAdmin = user?.role === "ADMIN" || user?.role === "SUPERADMIN";
  const isSuper = user?.role === "SUPERADMIN";

  useEffect(() => {
    if (!mounted) return;
    if (!token || (user && !isAdmin)) {
      router.replace("/login");
    }
  }, [mounted, token, user, isAdmin, router]);

  if (!mounted || !token || !user || !isAdmin) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const links = NAV.filter((n) => !n.super || isSuper);

  return (
    <div className="flex min-h-dvh bg-background text-foreground">
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
            const active = n.exact ? pathname === n.href : pathname.startsWith(n.href);
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
            onClick={() => {
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
        <div className="flex items-center gap-1 overflow-x-auto border-b border-border bg-card/40 px-3 py-2 md:hidden">
          {links.map((n) => {
            const active = n.exact ? pathname === n.href : pathname.startsWith(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                className={
                  "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors " +
                  (active ? "bg-primary/10 text-primary" : "text-muted-foreground")
                }
              >
                <n.icon className="h-4 w-4" />
                {n.label}
              </Link>
            );
          })}
          <div className="ml-auto flex shrink-0 items-center gap-1">
            <NotificationBell />
            <ThemeToggle />
          </div>
        </div>

        <main className="min-w-0 flex-1 px-5 py-8 sm:px-8">{children}</main>
      </div>
    </div>
  );
}
