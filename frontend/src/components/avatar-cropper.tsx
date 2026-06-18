"use client";

import { useEffect, useRef, useState } from "react";
import { ZoomIn, ZoomOut } from "lucide-react";

const VIEW = 288; // kesish oynasi (px)
const OUT = 512; // chiqish o'lchami (px), 1:1
const MAX_ZOOM = 4;

/**
 * Rasmni 1:1 holatda kesib oluvchi modal.
 * Foydalanuvchi rasmni suradi va kattalashtiradi; faqat ko'rinayotgan
 * doiraviy soha 512×512 JPEG sifatida saqlanadi.
 */
export function AvatarCropper({
  file,
  onCancel,
  onCropped,
  busy,
}: {
  file: File;
  onCancel: () => void;
  onCropped: (cropped: File) => void;
  busy?: boolean;
}) {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [nat, setNat] = useState<{ w: number; h: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(
    null,
  );

  // Faylni object URL ga aylantiramiz
  useEffect(() => {
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);

  const baseScale = nat ? Math.max(VIEW / nat.w, VIEW / nat.h) : 1;
  const display = baseScale * zoom;

  // offsetni rasm doim oynani to'liq qoplaydigan qilib cheklaymiz
  function clamp(o: { x: number; y: number }, disp = display) {
    if (!nat) return o;
    const rw = nat.w * disp;
    const rh = nat.h * disp;
    return {
      x: Math.min(0, Math.max(VIEW - rw, o.x)),
      y: Math.min(0, Math.max(VIEW - rh, o.y)),
    };
  }

  // Rasm yuklangach markazga joylaymiz
  function onImgLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const el = e.currentTarget;
    const w = el.naturalWidth;
    const h = el.naturalHeight;
    setNat({ w, h });
    const bs = Math.max(VIEW / w, VIEW / h);
    setOffset({ x: (VIEW - w * bs) / 2, y: (VIEW - h * bs) / 2 });
    setZoom(1);
  }

  // Zoom o'zgarganda markazni mahkam ushlaymiz
  function applyZoom(next: number) {
    const z = Math.min(MAX_ZOOM, Math.max(1, next));
    if (!nat) {
      setZoom(z);
      return;
    }
    const oldDisp = baseScale * zoom;
    const newDisp = baseScale * z;
    const cx = VIEW / 2;
    const cy = VIEW / 2;
    const sx = (cx - offset.x) / oldDisp;
    const sy = (cy - offset.y) / oldDisp;
    const next2 = clamp({ x: cx - sx * newDisp, y: cy - sy * newDisp }, newDisp);
    setZoom(z);
    setOffset(next2);
  }

  function onPointerDown(e: React.PointerEvent) {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!drag.current) return;
    const dx = e.clientX - drag.current.x;
    const dy = e.clientY - drag.current.y;
    setOffset(clamp({ x: drag.current.ox + dx, y: drag.current.oy + dy }));
  }
  function onPointerUp() {
    drag.current = null;
  }

  // Kesilgan rasmni chiqaramiz
  function confirm() {
    const img = imgRef.current;
    if (!img || !nat) return;
    const canvas = document.createElement("canvas");
    canvas.width = OUT;
    canvas.height = OUT;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const sSize = VIEW / display;
    const sx = Math.max(0, -offset.x / display);
    const sy = Math.max(0, -offset.y / display);
    ctx.drawImage(img, sx, sy, sSize, sSize, 0, 0, OUT, OUT);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const cropped = new File([blob], "avatar.jpg", { type: "image/jpeg" });
        onCropped(cropped);
      },
      "image/jpeg",
      0.9,
    );
  }

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-xl">
        <h3 className="mb-4 text-center font-medium">Rasmni moslang</h3>

        {/* Kesish oynasi */}
        <div className="flex justify-center">
          <div
            className="relative cursor-grab touch-none overflow-hidden rounded-full border border-border bg-muted active:cursor-grabbing"
            style={{ width: VIEW, height: VIEW }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onWheel={(e) => applyZoom(zoom - e.deltaY * 0.0015)}
          >
            {url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                ref={imgRef}
                src={url}
                alt=""
                draggable={false}
                onLoad={onImgLoad}
                className="max-w-none select-none"
                style={{
                  position: "absolute",
                  left: offset.x,
                  top: offset.y,
                  width: nat ? nat.w * display : "auto",
                  height: nat ? nat.h * display : "auto",
                }}
              />
            )}
            {/* doiraviy ramka ko'rsatkichi */}
            <div className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-inset ring-white/30" />
          </div>
        </div>

        {/* Zoom */}
        <div className="mt-5 flex items-center gap-3">
          <button
            type="button"
            onClick={() => applyZoom(zoom - 0.25)}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Kichraytirish"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <input
            type="range"
            min={1}
            max={MAX_ZOOM}
            step={0.01}
            value={zoom}
            onChange={(e) => applyZoom(Number(e.target.value))}
            className="h-1 flex-1 accent-primary"
          />
          <button
            type="button"
            onClick={() => applyZoom(zoom + 0.25)}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Kattalashtirish"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
        </div>

        {/* Amallar */}
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-60"
          >
            Bekor qilish
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={busy || !nat}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {busy && (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            )}
            Saqlash
          </button>
        </div>
      </div>
    </div>
  );
}
