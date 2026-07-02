"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { BookMarked, X } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

/**
 * "Zotero" tugmasi + o'rnatish modali.
 *
 * MUHIM: veb-sahifa JS orqali Zotero/Connector bor-yo'qligini ANIQLAY OLMAYDI —
 * Zotero xavfsizlik uchun saytlarni o'zining lokal serveri bilan gaplashishdan
 * bloklaydi. Shuning uchun modal faqat ogohlantiradi. "O'rnatish" bosilganda
 * .csl URL'ga o'tiladi: Connector o'rnatilgan bo'lsa — uslubni o'rnatadi
 * (fayl ochiladigan tabda yo'q), aks holda brauzer faylni yuklab oladi.
 */
export function ZoteroButton({ slug }: { slug: string }) {
  const [open, setOpen] = useState(false);
  const cslUrl = `${API_BASE}/articles/${encodeURIComponent(slug)}/citation-style`;

  function install() {
    // Bir xil tabda navigatsiya: Connector ushlab o'rnatadi; agar yo'q bo'lsa,
    // fayl yuklab olinadi (sahifa yo'qolmaydi, chunki bu — download).
    const a = document.createElement("a");
    a.href = cslUrl;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Zotero iqtibos uslubini o'rnatish"
        className="inline-flex h-10 items-center gap-1.5 rounded-xl px-3 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <BookMarked className="h-5 w-5" />
        <span className="hidden sm:inline">Zotero</span>
      </button>

      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
            onClick={() => setOpen(false)}
          >
            <div
              className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-medium">Zotero uslubini o&apos;rnatish</h3>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Yopish"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <p className="mb-4 text-sm text-muted-foreground">
                Bu iqtibos uslubini o&apos;rnatish uchun <b>Zotero Connector</b>{" "}
                brauzer kengaytmasi o&apos;rnatilgan va <b>Zotero</b> dasturi
                ochiq bo&apos;lishi kerak. Aks holda fayl shunchaki yuklab
                olinadi.
              </p>

              <button
                type="button"
                onClick={install}
                className="mb-2 w-full rounded-lg bg-primary py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
              >
                Zotero&apos;ga o&apos;rnatish
              </button>
              <a
                href="https://www.zotero.org/download/"
                target="_blank"
                rel="noopener noreferrer"
                className="block text-center text-sm font-medium text-primary hover:underline"
              >
                Zotero va Connector&apos;ni yuklab olish →
              </a>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
