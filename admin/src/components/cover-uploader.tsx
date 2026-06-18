"use client";

import { useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { uploadCover } from "@/lib/admin";
import { apiError } from "@/lib/api";

const MAX = 5 * 1024 * 1024;
const OK = ["image/jpeg", "image/png", "image/webp"];

/** Maqola muqovasini yuklash + ko'rish + o'chirish. */
export function CoverUploader({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (url: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    if (!OK.includes(file.type)) {
      setError("Faqat JPG, PNG yoki WEBP.");
      return;
    }
    if (file.size > MAX) {
      setError("Hajmi 5MB dan oshmasin.");
      return;
    }
    setBusy(true);
    try {
      const url = await uploadCover(file);
      onChange(url);
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {value ? (
        <div className="group relative overflow-hidden rounded-xl border border-border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="Muqova" className="aspect-[16/9] w-full object-cover" />
          <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
              className="rounded-lg bg-white/90 px-3 py-1.5 text-sm font-medium text-black hover:bg-white"
            >
              Almashtirish
            </button>
            <button
              type="button"
              onClick={() => onChange(null)}
              className="rounded-lg bg-black/60 p-2 text-white hover:bg-black/80"
              aria-label="O'chirish"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="flex aspect-[16/9] w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/20 text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground disabled:opacity-60"
        >
          {busy ? (
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : (
            <>
              <ImagePlus className="h-7 w-7" />
              <span className="text-sm font-medium">Muqova rasm yuklash</span>
              <span className="text-xs">16:9 tavsiya etiladi · maks 5MB</span>
            </>
          )}
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={onPick}
      />
      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
    </div>
  );
}
