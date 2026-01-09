import { NextRequest, NextResponse } from 'next/server';
import { requireUser, getAuthErrorResponse } from '@/lib/auth';
import { queryVectors } from '@/lib/pinecone';
import { VectorQuerySchema, VectorQueryResponse, APIError } from '@/types/api';

/**
 * POST /v1/vectors/query
 * Query similar vectors from Pinecone
 * 
 * Docs: https://docs.pinecone.io/reference/api/data-plane/query
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
    const parseResult = VectorQuerySchema.safeParse(body);
    if (!parseResult.success) {
      const error: APIError = {
        error: 'VALIDATION_ERROR',
        message: 'Invalid request body',
        details: parseResult.error.flatten(),
      };
      return NextResponse.json(error, { status: 400 });
    }

    const { namespace, vector, top_k, filter } = parseResult.data;

    // Query Pinecone
    const matches = await queryVectors(
      vector,
      top_k,
      filter,
      namespace
    );

    const response: VectorQueryResponse = {
      matches,
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error querying vectors:', error);
    
    const apiError: APIError = {
      error: 'INTERNAL_ERROR',
      message: 'Failed to query vectors',
      details: error instanceof Error ? error.message : 'Unknown error',
    };
    
    return NextResponse.json(apiError, { status: 500 });
  }
}
