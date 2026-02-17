"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { TopCreatives } from "@/components/creatives/TopCreatives";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MetricsChartLine } from "@/components/analytics/MetricsChart";
import { TrendingUp, ImageIcon, BarChart3, Zap, ArrowRight } from "lucide-react";
import { format, parseISO } from "date-fns";

interface DashboardStats {
  totalCreatives: number;
  avgEngagementPct: number | null;
  topViralityPct: number | null;
  activeCreators: number;
  source: "bigquery" | "fallback";
}

interface TrendPoint {
  date: string;
  engagement: number;
  creatives: number;
}

export default function DashboardOverview() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [trend, setTrend] = useState<TrendPoint[]>([]);

  useEffect(() => {
    fetch("/api/v1/dashboard/stats")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => (d ? setStats(d) : setStats(null)))
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetch("/api/v1/analytics/trends?days=7")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setTrend(d?.trend ?? []))
      .catch(() => setTrend([]));
  }, []);

  const trendDisplay = trend.map((p) => ({
    ...p,
    dateLabel: p.date ? format(parseISO(p.date), "EEE") : p.date,
  }));

  const cards = [
    { label: "Creatives", value: stats != null ? String(stats.totalCreatives) : "—", icon: ImageIcon, sub: "Last 30 days" },
    { label: "Avg. engagement", value: stats?.avgEngagementPct != null ? `${stats.avgEngagementPct}%` : "—", icon: BarChart3, sub: "All niches" },
    { label: "Virality (p90)", value: stats?.topViralityPct != null ? `${stats.topViralityPct}%` : "—", icon: TrendingUp, sub: "Top 10%" },
    { label: "Active creators", value: stats != null ? String(stats.activeCreators) : "—", icon: Zap, sub: "This month" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Overview</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Viral creatives and top performers
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(({ label, value, icon: Icon, sub }) => (
          <Card key={label} className="p-4 bg-card text-card-foreground border-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{label}</p>
                {loading ? (
                  <Skeleton className="h-8 w-20 mt-1" />
                ) : (
                  <p className="text-2xl font-bold mt-1">{value}</p>
                )}
                <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
              </div>
              <div className="rounded-lg bg-muted p-2">
                <Icon className="h-5 w-5 text-muted-foreground" aria-hidden />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 p-4 bg-card border-border">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Engagement (7 days)</h2>
            <Link
              href="/analytics"
              className="text-sm text-accent hover:underline flex items-center gap-1"
            >
              View analytics <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
          <MetricsChartLine
            data={trendDisplay}
            xKey="dateLabel"
            series={[{ dataKey: "engagement", name: "Engagement %", color: "#2563eb", formatter: (v) => `${v}%` }]}
            height={180}
            loading={false}
            yAxisFormatter={(v) => `${v}%`}
            tooltipLabel={(p) => (p.date as string) ?? ""}
          />
        </Card>
        <Card className="p-4 bg-card border-border">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Top this week</h2>
            <Link
              href="/explorer?interval_days=7"
              className="text-sm text-accent hover:underline flex items-center gap-1"
            >
              Explorer <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
          <TopCreatives niche="beauty" intervalDays={7} limit={6} />
        </Card>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Top creatives (30 days)</h2>
        <TopCreatives niche="beauty" limit={12} />
      </div>
    </div>
  );
}
