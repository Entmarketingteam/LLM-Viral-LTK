import { NextResponse } from "next/server";
import { bigquery } from "@/lib/bq";
import { requireUser, getAuthErrorResponse } from "@/lib/auth";

const PROJECT_ID = process.env.GOOGLE_PROJECT_ID || "bolt-ltk-app";
const DATASET = "creator_pulse";

export interface DashboardStatsResponse {
  totalCreatives: number;
  avgEngagementPct: number | null;
  topViralityPct: number | null;
  activeCreators: number;
  source: "bigquery" | "fallback";
}

const FALLBACK: DashboardStatsResponse = {
  totalCreatives: 0,
  avgEngagementPct: null,
  topViralityPct: null,
  activeCreators: 0,
  source: "fallback",
};

/**
 * GET /api/v1/dashboard/stats
 * Aggregate metrics for the overview dashboard.
 * Uses BigQuery when GCP is configured; returns zeros otherwise.
 */
export async function GET() {
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
    return NextResponse.json(FALLBACK);
  }

  try {
    const [rows] = await bigquery.query({
      query: `
        WITH metrics_30d AS (
          SELECT
            c.creative_id,
            c.creator_id,
            COALESCE(SUM(m.impressions), 0) AS total_impressions,
            SAFE_DIVIDE(
              SUM(COALESCE(m.likes, 0) + COALESCE(m.comments, 0) + COALESCE(m.shares, 0) + COALESCE(m.saves, 0)),
              NULLIF(SUM(m.impressions), 0)
            ) AS engagement_rate
          FROM \`${PROJECT_ID}.${DATASET}.creatives\` c
          LEFT JOIN \`${PROJECT_ID}.${DATASET}.creative_metrics_daily\` m
            ON c.creative_id = m.creative_id
            AND m.date >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
          GROUP BY c.creative_id, c.creator_id
          HAVING total_impressions > 0
        ),
        with_virality AS (
          SELECT
            m.*,
            a.virality_score
          FROM metrics_30d m
          LEFT JOIN \`${PROJECT_ID}.${DATASET}.creative_llm_annotations\` a
            ON m.creative_id = a.creative_id
        )
        SELECT
          (SELECT COUNT(*) FROM metrics_30d) AS total_creatives,
          (SELECT AVG(engagement_rate) FROM with_virality WHERE engagement_rate IS NOT NULL) AS avg_engagement,
          (SELECT APPROX_QUANTILES(virality_score, 100)[OFFSET(90)] FROM with_virality WHERE virality_score IS NOT NULL) AS p90_virality,
          (SELECT COUNT(DISTINCT creator_id) FROM metrics_30d WHERE creator_id IS NOT NULL) AS active_creators
      `,
    });

    const r = (rows as Record<string, unknown>[])[0];
    if (!r) return NextResponse.json(FALLBACK);

    const avgEng = r.avg_engagement as number | null;
    const p90 = Array.isArray(r.p90_virality) ? r.p90_virality[0] : r.p90_virality;

    const res: DashboardStatsResponse = {
      totalCreatives: Number(r.total_creatives) || 0,
      avgEngagementPct: avgEng != null ? Math.round(avgEng * 1000) / 10 : null,
      topViralityPct: p90 != null ? Math.round((p90 as number) * 100) : null,
      activeCreators: Number(r.active_creators) || 0,
      source: "bigquery",
    };
    return NextResponse.json(res);
  } catch {
    return NextResponse.json(FALLBACK);
  }
}
