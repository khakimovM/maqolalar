"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  MessageCircle,
  Send,
  CornerDownRight,
  Pencil,
  Trash2,
  Flag,
  X,
} from "lucide-react";
import {
  addComment,
  fetchComments,
  replyComment,
  editComment,
  deleteComment,
  reportComment,
  type CommentNode,
} from "@/lib/articles";
import { apiError } from "@/lib/api";
import { useAuth } from "@/lib/store/auth";
import { useToast } from "@/components/toast";
import { useConfirm, usePrompt } from "@/components/confirm-dialog";
import { EmojiPicker } from "@/components/emoji-picker";

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function insertAtCursor(
  ref: { current: HTMLTextAreaElement | null },
  value: string,
  setValue: (v: string) => void,
  ins: string,
) {
  const ta = ref.current;
  const start = ta?.selectionStart ?? value.length;
  const end = ta?.selectionEnd ?? value.length;
  setValue(value.slice(0, start) + ins + value.slice(end));
  requestAnimationFrame(() => {
    if (ta) {
      ta.focus();
      const pos = start + ins.length;
      ta.setSelectionRange(pos, pos);
    }
  });
}

function Avatar({ name }: { name: string }) {
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-medium text-primary">
      {name.slice(0, 2).toUpperCase()}
    </div>
  );
}

function ActionBtn({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
    >
      {children}
    </button>
  );
}

