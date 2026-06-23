"use client";

// Root layout darajasidagi render xatolarini ushlaydi va Sentry'ga yuboradi.
// Bu fayl ishga tushganda root layout o'rnini bosadi — shuning uchun o'z <html>/<body>'si bor
// va Tailwind'ga tayanmasdan inline uslub ishlatadi.
import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="uz">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0b0f0d",
          color: "#e7efe9",
          fontFamily: "system-ui, -apple-system, sans-serif",
          padding: "24px",
        }}
      >
        <div style={{ maxWidth: 420, textAlign: "center" }}>
          <h1 style={{ fontSize: 22, fontWeight: 600, margin: "0 0 12px" }}>
            Nimadir xato ketdi
          </h1>
          <p style={{ fontSize: 14, lineHeight: 1.6, color: "#9bb3a6", margin: "0 0 24px" }}>
            Kutilmagan xatolik yuz berdi. Sahifani qayta yuklab ko'ring — muammo
            takrorlansa, biroz vaqtdan so'ng yana urinib ko'ring.
          </p>
          <button
            onClick={() => reset()}
            style={{
              padding: "10px 20px",
              fontSize: 14,
              fontWeight: 500,
              color: "#0b0f0d",
              background: "#5dcaa5",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
            }}
          >
            Qayta urinish
          </button>
        </div>
      </body>
    </html>
  );
}
