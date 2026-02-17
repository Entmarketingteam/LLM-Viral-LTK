"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { MetricsChartLine, MetricsChartBar } from "@/components/analytics/MetricsChart";
import { format, parseISO } from "date-fns";

interface TrendPoint {
  date: string;
  engagement: number;
  creatives: number;
}

interface NichePoint {
  niche: string;
  creatives: number;
  engagement: number;
}

interface TrendsResponse {
  trend: TrendPoint[];
  byNiche: NichePoint[];
  source: string;
}

export default function AnalyticsPage() {
  const [data, setData] = useState<TrendsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/v1/analytics/trends?days=14")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  const trendDisplay = (data?.trend || []).map((p) => ({
    ...p,
    dateLabel: p.date ? format(parseISO(p.date), "MMM d") : p.date,
  }));

  const nicheData = data?.byNiche || [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Engagement trends, performance by niche, and insights
          {data?.source === "bigquery" && " (live from BigQuery)"}
        </p>
      </div>

      <Card className="p-6">
        <MetricsChartLine
          data={trendDisplay}
          xKey="dateLabel"
          series={[
            {
              dataKey: "engagement",
              name: "Engagement %",
              color: "#2563eb",
              formatter: (v) => `${v}%`,
            },
          ]}
          title="Engagement trend (14 days)"
          height={256}
          loading={loading}
          yAxisFormatter={(v) => `${v}%`}
          tooltipLabel={(p) => (p.date as string) ?? ""}
        />
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <MetricsChartBar
            data={nicheData}
            xKey="niche"
            barKey="creatives"
            barName="Creatives"
            title="Creatives by niche"
            height={256}
            loading={loading}
            layout="horizontal"
            color="#3b82f6"
          />
        </Card>
        <Card className="p-6">
          <MetricsChartBar
            data={nicheData}
            xKey="niche"
            barKey="engagement"
            barName="Engagement %"
            title="Avg. engagement by niche"
            height={256}
            loading={loading}
            color="#8b5cf6"
            valueFormatter={(v) => `${v}%`}
          />
        </Card>
      </div>
    </div>
  );
}
