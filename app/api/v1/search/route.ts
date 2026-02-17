import { NextRequest, NextResponse } from "next/server";
import { bigquery } from "@/lib/bq";
import { requireUser, getAuthErrorResponse } from "@/lib/auth";
import type { CreativeWithMetrics } from "@/types/api";
import { MOCK_TOP } from "@/lib/mock-creatives";

const PROJECT_ID = process.env.GOOGLE_PROJECT_ID || "bolt-ltk-app";
const DATASET = "creator_pulse";

export interface SearchResponse {
  items: CreativeWithMetrics[];
  total: number;
  q: string;
  source: "bigquery" | "fallback";
}

/**
 * GET /api/v1/search
 * Text search over caption and hashtags.
 * Query params: q (required), niche?, platform?, source_type?, limit? (default 20)
 */
export async function GET(req: NextRequest) {
  try {
    requireUser();
  } catch {
    return getAuthErrorResponse();
  }

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  const niche = searchParams.get("niche") || undefined;
  const platform = searchParams.get("platform") || undefined;
  const source_type = (searchParams.get("source_type") || undefined) as "paid" | "organic" | "ugc" | undefined;
  const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 100);

  if (!q) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", message: "Query parameter 'q' is required" },
      { status: 400 }
    );
  }

  const hasBq =
    process.env.GOOGLE_PROJECT_ID &&
    process.env.GOOGLE_CLIENT_EMAIL &&
    process.env.GOOGLE_PRIVATE_KEY;

  if (!hasBq) {
    const qLower = q.toLowerCase();
    const filtered = MOCK_TOP.filter((c) => {
      if (c.caption && c.caption.toLowerCase().includes(qLower)) return true;
      const tags = (c as { hashtags?: string[] }).hashtags;
      return Array.isArray(tags) && tags.some((h) => h.toLowerCase().includes(qLower));
    });
    const items = (niche ? filtered.filter((c) => c.niche === niche) : filtered)
      .filter((c) => !platform || c.platform === platform)
      .filter((c) => !source_type || c.source_type === source_type)
      .slice(0, limit)
      .map((m) => ({
        ...m,
        metrics: m.metrics,
        annotations: m.annotations,
        vision_features: m.vision_features,
      }));
    return NextResponse.json({
      items,
      total: items.length,
      q,
      source: "fallback",
    } as SearchResponse);
  }

  try {
    const conditions: string[] = [
      `(LOWER(COALESCE(c.caption, '')) LIKE LOWER(CONCAT('%', @q, '%')) OR EXISTS (SELECT 1 FROM UNNEST(COALESCE(c.hashtags, [])) AS h WHERE LOWER(h) LIKE LOWER(CONCAT('%', @q, '%'))))`,
    ];
    const params: Record<string, unknown> = { q, limit };
    if (niche) {
      conditions.push("c.niche = @niche");
      params.niche = niche;
    }
    if (platform) {
      conditions.push("c.platform = @platform");
      params.platform = platform;
    }
    if (source_type) {
      conditions.push("c.source_type = @source_type");
      params.source_type = source_type;
    }

    const query = `
      WITH filtered AS (
        SELECT
          c.creative_id,
          c.platform,
          c.source_type,
          c.niche,
          c.media_type,
          c.duration_seconds,
          c.creator_username,
          c.storage_uri,
          c.thumbnail_uri,
          c.caption,
          c.created_at,
          COALESCE(SUM(m.impressions), 0) AS total_impressions,
          COALESCE(SUM(m.clicks), 0) AS total_clicks,
          SUM(m.spend) AS total_spend,
          COALESCE(SUM(m.conversions), 0) AS total_conversions,
          SUM(m.revenue) AS total_revenue,
          COALESCE(SUM(m.likes), 0) AS total_likes,
          COALESCE(SUM(m.comments), 0) AS total_comments,
          COALESCE(SUM(m.shares), 0) AS total_shares,
          COALESCE(SUM(m.saves), 0) AS total_saves,
          SAFE_DIVIDE(SUM(m.clicks), NULLIF(SUM(m.impressions), 0)) AS ctr,
          SAFE_DIVIDE(SUM(m.spend) * 1000, NULLIF(SUM(m.impressions), 0)) AS cpm,
          SAFE_DIVIDE(SUM(m.revenue), NULLIF(SUM(m.spend), 0)) AS roas,
          SAFE_DIVIDE(
            SUM(m.likes) + SUM(m.comments) + SUM(m.shares) + SUM(m.saves),
            NULLIF(SUM(m.impressions), 0)
          ) AS engagement_rate,
          a.hook_type,
          a.hook_strength_score,
          a.cta_type,
          a.cta_clarity_score,
          a.sentiment_overall,
          a.pacing_style,
          a.virality_score,
          v.num_shots,
          v.first_product_appearance_sec,
          v.product_on_screen_ratio,
          v.scene_tags,
          v.style_tags
        FROM \`${PROJECT_ID}.${DATASET}.creatives\` c
        LEFT JOIN \`${PROJECT_ID}.${DATASET}.creative_metrics_daily\` m
          ON c.creative_id = m.creative_id AND m.date >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
        LEFT JOIN \`${PROJECT_ID}.${DATASET}.creative_llm_annotations\` a ON c.creative_id = a.creative_id
        LEFT JOIN \`${PROJECT_ID}.${DATASET}.creative_vision_features\` v ON c.creative_id = v.creative_id
        WHERE ${conditions.join(" AND ")}
        GROUP BY
          c.creative_id, c.platform, c.source_type, c.niche, c.media_type,
          c.duration_seconds, c.creator_username, c.storage_uri, c.thumbnail_uri,
          c.caption, c.created_at,
          a.hook_type, a.hook_strength_score, a.cta_type, a.cta_clarity_score,
          a.sentiment_overall, a.pacing_style, a.virality_score,
          v.num_shots, v.first_product_appearance_sec, v.product_on_screen_ratio,
          v.scene_tags, v.style_tags
        ORDER BY COALESCE(engagement_rate, 0) DESC
        LIMIT @limit
      )
      SELECT * FROM filtered
    `;

    const [rows] = await bigquery.query({ query, params });

    const items: CreativeWithMetrics[] = (rows as Record<string, unknown>[]).map((row: Record<string, unknown>) => ({
      creative_id: row.creative_id as string,
      platform: row.platform as string,
      source_type: row.source_type as string,
      niche: row.niche as string,
      media_type: row.media_type as string,
      duration_seconds: row.duration_seconds as number | null,
      creator_username: row.creator_username as string | null,
      storage_uri: row.storage_uri as string,
      thumbnail_uri: row.thumbnail_uri as string | null,
      caption: row.caption as string | null,
      created_at: row.created_at as string,
      metrics: {
        impressions: Number(row.total_impressions) || 0,
        clicks: Number(row.total_clicks) || 0,
        spend: (row.total_spend as number) ?? null,
        conversions: Number(row.total_conversions) || 0,
        revenue: (row.total_revenue as number) ?? null,
        likes: Number(row.total_likes) || 0,
        comments: Number(row.total_comments) || 0,
        shares: Number(row.total_shares) || 0,
        saves: Number(row.total_saves) || 0,
        ctr: (row.ctr as number) ?? null,
        cpm: (row.cpm as number) ?? null,
        roas: (row.roas as number) ?? null,
        engagement_rate: (row.engagement_rate as number) ?? null,
      },
      annotations: row.hook_type
        ? {
            hook_type: row.hook_type as string,
            hook_strength_score: (row.hook_strength_score as number) ?? null,
            cta_type: (row.cta_type as string) ?? null,
            cta_clarity_score: (row.cta_clarity_score as number) ?? null,
            sentiment_overall: (row.sentiment_overall as string) ?? null,
            pacing_style: (row.pacing_style as string) ?? null,
            virality_score: (row.virality_score as number) ?? null,
          }
        : null,
      vision_features: row.num_shots
        ? {
            num_shots: row.num_shots as number,
            first_product_appearance_sec: (row.first_product_appearance_sec as number) ?? null,
            product_on_screen_ratio: (row.product_on_screen_ratio as number) ?? null,
            scene_tags: (row.scene_tags as string[]) || [],
            style_tags: (row.style_tags as string[]) || [],
          }
        : null,
    }));

    return NextResponse.json({
      items,
      total: items.length,
      q,
      source: "bigquery",
    } as SearchResponse);
  } catch (err) {
    console.warn("Search BQ failed:", err);
    return NextResponse.json({
      items: [],
      total: 0,
      q,
      source: "fallback",
    } as SearchResponse);
  }
}
