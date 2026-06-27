"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ArrowLeft, Save, Send } from "lucide-react";
import { RichEditor } from "@/components/rich-editor";
import { CoverUploader } from "@/components/cover-uploader";
import { CslUploader } from "@/components/csl-uploader";
import { FormError } from "@/components/form";
import { Select } from "@/components/select";
import {
  fetchCategories,
  createArticle,
  updateArticle,
  publishArticle,
  type ArticleInput,
} from "@/lib/admin";
import { apiError } from "@/lib/api";
import type { ArticleType, ArticleStatus } from "@/lib/types";

type Json = Record<string, unknown>;

interface Initial {
  id?: string;
  title?: string;
  content?: Json | null;
  categoryId?: string;
  type?: ArticleType;
  excerpt?: string | null;
  coverImage?: string | null;
  citationStyle?: string | null;
  status?: ArticleStatus;
}

/** Tiptap hujjatidagi matn uzunligini sanaydi (bo'sh-emaslikni tekshirish uchun). */
function textLength(node: unknown): number {
  if (!node || typeof node !== "object") return 0;
  const n = node as { text?: string; content?: unknown[] };
  let len = n.text ? n.text.trim().length : 0;
  if (Array.isArray(n.content)) {
    for (const c of n.content) len += textLength(c);
  }
  return len;
}

export function ArticleForm({ initial }: { initial?: Initial }) {
  const router = useRouter();
  const isEdit = Boolean(initial?.id);

  const [title, setTitle] = useState(initial?.title ?? "");
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? "");
  const [type, setType] = useState<ArticleType>(initial?.type ?? "FREE");
  const [excerpt, setExcerpt] = useState(initial?.excerpt ?? "");
  const [coverImage, setCoverImage] = useState<string | null>(
    initial?.coverImage ?? null,
  );
  const [citationStyle, setCitationStyle] = useState<string | null>(
    initial?.citationStyle ?? null,
  );
  const [content, setContent] = useState<Json | null>(initial?.content ?? null);
  const [err, setErr] = useState<string | null>(null);

  const categories = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
  });

  const bodyLen = useMemo(() => (content ? textLength(content) : 0), [content]);

  function buildDto(): ArticleInput | null {
    setErr(null);
    if (title.trim().length < 3) {
      setErr("Sarlavha kamida 3 belgi bo'lishi kerak.");
      return null;
    }
    if (!categoryId) {
      setErr("Kategoriyani tanlang.");
      return null;
    }
    if (bodyLen < 1 || !content) {
      setErr("Maqola matni bo'sh bo'lmasligi kerak.");
      return null;
    }
    const ex = excerpt.trim();
    if (ex && (ex.length < 10 || ex.length > 300)) {
      setErr("Qisqacha izoh 10-300 belgi orasida bo'lsin.");
      return null;
    }
    return {
      title: title.trim(),
      content,
      categoryId,
      type,
      ...(ex ? { excerpt: ex } : {}),
      ...(coverImage ? { coverImage } : {}),
      citationStyle: citationStyle ?? "",
    };
  }

  const saveMut = useMutation({
    mutationFn: async (publishAfter: boolean) => {
      const dto = buildDto();
      if (!dto) throw new Error("validation");
      if (isEdit && initial?.id) {
        await updateArticle(initial.id, dto);
        if (publishAfter) await publishArticle(initial.id);
        return { id: initial.id };
      }
      const created = await createArticle(dto);
      if (publishAfter) await publishArticle(created.id);
      return { id: created.id };
    },
    onSuccess: () => {
      router.push("/articles");
    },
    onError: (e) => {
      if ((e as Error).message !== "validation") setErr(apiError(e));
    },
  });

  const busy = saveMut.isPending;
  const alreadyPublished = initial?.status === "PUBLISHED";

  return (
    <div className="mx-auto max-w-3xl">
      <button
        type="button"
        onClick={() => router.push("/articles")}
        className="mb-5 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Maqolalar
      </button>

      <h1 className="mb-6 font-serif text-3xl font-medium tracking-tight">
        {isEdit ? "Maqolani tahrirlash" : "Yangi maqola"}
      </h1>

      <div className="space-y-6">
        {/* Sarlavha */}
        <div className="space-y-1.5">
          <label htmlFor="title" className="block text-sm font-medium">Sarlavha</label>
          <input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            placeholder="Maqola sarlavhasi"
            className="w-full rounded-lg border border-input bg-background px-3.5 py-2.5 font-serif text-lg outline-none focus:border-primary focus:ring-2 focus:ring-primary/25"
          />
        </div>

        {/* Kategoriya + tur */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="cat" className="block text-sm font-medium">Kategoriya</label>
            <Select
              id="cat"
              value={categoryId}
              onChange={setCategoryId}
              placeholder="— tanlang —"
              options={(categories.data ?? []).map((c) => ({
                value: c.id,
                label: c.name,
              }))}
            />
          </div>
          <div className="space-y-1.5">
            <span className="block text-sm font-medium">Tur</span>
            <div className="flex gap-2">
              {(["FREE", "PREMIUM"] as ArticleType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={
                    "flex-1 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors " +
                    (type === t
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-input text-muted-foreground hover:text-foreground")
                  }
                >
                  {t === "FREE" ? "Bepul" : "Premium"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Muqova */}
        <div className="space-y-1.5">
          <span className="block text-sm font-medium">Muqova</span>
          <CoverUploader value={coverImage} onChange={setCoverImage} />
        </div>

        {/* Zotero iqtibos uslubi (.csl) */}
        <div className="space-y-1.5">
          <span className="block text-sm font-medium">
            Zotero uslubi{" "}
            <span className="text-muted-foreground">(ixtiyoriy)</span>
          </span>
          <CslUploader value={citationStyle} onChange={setCitationStyle} />
          <p className="text-xs text-muted-foreground">
            O&apos;quvchilar maqola sahifasida bu uslubni to&apos;g&apos;ridan-to&apos;g&apos;ri
            Zotero&apos;ga o&apos;rnatadi.
          </p>
        </div>

        {/* Qisqacha izoh */}
        <div className="space-y-1.5">
          <label htmlFor="excerpt" className="block text-sm font-medium">
            Qisqacha izoh <span className="text-muted-foreground">(ixtiyoriy)</span>
          </label>
          <textarea
            id="excerpt"
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            rows={2}
            maxLength={300}
            placeholder="Ro'yxatda ko'rinadigan qisqa tavsif (10-300 belgi)"
            className="w-full resize-y rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/25"
          />
        </div>

        {/* Matn */}
        <div className="space-y-1.5">
          <span className="block text-sm font-medium">Matn</span>
          <RichEditor initialContent={initial?.content ?? null} onChange={setContent} />
        </div>

        <FormError message={err} />

        {/* Amallar */}
        <div className="flex flex-wrap items-center gap-3 border-t border-border pt-5">
          <button
            type="button"
            onClick={() => saveMut.mutate(false)}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {isEdit ? "Saqlash" : "Qoralama saqlash"}
          </button>

          {!alreadyPublished && (
            <button
              type="button"
              onClick={() => saveMut.mutate(true)}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {busy ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Saqlab, e&apos;lon qilish
            </button>
          )}

          {alreadyPublished && (
            <span className="text-sm text-muted-foreground">
              Bu maqola e&apos;lon qilingan — o&apos;zgarishlar darhol saqlanadi.
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
