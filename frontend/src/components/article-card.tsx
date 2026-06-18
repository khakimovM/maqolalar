import Link from "next/link";
import { Eye, Heart, MessageCircle, Lock, BookOpen } from "lucide-react";
import type { CardArticle } from "@/lib/types";

export function ArticleCard({ a }: { a: CardArticle }) {
  return (
    <Link
      href={`/articles/${a.slug}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-all hover:-translate-y-1 hover:border-primary/50 hover:shadow-lg"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-muted">
        {a.coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={a.coverImage}
            alt={a.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-accent text-primary">
            <BookOpen className="h-10 w-10 opacity-50" />
          </div>
        )}
        {a.type === "PREMIUM" && (
          <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground">
            <Lock className="h-3 w-3" />
            Premium
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <span className="mb-2 inline-block w-fit rounded-md bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">
          {a.category.name}
        </span>
        <h3 className="font-serif text-lg font-medium leading-snug transition-colors group-hover:text-primary">
          {a.title}
        </h3>
        {a.excerpt && (
          <p className="mt-2 line-clamp-2 flex-1 text-sm leading-relaxed text-muted-foreground">
            {a.excerpt}
          </p>
        )}
        <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-[10px] font-medium text-primary">
              {a.author.username.slice(0, 2).toUpperCase()}
            </div>
            <span className="truncate text-xs text-muted-foreground">{a.author.username}</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5" />{a.viewCount}</span>
            <span className="flex items-center gap-1"><Heart className="h-3.5 w-3.5" />{a._count.likes}</span>
            <span className="flex items-center gap-1"><MessageCircle className="h-3.5 w-3.5" />{a._count.comments}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
