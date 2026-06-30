"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Inbox, UserPlus, UserX } from "lucide-react";
import {
  fetchAdminRequests,
  fetchAdminRequestSeries,
  type AdminRequestItem,
} from "@/lib/admin";

type Period = "daily" | "monthly" | "yearly" | "custom";

function fmtDate(s: string): string {
  const d = new Date(s);
  if (isNaN(d.getTime())) return "";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}.${mm}.${d.getFullYear()}`;
}

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
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

function StatusBadge({ status }: { status: AdminRequestItem["status"] }) {
  const cls =
    status === "APPROVED"
      ? "bg-emerald-500/15 text-emerald-600"
      : status === "REJECTED"
        ? "bg-rose-500/15 text-rose-600"
        : "bg-amber-500/15 text-amber-600";
  const label =
    status === "APPROVED"
      ? "Tasdiqlangan"
      : status === "REJECTED"
        ? "Rad etilgan"
        : "Kutilmoqda";
  return (
    <span className={"shrink-0 rounded-full px-2 py-0.5 text-xs font-medium " + cls}>
      {label}
    </span>
  );
}

function BarChart({
  labels,
  total,
}: {
  labels: string[];
  total: number[];
}) {
  const max = Math.max(1, ...total);
  return (
    <div className="flex h-44 items-end gap-1">
      {total.map((v, i) => (
        <div
          key={i}
          title={`${labels[i]}: ${v} ta`}
          className="group flex flex-1 flex-col justify-end"
        >
          <div
            className="w-full rounded-t bg-primary/70 transition-colors group-hover:bg-primary"
            style={{
              height: `${(v / max) * 100}%`,
              minHeight: v > 0 ? "3px" : "0",
            }}
          />
        </div>
      ))}
    </div>
  );
}

export default function RequestsPage() {
  const [period, setPeriod] = useState<Period>("daily");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const customReady = period === "custom" && !!from && !!to;

  const summary = useQuery({
    queryKey: ["admin-requests"],
    queryFn: fetchAdminRequests,
  });

  const series = useQuery({
    queryKey: ["admin-requests-series", period, from, to],
    queryFn: () =>
      customReady
        ? fetchAdminRequestSeries({ from, to })
        : period === "custom"
          ? fetchAdminRequestSeries({ period: "daily" })
          : fetchAdminRequestSeries({ period }),
  });

  const data = summary.data;

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-8">
        <h1 className="font-serif text-3xl font-medium tracking-tight">
          Muallif arizalari
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Telegram bot orqali kelgan &quot;muallif bo&apos;lish&quot; arizalari.
        </p>
      </header>

      {/* Statistika kartalari */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        <StatCard
          label="Kutilmoqda"
          value={data?.counts.pending ?? 0}
          icon={Inbox}
        />
        <StatCard
          label="Tasdiqlangan"
          value={data?.counts.approved ?? 0}
          icon={UserPlus}
        />
        <StatCard
          label="Rad etilgan"
          value={data?.counts.rejected ?? 0}
          icon={UserX}
        />
      </div>

      {/* Grafik + davr tanlagich */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          Arizalar dinamikasi
        </h2>
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

      <section className="mb-8 rounded-xl border border-border bg-card p-5">
        {series.isLoading || !series.data ? (
          <div className="h-44 animate-pulse rounded-lg bg-muted/40" />
        ) : (
          <>
            <BarChart labels={series.data.buckets} total={series.data.total} />
            <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
              <span>{series.data.buckets[0] ?? ""}</span>
              <span>
                {series.data.buckets[series.data.buckets.length - 1] ?? ""}
              </span>
            </div>
          </>
        )}
      </section>

      {/* Oxirgi arizalar */}
      <section>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">
          Oxirgi arizalar
        </h2>
        {!data ? (
          <div className="h-24 animate-pulse rounded-xl bg-muted/40" />
        ) : data.recent.length === 0 ? (
          <p className="rounded-xl border border-border bg-card px-4 py-6 text-center text-sm text-muted-foreground">
            Hozircha ariza yo&apos;q.
          </p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border">
            {data.recent.map((r) => (
              <div
                key={r.id}
                className="flex items-start justify-between gap-3 border-b border-border px-4 py-3 last:border-0"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-x-2 text-sm">
                    <span className="font-medium">{r.name}</span>
                    {r.telegramUsername && (
                      <span className="text-muted-foreground">
                        @{r.telegramUsername}
                      </span>
                    )}
                    {r.phone && (
                      <span className="text-muted-foreground">· {r.phone}</span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {r.reason}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {fmtDate(r.createdAt)}
                  </p>
                </div>
                <StatusBadge status={r.status} />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
