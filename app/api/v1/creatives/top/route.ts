import { NextRequest, NextResponse } from 'next/server';
import { bigquery } from '@/lib/bq';
import { requireUser, getAuthErrorResponse } from '@/lib/auth';
import { TopCreativesParams, TopCreativesResponse, APIError } from '@/types/api';
import { MOCK_TOP } from '@/lib/mock-creatives';

const PROJECT_ID = process.env.GOOGLE_PROJECT_ID || 'bolt-ltk-app';
const DATASET = 'creator_pulse';

/**
 * GET /v1/creatives/top
 * Get top-performing creatives by niche/platform
 * 
 * Query params:
 * - niche (required): 'beauty', 'fashion', 'home', etc.
 * - platform: 'ltk', 'meta_ads', 'tiktok', etc.
 * - source_type: 'paid', 'organic', 'ugc'
 * - interval_days: 7, 30, 90 (default 30)
 * - limit: 1-100 (default 20)
 * - sort_by: 'roas', 'engagement_rate', 'impressions', 'virality_score' (default 'engagement_rate')
 */
export async function GET(req: NextRequest) {
  try {
    requireUser();
  } catch {
    return getAuthErrorResponse();
  }

  try {
    const { searchParams } = new URL(req.url);
    
    // Parse query params
    const params: TopCreativesParams = {
      niche: searchParams.get('niche') || '',
      platform: searchParams.get('platform') || undefined,
      source_type: searchParams.get('source_type') as TopCreativesParams['source_type'],
      interval_days: parseInt(searchParams.get('interval_days') || '30'),
      limit: Math.min(parseInt(searchParams.get('limit') || '20'), 100),
      sort_by: (searchParams.get('sort_by') as TopCreativesParams['sort_by']) || 'engagement_rate',
    };

    // Validate required params
    if (!params.niche) {
      const error: APIError = {
        error: 'VALIDATION_ERROR',
        message: 'niche parameter is required',
      };
      return NextResponse.json(error, { status: 400 });
    }

    // Map sort_by to SQL column
    const sortColumn = {
      roas: 'roas',
      engagement_rate: 'engagement_rate',
      impressions: 'total_impressions',
      virality_score: 'virality_score',
    }[params.sort_by || 'engagement_rate'];

    // Build query with filters
    const conditions: string[] = ['niche = @niche'];
    const queryParams: Record<string, unknown> = {
      niche: params.niche,
      interval_days: params.interval_days,
      limit: params.limit,
    };

    if (params.platform) {
      conditions.push('platform = @platform');
      queryParams.platform = params.platform;
    }

    if (params.source_type) {
      conditions.push('source_type = @source_type');
      queryParams.source_type = params.source_type;
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
          
          -- Aggregated metrics
          COALESCE(SUM(m.impressions), 0) AS total_impressions,
          COALESCE(SUM(m.clicks), 0) AS total_clicks,
          SUM(m.spend) AS total_spend,
          COALESCE(SUM(m.conversions), 0) AS total_conversions,
          SUM(m.revenue) AS total_revenue,
          COALESCE(SUM(m.likes), 0) AS total_likes,
          COALESCE(SUM(m.comments), 0) AS total_comments,
          COALESCE(SUM(m.shares), 0) AS total_shares,
          COALESCE(SUM(m.saves), 0) AS total_saves,
          
          -- Calculated metrics
          SAFE_DIVIDE(SUM(m.clicks), NULLIF(SUM(m.impressions), 0)) AS ctr,
          SAFE_DIVIDE(SUM(m.spend) * 1000, NULLIF(SUM(m.impressions), 0)) AS cpm,
          SAFE_DIVIDE(SUM(m.revenue), NULLIF(SUM(m.spend), 0)) AS roas,
          SAFE_DIVIDE(
            SUM(m.likes) + SUM(m.comments) + SUM(m.shares) + SUM(m.saves),
            NULLIF(SUM(m.impressions), 0)
          ) AS engagement_rate,
          
          -- Annotations
          a.hook_type,
          a.hook_strength_score,
          a.cta_type,
          a.cta_clarity_score,
          a.sentiment_overall,
          a.pacing_style,
          a.virality_score,
          
          -- Vision features
          v.num_shots,
          v.first_product_appearance_sec,
          v.product_on_screen_ratio,
          v.scene_tags,
          v.style_tags
          
        FROM \`${PROJECT_ID}.${DATASET}.creatives\` c
        LEFT JOIN \`${PROJECT_ID}.${DATASET}.creative_metrics_daily\` m
          ON c.creative_id = m.creative_id
          AND m.date >= DATE_SUB(CURRENT_DATE(), INTERVAL @interval_days DAY)
        LEFT JOIN \`${PROJECT_ID}.${DATASET}.creative_llm_annotations\` a
          ON c.creative_id = a.creative_id
        LEFT JOIN \`${PROJECT_ID}.${DATASET}.creative_vision_features\` v
          ON c.creative_id = v.creative_id
        WHERE ${conditions.join(' AND ')}
        GROUP BY
          c.creative_id, c.platform, c.source_type, c.niche, c.media_type,
          c.duration_seconds, c.creator_username, c.storage_uri, c.thumbnail_uri,
          c.caption, c.created_at,
          a.hook_type, a.hook_strength_score, a.cta_type, a.cta_clarity_score,
          a.sentiment_overall, a.pacing_style, a.virality_score,
          v.num_shots, v.first_product_appearance_sec, v.product_on_screen_ratio,
          v.scene_tags, v.style_tags
        HAVING total_impressions > 0
      )
      SELECT *
      FROM filtered
      ORDER BY ${sortColumn} DESC NULLS LAST
      LIMIT @limit
    `;

    const [rows] = await bigquery.query({ query, params: queryParams });

    // Transform to response format
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const items = rows.map((row: any) => ({
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
        impressions: row.total_impressions as number,
        clicks: row.total_clicks as number,
        spend: row.total_spend as number | null,
        conversions: row.total_conversions as number,
        revenue: row.total_revenue as number | null,
        likes: row.total_likes as number,
        comments: row.total_comments as number,
        shares: row.total_shares as number,
        saves: row.total_saves as number,
        ctr: row.ctr as number | null,
        cpm: row.cpm as number | null,
        roas: row.roas as number | null,
        engagement_rate: row.engagement_rate as number | null,
      },
      annotations: row.hook_type ? {
        hook_type: row.hook_type as string,
        hook_strength_score: row.hook_strength_score as number | null,
        cta_type: row.cta_type as string | null,
        cta_clarity_score: row.cta_clarity_score as number | null,
        sentiment_overall: row.sentiment_overall as string | null,
        pacing_style: row.pacing_style as string | null,
        virality_score: row.virality_score as number | null,
      } : null,
      vision_features: row.num_shots ? {
        num_shots: row.num_shots as number,
        first_product_appearance_sec: row.first_product_appearance_sec as number | null,
        product_on_screen_ratio: row.product_on_screen_ratio as number | null,
        scene_tags: (row.scene_tags || []) as string[],
        style_tags: (row.style_tags || []) as string[],
      } : null,
    }));

    const response: TopCreativesResponse = {
      items,
      total: items.length,
      params,
    };

    return NextResponse.json(response);

  } catch (error) {
    console.warn('BigQuery failed, serving mock creatives:', error instanceof Error ? error.message : error);
    const { searchParams } = new URL(req.url);
    const params: TopCreativesParams = {
      niche: searchParams.get('niche') || 'beauty',
      platform: searchParams.get('platform') || undefined,
      source_type: searchParams.get('source_type') as TopCreativesParams['source_type'],
      interval_days: parseInt(searchParams.get('interval_days') || '30'),
      limit: Math.min(parseInt(searchParams.get('limit') || '20'), 100),
      sort_by: (searchParams.get('sort_by') as TopCreativesParams['sort_by']) || 'engagement_rate',
    };
    let items = MOCK_TOP.filter((m) => m.niche.toLowerCase() === (params.niche || '').toLowerCase());
    if (params.platform) items = items.filter((m) => m.platform === params.platform);
    if (params.source_type) items = items.filter((m) => m.source_type === params.source_type);
    if (items.length === 0) items = MOCK_TOP;
    items = items.slice(0, params.limit);
    return NextResponse.json({ items, total: items.length, params } as TopCreativesResponse);
  }
}
