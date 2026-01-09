import { NextRequest, NextResponse } from 'next/server';
import { bigquery } from '@/lib/bq';
import { requireUser, getAuthErrorResponse } from '@/lib/auth';
import { CreateCreativeSchema, CreateCreativeResponse, APIError } from '@/types/api';

const PROJECT_ID = process.env.GOOGLE_PROJECT_ID || 'bolt-ltk-app';
const DATASET = 'creator_pulse';

/**
 * POST /v1/ingestion/creative
 * Register a creative and queue it for analysis
 * 
 * Docs: https://docs.cloud.google.com/bigquery/docs/reference/rest
 */
export async function POST(req: NextRequest) {
  // Auth check
  try {
    requireUser();
  } catch {
    return getAuthErrorResponse();
  }

  try {
    const body = await req.json();
    
    // Validate request body
    const parseResult = CreateCreativeSchema.safeParse(body);
    if (!parseResult.success) {
      const error: APIError = {
        error: 'VALIDATION_ERROR',
        message: 'Invalid request body',
        details: parseResult.error.flatten(),
      };
      return NextResponse.json(error, { status: 400 });
    }

    const data = parseResult.data;

    // Prepare row for BigQuery
    const row = {
      creative_id: data.creative_id,
      platform: data.platform,
      source_type: data.source_type,
      account_id: data.account_id || null,
      campaign_id: data.campaign_id || null,
      adset_id: data.adset_id || null,
      niche: data.niche,
      media_type: data.media_type,
      duration_seconds: data.duration_seconds || null,
      storage_uri: data.storage_uri,
      thumbnail_uri: data.thumbnail_uri || null,
      caption: data.caption || null,
      hashtags: data.hashtags || [],
      creator_id: data.creator_id || null,
      creator_username: data.creator_username || null,
      created_at: data.created_at || new Date().toISOString(),
      analysis_status: 'pending',
    };

    // Insert into BigQuery
    const table = bigquery.dataset(DATASET).table('creatives');
    
    // Use MERGE to handle upserts (update if exists, insert if not)
    const mergeQuery = `
      MERGE \`${PROJECT_ID}.${DATASET}.creatives\` AS target
      USING (SELECT @creative_id AS creative_id) AS source
      ON target.creative_id = source.creative_id
      WHEN MATCHED THEN
        UPDATE SET
          platform = @platform,
          source_type = @source_type,
          account_id = @account_id,
          campaign_id = @campaign_id,
          adset_id = @adset_id,
          niche = @niche,
          media_type = @media_type,
          duration_seconds = @duration_seconds,
          storage_uri = @storage_uri,
          thumbnail_uri = @thumbnail_uri,
          caption = @caption,
          hashtags = @hashtags,
          creator_id = @creator_id,
          creator_username = @creator_username,
          updated_at = CURRENT_TIMESTAMP()
      WHEN NOT MATCHED THEN
        INSERT (creative_id, platform, source_type, account_id, campaign_id, adset_id, 
                niche, media_type, duration_seconds, storage_uri, thumbnail_uri, 
                caption, hashtags, creator_id, creator_username, created_at, analysis_status)
        VALUES (@creative_id, @platform, @source_type, @account_id, @campaign_id, @adset_id,
                @niche, @media_type, @duration_seconds, @storage_uri, @thumbnail_uri,
                @caption, @hashtags, @creator_id, @creator_username, @created_at, 'pending')
    `;

    await bigquery.query({
      query: mergeQuery,
      params: row,
    });

    // TODO: Publish to Pub/Sub for analysis worker
    // For now, we'll just mark as queued
    const analysisQueued = false; // Will be true when Pub/Sub is set up

    const response: CreateCreativeResponse = {
      creative_id: data.creative_id,
      status: 'accepted',
      analysis_queued: analysisQueued,
    };

    return NextResponse.json(response, { status: 202 });

  } catch (error) {
    console.error('Error creating creative:', error);
    
    const apiError: APIError = {
      error: 'INTERNAL_ERROR',
      message: 'Failed to create creative',
      details: error instanceof Error ? error.message : 'Unknown error',
    };
    
    return NextResponse.json(apiError, { status: 500 });
  }
}

/**
 * GET /v1/ingestion/creative
 * List recently ingested creatives (for debugging/monitoring)
 */
export async function GET(req: NextRequest) {
  try {
    requireUser();
  } catch {
    return getAuthErrorResponse();
  }

  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status'); // 'pending', 'processing', 'completed', 'failed'

    let query = `
      SELECT creative_id, platform, source_type, niche, media_type, 
             creator_username, analysis_status, created_at, ingested_at
      FROM \`${PROJECT_ID}.${DATASET}.creatives\`
    `;

    const params: Record<string, unknown> = { limit };

    if (status) {
      query += ` WHERE analysis_status = @status`;
      params.status = status;
    }

    query += ` ORDER BY ingested_at DESC LIMIT @limit`;

    const [rows] = await bigquery.query({ query, params });

    return NextResponse.json({
      items: rows,
      total: rows.length,
    });

  } catch (error) {
    console.error('Error listing creatives:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Failed to list creatives' },
      { status: 500 }
    );
  }
}
