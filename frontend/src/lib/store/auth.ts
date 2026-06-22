import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "@/lib/types";

interface AuthState {
  user: User | null;
  /** Access token — FAQAT xotirada saqlanadi (localStorage'da emas, XSS himoyasi). */
  accessToken: string | null;
  /** Sessiya tiklash (bootstrap) tugaganini bildiradi. */
  hydrated: boolean;
  /** Login/verify/OAuth muvaffaqiyatidan keyin chaqiriladi. */
  setAuth: (data: { user: User; accessToken: string }) => void;
  /** Faqat access tokenni yangilash (refresh oqimi). */
  setAccessToken: (accessToken: string) => void;
  setUser: (user: User) => void;
  setHydrated: (v: boolean) => void;
  logout: () => void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      hydrated: false,
      setAuth: ({ user, accessToken }) => set({ user, accessToken }),
      setAccessToken: (accessToken) => set({ accessToken }),
      setUser: (user) => set({ user }),
      setHydrated: (hydrated) => set({ hydrated }),
      logout: () => set({ user: null, accessToken: null }),
    }),
    {
      name: "maqolalar-auth",
      // FAQAT user saqlanadi — access token xotirada, refresh token httpOnly cookie'da
      partialize: (s) => ({ user: s.user }),
    },
  ),
);
