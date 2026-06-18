"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Eye,
  Heart,
  MessageCircle,
  FileText,
  Users,
  FolderTree,
  UserPlus,
  FilePlus2,
} from "lucide-react";
import { fetchMyAnalytics, fetchStats } from "@/lib/admin";
import { useAuth } from "@/lib/store/auth";

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

export default function AdminDashboard() {
  const user = useAuth((s) => s.user);
  const isSuper = user?.role === "SUPERADMIN";

  const analytics = useQuery({
    queryKey: ["my-analytics"],
    queryFn: fetchMyAnalytics,
  });

  const stats = useQuery({
    queryKey: ["admin-stats"],
    queryFn: () => fetchStats(),
    enabled: isSuper,
  });

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-8">
        <h1 className="font-serif text-3xl font-medium tracking-tight">
          Boshqaruv paneli
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Xush kelibsiz, {user?.username}.
        </p>
      </header>

      {isSuper && (
        <section className="mb-10">
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">Platforma</h2>
          {stats.isLoading ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-24 animate-pulse rounded-xl bg-muted/40" />
              ))}
            </div>
          ) : stats.data ? (
            <>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                <StatCard label="Foydalanuvchilar" value={stats.data.totals.users} icon={Users} />
                <StatCard label="Adminlar" value={stats.data.totals.admins} icon={Users} />
                <StatCard label="Maqolalar" value={stats.data.totals.articles} icon={FileText} />
                <StatCard label="E'lon qilingan" value={stats.data.totals.publishedArticles} icon={FileText} />
                <StatCard label="Kategoriyalar" value={stats.data.totals.categories} icon={FolderTree} />
                <StatCard label="Izohlar" value={stats.data.totals.comments} icon={MessageCircle} />
                <StatCard label="Ko'rishlar" value={stats.data.totals.views} icon={Eye} />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
                <StatCard label="Yangi foydalanuvchi (oy)" value={stats.data.range.newUsers} icon={UserPlus} />
                <StatCard label="Yangi maqola (oy)" value={stats.data.range.newArticles} icon={FilePlus2} />
              </div>
            </>
          ) : null}
        </section>
      )}

      <section>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">
          Mening maqolalarim
        </h2>
        {analytics.isLoading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-muted/40" />
            ))}
          </div>
        ) : analytics.data ? (
          <>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <StatCard label="Maqolalar" value={analytics.data.totals.articles} icon={FileText} />
              <StatCard label="Ko'rishlar" value={analytics.data.totals.views} icon={Eye} />
              <StatCard label="Layklar" value={analytics.data.totals.likes} icon={Heart} />
              <StatCard label="Izohlar" value={analytics.data.totals.comments} icon={MessageCircle} />
            </div>

            {analytics.data.articles.length > 0 && (
              <div className="mt-6 overflow-hidden rounded-xl border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2.5 font-medium">Maqola</th>
                      <th className="px-3 py-2.5 text-right font-medium">Ko'rish</th>
                      <th className="px-3 py-2.5 text-right font-medium">Layk</th>
                      <th className="px-4 py-2.5 text-right font-medium">Izoh</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.data.articles.slice(0, 8).map((a) => (
                      <tr key={a.id} className="border-t border-border">
                        <td className="max-w-[18rem] truncate px-4 py-2.5 font-medium">{a.title}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums">{a.views}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums">{a.likes}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{a.comments}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Ma&apos;lumot yo&apos;q.</p>
        )}
      </section>
    </div>
  );
}
