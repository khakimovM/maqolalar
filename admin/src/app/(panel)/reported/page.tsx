"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Flag, Trash2, ExternalLink, ShieldAlert } from "lucide-react";
import {
  fetchReportedComments,
  deleteCommentAdmin,
  type ReportedComment,
} from "@/lib/admin";
import { apiError } from "@/lib/api";
import { useConfirm } from "@/components/confirm-dialog";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3001";

function fmtDate(s: string) {
  const d = new Date(s);
  if (isNaN(d.getTime())) return "";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}.${mm}.${d.getFullYear()}`;
}

function ReportedCard({
  c,
  highlight,
  deleting,
  onDelete,
}: {
  c: ReportedComment;
  highlight: boolean;
  deleting: boolean;
  onDelete: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [glow, setGlow] = useState(highlight);

  useEffect(() => {
    if (!highlight) return;
    const t1 = setTimeout(() => {
      ref.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 200);
    const t2 = setTimeout(() => setGlow(false), 800);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [highlight]);

  return (
    <div
      ref={ref}
      className={
        "rounded-xl border bg-card p-4 transition-colors duration-700 " +
        (glow ? "border-primary bg-primary/10" : "border-border")
      }
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">{c.author.username}</span>
            <span className="text-xs text-muted-foreground">
              {fmtDate(c.createdAt)}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">
              <Flag className="h-3 w-3" />
              {c.reportCount} shikoyat
            </span>
          </div>
          <a
            href={`${SITE_URL}/articles/${c.article.slug}?comment=${c.id}`}
            target="_blank"
            rel="noreferrer"
            className="mt-2 block text-sm text-foreground/90 transition-colors hover:text-primary"
          >
            {c.content}
          </a>
          <a
            href={`${SITE_URL}/articles/${c.article.slug}?comment=${c.id}`}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <ExternalLink className="h-3 w-3" />
            Maqolada ko&apos;rish
          </a>
        </div>

        <button
          type="button"
          onClick={onDelete}
          disabled={deleting}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-destructive/40 px-3 py-1.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
        >
          <Trash2 className="h-4 w-4" />
          O&apos;chirish
        </button>
      </div>

      {c.reports.length > 0 && (
        <div className="mt-3 space-y-1.5 border-t border-border pt-3">
          {c.reports.map((r, i) => (
            <p key={i} className="text-xs text-muted-foreground">
              <span className="font-medium">{r.reportedBy.username}</span>
              {r.reason ? `: ${r.reason}` : " — sabab ko'rsatilmagan"}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

function ReportedContent() {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const searchParams = useSearchParams();
  const highlightId = searchParams.get("comment");

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["reported"],
    queryFn: fetchReportedComments,
  });

  const deleteMut = useMutation({
    mutationFn: deleteCommentAdmin,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reported"] }),
  });

  async function handleDelete(id: string) {
    const ok = await confirm({
      title: "Izohni o'chirish",
      description: "Bu izoh butunlay o'chiriladi.",
      confirmText: "O'chirish",
      danger: true,
    });
    if (ok) deleteMut.mutate(id);
  }

  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-6 flex items-center gap-2">
        <Flag className="h-6 w-6 text-primary" />
        <h1 className="font-serif text-3xl font-medium tracking-tight">
          Shikoyat qilingan izohlar
        </h1>
      </header>

      {isError && (
        <p className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {apiError(error)}
        </p>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl bg-muted/40" />
          ))}
        </div>
      ) : !data || data.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-16 text-center">
          <ShieldAlert className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Shikoyat qilingan izoh yo&apos;q. Hammasi joyida.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {data.map((c: ReportedComment) => (
            <ReportedCard
              key={c.id}
              c={c}
              highlight={highlightId === c.id}
              deleting={deleteMut.isPending}
              onDelete={() => handleDelete(c.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ReportedPage() {
  return (
    <Suspense fallback={null}>
      <ReportedContent />
    </Suspense>
  );
}
