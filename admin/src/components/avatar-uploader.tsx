"use client";

import { useRef, useState } from "react";
import { Camera } from "lucide-react";
import { uploadAvatar, updateProfile } from "@/lib/profile";
import { apiError } from "@/lib/api";
import { useAuth } from "@/lib/store/auth";
import { AvatarCropper } from "@/components/avatar-cropper";

const MAX = 5 * 1024 * 1024; // 5MB
const OK_TYPES = ["image/jpeg", "image/png", "image/webp"];
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

/** Avatar manzilini to'liq URL ga keltiradi (backend /uploads/... qaytaradi). */
function resolve(src: string | null): string | null {
  if (!src) return null;
  if (src.startsWith("http")) return src;
  return `${API_BASE}${src.startsWith("/") ? "" : "/"}${src}`;
}

/**
 * Avatar ko'rsatish + o'zgartirish.
 * Oqim: fayl tanlash → 1:1 kesish → POST /upload/avatar → PUT /users/me {avatar}.
 */
export function AvatarUploader() {
  const user = useAuth((s) => s.user);
  const setUser = useAuth((s) => s.setUser);
  const inputRef = useRef<HTMLInputElement>(null);
  const [picked, setPicked] = useState<File | null>(null); // kesish kutilayotgan rasm
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const src = resolve(user?.avatar ?? null);
  const initials = (user?.username ?? "??").slice(0, 2).toUpperCase();

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // bir xil faylni qayta tanlash mumkin bo'lsin
    if (!file) return;

    setError(null);
    if (!OK_TYPES.includes(file.type)) {
      setError("Faqat JPG, PNG yoki WEBP rasm yuklash mumkin.");
      return;
    }
    if (file.size > MAX) {
      setError("Rasm hajmi 5MB dan oshmasligi kerak.");
      return;
    }
    setPicked(file); // kesish modalini ochamiz
  }

  // Cropper kesilgan rasmni qaytargach — yuklaymiz
  async function onCropped(cropped: File) {
    setBusy(true);
    setError(null);
    try {
      const url = await uploadAvatar(cropped);
      const updated = await updateProfile({ avatar: url });
      setUser(updated);
      setPicked(null);
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="group relative h-24 w-24 overflow-hidden rounded-full border border-border bg-primary/10 outline-none ring-offset-2 ring-offset-background focus-visible:ring-2 focus-visible:ring-primary"
        aria-label="Avatarni o'zgartirish"
      >
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="Avatar" className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-2xl font-medium text-primary">
            {initials}
          </span>
        )}
        <span className="absolute inset-0 flex items-center justify-center bg-black/45 text-white opacity-0 transition-opacity group-hover:opacity-100">
          {busy ? (
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <Camera className="h-5 w-5" />
          )}
        </span>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={onPick}
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-60"
      >
        {busy ? "Yuklanmoqda…" : "Rasmni o'zgartirish"}
      </button>

      {error && <p className="max-w-[16rem] text-center text-xs text-destructive">{error}</p>}

      {picked && (
        <AvatarCropper
          file={picked}
          busy={busy}
          onCancel={() => {
            if (!busy) setPicked(null);
          }}
          onCropped={onCropped}
        />
      )}
    </div>
  );
}
