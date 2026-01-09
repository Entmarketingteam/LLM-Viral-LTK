import { NextRequest, NextResponse } from 'next/server';
import { bigquery } from '@/lib/bq';
import { requireUser, getAuthErrorResponse } from '@/lib/auth';
import { CreativeDetailResponse, APIError } from '@/types/api';

const PROJECT_ID = process.env.GOOGLE_PROJECT_ID || 'bolt-ltk-app';
const DATASET = 'creator_pulse';

/**
 * GET /v1/creatives/:creative_id
 * Get full details for a single creative
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { creative_id: string } }
) {
  try {
    requireUser();
  } catch {
    return getAuthErrorResponse();
  }

  try {
    const { creative_id } = params;

    if (!creative_id) {
      const error: APIError = {
        error: 'VALIDATION_ERROR',
        message: 'creative_id is required',
      };
      return NextResponse.json(error, { status: 400 });
    }

    // Get creative details
    const creativeQuery = `
      SELECT *
      FROM \`${PROJECT_ID}.${DATASET}.creatives\`
      WHERE creative_id = @creative_id
    `;

    const [creativeRows] = await bigquery.query({
      query: creativeQuery,
      params: { creative_id },
    });

    if (creativeRows.length === 0) {
      const error: APIError = {
        error: 'NOT_FOUND',
        message: `Creative not found: ${creative_id}`,
      };
      return NextResponse.json(error, { status: 404 });
    }

    const creative = creativeRows[0];

    // Get aggregated metrics (last 30 days)
    const metricsQuery = `
      SELECT
        COALESCE(SUM(impressions), 0) AS impressions,
        COALESCE(SUM(clicks), 0) AS clicks,
        SUM(spend) AS spend,
        COALESCE(SUM(conversions), 0) AS conversions,
        SUM(revenue) AS revenue,
        COALESCE(SUM(likes), 0) AS likes,
        COALESCE(SUM(comments), 0) AS comments,
        COALESCE(SUM(shares), 0) AS shares,
        COALESCE(SUM(saves), 0) AS saves,
        SAFE_DIVIDE(SUM(clicks), NULLIF(SUM(impressions), 0)) AS ctr,
        SAFE_DIVIDE(SUM(revenue), NULLIF(SUM(spend), 0)) AS roas,
        SAFE_DIVIDE(
          SUM(likes) + SUM(comments) + SUM(shares) + SUM(saves),
          NULLIF(SUM(impressions), 0)
        ) AS engagement_rate
      FROM \`${PROJECT_ID}.${DATASET}.creative_metrics_daily\`
      WHERE creative_id = @creative_id
        AND date >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
    `;

    const [metricsRows] = await bigquery.query({
      query: metricsQuery,
      params: { creative_id },
    });

    const metrics = metricsRows[0] || {
      impressions: 0,
      clicks: 0,
      spend: null,
      conversions: 0,
      revenue: null,
      likes: 0,
      comments: 0,
      shares: 0,
      saves: 0,
      ctr: null,
      roas: null,
      engagement_rate: null,
    };

    // Get vision features
    const visionQuery = `
      SELECT *
      FROM \`${PROJECT_ID}.${DATASET}.creative_vision_features\`
      WHERE creative_id = @creative_id
    `;

    const [visionRows] = await bigquery.query({
      query: visionQuery,
      params: { creative_id },
    });

    const visionFeatures = visionRows.length > 0 ? {
      num_shots: visionRows[0].num_shots,
      avg_shot_length_sec: visionRows[0].avg_shot_length_sec,
      first_face_appearance_sec: visionRows[0].first_face_appearance_sec,
      first_product_appearance_sec: visionRows[0].first_product_appearance_sec,
      product_on_screen_ratio: visionRows[0].product_on_screen_ratio,
      has_overlay_text: visionRows[0].has_overlay_text || false,
      scene_tags: visionRows[0].scene_tags || [],
      style_tags: visionRows[0].style_tags || [],
      object_tags: visionRows[0].object_tags || [],
    } : null;

    // Get LLM annotations
    const annotationsQuery = `
      SELECT *
      FROM \`${PROJECT_ID}.${DATASET}.creative_llm_annotations\`
      WHERE creative_id = @creative_id
      ORDER BY processed_at DESC
      LIMIT 1
    `;

    const [annotationRows] = await bigquery.query({
      query: annotationsQuery,
      params: { creative_id },
    });

    const annotations = annotationRows.length > 0 ? {
      hook_type: annotationRows[0].hook_type,
      hook_text: annotationRows[0].hook_text,
      hook_strength_score: annotationRows[0].hook_strength_score,
      cta_type: annotationRows[0].cta_type,
      cta_text: annotationRows[0].cta_text,
      cta_clarity_score: annotationRows[0].cta_clarity_score,
      sentiment_overall: annotationRows[0].sentiment_overall,
      emotional_tone_tags: annotationRows[0].emotional_tone_tags || [],
      pacing_style: annotationRows[0].pacing_style,
      content_structure: annotationRows[0].content_structure,
      transcript_first_5s: annotationRows[0].transcript_first_5s,
      virality_score: annotationRows[0].virality_score,
      virality_factors: annotationRows[0].virality_factors || [],
    } : null;

    const response: CreativeDetailResponse = {
      creative: {
        creative_id: creative.creative_id,
        platform: creative.platform,
        source_type: creative.source_type,
        niche: creative.niche,
        media_type: creative.media_type,
        duration_seconds: creative.duration_seconds,
        storage_uri: creative.storage_uri,
        thumbnail_uri: creative.thumbnail_uri,
        caption: creative.caption,
        hashtags: creative.hashtags || [],
        creator_username: creative.creator_username,
        created_at: creative.created_at,
        analysis_status: creative.analysis_status,
      },
      metrics,
      vision_features: visionFeatures,
      annotations,
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error fetching creative details:', error);
    
    const apiError: APIError = {
      error: 'INTERNAL_ERROR',
      message: 'Failed to fetch creative details',
      details: error instanceof Error ? error.message : 'Unknown error',
    };
    
    return NextResponse.json(apiError, { status: 500 });
  }
}
