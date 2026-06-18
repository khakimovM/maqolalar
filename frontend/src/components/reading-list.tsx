"use client";

import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BookOpenCheck, X, BookOpen } from "lucide-react";
import { fetchReading, removeReading, type ReadingArticle } from "@/lib/profile";
import { apiError } from "@/lib/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

function cover(src: string | null): string | null {
  if (!src) return null;
  return src.startsWith("http") ? src : `${API_BASE}${src.startsWith("/") ? "" : "/"}${src}`;
}

function ReadingRow({ a }: { a: ReadingArticle }) {
  const qc = useQueryClient();
  const removeMut = useMutation({
    mutationFn: () => removeReading(a.id),
    onSuccess: () =>
      qc.setQueryData<ReadingArticle[]>(["reading"], (old) =>
        (old ?? []).filter((x) => x.id !== a.id),
      ),
  });
  const img = cover(a.coverImage);

  return (
    <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-3 transition-colors hover:border-primary/50">
      <Link
        href={`/articles/${a.slug}`}
        className="relative h-16 w-24 shrink-0 overflow-hidden rounded-lg bg-muted"
      >
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img} alt={a.title} className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-primary">
            <BookOpen className="h-5 w-5 opacity-50" />
          </span>
        )}
      </Link>

      <div className="min-w-0 flex-1">
        <Link href={`/articles/${a.slug}`} className="block">
          <span className="mb-0.5 inline-block text-xs text-muted-foreground">
            {a.category.name}
          </span>
          <h3 className="truncate font-serif font-medium leading-snug hover:text-primary">
            {a.title}
          </h3>
        </Link>
        <div className="mt-2 flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${a.scrollPercent}%` }}
            />
          </div>
          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
            {a.scrollPercent}%
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={() => removeMut.mutate()}
        disabled={removeMut.isPending}
        className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
        aria-label="Ro'yxatdan o'chirish"
        title="Ro'yxatdan o'chirish"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function ReadingList() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["reading"],
    queryFn: fetchReading,
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-xl border border-border bg-muted/40"
          />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
        {apiError(error)}
      </p>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-16 text-center">
        <BookOpenCheck className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Davom ettiriladigan maqola yo&apos;q.
        </p>
        <Link
          href="/articles"
          className="text-sm font-medium text-primary hover:underline"
        >
          O&apos;qishni boshlash →
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {data.map((a) => (
        <ReadingRow key={a.id} a={a} />
      ))}
    </div>
  );
}
