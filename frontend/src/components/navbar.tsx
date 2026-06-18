"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { BookOpen } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";
import { FontSizeToggle } from "./font-size-toggle";
import { NotificationBell } from "./notification-bell";
import { useAuth } from "@/lib/store/auth";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

function resolve(src: string | null): string | null {
  if (!src) return null;
  return src.startsWith("http")
    ? src
    : `${API_BASE}${src.startsWith("/") ? "" : "/"}${src}`;
}

export function Navbar() {
  const user = useAuth((s) => s.user);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const avatar = user ? resolve(user.avatar) : null;
  const initials = (user?.username ?? "").slice(0, 2).toUpperCase();

  return (
    <motion.header
      initial={{ y: -16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-md"
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-8">
        <Link href="/" className="flex items-center gap-2 text-lg font-medium tracking-tight">
          <BookOpen className="h-5 w-5 text-primary" />
          Maqolalar
        </Link>
        <nav className="ml-4 hidden items-center gap-5 text-sm text-muted-foreground md:flex">
          <Link href="/articles" className="transition-colors hover:text-foreground">
            Maqolalar
          </Link>
        </nav>
        <div className="flex-1" />
        <FontSizeToggle />
        <ThemeToggle />

        {!mounted ? (
          <div className="h-9 w-9" />
        ) : user ? (
          <>
            <NotificationBell />
            <Link
              href="/profile"
              aria-label="Profil"
              title={user.username}
              className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-border bg-primary/10 text-xs font-medium text-primary transition-colors hover:border-primary/50"
            >
              {avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatar} alt={user.username} className="h-full w-full object-cover" />
              ) : (
                initials
              )}
            </Link>
          </>
        ) : (
          <Link
            href="/login"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Kirish
          </Link>
        )}
      </div>
    </motion.header>
  );
}
