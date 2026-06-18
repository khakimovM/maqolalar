"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { motion, useScroll } from "framer-motion";
import { saveProgress } from "@/lib/profile";
import {
  ArrowLeft,
  Bookmark,
  Eye,
  Heart,
  Lock,
} from "lucide-react";
import {
  fetchArticle,
  toggleLike,
  toggleSave,
} from "@/lib/articles";
import { TiptapRender } from "@/components/tiptap-render";
import { Comments } from "@/components/comments";
import { useAuth } from "@/lib/store/auth";

function fmtDate(s: string | null) {
  if (!s) return "";
  return new Date(s).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function ArticlePage() {
  const params = useParams();
  const slug = String(params.slug);
  const router = useRouter();
  const token = useAuth((s) => s.accessToken);
  const { scrollYProgress } = useScroll();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["article", slug],
    queryFn: () => fetchArticle(slug),
    retry: false,
  });

  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState<number | null>(null);
  const [saved, setSaved] = useState(false);

  const likeMut = useMutation({
    mutationFn: () => toggleLike(data!.id),
    onSuccess: (r) => {
      setLiked(r.liked);
      setLikeCount(r.likeCount);
    },
  });
  const saveMut = useMutation({
    mutationFn: () => toggleSave(data!.id),
    onSuccess: (r) => setSaved(r.saved),
  });

  function guard(fn: () => void) {
    if (!token) {
      router.push("/login");
      return;
    }
    fn();
  }

  // O'qish progressini backendga saqlaymiz (kirgan foydalanuvchi uchun):
  // erishilgan eng katta foizni har 5s da va sahifani tark etishda yuboramiz.
  const articleId = data?.id;
  useEffect(() => {
    if (!token || !articleId) return;
    let max = 0;
    const read = () => {
      const v = Math.round((scrollYProgress.get() || 0) * 100);
      if (v > max) max = Math.min(100, v);
    };
    const unsub = scrollYProgress.on("change", read);
    const flush = () => {
      if (max > 0) saveProgress(articleId, max).catch(() => {});
    };
    const id = setInterval(flush, 5000);
    return () => {
      unsub();
      clearInterval(id);
      flush();
    };
  }, [token, articleId, scrollYProgress]);

  const status = (error as { response?: { status?: number } } | null)?.response
    ?.status;

  if (isError && status === 403) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-6 py-32 text-center">
        <Lock className="h-10 w-10 text-primary" />
        <h1 className="text-2xl font-medium">Premium maqola</h1>
        <p className="text-muted-foreground">
          Bu maqolani o&apos;qish uchun tizimga kiring.
        </p>
        <Link
          href="/login"
          className="rounded-full bg-primary px-6 py-2.5 font-medium text-primary-foreground"
        >
          Kirish
        </Link>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mx-auto max-w-md px-6 py-32 text-center text-muted-foreground">
        Maqola topilmadi yoki yuklab bo&apos;lmadi.{" "}
        <Link href="/articles" className="text-primary hover:underline">
          Ro&apos;yxatga qaytish
        </Link>
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="mx-auto max-w-3xl animate-pulse px-6 py-12">
        <div className="mb-4 h-4 w-24 rounded bg-muted" />
        <div className="mb-3 h-10 w-3/4 rounded bg-muted" />
        <div className="mb-8 h-4 w-40 rounded bg-muted" />
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-4 w-full rounded bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  const likes = likeCount ?? data._count.likes;

  return (
    <>
      <motion.div
        style={{ scaleX: scrollYProgress }}
        className="fixed left-0 top-0 z-50 h-1 w-full origin-left bg-primary"
      />

      <article className="mx-auto max-w-3xl px-6 py-12">
        <Link
          href="/articles"
          className="mb-8 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Maqolalar
        </Link>

        <div className="mb-3 flex items-center gap-2">
          <span className="rounded-md bg-accent px-2.5 py-1 text-xs font-medium text-accent-foreground">
            {data.category.name}
          </span>
          {data.type === "PREMIUM" && (
            <span className="inline-flex items-center gap-1 rounded-md bg-primary/15 px-2.5 py-1 text-xs font-medium text-primary">
              <Lock className="h-3 w-3" />
              Premium
            </span>
          )}
        </div>

        <h1 className="font-serif text-4xl font-medium leading-tight md:text-5xl">
          {data.title}
        </h1>

        <div className="mt-5 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 text-[11px] font-medium text-primary">
              {data.author.username.slice(0, 2).toUpperCase()}
            </span>
            {data.author.username}
          </span>
          <span>{fmtDate(data.publishedAt ?? data.createdAt)}</span>
          <span className="flex items-center gap-1">
            <Eye className="h-4 w-4" />
            {data.viewCount}
          </span>
        </div>

        {data.coverImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={data.coverImage}
            alt={data.title}
            className="my-8 w-full rounded-xl border border-border object-cover"
          />
        )}

        <div
          className="mt-8 font-serif text-foreground/90"
          style={{ fontSize: "calc(1.05rem * var(--reading-scale, 1))" }}
        >
          <TiptapRender content={data.content} />
        </div>

        {/* Amallar */}
        <div className="mt-10 flex items-center gap-3 border-t border-border pt-6">
          <button
            onClick={() => guard(() => likeMut.mutate())}
            className={
              "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors " +
              (liked
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:text-foreground")
            }
          >
            <Heart className={"h-4 w-4 " + (liked ? "fill-current" : "")} />
            {likes}
          </button>
          <button
            onClick={() => guard(() => saveMut.mutate())}
            className={
              "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors " +
              (saved
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:text-foreground")
            }
          >
            <Bookmark className={"h-4 w-4 " + (saved ? "fill-current" : "")} />
            {saved ? "Saqlangan" : "Saqlash"}
          </button>
        </div>

        <Comments slug={slug} />
      </article>
    </>
  );
}
