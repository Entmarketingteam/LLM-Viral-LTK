"use client";

import { Card } from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import { format, subDays } from "date-fns";

// Placeholder: last 14 days engagement trend
const trendData = Array.from({ length: 14 }, (_, i) => {
  const d = subDays(new Date(), 13 - i);
  return {
    date: format(d, "MMM d"),
    engagement: 2.2 + Math.sin(i * 0.5) * 0.8 + (i * 0.03),
    creatives: 40 + i * 2 + Math.round((Math.random() - 0.5) * 10),
  };
});

const nicheData = [
  { niche: "Beauty", creatives: 124, engagement: 3.2 },
  { niche: "Fashion", creatives: 98, engagement: 2.8 },
  { niche: "Home", creatives: 67, engagement: 2.1 },
  { niche: "Fitness", creatives: 89, engagement: 3.5 },
  { niche: "Food", creatives: 56, engagement: 2.9 },
];

export default function AnalyticsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Engagement trends, performance by niche, and insights
        </p>
      </div>

      <Card className="p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Engagement trend (14 days)</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#9ca3af" />
              <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" tickFormatter={(v) => `${v}%`} />
              <Tooltip
                formatter={(v: number) => [`${v}%`, "Engagement"]}
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
              />
              <Line
                type="monotone"
                dataKey="engagement"
                stroke="#2563eb"
                strokeWidth={2}
                dot={{ r: 3 }}
                name="Engagement %"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="text-xs text-gray-400 mt-2">Placeholder data. Connect BigQuery for live metrics.</p>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Creatives by niche</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={nicheData} layout="vertical" margin={{ left: 60 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200" />
                <XAxis type="number" tick={{ fontSize: 12 }} stroke="#9ca3af" />
                <YAxis dataKey="niche" type="category" width={56} tick={{ fontSize: 12 }} stroke="#9ca3af" />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="creatives" fill="#3b82f6" radius={[0, 4, 4, 0]} name="Creatives" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Avg. engagement by niche</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={nicheData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200" />
                <XAxis dataKey="niche" tick={{ fontSize: 12 }} stroke="#9ca3af" />
                <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" tickFormatter={(v) => `${v}%`} />
                <Tooltip formatter={(v: number) => [`${v}%`, "Engagement"]} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="engagement" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Engagement %" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}
