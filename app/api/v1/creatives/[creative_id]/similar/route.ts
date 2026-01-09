import { NextRequest, NextResponse } from 'next/server';
import { bigquery } from '@/lib/bq';
import { requireUser, getAuthErrorResponse } from '@/lib/auth';
import { queryVectors, PINECONE_NAMESPACE_CREATIVES } from '@/lib/pinecone';
import { SimilarCreativesResponse, APIError } from '@/types/api';

const PROJECT_ID = process.env.GOOGLE_PROJECT_ID || 'bolt-ltk-app';
const DATASET = 'creator_pulse';

/**
 * GET /v1/creatives/:creative_id/similar
 * Find similar creatives using vector search
 * 
 * Query params:
 * - niche: Filter by niche
 * - platform: Filter by platform
 * - top_k: Number of results (default 10, max 50)
 * - min_performance_bucket: 'top10pc' or 'mid'
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
    const { searchParams } = new URL(req.url);

    if (!creative_id) {
      const error: APIError = {
        error: 'VALIDATION_ERROR',
        message: 'creative_id is required',
      };
      return NextResponse.json(error, { status: 400 });
    }

    const topK = Math.min(parseInt(searchParams.get('top_k') || '10'), 50);
    const niche = searchParams.get('niche');
    const platform = searchParams.get('platform');
    const minPerformanceBucket = searchParams.get('min_performance_bucket');

    // Step 1: Get the embedding for the seed creative from BigQuery
    const embeddingQuery = `
      SELECT clip_embedding_id
      FROM \`${PROJECT_ID}.${DATASET}.creative_vision_features\`
      WHERE creative_id = @creative_id
    `;

    const [embeddingRows] = await bigquery.query({
      query: embeddingQuery,
      params: { creative_id },
    });

    if (embeddingRows.length === 0 || !embeddingRows[0].clip_embedding_id) {
      // Fallback: If no embedding exists, return empty or use text-based similarity
      // For now, return an error asking to wait for analysis
      const error: APIError = {
        error: 'NOT_READY',
        message: `Creative ${creative_id} has not been analyzed yet. Embeddings not available.`,
      };
      return NextResponse.json(error, { status: 404 });
    }

    // Step 2: Build Pinecone filter
    const filter: Record<string, unknown> = {};
    
    if (niche) {
      filter.niche = niche;
    }
    if (platform) {
      filter.platform = platform;
    }
    if (minPerformanceBucket) {
      // Filter for top performers
      if (minPerformanceBucket === 'top10pc') {
        filter.performance_bucket = 'top10pc';
      } else if (minPerformanceBucket === 'mid') {
        filter.performance_bucket = { $in: ['top10pc', 'mid'] };
      }
    }

    // Step 3: Query Pinecone for similar vectors
    // First, we need to get the actual vector values
    // In production, you'd either:
    // a) Store the vector in BigQuery too
    // b) Fetch from Pinecone by ID first
    // For now, we'll fetch by ID from Pinecone

    // Pinecone fetch by ID to get the vector
    const { getPineconeClient, PINECONE_INDEX } = await import('@/lib/pinecone');
    const index = getPineconeClient().index(PINECONE_INDEX);
    
    const fetchResult = await index.namespace(PINECONE_NAMESPACE_CREATIVES).fetch([creative_id]);
    
    if (!fetchResult.records[creative_id]) {
      const error: APIError = {
        error: 'NOT_READY',
        message: `Embedding not found in vector store for creative ${creative_id}`,
      };
      return NextResponse.json(error, { status: 404 });
    }

    const seedVector = fetchResult.records[creative_id].values;

    // Step 4: Query for similar vectors (excluding the seed)
    const matches = await queryVectors(
      seedVector,
      topK + 1, // Get one extra since we'll exclude the seed
      Object.keys(filter).length > 0 ? filter : undefined,
      PINECONE_NAMESPACE_CREATIVES
    );

    // Filter out the seed creative
    const filteredMatches = matches.filter(m => m.id !== creative_id).slice(0, topK);

    // Step 5: Enrich with data from BigQuery
    if (filteredMatches.length === 0) {
      return NextResponse.json({
        seed_creative_id: creative_id,
        similar: [],
      } as SimilarCreativesResponse);
    }

    const creativeIds = filteredMatches.map(m => m.id);
    
    const enrichQuery = `
      SELECT 
        c.creative_id,
        c.platform,
        c.niche,
        c.thumbnail_uri,
        a.hook_type,
        CASE
          WHEN perf.engagement_percentile >= 0.9 THEN 'top10pc'
          WHEN perf.engagement_percentile >= 0.5 THEN 'mid'
          ELSE 'bottom50pc'
        END AS performance_bucket
      FROM \`${PROJECT_ID}.${DATASET}.creatives\` c
      LEFT JOIN \`${PROJECT_ID}.${DATASET}.creative_llm_annotations\` a
        ON c.creative_id = a.creative_id
      LEFT JOIN (
        SELECT 
          creative_id,
          PERCENT_RANK() OVER (ORDER BY SUM(likes + comments + shares + saves) / NULLIF(SUM(impressions), 0) DESC) AS engagement_percentile
        FROM \`${PROJECT_ID}.${DATASET}.creative_metrics_daily\`
        WHERE date >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
        GROUP BY creative_id
      ) perf ON c.creative_id = perf.creative_id
      WHERE c.creative_id IN UNNEST(@creative_ids)
    `;

    const [enrichedRows] = await bigquery.query({
      query: enrichQuery,
      params: { creative_ids: creativeIds },
    });

    // Create a map for quick lookup
    const enrichedMap = new Map<string, Record<string, unknown>>();
    for (const row of enrichedRows) {
      enrichedMap.set(row.creative_id, row);
    }

    // Build response
    const similar = filteredMatches.map(match => {
      const enriched = enrichedMap.get(match.id);
      return {
        creative_id: match.id,
        similarity_score: match.score,
        platform: (enriched?.platform as string) || (match.metadata?.platform as string) || 'unknown',
        niche: (enriched?.niche as string) || (match.metadata?.niche as string) || 'unknown',
        thumbnail_uri: (enriched?.thumbnail_uri as string) || null,
        hook_type: (enriched?.hook_type as string) || null,
        performance_bucket: (enriched?.performance_bucket as string) || (match.metadata?.performance_bucket as string) || null,
      };
    });

    const response: SimilarCreativesResponse = {
      seed_creative_id: creative_id,
      similar,
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error finding similar creatives:', error);
    
    const apiError: APIError = {
      error: 'INTERNAL_ERROR',
      message: 'Failed to find similar creatives',
      details: error instanceof Error ? error.message : 'Unknown error',
    };
    
    return NextResponse.json(apiError, { status: 500 });
  }
}
