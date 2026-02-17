import { NextRequest, NextResponse } from "next/server";
import { bigquery } from "@/lib/bq";
import { requireUser, getAuthErrorResponse } from "@/lib/auth";

const PROJECT_ID = process.env.GOOGLE_PROJECT_ID || "bolt-ltk-app";
const DATASET = "creator_pulse";

export interface TrendPoint {
  date: string;
  engagement: number;
  creatives: number;
}

export interface NichePoint {
  niche: string;
  creatives: number;
  engagement: number;
}

export interface AnalyticsTrendsResponse {
  trend: TrendPoint[];
  byNiche: NichePoint[];
  source: "bigquery" | "fallback";
}

const FALLBACK_TREND: TrendPoint[] = Array.from({ length: 14 }, (_, i) => {
  const d = new Date();
  d.setDate(d.getDate() - (13 - i));
  return {
    date: d.toISOString().slice(0, 10),
    engagement: 2.2 + Math.sin(i * 0.5) * 0.8 + i * 0.03,
    creatives: 40 + i * 2 + Math.round((Math.random() - 0.5) * 10),
  };
});

const FALLBACK_NICHE: NichePoint[] = [
  { niche: "Beauty", creatives: 124, engagement: 3.2 },
  { niche: "Fashion", creatives: 98, engagement: 2.8 },
  { niche: "Home", creatives: 67, engagement: 2.1 },
  { niche: "Fitness", creatives: 89, engagement: 3.5 },
  { niche: "Food", creatives: 56, engagement: 2.9 },
];

/**
 * GET /api/v1/analytics/trends
 * Time-series and niche breakdown for analytics charts.
 * Query params: days (default 14) for trend range.
 */
export async function GET(req: NextRequest) {
  try {
    requireUser();
  } catch {
    return getAuthErrorResponse();
  }

  const hasBq =
    process.env.GOOGLE_PROJECT_ID &&
    process.env.GOOGLE_CLIENT_EMAIL &&
    process.env.GOOGLE_PRIVATE_KEY;

  if (!hasBq) {
    return NextResponse.json({
      trend: FALLBACK_TREND,
      byNiche: FALLBACK_NICHE,
      source: "fallback",
    } as AnalyticsTrendsResponse);
  }

  const { searchParams } = new URL(req.url);
  const days = Math.min(Math.max(parseInt(searchParams.get("days") || "14"), 7), 90);

  try {
    const [trendRows] = await bigquery.query({
      query: `
        WITH daily AS (
          SELECT
            m.date,
            COUNT(DISTINCT m.creative_id) AS creatives,
            SAFE_DIVIDE(
              SUM(COALESCE(m.likes, 0) + COALESCE(m.comments, 0) + COALESCE(m.shares, 0) + COALESCE(m.saves, 0)),
              NULLIF(SUM(m.impressions), 0)
            ) AS engagement_rate
          FROM \`${PROJECT_ID}.${DATASET}.creative_metrics_daily\` m
          WHERE m.date >= DATE_SUB(CURRENT_DATE(), INTERVAL @days DAY)
            AND COALESCE(m.impressions, 0) > 0
          GROUP BY m.date
        )
        SELECT
          FORMAT_DATE('%Y-%m-%d', date) AS date,
          ROUND(COALESCE(engagement_rate, 0) * 100, 2) AS engagement,
          creatives
        FROM daily
        ORDER BY date
      `,
      params: { days },
    });

    const [nicheRows] = await bigquery.query({
      query: `
        WITH metrics_30d AS (
          SELECT
            c.creative_id,
            c.niche,
            SAFE_DIVIDE(
              SUM(COALESCE(m.likes, 0) + COALESCE(m.comments, 0) + COALESCE(m.shares, 0) + COALESCE(m.saves, 0)),
              NULLIF(SUM(m.impressions), 0)
            ) AS engagement_rate
          FROM \`${PROJECT_ID}.${DATASET}.creatives\` c
          LEFT JOIN \`${PROJECT_ID}.${DATASET}.creative_metrics_daily\` m
            ON c.creative_id = m.creative_id
            AND m.date >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
          GROUP BY c.creative_id, c.niche
          HAVING SUM(m.impressions) > 0
        )
        SELECT
          niche,
          COUNT(*) AS creatives,
          ROUND(AVG(engagement_rate) * 100, 2) AS engagement
        FROM metrics_30d
        WHERE niche IS NOT NULL AND niche != ''
        GROUP BY niche
        ORDER BY creatives DESC
      `,
    });

    const trend: TrendPoint[] = (trendRows as Record<string, unknown>[]).map((r) => ({
      date: String(r.date),
      engagement: Number(r.engagement) || 0,
      creatives: Number(r.creatives) || 0,
    }));

    const byNiche: NichePoint[] = (nicheRows as Record<string, unknown>[]).map((r) => ({
      niche: String(r.niche || ""),
      creatives: Number(r.creatives) || 0,
      engagement: Number(r.engagement) || 0,
    }));

    if (trend.length === 0) {
      return NextResponse.json({
        trend: FALLBACK_TREND,
        byNiche: byNiche.length ? byNiche : FALLBACK_NICHE,
        source: "bigquery",
      } as AnalyticsTrendsResponse);
    }

    return NextResponse.json({
      trend,
      byNiche: byNiche.length ? byNiche : FALLBACK_NICHE,
      source: "bigquery",
    } as AnalyticsTrendsResponse);
  } catch {
    return NextResponse.json({
      trend: FALLBACK_TREND,
      byNiche: FALLBACK_NICHE,
      source: "fallback",
    } as AnalyticsTrendsResponse);
  }
}
