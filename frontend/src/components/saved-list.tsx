"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Bookmark } from "lucide-react";
import { ArticleCard } from "@/components/article-card";
import { fetchSaved } from "@/lib/profile";
import { apiError } from "@/lib/api";

export function SavedList() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["saved"],
    queryFn: fetchSaved,
  });

  if (isLoading) {
    return (
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-72 animate-pulse rounded-xl border border-border bg-muted/40"
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
        <Bookmark className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Hozircha saqlangan maqola yo&apos;q.
        </p>
        <Link
          href="/articles"
          className="text-sm font-medium text-primary hover:underline"
        >
          Maqolalarni ko&apos;rish →
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {data.map((a) => (
        <ArticleCard key={a.id} a={a} />
      ))}
    </div>
  );
}
