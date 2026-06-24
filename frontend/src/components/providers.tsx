"use client";

import { useEffect, useRef, useState } from "react";
import { ThemeProvider } from "next-themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ToastProvider } from "@/components/toast";
import { NotificationsListener } from "@/components/notifications-listener";
import { DialogProvider } from "@/components/confirm-dialog";
import { useAuth } from "@/lib/store/auth";
import { refreshSession, fetchMe } from "@/lib/auth-api";

/**
 * Sahifa yuklanganda sessiyani tiklaydi: access token xotirada bo'lgani uchun
 * yangilanishda yo'qoladi — refresh cookie orqali yangisini olamiz.
 * Faqat avval kirgan (user persist qilingan) foydalanuvchi uchun ishlaydi.
 */
function AuthBootstrap() {
  const setAccessToken = useAuth((s) => s.setAccessToken);
  const setUser = useAuth((s) => s.setUser);
  const setHydrated = useAuth((s) => s.setHydrated);
  const logout = useAuth((s) => s.logout);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    if (!useAuth.getState().user) {
      setHydrated(true);
      return;
    }

    (async () => {
      try {
        const accessToken = await refreshSession();
        setAccessToken(accessToken);
        const me = await fetchMe();
        setUser(me);
      } catch {
        logout(); // cookie yaroqsiz — sessiyani tozalaymiz
      } finally {
        setHydrated(true);
      }
    })();
  }, [setAccessToken, setUser, setHydrated, logout]);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 daqiqa
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );

  // Akkaunt almashganda (logout yoki boshqa user) eski keshni tozalaymiz —
  // aks holda yangi user bir lahza oldingi userning bildirishnoma/ma'lumotlarini ko'radi.
  const userId = useAuth((s) => s.user?.id ?? null);
  const prevUserId = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    if (prevUserId.current !== undefined && prevUserId.current !== userId) {
      queryClient.clear();
    }
    prevUserId.current = userId;
  }, [userId, queryClient]);

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      disableTransitionOnChange={false}
    >
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <DialogProvider>
            <AuthBootstrap />
            <NotificationsListener />
            {children}
          </DialogProvider>
        </ToastProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
