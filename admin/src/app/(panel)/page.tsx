"use client";

import { useState } from "react";
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
  Mail,
  Send,
  CheckCircle2,
  AlertTriangle,
  KeyRound,
  AtSign,
} from "lucide-react";
import {
  fetchMyAnalytics,
  fetchStats,
  fetchEmailStats,
  type EmailStats,
} from "@/lib/admin";
import { useAuth } from "@/lib/store/auth";

type Period = "daily" | "monthly" | "yearly" | "custom";

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

/** So'nggi 14 kunlik email yuborish o'sish grafigi (yengil SVG). */
function EmailGrowthChart({ series }: { series: EmailStats["series"] }) {
  const W = 640;
  const H = 200;
  const padL = 10;
  const padR = 10;
  const padT = 16;
  const padB = 26;
  const n = series.length;
  const max = Math.max(1, ...series.map((d) => d.count));
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const x = (i: number) => padL + (n <= 1 ? innerW / 2 : (i * innerW) / (n - 1));
  const y = (v: number) => padT + innerH - (v / max) * innerH;

  const linePath = series
    .map((d, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(d.count).toFixed(1)}`)
    .join(" ");
  const areaPath =
    `M ${x(0).toFixed(1)} ${(padT + innerH).toFixed(1)} ` +
    series.map((d, i) => `L ${x(i).toFixed(1)} ${y(d.count).toFixed(1)}`).join(" ") +
    ` L ${x(n - 1).toFixed(1)} ${(padT + innerH).toFixed(1)} Z`;

  const fmt = (s: string) => {
    const [, m, d] = s.split("-");
    return `${d}/${m}`;
  };
  // Ko'rsatiladigan x belgilari: birinchi, o'rta, oxirgi
  const ticks = [0, Math.floor((n - 1) / 2), n - 1];

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-medium">So&apos;nggi 14 kun — yuborilgan xatlar</span>
        <span className="text-xs text-muted-foreground">eng yuqori: {max}</span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-48 w-full text-primary"
        preserveAspectRatio="none"
      >
        {/* gorizontal panjara */}
        {[0, 0.5, 1].map((t) => (
          <line
            key={t}
            x1={padL}
            x2={W - padR}
            y1={padT + innerH * t}
            y2={padT + innerH * t}
            className="stroke-border"
            strokeWidth={1}
          />
        ))}
        <path d={areaPath} fill="currentColor" opacity={0.12} />
        <path
          d={linePath}
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {series.map((d, i) => (
          <circle key={i} cx={x(i)} cy={y(d.count)} r={2.5} fill="currentColor" />
        ))}
        {ticks.map((i) => (
          <text
            key={i}
            x={x(i)}
            y={H - 8}
            textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"}
            className="fill-muted-foreground"
            fontSize={11}
          >
            {fmt(series[i].date)}
          </text>
        ))}
      </svg>
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

  const [period, setPeriod] = useState<Period>("monthly");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const customReady = period === "custom" && !!from && !!to;

  const stats = useQuery({
    queryKey: ["admin-stats", period, from, to],
    queryFn: () =>
      customReady
        ? fetchStats({ from, to })
        : period === "custom"
          ? fetchStats({ period: "monthly" })
          : fetchStats({ period }),
    enabled: isSuper,
  });

  const emailStats = useQuery({
    queryKey: ["admin-email-stats"],
    queryFn: fetchEmailStats,
    enabled: isSuper,
  });

  const rangeLabel =
    period === "daily"
      ? "bugun"
      : period === "yearly"
        ? "yil"
        : period === "custom"
          ? "oraliq"
          : "oy";

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
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-medium text-muted-foreground">Platforma</h2>
            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  ["daily", "Kunlik"],
                  ["monthly", "Oylik"],
                  ["yearly", "Yillik"],
                  ["custom", "Maxsus"],
                ] as [Period, string][]
              ).map(([p, label]) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriod(p)}
                  className={
                    "rounded-full px-3 py-1 text-xs font-medium transition-colors " +
                    (period === p
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:text-foreground")
                  }
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          {period === "custom" && (
            <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="rounded-lg border border-input bg-background px-3 py-1.5 outline-none focus:border-primary"
              />
              <span className="text-muted-foreground">—</span>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="rounded-lg border border-input bg-background px-3 py-1.5 outline-none focus:border-primary"
              />
            </div>
          )}
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
                <StatCard label={`Yangi foydalanuvchi (${rangeLabel})`} value={stats.data.range.newUsers} icon={UserPlus} />
                <StatCard label={`Yangi maqola (${rangeLabel})`} value={stats.data.range.newArticles} icon={FilePlus2} />
              </div>
            </>
          ) : null}
        </section>
      )}

      {isSuper && (
        <section className="mb-10">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Mail className="h-4 w-4" /> Email yuborish
          </h2>
          {emailStats.isLoading ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-24 animate-pulse rounded-xl bg-muted/40" />
                ))}
              </div>
              <div className="h-60 animate-pulse rounded-xl bg-muted/40" />
            </div>
          ) : emailStats.data ? (
            <>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <StatCard label="Bugun" value={emailStats.data.totals.today} icon={Mail} />
                <StatCard label="Shu hafta" value={emailStats.data.totals.week} icon={Mail} />
                <StatCard label="Shu oy" value={emailStats.data.totals.month} icon={Mail} />
                <StatCard label="Jami" value={emailStats.data.totals.all} icon={Mail} />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                <StatCard label="Yetkazilgan" value={emailStats.data.status.sent} icon={CheckCircle2} />
                <StatCard label="Xato" value={emailStats.data.status.failed} icon={AlertTriangle} />
                <StatCard label="Ro'yxatdan o'tish" value={emailStats.data.byType.verification} icon={UserPlus} />
                <StatCard label="Parol tiklash" value={emailStats.data.byType.reset} icon={KeyRound} />
                <StatCard label="Email o'zgartirish" value={emailStats.data.byType.changeEmail} icon={AtSign} />
              </div>
              <div className="mt-4">
                <EmailGrowthChart series={emailStats.data.series} />
              </div>
            </>
          ) : (
            <p className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
              <Send className="h-4 w-4" /> Hozircha email yuborilmagan.
            </p>
          )}
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