function CommentItem({
  c,
  slug,
  currentUserId,
  token,
  highlightId,
}: {
  c: CommentNode;
  slug: string;
  currentUserId?: string;
  token: string | null;
  highlightId?: string | null;
}) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const confirm = useConfirm();
  const prompt = usePrompt();
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyText, setReplyText] = useState("");
  const replyRef = useRef<HTMLTextAreaElement>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editText, setEditText] = useState(c.content);
  const itemRef = useRef<HTMLDivElement>(null);
  const isTarget = highlightId === c.id;
  const [glow, setGlow] = useState(isTarget);
  useEffect(() => {
    if (!isTarget) return;
    const t1 = setTimeout(() => {
      itemRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 350);
    const t2 = setTimeout(() => setGlow(false), 2800);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [isTarget]);

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: ["comments", slug] });

  const replyMut = useMutation({
    mutationFn: () => replyComment(c.id, replyText.trim()),
    onSuccess: () => {
      setReplyText("");
      setReplyOpen(false);
      invalidate();
    },
  });
  const editMut = useMutation({
    mutationFn: () => editComment(c.id, editText.trim()),
    onSuccess: () => {
      setEditOpen(false);
      invalidate();
    },
  });
  const deleteMut = useMutation({
    mutationFn: () => deleteComment(c.id),
    onSuccess: invalidate,
  });
  const reportMut = useMutation({
    mutationFn: (reason?: string) => reportComment(c.id, reason),
    onSuccess: () =>
      toast({
        title: "Izoh spam deb belgilandi",
        icon: <Flag className="h-4 w-4 text-amber-500" />,
      }),
    onError: (e) => toast({ title: apiError(e) }),
  });

  const isOwn = !!currentUserId && c.author.id === currentUserId;
  const canAct = !!token && !c.isDeleted;

  async function onReport() {
    const r = await prompt({
      title: "Izoh haqida shikoyat",
      description: "Sababini yozing (ixtiyoriy, kamida 3 belgi).",
      placeholder: "Masalan: haqorat, reklama...",
      confirmText: "Shikoyat yuborish",
    });
    if (r === null) return;
    const reason = r.trim().length >= 3 ? r.trim() : undefined;
    reportMut.mutate(reason);
  }

  return (
    <div
      ref={itemRef}
      className={
        "-mx-2 flex gap-3 rounded-lg px-2 py-1.5 transition-colors duration-1000 " +
        (glow ? "bg-primary/10" : "bg-transparent")
      }
    >
      <Avatar name={c.author.username} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{c.author.username}</span>
          <span className="text-xs text-muted-foreground">
            {fmtDate(c.createdAt)}
          </span>
          {c.isEdited && (
            <span className="text-xs text-muted-foreground">(tahrirlangan)</span>
          )}
        </div>

        {editOpen ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (editText.trim()) editMut.mutate();
            }}
            className="mt-2"
          >
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              rows={2}
              maxLength={2000}
              className="w-full resize-none rounded-lg border border-border bg-card p-2.5 text-sm outline-none focus:border-primary"
            />
            <div className="mt-1.5 flex gap-2">
              <button
                type="submit"
                disabled={!editText.trim() || editMut.isPending}
                className="rounded-full bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                Saqlash
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditOpen(false);
                  setEditText(c.content);
                }}
                className="rounded-full border border-border px-4 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                Bekor
              </button>
            </div>
          </form>
        ) : (
          <p
            className={
              "mt-1 text-sm leading-relaxed " +
              (c.isDeleted ? "italic text-muted-foreground" : "text-foreground/90")
            }
          >
            {c.isDeleted ? "[o'chirilgan]" : c.content}
          </p>
        )}

        {/* Amallar */}
        {canAct && !editOpen && (
          <div className="mt-2 flex flex-wrap items-center gap-4">
            <ActionBtn onClick={() => setReplyOpen((o) => !o)}>
              <CornerDownRight className="h-3.5 w-3.5" />
              Javob
            </ActionBtn>
            {isOwn ? (
              <>
                <ActionBtn
                  onClick={() => {
                    setEditText(c.content);
                    setEditOpen(true);
                  }}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Tahrirlash
                </ActionBtn>
                <ActionBtn
                  onClick={async () => {
                    const ok = await confirm({
                      title: "Izohni o'chirish",
                      description: "Bu izoh o'chiriladi. Davom etasizmi?",
                      confirmText: "O'chirish",
                      danger: true,
                    });
                    if (ok) deleteMut.mutate();
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  O&apos;chirish
                </ActionBtn>
              </>
            ) : (
              <ActionBtn onClick={onReport}>
                <Flag className="h-3.5 w-3.5" />
                Shikoyat
              </ActionBtn>
            )}
          </div>
        )}

        {/* Javob formasi */}
        {replyOpen && canAct && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (replyText.trim()) replyMut.mutate();
            }}
            className="mt-3"
          >
            <div className="flex items-start gap-2">
              <textarea
                ref={replyRef}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                rows={2}
                maxLength={2000}
                autoFocus
                placeholder={`${c.author.username} ga javob...`}
                className="flex-1 resize-none rounded-lg border border-border bg-card p-2.5 text-sm outline-none focus:border-primary"
              />
              <EmojiPicker
                onPick={(e) => insertAtCursor(replyRef, replyText, setReplyText, e)}
              />
              <button
                type="submit"
                disabled={!replyText.trim() || replyMut.isPending}
                className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setReplyOpen(false)}
                className="mt-1 rounded-md p-1 text-muted-foreground hover:text-foreground"
                aria-label="Yopish"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </form>
        )}

        {/* Javoblar */}
        {c.replies && c.replies.length > 0 && (
          <div className="mt-4 space-y-4 border-l border-border pl-4">
            {c.replies.map((r) => (
              <CommentItem
                key={r.id}
                c={r}
                slug={slug}
                currentUserId={currentUserId}
                token={token}
                highlightId={highlightId}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function Comments({
  slug,
  embedded,
  highlightId,
}: {
  slug: string;
  embedded?: boolean;
  highlightId?: string | null;
}) {
  const token = useAuth((s) => s.accessToken);
  const currentUserId = useAuth((s) => s.user?.id);
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const mainRef = useRef<HTMLTextAreaElement>(null);

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
  // Yuqori darajadagi izohlar: eng yangisi tepada (javoblar ichida xronologik qoladi)
  const sorted = comments
    ? [...comments].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
    : [];

  return (
    <section className={embedded ? "" : "mt-14 border-t border-border pt-10"}>
      {!embedded && (
        <h2 className="flex items-center gap-2 text-xl font-medium">
          <MessageCircle className="h-5 w-5 text-primary" />
          Izohlar {count > 0 && <span className="text-muted-foreground">({count})</span>}
        </h2>
      )}

      {token ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (text.trim()) mutation.mutate();
          }}
          className="mt-6"
        >
          <textarea
            ref={mainRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            maxLength={2000}
            placeholder="Fikringizni yozing..."
            className="w-full resize-none rounded-xl border border-border bg-card p-3 text-sm outline-none transition-colors focus:border-primary"
          />
          <div className="mt-2 flex items-center justify-between">
            <EmojiPicker onPick={(e) => insertAtCursor(mainRef, text, setText, e)} />
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
          sorted.map((c) => (
            <CommentItem
              key={c.id}
              c={c}
              slug={slug}
              currentUserId={currentUserId}
              token={token}
              highlightId={highlightId}
            />
          ))
        )}
      </div>
    </section>
  );
}
