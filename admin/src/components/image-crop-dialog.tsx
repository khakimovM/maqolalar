"use client";

import { useEffect, useRef, useState } from "react";
import { X, Crop as CropIcon } from "lucide-react";

const MAX_W = 560;
const MAX_H = 440;
const MIN = 24;

type DragMode = "move" | "tl" | "tr" | "bl" | "br" | null;

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Rasmni erkin to'rtburchak bo'yicha qirqadi (canvas) va File qaytaradi.
 * Rasm crossOrigin="anonymous" bilan yuklanadi (backend /uploads CORS ochiq).
 */
export function ImageCropDialog({
  src,
  onCropped,
  onClose,
}: {
  src: string;
  onCropped: (file: File) => Promise<void> | void;
  onClose: () => void;
}) {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const areaRef = useRef<HTMLDivElement | null>(null);
  const [disp, setDisp] = useState<{ w: number; h: number } | null>(null);
  const [rect, setRect] = useState<Rect>({ x: 0, y: 0, w: 0, h: 0 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const drag = useRef<{
    mode: DragMode;
    startX: number;
    startY: number;
    r: Rect;
  } | null>(null);

  function onLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const el = e.currentTarget;
    const nW = el.naturalWidth;
    const nH = el.naturalHeight;
    const scale = Math.min(MAX_W / nW, MAX_H / nH, 1);
    const w = Math.round(nW * scale);
    const h = Math.round(nH * scale);
    setDisp({ w, h });
    // boshlang'ich: 80% markazda
    const cw = Math.round(w * 0.8);
    const ch = Math.round(h * 0.8);
    setRect({ x: Math.round((w - cw) / 2), y: Math.round((h - ch) / 2), w: cw, h: ch });
  }

  function clampRect(r: Rect): Rect {
    if (!disp) return r;
    let { x, y, w, h } = r;
    w = Math.max(MIN, w);
    h = Math.max(MIN, h);
    x = Math.max(0, Math.min(x, disp.w - w));
    y = Math.max(0, Math.min(y, disp.h - h));
    if (x + w > disp.w) w = disp.w - x;
    if (y + h > disp.h) h = disp.h - y;
    return { x, y, w, h };
  }

  function startDrag(mode: DragMode, e: React.PointerEvent) {
    e.preventDefault();
    e.stopPropagation();
    drag.current = { mode, startX: e.clientX, startY: e.clientY, r: { ...rect } };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  function onMove(e: PointerEvent) {
    const d = drag.current;
    if (!d || !disp) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    const r = d.r;
    let next: Rect;
    if (d.mode === "move") {
      next = { ...r, x: r.x + dx, y: r.y + dy };
    } else {
      let { x, y, w, h } = r;
      if (d.mode === "tl") {
        x = r.x + dx;
        y = r.y + dy;
        w = r.w - dx;
        h = r.h - dy;
      } else if (d.mode === "tr") {
        y = r.y + dy;
        w = r.w + dx;
        h = r.h - dy;
      } else if (d.mode === "bl") {
        x = r.x + dx;
        w = r.w - dx;
        h = r.h + dy;
      } else {
        w = r.w + dx;
        h = r.h + dy;
      }
      next = { x, y, w, h };
    }
    setRect(clampRect(next));
  }

  function onUp() {
    drag.current = null;
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
  }

  useEffect(() => {
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function confirm() {
    const img = imgRef.current;
    if (!img || !disp) return;
    setError(null);
    setBusy(true);
    try {
      const scale = img.naturalWidth / disp.w;
      const sx = Math.round(rect.x * scale);
      const sy = Math.round(rect.y * scale);
      const sw = Math.max(1, Math.round(rect.w * scale));
      const sh = Math.max(1, Math.round(rect.h * scale));
      const canvas = document.createElement("canvas");
      canvas.width = sw;
      canvas.height = sh;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("canvas");
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
      const blob: Blob | null = await new Promise((res) =>
        canvas.toBlob((b) => res(b), "image/jpeg", 0.92),
      );
      if (!blob) throw new Error("blob");
      const file = new File([blob], "crop.jpg", { type: "image/jpeg" });
      await onCropped(file);
    } catch {
      setError("Qirqib bo'lmadi. Rasm boshqa manbadan bo'lsa, CORS yoqilganini tekshiring.");
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h3 className="flex items-center gap-2 font-medium">
            <CropIcon className="h-4 w-4 text-primary" />
            Rasmni qirqish
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted"
            aria-label="Yopish"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-1 items-center justify-center overflow-auto bg-muted/20 p-5">
          <div
            ref={areaRef}
            className="relative select-none"
            style={{ width: disp?.w, height: disp?.h }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imgRef}
              src={src}
              alt=""
              crossOrigin="anonymous"
              onLoad={onLoad}
              draggable={false}
              className="block h-auto w-full"
              style={{ width: disp?.w, height: disp?.h }}
            />

            {disp && (
              <div
                onPointerDown={(e) => startDrag("move", e)}
                className="absolute cursor-move"
                style={{
                  left: rect.x,
                  top: rect.y,
                  width: rect.w,
                  height: rect.h,
                  boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)",
                  outline: "1px solid rgba(255,255,255,0.9)",
                }}
              >
                {(["tl", "tr", "bl", "br"] as DragMode[]).map((c) => (
                  <span
                    key={c}
                    onPointerDown={(e) => startDrag(c, e)}
                    className="absolute h-3.5 w-3.5 rounded-full border-2 border-white bg-primary"
                    style={{
                      left: c === "tl" || c === "bl" ? -7 : undefined,
                      right: c === "tr" || c === "br" ? -7 : undefined,
                      top: c === "tl" || c === "tr" ? -7 : undefined,
                      bottom: c === "bl" || c === "br" ? -7 : undefined,
                      cursor:
                        c === "tl" || c === "br" ? "nwse-resize" : "nesw-resize",
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {error && (
          <p className="border-t border-border px-5 py-2 text-xs text-destructive">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-3 border-t border-border px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-60"
          >
            Bekor qilish
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={busy || !disp}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {busy && (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            )}
            Qirqish
          </button>
        </div>
      </div>
    </div>
  );
}
