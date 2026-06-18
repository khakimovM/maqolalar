import { create } from "zustand";
import { persist } from "zustand/middleware";

interface PrefsState {
  fontScale: number;
  inc: () => void;
  dec: () => void;
}

/** O'qish shrifti kattaligi (A− / A+). 85%–135% oralig'ida. */
export const usePrefs = create<PrefsState>()(
  persist(
    (set, get) => ({
      fontScale: 1,
      inc: () =>
        set({ fontScale: Math.min(1.35, +(get().fontScale + 0.1).toFixed(2)) }),
      dec: () =>
        set({ fontScale: Math.max(0.85, +(get().fontScale - 0.1).toFixed(2)) }),
    }),
    { name: "maqolalar-prefs" },
  ),
);
