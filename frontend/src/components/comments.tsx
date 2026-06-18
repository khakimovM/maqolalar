"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageCircle, Send } from "lucide-react";
import { addComment, fetchComments, type CommentNode } from "@/lib/articles";
import { useAuth } from "@/lib/store/auth";

function fmtDate(s: string) {
  const d = new Date(s);
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function Avatar({ name }: { name: string }) {
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-medium text-primary">
      {name.slice(0, 2).toUpperCase()}
    </div>
  );
}

function CommentItem({ c }: { c: CommentNode }) {
  return (
    <div className="flex gap-3">
      <Avatar name={c.author.username} />
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{c.author.username}</span>
          <span className="text-xs text-muted-foreground">{fmtDate(c.createdAt)}</span>
          {c.isEdited && (
            <span className="text-xs text-muted-foreground">(tahrirlangan)</span>
          )}
        </div>
        <p
          className={
            "mt-1 text-sm leading-relaxed " +
            (c.isDeleted ? "italic text-muted-foreground" : "text-foreground/90")
          }
        >
          {c.isDeleted ? "[o'chirilgan]" : c.content}
        </p>
        {c.replies && c.replies.length > 0 && (
          <div className="mt-4 space-y-4 border-l border-border pl-4">
            {c.replies.map((r) => (
              <CommentItem key={r.id} c={r} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function Comments({ slug }: { slug: string }) {
  const token = useAuth((s) => s.accessToken);
  const qc = useQueryClient();
  const [text, setText] = useState("");

  const { data: comments, isLoading } = useQuery({
    queryKey: ["comments", slug],
    queryFn: () => fetchComments(slug),
  });

  const mutation = useMutation({
    mutationFn: () => addComment(slug, text.trim()),
    onSuccess: () => {
      setText("");
      qc.invalidateQueries({ queryKey: ["comments", slug] });
    },
  });

  const count = comments?.length ?? 0;

  return (
    <section className="mt-14 border-t border-border pt-10">
      <h2 className="flex items-center gap-2 text-xl font-medium">
        <MessageCircle className="h-5 w-5 text-primary" />
        Izohlar {count > 0 && <span className="text-muted-foreground">({count})</span>}
      </h2>

      {token ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (text.trim()) mutation.mutate();
          }}
          className="mt-6"
        >
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            placeholder="Fikringizni yozing..."
            className="w-full resize-none rounded-xl border border-border bg-card p-3 text-sm outline-none transition-colors focus:border-primary"
          />
          <div className="mt-2 flex justify-end">
            <button
              type="submit"
              disabled={!text.trim() || mutation.isPending}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              {mutation.isPending ? "Yuborilmoqda..." : "Yuborish"}
            </button>
          </div>
        </form>
      ) : (
        <div className="mt-6 rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
          Izoh yozish uchun{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            kiring
          </Link>
          .
        </div>
      )}

      <div className="mt-8 space-y-6">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Yuklanmoqda...</p>
        ) : count === 0 ? (
          <p className="text-sm text-muted-foreground">
            Hozircha izoh yo&apos;q. Birinchi bo&apos;ling!
          </p>
        ) : (
          comments!.map((c) => <CommentItem key={c.id} c={c} />)
        )}
      </div>
    </section>
  );
}
