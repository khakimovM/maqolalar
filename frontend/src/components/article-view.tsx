"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { AnimatePresence, motion, useScroll } from "framer-motion";
import { saveProgress, fetchReading } from "@/lib/profile";
import {
  ArrowLeft,
  Bookmark,
  Eye,
  Heart,
  Lock,
  MessageCircle,
  MapPin,
  X,
} from "lucide-react";
import {
  fetchArticle,
  toggleLike,
  toggleSave,
  fetchComments,
} from "@/lib/articles";
import { TiptapRender } from "@/components/tiptap-render";
import { Comments } from "@/components/comments";
import { ZoteroButton } from "@/components/zotero-install";
import { useAuth } from "@/lib/store/auth";
import { useToast } from "@/components/toast";

function fmtDate(s: string | null) {
  if (!s) return "";
  const d = new Date(s);
  if (isNaN(d.getTime())) return "";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}.${mm}.${d.getFullYear()}`;
}

function ArticleContent() {
  const params = useParams();
  const slug = String(params.slug);
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = useAuth((s) => s.accessToken);
  const qc = useQueryClient();
  const { toast } = useToast();
  const { scrollYProgress } = useScroll();
  const contentRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["article", slug],
    queryFn: () => fetchArticle(slug),
    retry: false,
  });

  const comments = useQuery({
    queryKey: ["comments", slug],
    queryFn: () => fetchComments(slug),
  });
  const commentCount = comments.data?.length ?? 0;

  const reading = useQuery({
    queryKey: ["reading"],
    queryFn: fetchReading,
    enabled: !!token,
  });

  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState<number | null>(null);
  const [saved, setSaved] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [highlightId, setHighlightId] = useState<string | null>(null);

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
  const markMut = useMutation({
    mutationFn: () => saveProgress(data!.id, computePercent()),
    onSuccess: () => {
      toast({
        title: "O'qish joyingiz belgilandi",
        icon: <MapPin className="h-4 w-4 text-primary" />,
      });
      qc.invalidateQueries({ queryKey: ["reading"] });
    },
  });

  function guard(fn: () => void) {
    if (!token) {
      router.push("/login");
      return;
    }
    fn();
  }

  // Joriy o'qilayotgan joyni kontentga nisbatan foizda hisoblaymiz
  function computePercent(): number {
    const el = contentRef.current;
    if (!el) return 0;
    const topAbs = el.getBoundingClientRect().top + window.scrollY;
    const height = el.offsetHeight || 1;
    const anchor = window.scrollY + window.innerHeight * 0.35;
    return Math.max(0, Math.min(100, Math.round(((anchor - topAbs) / height) * 100)));
  }
  function scrollToPercent(p: number) {
    const el = contentRef.current;
    if (!el) return;
    const topAbs = el.getBoundingClientRect().top + window.scrollY;
    const height = el.offsetHeight;
    const target = topAbs + (p / 100) * height - window.innerHeight * 0.35;
    window.scrollTo({ top: Math.max(0, target), behavior: "smooth" });
  }

  // Bildirishnomadan ?comment kelsa — izohlar panelini ochib, o'sha izohni belgilaymiz
  const commentParam = searchParams.get("comment");
  useEffect(() => {
    if (commentParam) {
      setHighlightId(commentParam);
      setSheetOpen(true);
    }
  }, [commentParam]);

  // Sheet ochilganda sahifa scroll'ini qulflaymiz
  useEffect(() => {
    if (!sheetOpen) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [sheetOpen]);

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
  const savedEntry = reading.data?.find((r) => r.id === data.id);
  const savedPercent = savedEntry?.scrollPercent ?? null;
  const showBanner =
    !bannerDismissed &&
    savedPercent != null &&
    savedPercent >= 1 &&
    savedPercent < 100;

  return (
    <>
      <motion.div
        style={{ scaleX: scrollYProgress }}
        className="fixed left-0 top-0 z-50 h-1 w-full origin-left bg-primary"
      />

      <article className="mx-auto max-w-3xl px-6 pb-32 pt-12">
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

        {/* Davom etish tasmasi */}
        {showBanner && (
          <div className="mt-6 flex items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3">
            <span className="text-sm">
              Oxirgi o&apos;qigan joyingiz: <b>{savedPercent}%</b>
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (savedPercent != null) scrollToPercent(savedPercent);
                  setBannerDismissed(true);
                }}
                className="rounded-full bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90"
              >
                Davom etish
              </button>
              <button
                onClick={() => setBannerDismissed(true)}
                className="rounded-md p-1 text-muted-foreground hover:text-foreground"
                aria-label="Yopish"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {data.coverImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={data.coverImage}
            alt={data.title}
            className="my-8 w-full rounded-xl border border-border object-cover"
          />
        )}

        <div
          ref={contentRef}
          className="mt-8 font-serif text-foreground/90"
          style={{ fontSize: "calc(1.05rem * var(--reading-scale, 1))" }}
        >
          <TiptapRender content={data.content} />
        </div>
      </article>

      {/* Suzuvchi amal-paneli — article kengligida */}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-40 px-4 sm:bottom-6">
        <div className="pointer-events-auto mx-auto flex max-w-3xl items-center gap-1 rounded-2xl border border-border bg-background/75 p-1.5 shadow-lg ring-1 ring-black/5 backdrop-blur-xl sm:gap-1.5 sm:p-2">
          <PillBtn
            active={liked}
            onClick={() => guard(() => likeMut.mutate())}
            title="Yoqtirish"
            label={String(likes)}
            icon={
              <Heart
                className={
                  "h-5 w-5 transition-transform " +
                  (liked ? "scale-110 fill-current" : "")
                }
              />
            }
          />
          <PillBtn
            onClick={() => setSheetOpen(true)}
            title="Izohlar"
            label={String(commentCount)}
            icon={<MessageCircle className="h-5 w-5" />}
          />
          <PillBtn
            active={saved}
            onClick={() => guard(() => saveMut.mutate())}
            title={saved ? "Saqlangan" : "Saqlash"}
            icon={<Bookmark className={"h-5 w-5 " + (saved ? "fill-current" : "")} />}
          />

          {data.citationStyle && <ZoteroButton slug={data.slug} />}

          <div className="flex-1" />

          <button
            type="button"
            onClick={() => guard(() => markMut.mutate())}
            disabled={markMut.isPending}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {markMut.isPending ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <MapPin className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">Joyni belgilash</span>
          </button>
        </div>
      </div>

      {/* Izohlar — bottom sheet */}
      <AnimatePresence>
        {sheetOpen && (
          <motion.div
            className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSheetOpen(false)}
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 32, stiffness: 320 }}
              className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-t-2xl border border-border bg-background sm:max-h-[80vh] sm:rounded-2xl"
            >
              <div className="flex items-center justify-between border-b border-border px-5 py-3">
                <h3 className="flex items-center gap-2 font-medium">
                  <MessageCircle className="h-5 w-5 text-primary" />
                  Izohlar
                  {commentCount > 0 && (
                    <span className="text-muted-foreground">({commentCount})</span>
                  )}
                </h3>
                <button
                  type="button"
                  onClick={() => setSheetOpen(false)}
                  className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  aria-label="Yopish"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="overflow-y-auto px-5 py-4">
                <Comments slug={slug} embedded highlightId={highlightId} />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function PillBtn({
  icon,
  label,
  title,
  onClick,
  active,
}: {
  icon: React.ReactNode;
  label?: string;
  title: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className={
        "inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors " +
        (active
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground")
      }
    >
      {icon}
      {label && <span className="tabular-nums">{label}</span>}
    </button>
  );
}

export function ArticleView() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-3xl px-6 py-12">
          <div className="h-72 animate-pulse rounded bg-muted" />
        </div>
      }
    >
      <ArticleContent />
    </Suspense>
  );
}
