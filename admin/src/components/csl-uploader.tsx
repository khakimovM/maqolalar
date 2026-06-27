"use client";

import { useRef, useState } from "react";
import { FileText, X } from "lucide-react";
import { uploadCitationStyle } from "@/lib/admin";
import { apiError } from "@/lib/api";

const MAX = 1024 * 1024;

/** Zotero iqtibos uslubi (.csl) yuklash + o'chirish. */
export function CslUploader({
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
    if (!file.name.toLowerCase().endsWith(".csl")) {
      setError("Faqat .csl fayl.");
      return;
    }
    if (file.size > MAX) {
      setError("Hajmi 1MB dan oshmasin.");
      return;
    }
    setBusy(true);
    try {
      const url = await uploadCitationStyle(file);
      onChange(url);
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  }

  const filename = value ? value.split("/").pop() : null;

  return (
    <div>
      {value ? (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/20 px-3.5 py-2.5">
          <span className="flex min-w-0 items-center gap-2 text-sm">
            <FileText className="h-4 w-4 shrink-0 text-primary" />
            <span className="truncate">{filename}</span>
          </span>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
              className="text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              Almashtirish
            </button>
            <button
              type="button"
              onClick={() => onChange(null)}
              className="rounded-md p-1 text-muted-foreground hover:text-destructive"
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
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/20 px-3.5 py-2.5 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground disabled:opacity-60"
        >
          {busy ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : (
            <>
              <FileText className="h-4 w-4" />
              Zotero uslubi (.csl) yuklash
            </>
          )}
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept=".csl,application/vnd.citationstyles.style+xml,application/xml,text/xml"
        className="hidden"
        onChange={onPick}
      />
      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
    </div>
  );
}
