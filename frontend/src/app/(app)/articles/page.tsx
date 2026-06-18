"use client";

import { useEffect, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Search, FileX } from "lucide-react";
import {
  fetchArticles,
  fetchCategories,
  type ArticleQuery,
} from "@/lib/articles";
import { ArticleCard } from "@/components/article-card";

const TYPES: { label: string; value: ArticleQuery["type"] }[] = [
  { label: "Hammasi", value: undefined },
  { label: "Bepul", value: "FREE" },
  { label: "Premium", value: "PREMIUM" },
];

function chip(active: boolean) {
  return (
    "rounded-full border px-3.5 py-1.5 text-sm transition-colors " +
    (active
      ? "border-primary bg-primary text-primary-foreground"
      : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground")
  );
}

export default function ArticlesPage() {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [category, setCategory] = useState<string | undefined>(undefined);
  const [type, setType] = useState<ArticleQuery["type"]>(undefined);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const cats = useQuery({ queryKey: ["categories"], queryFn: fetchCategories });

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["articles", { page, debounced, category, type }],
    queryFn: () =>
      fetchArticles({
        page,
        limit: 9,
        search: debounced || undefined,
        category,
        type,
      }),
    placeholderData: keepPreviousData,
  });

  const meta = data?.meta;
  const items = data?.items ?? [];

  return (
    <main className="mx-auto max-w-7xl px-8 py-10">
      {/* Sarlavha + qidiruv */}
      <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-serif text-3xl font-medium tracking-tight md:text-4xl">
            Maqolalar
          </h1>
          <p className="mt-2 text-muted-foreground">
            Bilim olamiga sayohatni shu yerdan boshlang.
          </p>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Maqola qidirish..."
            className="h-11 w-full rounded-full border border-border bg-card pl-10 pr-4 text-sm outline-none transition-colors focus:border-primary"
          />
        </div>
      </div>

      {/* Filtrlar */}
      <div className="mt-7 flex flex-wrap items-center gap-2">
        <button
          onClick={() => {
            setCategory(undefined);
            setPage(1);
          }}
          className={chip(category === undefined)}
        >
          Barcha yo&apos;nalishlar
        </button>
        {cats.data?.map((c) => (
          <button
            key={c.id}
            onClick={() => {
              setCategory(c.slug);
              setPage(1);
            }}
            className={chip(category === c.slug)}
          >
            {c.name}
          </button>
        ))}
        <span className="mx-2 hidden h-5 w-px bg-border md:inline-block" />
        {TYPES.map((t) => (
          <button
            key={t.label}
            onClick={() => {
              setType(t.value);
              setPage(1);
            }}
            className={chip(type === t.value)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="mt-8 min-h-[400px]">
        {isLoading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="overflow-hidden rounded-xl border border-border bg-card"
              >
                <div className="aspect-[16/10] animate-pulse bg-muted" />
                <div className="space-y-3 p-4">
                  <div className="h-3 w-16 animate-pulse rounded bg-muted" />
                  <div className="h-4 w-4/5 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-full animate-pulse rounded bg-muted" />
                  <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
            <p className="text-muted-foreground">
              Maqolalarni yuklab bo&apos;lmadi. Server ishlayotganini tekshiring.
            </p>
            <button
              onClick={() => refetch()}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              Qayta urinish
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-center text-muted-foreground">
            <FileX className="h-10 w-10 opacity-50" />
            <p>Hech qanday maqola topilmadi.</p>
          </div>
        ) : (
          <div
            className={
              "grid grid-cols-1 gap-6 transition-opacity sm:grid-cols-2 lg:grid-cols-3 " +
              (isFetching ? "opacity-60" : "opacity-100")
            }
          >
            {items.map((a) => (
              <ArticleCard key={a.id} a={a} />
            ))}
          </div>
        )}
      </div>

      {/* Sahifalash */}
      {meta && meta.totalPages > 1 && (
        <div className="mt-10 flex items-center justify-center gap-4">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border text-foreground transition-colors hover:bg-accent disabled:opacity-40"
            aria-label="Oldingi"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="text-sm text-muted-foreground tabular-nums">
            {meta.page} / {meta.totalPages}
          </span>
          <button
            disabled={page >= meta.totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border text-foreground transition-colors hover:bg-accent disabled:opacity-40"
            aria-label="Keyingi"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      )}
    </main>
  );
}
