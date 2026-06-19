"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { io } from "socket.io-client";
import { Heart, CornerDownRight, AlertTriangle, MessageCircle } from "lucide-react";
import {
  notificationText,
  type NotificationType,
} from "@/lib/notifications";
import { useAuth } from "@/lib/store/auth";
import { useToast } from "@/components/toast";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

function TypeIcon({ type }: { type: NotificationType }) {
  const cls = "h-4 w-4";
  if (type === "NEW_LIKE") return <Heart className={cls + " text-rose-500"} />;
  if (type === "NEW_REPLY")
    return <CornerDownRight className={cls + " text-primary"} />;
  if (type === "COMMENT_SPAM")
    return <AlertTriangle className={cls + " text-amber-500"} />;
  return <MessageCircle className={cls + " text-primary"} />;
}

/**
 * Bitta WebSocket ulanish — butun ilova uchun.
 * Yangi bildirishnoma kelganda: ro'yxatni yangilaydi + toast chiqaradi.
 * (Bell komponentlari faqat ko'rsatadi — ular socket ochmaydi.)
 */
export function NotificationsListener() {
  const token = useAuth((s) => s.accessToken);
  const qc = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    if (!token) return;
    const socket = io(API_BASE, { auth: { token } });
    socket.on("notification", (n: { type?: NotificationType }) => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      if (n?.type) {
        toast({
          title: notificationText(n.type),
          icon: <TypeIcon type={n.type} />,
        });
      }
    });
    return () => {
      socket.disconnect();
    };
  }, [token, qc, toast]);

  return null;
}
