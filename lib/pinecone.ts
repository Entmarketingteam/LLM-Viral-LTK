import { Pinecone } from '@pinecone-database/pinecone';

// Index configuration
export const PINECONE_INDEX = process.env.PINECONE_INDEX || 'creative-embeddings';
export const PINECONE_NAMESPACE_CREATIVES = 'creatives';
export const PINECONE_NAMESPACE_FRAMES = 'frames';

// Embedding dimensions (depends on model)
export const EMBEDDING_DIMENSIONS = {
  'ViT-B/32': 512,
  'ViT-L/14': 768,
  'ViT-L/14@336px': 768,
} as const;

export type EmbeddingModel = keyof typeof EMBEDDING_DIMENSIONS;

// Lazy initialization of Pinecone client
let _pinecone: Pinecone | null = null;

/**
 * Get the Pinecone client (lazy initialized)
 * Docs: https://docs.pinecone.io/guides/get-started/quickstart
 */
export function getPineconeClient(): Pinecone {
  if (!_pinecone) {
    const apiKey = process.env.PINECONE_API_KEY;
    if (!apiKey) {
      throw new Error('PINECONE_API_KEY environment variable is not set');
    }
    _pinecone = new Pinecone({ apiKey });
  }
  return _pinecone;
}

// Export for backward compatibility
export const pinecone = {
  index: (indexName: string) => getPineconeClient().index(indexName),
};

/**
 * Get the Pinecone index
 */
export function getIndex() {
  return getPineconeClient().index(PINECONE_INDEX);
}

/**
 * Metadata shape for creative vectors in Pinecone
 */
export interface CreativeVectorMetadata {
  creative_id: string;
  platform: string;
  niche: string;
  media_type: string;
  source_type: string;
  hook_type?: string;
  performance_bucket?: 'top10pc' | 'mid' | 'bottom50pc';
  created_at_epoch: number;  // Unix timestamp for filtering
}

/**
 * Metadata shape for frame vectors in Pinecone
 */
export interface FrameVectorMetadata {
  creative_id: string;
  frame_number: number;
  timestamp_sec: number;
  has_face: boolean;
  has_product: boolean;
  has_text: boolean;
  niche: string;
  platform: string;
}

/**
 * Upsert vectors to Pinecone
 */
export async function upsertVectors(
  vectors: Array<{
    id: string;
    values: number[];
    metadata?: Record<string, string | number | boolean | string[]>;
  }>,
  namespace: string = PINECONE_NAMESPACE_CREATIVES
): Promise<void> {
  const index = getIndex();
  
  // Pinecone has a limit of 100 vectors per upsert
  const batchSize = 100;
  for (let i = 0; i < vectors.length; i += batchSize) {
    const batch = vectors.slice(i, i + batchSize);
    await index.namespace(namespace).upsert(batch);
  }
}

/**
 * Query similar vectors
 */
export async function queryVectors(
  vector: number[],
  topK: number = 10,
  filter?: Record<string, unknown>,
  namespace: string = PINECONE_NAMESPACE_CREATIVES
): Promise<Array<{ id: string; score: number; metadata?: Record<string, unknown> }>> {
  const index = getIndex();
  
  const result = await index.namespace(namespace).query({
    vector,
    topK,
    filter,
    includeMetadata: true,
  });
  
  return (result.matches || []).map(match => ({
    id: match.id,
    score: match.score || 0,
    metadata: match.metadata,
  }));
}

/**
 * Delete vectors by ID
 */
export async function deleteVectors(
  ids: string[],
  namespace: string = PINECONE_NAMESPACE_CREATIVES
): Promise<void> {
  const index = getIndex();
  await index.namespace(namespace).deleteMany(ids);
}

/**
 * Delete all vectors for a creative (both creative and frame embeddings)
 */
export async function deleteCreativeVectors(creativeId: string): Promise<void> {
  const index = getIndex();
  
  // Delete from creatives namespace
  await index.namespace(PINECONE_NAMESPACE_CREATIVES).deleteMany([creativeId]);
  
  // Delete from frames namespace (delete by filter)
  // Note: This requires Pinecone serverless or pod with metadata filtering
  await index.namespace(PINECONE_NAMESPACE_FRAMES).deleteMany({
    filter: { creative_id: creativeId },
  });
}
