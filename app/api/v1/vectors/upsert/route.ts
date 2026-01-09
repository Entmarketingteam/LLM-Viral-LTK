import { NextRequest, NextResponse } from 'next/server';
import { requireUser, getAuthErrorResponse } from '@/lib/auth';
import { upsertVectors } from '@/lib/pinecone';
import { VectorUpsertSchema, VectorUpsertResponse, APIError } from '@/types/api';

/**
 * POST /v1/vectors/upsert
 * Upsert vectors into Pinecone
 * 
 * Docs: https://docs.pinecone.io/reference/api/data-plane/upsert
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
    const parseResult = VectorUpsertSchema.safeParse(body);
    if (!parseResult.success) {
      const error: APIError = {
        error: 'VALIDATION_ERROR',
        message: 'Invalid request body',
        details: parseResult.error.flatten(),
      };
      return NextResponse.json(error, { status: 400 });
    }

    const { namespace, vectors } = parseResult.data;

    if (vectors.length === 0) {
      return NextResponse.json({
        upserted_count: 0,
      } as VectorUpsertResponse);
    }

    // Validate vector dimensions are consistent
    const dimensions = vectors[0].values.length;
    const invalidVectors = vectors.filter(v => v.values.length !== dimensions);
    if (invalidVectors.length > 0) {
      const error: APIError = {
        error: 'VALIDATION_ERROR',
        message: `Inconsistent vector dimensions. Expected ${dimensions}, but found vectors with different dimensions.`,
        details: { invalid_ids: invalidVectors.map(v => v.id) },
      };
      return NextResponse.json(error, { status: 400 });
    }

    // Upsert to Pinecone
    await upsertVectors(
      vectors.map(v => ({
        id: v.id,
        values: v.values,
        metadata: v.metadata as Record<string, string | number | boolean | string[]> | undefined,
      })),
      namespace
    );

    const response: VectorUpsertResponse = {
      upserted_count: vectors.length,
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error upserting vectors:', error);
    
    const apiError: APIError = {
      error: 'INTERNAL_ERROR',
      message: 'Failed to upsert vectors',
      details: error instanceof Error ? error.message : 'Unknown error',
    };
    
    return NextResponse.json(apiError, { status: 500 });
  }
}
