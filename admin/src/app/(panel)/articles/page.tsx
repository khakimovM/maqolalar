"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Send,
  Archive,
  Eye,
  Heart,
  MessageCircle,
} from "lucide-react";
import {
  fetchMyArticles,
  publishArticle,
  archiveArticle,
  deleteArticle,
  type AdminArticle,
} from "@/lib/admin";
import { apiError } from "@/lib/api";
import type { ArticleStatus } from "@/lib/types";

const FILTERS: { value: ArticleStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "Hammasi" },
  { value: "DRAFT", label: "Qoralama" },
  { value: "PUBLISHED", label: "E'lon qilingan" },
  { value: "ARCHIVED", label: "Arxiv" },
];

function StatusBadge({ s }: { s: ArticleStatus }) {
  const map: Record<ArticleStatus, string> = {
    DRAFT: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    PUBLISHED: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    ARCHIVED: "bg-muted text-muted-foreground",
  };
  const label: Record<ArticleStatus, string> = {
    DRAFT: "Qoralama",
    PUBLISHED: "E'lon qilingan",
    ARCHIVED: "Arxiv",
  };
  return (
    <span className={"inline-block rounded-full px-2.5 py-0.5 text-xs font-medium " + map[s]}>
      {label[s]}
    </span>
  );
}

export default function AdminArticlesPage() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<ArticleStatus | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin-articles", { status, search, page }],
    queryFn: () =>
      fetchMyArticles({
        page,
        limit: 10,
        status: status === "ALL" ? undefined : status,
        search: search.trim() || undefined,
      }),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin-articles"] });
  const publishMut = useMutation({ mutationFn: publishArticle, onSuccess: invalidate });
  const archiveMut = useMutation({ mutationFn: archiveArticle, onSuccess: invalidate });
  const deleteMut = useMutation({ mutationFn: deleteArticle, onSuccess: invalidate });

  const busyId = publishMut.isPending
    ? publishMut.variables
    : archiveMut.isPending
      ? archiveMut.variables
      : deleteMut.isPending
        ? deleteMut.variables
        : null;

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-serif text-3xl font-medium tracking-tight">Maqolalar</h1>
        <Link
          href="/articles/new"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          Yangi maqola
        </Link>
      </header>

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => {
                setStatus(f.value);
                setPage(1);
              }}
              className={
                "rounded-full px-3 py-1.5 text-sm font-medium transition-colors " +
                (status === f.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground")
              }
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative ml-auto">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Qidirish…"
            className="w-56 rounded-lg border border-input bg-background py-2 pl-9 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/25"
          />
        </div>
      </div>

      {isError && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {apiError(error)}
        </p>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-muted/40" />
          ))}
        </div>
      ) : !data || data.items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
          Maqola topilmadi.
        </div>
      ) : (
        <div className="space-y-3">
          {data.items.map((a) => (
            <ArticleRow
              key={a.id}
              a={a}
              busy={busyId === a.id}
              onPublish={() => publishMut.mutate(a.id)}
              onArchive={() => archiveMut.mutate(a.id)}
              onDelete={() => {
                if (window.confirm(`"${a.title}" maqolasini o'chirishni tasdiqlaysizmi?`)) {
                  deleteMut.mutate(a.id);
                }
              }}
            />
          ))}
        </div>
      )}

      {data && data.meta.totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-3 text-sm">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded-lg border border-border px-3 py-1.5 disabled:opacity-40"
          >
            Oldingi
          </button>
          <span className="text-muted-foreground">
            {page} / {data.meta.totalPages}
          </span>
          <button
            type="button"
            disabled={page >= data.meta.totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg border border-border px-3 py-1.5 disabled:opacity-40"
          >
            Keyingi
          </button>
        </div>
      )}
    </div>
  );
}

function ArticleRow({
  a,
  busy,
  onPublish,
  onArchive,
  onDelete,
}: {
  a: AdminArticle;
  busy: boolean;
  onPublish: () => void;
  onArchive: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-4">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge s={a.status} />
          {a.type === "PREMIUM" && (
            <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
              Premium
            </span>
          )}
          <span className="text-xs text-muted-foreground">{a.category.name}</span>
        </div>
        <h3 className="mt-1.5 truncate font-serif font-medium">{a.title}</h3>
        <div className="mt-1.5 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5" />{a.viewCount}</span>
          <span className="flex items-center gap-1"><Heart className="h-3.5 w-3.5" />{a._count.likes}</span>
          <span className="flex items-center gap-1"><MessageCircle className="h-3.5 w-3.5" />{a._count.comments}</span>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <Link
          href={`/articles/${a.id}/edit`}
          className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          title="Tahrirlash"
        >
          <Pencil className="h-4 w-4" />
        </Link>
        {a.status === "PUBLISHED" ? (
          <button
            type="button"
            onClick={onArchive}
            disabled={busy}
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
            title="Arxivlash"
          >
            <Archive className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={onPublish}
            disabled={busy}
            className="rounded-lg p-2 text-emerald-600 transition-colors hover:bg-emerald-500/10 disabled:opacity-50 dark:text-emerald-400"
            title="E'lon qilish"
          >
            <Send className="h-4 w-4" />
          </button>
        )}
        <button
          type="button"
          onClick={onDelete}
          disabled={busy}
          className="rounded-lg p-2 text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
          title="O'chirish"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
