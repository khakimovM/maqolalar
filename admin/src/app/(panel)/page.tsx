"use client";

import { useId, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Eye, MessageCircle, FileText, Users, Mail } from "lucide-react";
import {
  fetchMyAnalytics,
  fetchStats,
  fetchTimeseries,
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
    <div className="rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/40">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

type Line = { label: string; color: string; data: number[] };

/** Catmull-Rom → bezier: nuqtalardan silliq egri chiziq yasaydi. */
function smooth(points: { x: number; y: number }[]): string {
  if (points.length < 2)
    return points.length ? `M ${points[0].x} ${points[0].y}` : "";
  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] || points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}

function TrendChart({
  title,
  buckets,
  lines,
  animKey,
  footer,
}: {
  title: string;
  buckets: string[];
  lines: Line[];
  animKey: string;
  footer?: React.ReactNode;
}) {
  const gid = useId().replace(/:/g, "");
  const wrapRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<number | null>(null);

  const W = 560;
  const H = 190;
  const padL = 8;
  const padR = 8;
  const padT = 16;
  const padB = 24;
  const n = buckets.length;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const max = Math.max(1, ...lines.flatMap((l) => l.data));
  const single = lines.length === 1;
  const total = single ? lines[0].data.reduce((a, b) => a + b, 0) : null;

  const x = (i: number) => padL + (n <= 1 ? innerW / 2 : (i * innerW) / (n - 1));
  const y = (v: number) => padT + innerH - (v / max) * innerH;
  const pts = (data: number[]) => data.map((v, i) => ({ x: x(i), y: y(v) }));

  const baseline = padT + innerH;
  const areaPath = (data: number[]) => {
    const top = smooth(pts(data));
    if (!top) return "";
    return `${top} L ${x(n - 1).toFixed(1)} ${baseline} L ${x(0).toFixed(1)} ${baseline} Z`;
  };

  const ticks = n > 1 ? [0, Math.floor((n - 1) / 2), n - 1] : [0];

  function onMove(e: React.MouseEvent) {
    if (n < 1 || !wrapRef.current) return;
    const r = wrapRef.current.getBoundingClientRect();
    const frac = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    setHover(Math.round(frac * (n - 1)));
  }

  const hi = hover;
  const hiFrac = hi !== null && n > 1 ? hi / (n - 1) : 0.5;
  const tipAlign = hiFrac < 0.18 ? "0" : hiFrac > 0.82 ? "-100%" : "-50%";

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-1 flex items-center justify-between gap-3">
        <span className="text-sm font-medium">{title}</span>
        {total !== null && (
          <span className="text-xs text-muted-foreground">
            jami: <span className="tabular-nums text-foreground">{total}</span>
          </span>
        )}
      </div>
      {lines.length > 1 && (
        <div className="mb-2 flex flex-wrap gap-3">
          {lines.map((l) => (
            <span key={l.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="h-2 w-2 rounded-full" style={{ background: l.color }} />
              {l.label}
            </span>
          ))}
        </div>
      )}

      <div
        ref={wrapRef}
        className="relative"
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
      >
        <svg viewBox={`0 0 ${W} ${H}`} className="h-48 w-full" preserveAspectRatio="none">
          <defs>
            {lines.map((l, idx) => (
              <linearGradient key={idx} id={`${gid}-${idx}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={l.color} stopOpacity={0.32} />
                <stop offset="100%" stopColor={l.color} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>

          {[0, 0.25, 0.5, 0.75, 1].map((t) => (
            <line
              key={t}
              x1={padL}
              x2={W - padR}
              y1={padT + innerH * t}
              y2={padT + innerH * t}
              className="stroke-border"
              strokeWidth={1}
              opacity={t === 1 ? 1 : 0.5}
            />
          ))}

          {single && (
            <motion.path
              key={`area-${animKey}`}
              d={areaPath(lines[0].data)}
              fill={`url(#${gid}-0)`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          )}

          {lines.map((l, idx) => (
            <motion.path
              key={`line-${idx}-${animKey}`}
              d={smooth(pts(l.data))}
              fill="none"
              stroke={l.color}
              strokeWidth={2.5}
              strokeLinejoin="round"
              strokeLinecap="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.9, ease: "easeInOut" }}
            />
          ))}

          {hi !== null && (
            <>
              <line
                x1={x(hi)}
                x2={x(hi)}
                y1={padT}
                y2={baseline}
                className="stroke-primary/40"
                strokeWidth={1}
                strokeDasharray="3 3"
              />
              {lines.map((l, idx) => (
                <g key={idx}>
                  <circle cx={x(hi)} cy={y(l.data[hi])} r={5} fill={l.color} opacity={0.2} />
                  <circle cx={x(hi)} cy={y(l.data[hi])} r={3} fill={l.color} />
                </g>
              ))}
            </>
          )}

          {ticks.map((i) => (
            <text
              key={i}
              x={x(i)}
              y={H - 7}
              textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"}
              className="fill-muted-foreground"
              fontSize={11}
            >
              {buckets[i]}
            </text>
          ))}
        </svg>

        {hi !== null && (
          <div
            className="pointer-events-none absolute top-1 z-10 whitespace-nowrap rounded-lg border border-border bg-popover px-2.5 py-1.5 text-xs shadow-lg"
            style={{ left: `${hiFrac * 100}%`, transform: `translateX(${tipAlign})` }}
          >
            <div className="mb-0.5 font-medium text-muted-foreground">{buckets[hi]}</div>
            {lines.map((l) => (
              <div key={l.label} className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ background: l.color }} />
                <span className="text-muted-foreground">{l.label}:</span>
                <span className="font-medium tabular-nums text-foreground">{l.data[hi]}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      {footer}
    </div>
  );
}

const EMERALD = "#10b981";
const SKY = "#38bdf8";

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

  const [period, setPeriod] = useState<Period>("daily");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const customReady = period === "custom" && !!from && !!to;

  const ts = useQuery({
    queryKey: ["admin-timeseries", period, from, to],
    queryFn: () =>
      customReady
        ? fetchTimeseries({ from, to })
        : period === "custom"
          ? fetchTimeseries({ period: "daily" })
          : fetchTimeseries({ period }),
    enabled: isSuper,
  });

  const animKey = `${period}-${from}-${to}`;

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
        <>
          {stats.data && (
            <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              <StatCard label="Foydalanuvchilar" value={stats.data.totals.users} icon={Users} />
              <StatCard label="Maqolalar" value={stats.data.totals.articles} icon={FileText} />
              <StatCard label="Izohlar" value={stats.data.totals.comments} icon={MessageCircle} />
              <StatCard label="Ko'rishlar" value={stats.data.totals.views} icon={Eye} />
              <StatCard label="Emaillar" value={stats.data.totals.emails} icon={Mail} />
            </div>
          )}

          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-medium text-muted-foreground">O&apos;sish dinamikasi</h2>
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

          <section className="mb-10">
            {ts.isLoading || !ts.data ? (
              <div className="grid gap-4 lg:grid-cols-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-64 animate-pulse rounded-xl bg-muted/40" />
                ))}
              </div>
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                <TrendChart
                  title="Foydalanuvchilar o'sishi"
                  buckets={ts.data.buckets}
                  animKey={animKey}
                  lines={[{ label: "Foydalanuvchilar", color: EMERALD, data: ts.data.series.users }]}
                />
                <TrendChart
                  title="Maqolalar o'sishi"
                  buckets={ts.data.buckets}
                  animKey={animKey}
                  lines={[{ label: "Maqolalar", color: EMERALD, data: ts.data.series.articles }]}
                />
                <TrendChart
                  title="Email yuborish"
                  buckets={ts.data.buckets}
                  animKey={animKey}
                  lines={[{ label: "Emaillar", color: EMERALD, data: ts.data.series.emails }]}
                  footer={
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-border pt-3 text-xs text-muted-foreground">
                      <span>Yetkazilgan: <span className="font-medium text-foreground tabular-nums">{ts.data.email.sent}</span></span>
                      <span>Xato: <span className="font-medium text-foreground tabular-nums">{ts.data.email.failed}</span></span>
                      <span>Ro&apos;yxatdan o&apos;tish: <span className="font-medium text-foreground tabular-nums">{ts.data.email.verification}</span></span>
                      <span>Parol tiklash: <span className="font-medium text-foreground tabular-nums">{ts.data.email.reset}</span></span>
                      <span>Email o&apos;zgartirish: <span className="font-medium text-foreground tabular-nums">{ts.data.email.changeEmail}</span></span>
                    </div>
                  }
                />
                <TrendChart
                  title="Ko'rishlar va izohlar"
                  buckets={ts.data.buckets}
                  animKey={animKey}
                  lines={[
                    { label: "Ko'rishlar", color: EMERALD, data: ts.data.series.views },
                    { label: "Izohlar", color: SKY, data: ts.data.series.comments },
                  ]}
                />
              </div>
            )}
          </section>
        </>
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
              <StatCard label="Layklar" value={analytics.data.totals.likes} icon={MessageCircle} />
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
