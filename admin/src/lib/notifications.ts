import { api } from "./api";

export type NotificationType =
  | "NEW_COMMENT"
  | "NEW_REPLY"
  | "NEW_LIKE"
  | "COMMENT_SPAM";

export interface AppNotification {
  id: string;
  type: NotificationType;
  referenceId: string;
  isRead: boolean;
  createdAt: string;
  /** Backend boyitadi: tegishli maqola (bo'lmasligi mumkin). */
  article: { slug: string; title: string } | null;
}

export interface NotificationList {
  items: AppNotification[];
  unreadCount: number;
}

/** Bildirishnomalar + o'qilmaganlar soni. GET /notifications */
export async function fetchNotifications(): Promise<NotificationList> {
  const res = await api.get("/notifications");
  return res.data.data;
}

/** Bittasini o'qildi deb belgilash. PUT /notifications/:id/read */
export async function markNotificationRead(id: string): Promise<void> {
  await api.put(`/notifications/${id}/read`, {});
}

/** Barchasini o'qildi deb belgilash. PUT /notifications/read-all */
export async function markAllNotificationsRead(): Promise<void> {
  await api.put("/notifications/read-all", {});
}

/** Tur bo'yicha o'zbekcha matn. */
export function notificationText(type: NotificationType): string {
  switch (type) {
    case "NEW_COMMENT":
      return "Maqolangizga yangi izoh qoldirildi";
    case "NEW_REPLY":
      return "Izohingizga javob berildi";
    case "NEW_LIKE":
      return "Maqolangiz yoqtirildi";
    case "COMMENT_SPAM":
      return "Izoh spam sifatida belgilandi";
    default:
      return "Yangi bildirishnoma";
  }
}

/** Oddiy nisbiy vaqt (o'zbekcha). */
export function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return "hozir";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} daqiqa oldin`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} soat oldin`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} kun oldin`;
  const dt = new Date(iso);
  const dd = String(dt.getDate()).padStart(2, "0");
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  return `${dd}.${mm}.${dt.getFullYear()}`;
}
