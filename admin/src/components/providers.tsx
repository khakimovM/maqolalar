"use client";

import { useEffect, useRef, useState } from "react";
import { ThemeProvider } from "next-themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ToastProvider } from "@/components/toast";
import { NotificationsListener } from "@/components/notifications-listener";
import { DialogProvider } from "@/components/confirm-dialog";
import { useAuth } from "@/lib/store/auth";
import { refreshSession, fetchMe } from "@/lib/auth";

/** Sahifa yuklanganda sessiyani refresh cookie orqali tiklaydi. */
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
        logout();
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
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );

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
