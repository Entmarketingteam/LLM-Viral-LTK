"use client";

import { useState, useEffect } from "react";
import { TopCreatives } from "@/components/creatives/TopCreatives";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, ImageIcon, BarChart3, Zap } from "lucide-react";

interface DashboardStats {
  totalCreatives: number;
  avgEngagementPct: number | null;
  topViralityPct: number | null;
  activeCreators: number;
  source: "bigquery" | "fallback";
}

export default function DashboardOverview() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/v1/dashboard/stats")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => (d ? setStats(d) : setStats(null)))
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, []);

  const cards = [
    { label: "Creatives", value: stats != null ? String(stats.totalCreatives) : "—", icon: ImageIcon, sub: "Last 30 days" },
    { label: "Avg. engagement", value: stats?.avgEngagementPct != null ? `${stats.avgEngagementPct}%` : "—", icon: BarChart3, sub: "All niches" },
    { label: "Virality (p90)", value: stats?.topViralityPct != null ? `${stats.topViralityPct}%` : "—", icon: TrendingUp, sub: "Top 10%" },
    { label: "Active creators", value: stats != null ? String(stats.activeCreators) : "—", icon: Zap, sub: "This month" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Overview</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Viral creatives and top performers
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(({ label, value, icon: Icon, sub }) => (
          <Card key={label} className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">{label}</p>
                {loading ? (
                  <Skeleton className="h-8 w-20 mt-1" />
                ) : (
                  <p className="text-2xl font-bold mt-1">{value}</p>
                )}
                <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
              </div>
              <div className="rounded-lg bg-gray-100 p-2">
                <Icon className="h-5 w-5 text-gray-600" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <TopCreatives niche="beauty" limit={12} />
    </div>
  );
}
