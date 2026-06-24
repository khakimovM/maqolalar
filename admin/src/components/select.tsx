"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export interface SelectOption {
  value: string;
  label: string;
}

/**
 * Boyitilgan, klaviatura bilan ishlaydigan dropdown (native <select> o'rniga).
 * - tashqariga bosilsa yopiladi
 * - ↑/↓ navigatsiya, Enter tanlash, Esc yopish
 * - tanlangan variant belgisi (✓) va animatsiyali ochilish
 */
export function Select({
  id,
  value,
  onChange,
  options,
  placeholder = "— tanlang —",
  className,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const ref = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value) ?? null;

  // Tashqariga bosilsa yopish
  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  // Ochilganda tanlangan variantni faollashtirish
  useEffect(() => {
    if (!open) return;
    const idx = options.findIndex((o) => o.value === value);
    setActive(idx >= 0 ? idx : 0);
  }, [open, value, options]);

  function choose(v: string) {
    onChange(v);
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    if (e.key === "Escape") {
      setOpen(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, options.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const o = options[active];
      if (o) choose(o.value);
    }
  }

  return (
    <div ref={ref} className={"relative " + (className ?? "")}>
      <button
        type="button"
        id={id}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={onKeyDown}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm outline-none transition-colors hover:border-primary/60 focus:border-primary focus:ring-2 focus:ring-primary/25"
      >
        <span className={selected ? "text-foreground" : "text-muted-foreground"}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          className={
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 " +
            (open ? "rotate-180" : "")
          }
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul
            role="listbox"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.14, ease: "easeOut" }}
            className="absolute z-50 mt-2 max-h-64 w-full overflow-auto rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-xl shadow-black/25"
          >
            {options.length === 0 && (
              <li className="px-3 py-2 text-sm text-muted-foreground">
                Variant yo&apos;q
              </li>
            )}
            {options.map((o, i) => {
              const isSel = o.value === value;
              const isActive = i === active;
              return (
                <li
                  key={o.value}
                  role="option"
                  aria-selected={isSel}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => choose(o.value)}
                  className={
                    "flex cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm transition-colors " +
                    (isSel
                      ? "bg-primary/10 font-medium text-primary"
                      : isActive
                        ? "bg-accent text-accent-foreground"
                        : "text-foreground")
                  }
                >
                  <span className="truncate">{o.label}</span>
                  {isSel && <Check className="h-4 w-4 shrink-0" />}
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
