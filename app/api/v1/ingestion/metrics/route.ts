import { NextRequest, NextResponse } from 'next/server';
import { bigquery } from '@/lib/bq';
import { requireUser, getAuthErrorResponse } from '@/lib/auth';
import { IngestMetricsSchema, IngestMetricsResponse, APIError } from '@/types/api';

const PROJECT_ID = process.env.GOOGLE_PROJECT_ID || 'bolt-ltk-app';
const DATASET = 'creator_pulse';

/**
 * POST /v1/ingestion/metrics
 * Ingest daily metrics for one or more creatives
 * 
 * Supports batch inserts for efficiency
 */
export async function POST(req: NextRequest) {
  try {
    requireUser();
  } catch {
    return getAuthErrorResponse();
  }

  try {
    const body = await req.json();
    
    // Validate request body
    const parseResult = IngestMetricsSchema.safeParse(body);
    if (!parseResult.success) {
      const error: APIError = {
        error: 'VALIDATION_ERROR',
        message: 'Invalid request body',
        details: parseResult.error.flatten(),
      };
      return NextResponse.json(error, { status: 400 });
    }

    const { rows } = parseResult.data;

    if (rows.length === 0) {
      return NextResponse.json({
        rows_inserted: 0,
        status: 'success',
      } as IngestMetricsResponse);
    }

    // Prepare rows for BigQuery
    const bqRows = rows.map(row => ({
      creative_id: row.creative_id,
      date: row.date,
      impressions: row.impressions,
      clicks: row.clicks ?? 0,
      spend: row.spend ?? null,
      conversions: row.conversions ?? 0,
      revenue: row.revenue ?? null,
      likes: row.likes ?? 0,
      comments: row.comments ?? 0,
      shares: row.shares ?? 0,
      saves: row.saves ?? 0,
      video_views: row.video_views ?? 0,
      video_completions: row.video_completions ?? 0,
      avg_watch_time_seconds: row.avg_watch_time_seconds ?? null,
    }));

    // Use MERGE for upsert behavior (update existing day's metrics)
    const errors: string[] = [];
    let insertedCount = 0;

    // Process in batches to avoid query size limits
    const BATCH_SIZE = 50;
    for (let i = 0; i < bqRows.length; i += BATCH_SIZE) {
      const batch = bqRows.slice(i, i + BATCH_SIZE);
      
      try {
        // Build VALUES clause for the batch
        const valuesClause = batch.map((_, idx) => `(
          @creative_id_${idx}, @date_${idx}, @impressions_${idx}, @clicks_${idx},
          @spend_${idx}, @conversions_${idx}, @revenue_${idx}, @likes_${idx},
          @comments_${idx}, @shares_${idx}, @saves_${idx}, @video_views_${idx},
          @video_completions_${idx}, @avg_watch_time_seconds_${idx}
        )`).join(',\n');

        const params: Record<string, unknown> = {};
        batch.forEach((row, idx) => {
          params[`creative_id_${idx}`] = row.creative_id;
          params[`date_${idx}`] = row.date;
          params[`impressions_${idx}`] = row.impressions;
          params[`clicks_${idx}`] = row.clicks;
          params[`spend_${idx}`] = row.spend;
          params[`conversions_${idx}`] = row.conversions;
          params[`revenue_${idx}`] = row.revenue;
          params[`likes_${idx}`] = row.likes;
          params[`comments_${idx}`] = row.comments;
          params[`shares_${idx}`] = row.shares;
          params[`saves_${idx}`] = row.saves;
          params[`video_views_${idx}`] = row.video_views;
          params[`video_completions_${idx}`] = row.video_completions;
          params[`avg_watch_time_seconds_${idx}`] = row.avg_watch_time_seconds;
        });

        const mergeQuery = `
          MERGE \`${PROJECT_ID}.${DATASET}.creative_metrics_daily\` AS target
          USING (
            SELECT * FROM UNNEST([
              ${batch.map((_, idx) => `STRUCT(
                @creative_id_${idx} AS creative_id,
                PARSE_DATE('%Y-%m-%d', @date_${idx}) AS date,
                @impressions_${idx} AS impressions,
                @clicks_${idx} AS clicks,
                @spend_${idx} AS spend,
                @conversions_${idx} AS conversions,
                @revenue_${idx} AS revenue,
                @likes_${idx} AS likes,
                @comments_${idx} AS comments,
                @shares_${idx} AS shares,
                @saves_${idx} AS saves,
                @video_views_${idx} AS video_views,
                @video_completions_${idx} AS video_completions,
                @avg_watch_time_seconds_${idx} AS avg_watch_time_seconds
              )`).join(',\n')}
            ])
          ) AS source
          ON target.creative_id = source.creative_id AND target.date = source.date
          WHEN MATCHED THEN
            UPDATE SET
              impressions = source.impressions,
              clicks = source.clicks,
              spend = source.spend,
              conversions = source.conversions,
              revenue = source.revenue,
              likes = source.likes,
              comments = source.comments,
              shares = source.shares,
              saves = source.saves,
              video_views = source.video_views,
              video_completions = source.video_completions,
              avg_watch_time_seconds = source.avg_watch_time_seconds,
              updated_at = CURRENT_TIMESTAMP()
          WHEN NOT MATCHED THEN
            INSERT (creative_id, date, impressions, clicks, spend, conversions, revenue,
                    likes, comments, shares, saves, video_views, video_completions, 
                    avg_watch_time_seconds)
            VALUES (source.creative_id, source.date, source.impressions, source.clicks,
                    source.spend, source.conversions, source.revenue, source.likes,
                    source.comments, source.shares, source.saves, source.video_views,
                    source.video_completions, source.avg_watch_time_seconds)
        `;

        await bigquery.query({ query: mergeQuery, params });
        insertedCount += batch.length;

      } catch (error) {
        const errMsg = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`Batch ${i / BATCH_SIZE + 1}: ${errMsg}`);
      }
    }

    const response: IngestMetricsResponse = {
      rows_inserted: insertedCount,
      status: errors.length === 0 ? 'success' : 'partial',
      errors: errors.length > 0 ? errors : undefined,
    };

    return NextResponse.json(response, { 
      status: errors.length > 0 && insertedCount === 0 ? 500 : 200 
    });

  } catch (error) {
    console.error('Error ingesting metrics:', error);
    
    const apiError: APIError = {
      error: 'INTERNAL_ERROR',
      message: 'Failed to ingest metrics',
      details: error instanceof Error ? error.message : 'Unknown error',
    };
    
    return NextResponse.json(apiError, { status: 500 });
  }
}

/**
 * GET /v1/ingestion/metrics
 * Get metrics for a creative (for debugging)
 */
export async function GET(req: NextRequest) {
  try {
    requireUser();
  } catch {
    return getAuthErrorResponse();
  }

  try {
    const { searchParams } = new URL(req.url);
    const creativeId = searchParams.get('creative_id');
    const days = parseInt(searchParams.get('days') || '30');

    if (!creativeId) {
      return NextResponse.json(
        { error: 'VALIDATION_ERROR', message: 'creative_id is required' },
        { status: 400 }
      );
    }

    const query = `
      SELECT *
      FROM \`${PROJECT_ID}.${DATASET}.creative_metrics_daily\`
      WHERE creative_id = @creative_id
        AND date >= DATE_SUB(CURRENT_DATE(), INTERVAL @days DAY)
      ORDER BY date DESC
    `;

    const [rows] = await bigquery.query({
      query,
      params: { creative_id: creativeId, days },
    });

    return NextResponse.json({
      creative_id: creativeId,
      metrics: rows,
      total_days: rows.length,
    });

  } catch (error) {
    console.error('Error fetching metrics:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Failed to fetch metrics' },
      { status: 500 }
    );
  }
}
