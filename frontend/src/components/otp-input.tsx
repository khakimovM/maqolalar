"use client";

import { useRef } from "react";

/**
 * 6 xonali OTP kiritish maydoni.
 * Har bir raqam alohida katakda; paste va backspace qo'llab-quvvatlanadi.
 */
export function OtpInput({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = value.padEnd(6, " ").slice(0, 6).split("");

  function setAt(i: number, d: string) {
    const next = value.split("");
    next[i] = d;
    onChange(next.join("").replace(/\s/g, "").slice(0, 6));
  }

  return (
    <div className="flex justify-between gap-2" dir="ltr">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          inputMode="numeric"
          maxLength={1}
          disabled={disabled}
          value={d.trim()}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, "");
            if (!v) {
              setAt(i, "");
              return;
            }
            setAt(i, v[v.length - 1]);
            if (i < 5) refs.current[i + 1]?.focus();
          }}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && !digits[i].trim() && i > 0) {
              refs.current[i - 1]?.focus();
            }
          }}
          onPaste={(e) => {
            e.preventDefault();
            const text = e.clipboardData
              .getData("text")
              .replace(/\D/g, "")
              .slice(0, 6);
            if (text) {
              onChange(text);
              refs.current[Math.min(text.length, 5)]?.focus();
            }
          }}
          className="h-12 w-full rounded-lg border border-input bg-background text-center text-lg font-medium outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/25 disabled:opacity-60"
        />
      ))}
    </div>
  );
}
