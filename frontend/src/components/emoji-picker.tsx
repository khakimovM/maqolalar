"use client";

import { useEffect, useRef, useState } from "react";
import { Smile } from "lucide-react";

const EMOJIS = ["😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇", "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘", "😋", "😎", "🤩", "🥳", "😏", "🤔", "🤨", "😐", "😴", "😬", "🙄", "😮", "😯", "😢", "😭", "😤", "😠", "😡", "🤯", "😱", "🥺", "🤗", "🤭", "🤫", "👍", "👎", "👏", "🙌", "👌", "✌️", "🤞", "🤝", "🙏", "💪", "👋", "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "💔", "🔥", "⭐", "✨", "🎉", "🎊", "✅", "❌", "❗", "❓", "💯", "📌", "📝", "📚", "🔖", "💡", "⚡", "🌟"];

/** Oddiy emoji tanlagich — tugma + panel. Bosilganda onPick(emoji) chaqiriladi. */
export function EmojiPicker({ onPick }: { onPick: (emoji: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title="Emoji"
        aria-label="Emoji"
        className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <Smile className="h-5 w-5" />
      </button>
      {open && (
        <div className="absolute bottom-full left-0 z-30 mb-2 grid max-h-56 w-64 grid-cols-8 gap-0.5 overflow-y-auto rounded-xl border border-border bg-popover p-2 shadow-lg">
          {EMOJIS.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => {
                onPick(e);
                setOpen(false);
              }}
              className="flex h-7 w-7 items-center justify-center rounded text-lg transition-colors hover:bg-muted"
            >
              {e}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
