"use client";

import { useEffect } from "react";
import { usePrefs } from "@/lib/store/prefs";

export function FontSizeToggle() {
  const { fontScale, inc, dec } = usePrefs();

  // O'qish sahifasi ishlatadigan CSS o'zgaruvchini yangilaymiz
  useEffect(() => {
    document.documentElement.style.setProperty(
      "--reading-scale",
      String(fontScale),
    );
  }, [fontScale]);

  return (
    <div className="flex items-center overflow-hidden rounded-md border border-border text-foreground">
      <button
        type="button"
        aria-label="Shriftni kichraytirish"
        onClick={dec}
        className="px-2.5 py-1.5 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
      >
        A−
      </button>
      <span className="border-x border-border px-2 text-xs text-muted-foreground tabular-nums">
        {Math.round(fontScale * 100)}%
      </span>
      <button
        type="button"
        aria-label="Shriftni kattalashtirish"
        onClick={inc}
        className="px-2.5 py-1.5 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
      >
        A+
      </button>
    </div>
  );
}
