"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArticleForm } from "@/components/article-form";
import { fetchArticleForEdit } from "@/lib/admin";
import { apiError } from "@/lib/api";

export default function EditArticlePage() {
  const params = useParams();
  const id = String(params.id);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["edit-article", id],
    queryFn: () => fetchArticleForEdit(id),
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 h-9 w-56 animate-pulse rounded bg-muted/50" />
        <div className="space-y-4">
          <div className="h-11 animate-pulse rounded-lg bg-muted/40" />
          <div className="h-40 animate-pulse rounded-lg bg-muted/40" />
          <div className="h-80 animate-pulse rounded-xl bg-muted/40" />
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="mx-auto max-w-3xl py-20 text-center text-sm text-muted-foreground">
        {isError ? apiError(error) : "Maqola topilmadi."}
      </div>
    );
  }

  return (
    <ArticleForm
      initial={{
        id: data.id,
        title: data.title,
        content: data.content,
        categoryId: data.categoryId,
        type: data.type,
        excerpt: data.excerpt,
        coverImage: data.coverImage,
        status: data.status,
      }}
    />
  );
}
