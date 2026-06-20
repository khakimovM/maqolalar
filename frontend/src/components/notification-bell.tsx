"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  MessageCircle,
  Heart,
  CornerDownRight,
  AlertTriangle,
  CheckCheck,
} from "lucide-react";
import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  notificationText,
  relativeTime,
  type AppNotification,
  type NotificationType,
} from "@/lib/notifications";
import { useAuth } from "@/lib/store/auth";

function TypeIcon({ type }: { type: NotificationType }) {
  const cls = "h-4 w-4";
  if (type === "NEW_LIKE") return <Heart className={cls + " text-rose-500"} />;
  if (type === "NEW_REPLY")
    return <CornerDownRight className={cls + " text-primary"} />;
  if (type === "COMMENT_SPAM")
    return <AlertTriangle className={cls + " text-amber-500"} />;
  return <MessageCircle className={cls + " text-primary"} />;
}

export function NotificationBell({ align = "right" }: { align?: "left" | "right" } = {}) {
  const token = useAuth((s) => s.accessToken);
  const qc = useQueryClient();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { data } = useQuery({
    queryKey: ["notifications"],
    queryFn: fetchNotifications,
    enabled: !!token,
    refetchOnWindowFocus: true,
  });

  // Tashqariga bosilganda yopiladi
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const readMut = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
  const allMut = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const unread = data?.unreadCount ?? 0;
  const items = data?.items ?? [];

  function onItem(n: AppNotification) {
    if (!n.isRead) readMut.mutate(n.id);
    if (n.article) {
      // Izoh turlari uchun referenceId = comment id → uni belgilash uchun URL'ga qo'shamiz
      const suffix = n.type === "NEW_LIKE" ? "" : `?comment=${n.referenceId}`;
      router.push(`/articles/${n.article.slug}${suffix}`);
      setOpen(false);
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Bildirishnomalar"
        className="relative flex h-9 w-9 items-center justify-center rounded-md border border-border text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-foreground">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          className={
            "fixed inset-x-2 top-16 z-50 overflow-hidden rounded-xl border border-border bg-popover shadow-lg " +
            "md:absolute md:inset-x-auto md:top-full md:mt-2 md:w-80 " +
            (align === "left" ? "md:left-0" : "md:right-0")
          }
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
            <span className="text-sm font-medium">Bildirishnomalar</span>
            {unread > 0 && (
              <button
                type="button"
                onClick={() => allMut.mutate()}
                disabled={allMut.isPending}
                className="flex items-center gap-1 text-xs font-medium text-primary hover:underline disabled:opacity-60"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Barchasini o&apos;qildim
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-12 text-center">
                <Bell className="h-7 w-7 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Hozircha bildirishnoma yo&apos;q.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {items.map((n) => (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => onItem(n)}
                      className={
                        "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/60 " +
                        (n.isRead ? "" : "bg-primary/5")
                      }
                    >
                      <span className="mt-0.5 shrink-0">
                        <TypeIcon type={n.type} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm leading-snug">
                          {notificationText(n.type)}
                        </span>
                        {n.article && (
                          <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                            {n.article.title}
                          </span>
                        )}
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          {relativeTime(n.createdAt)}
                        </span>
                      </span>
                      {!n.isRead && (
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
