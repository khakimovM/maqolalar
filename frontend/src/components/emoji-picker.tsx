"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Smile } from "lucide-react";

const EMOJIS = ["😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇", "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘", "😋", "😎", "🤩", "🥳", "😏", "🤔", "🤨", "😐", "😴", "😬", "🙄", "😮", "😯", "😢", "😭", "😤", "😠", "😡", "🤯", "😱", "🥺", "🤗", "🤭", "🤫", "👍", "👎", "👏", "🙌", "👌", "✌️", "🤞", "🤝", "🙏", "💪", "👋", "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "💔", "🔥", "⭐", "✨", "🎉", "🎊", "✅", "❌", "❗", "❓", "💯", "📌", "📝", "📚", "🔖", "💡", "⚡", "🌟"];

const PANEL_W = 256; // w-64
const PANEL_H = 208; // max-h-52

/** Oddiy emoji tanlagich — tugma + panel. Panel portal orqali fixed chiqadi (konteyner kesmaydi). */
export function EmojiPicker({ onPick }: { onPick: (emoji: string) => void }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number }>({
    top: 0,
    left: 0,
  });
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  // Tugma joyiga qarab panel pozitsiyasini hisoblash (yuqori/past, ekran ichida).
  useLayoutEffect(() => {
    if (!open || !btnRef.current) return;
    function place() {
      const r = btnRef.current!.getBoundingClientRect();
      const gap = 8;
      const spaceBelow = window.innerHeight - r.bottom;
      const top =
        spaceBelow >= PANEL_H + gap
          ? r.bottom + gap
          : Math.max(gap, r.top - PANEL_H - gap);
      let left = r.left;
      if (left + PANEL_W > window.innerWidth - gap)
        left = window.innerWidth - PANEL_W - gap;
      if (left < gap) left = gap;
      setPos({ top, left });
    }
    place();
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [open]);

  // Tashqariga bosilganda yopish (tugma ham, panel ham hisobga olinadi).
  useEffect(() => {
    function onDown(e: MouseEvent) {
      const t = e.target as Node;
      if (btnRef.current?.contains(t) || panelRef.current?.contains(t)) return;
      setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        title="Emoji"
        aria-label="Emoji"
        className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <Smile className="h-5 w-5" />
      </button>
      {open &&
        mounted &&
        createPortal(
          <div
            ref={panelRef}
            style={{ top: pos.top, left: pos.left, width: PANEL_W }}
            className="fixed z-[120] grid max-h-52 grid-cols-8 gap-0.5 overflow-y-auto rounded-xl border border-border bg-popover p-2 shadow-lg"
          >
            {EMOJIS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => onPick(e)}
                className="flex h-7 w-7 items-center justify-center rounded text-lg transition-colors hover:bg-muted"
              >
                {e}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </>
  );
}
