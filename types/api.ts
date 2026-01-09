import { z } from 'zod';

// ============================================================================
// INGESTION API TYPES
// ============================================================================

/**
 * POST /v1/ingestion/creative - Register a creative
 */
export const CreateCreativeSchema = z.object({
  creative_id: z.string().min(1),
  platform: z.string().min(1),  // 'meta_ads', 'tiktok', 'ltk', 'instagram'
  source_type: z.enum(['paid', 'organic', 'ugc']),
  account_id: z.string().optional(),
  campaign_id: z.string().optional().nullable(),
  adset_id: z.string().optional().nullable(),
  niche: z.string().min(1),
  media_type: z.enum(['image', 'video', 'carousel']),
  duration_seconds: z.number().optional().nullable(),
  storage_uri: z.string().min(1),  // GCS URI
  thumbnail_uri: z.string().optional(),
  caption: z.string().optional(),
  hashtags: z.array(z.string()).optional(),
  creator_id: z.string().optional(),
  creator_username: z.string().optional(),
  created_at: z.string().datetime().optional(),  // ISO 8601
});

export type CreateCreativeRequest = z.infer<typeof CreateCreativeSchema>;

export interface CreateCreativeResponse {
  creative_id: string;
  status: 'accepted';
  analysis_queued: boolean;
}

/**
 * POST /v1/ingestion/metrics - Ingest daily metrics
 */
export const IngestMetricsSchema = z.object({
  rows: z.array(z.object({
    creative_id: z.string().min(1),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),  // YYYY-MM-DD
    impressions: z.number().int().min(0),
    clicks: z.number().int().min(0).optional(),
    spend: z.number().min(0).optional().nullable(),
    conversions: z.number().int().min(0).optional(),
    revenue: z.number().min(0).optional().nullable(),
    likes: z.number().int().min(0).optional(),
    comments: z.number().int().min(0).optional(),
    shares: z.number().int().min(0).optional(),
    saves: z.number().int().min(0).optional(),
    video_views: z.number().int().min(0).optional(),
    video_completions: z.number().int().min(0).optional(),
    avg_watch_time_seconds: z.number().min(0).optional(),
  })),
});

export type IngestMetricsRequest = z.infer<typeof IngestMetricsSchema>;

export interface IngestMetricsResponse {
  rows_inserted: number;
  status: 'success' | 'partial';
  errors?: string[];
}

/**
 * POST /v1/ingestion/platform-sync - Trigger platform sync
 */
export const PlatformSyncSchema = z.object({
  platform: z.string().min(1),
  account_id: z.string().min(1),
  sync_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  sync_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
});

export type PlatformSyncRequest = z.infer<typeof PlatformSyncSchema>;

export interface PlatformSyncResponse {
  sync_id: string;
  status: 'started';
  platform: string;
  account_id: string;
}

// ============================================================================
// DATA API TYPES
// ============================================================================

/**
 * GET /v1/creatives/top - Top performing creatives
 */
export interface TopCreativesParams {
  niche: string;
  platform?: string;
  source_type?: 'paid' | 'organic' | 'ugc';
  interval_days?: number;  // default 30
  limit?: number;  // default 20
  sort_by?: 'roas' | 'engagement_rate' | 'impressions' | 'virality_score';
}

export interface CreativeWithMetrics {
  creative_id: string;
  platform: string;
  source_type: string;
  niche: string;
  media_type: string;
  duration_seconds: number | null;
  creator_username: string | null;
  storage_uri: string;
  thumbnail_uri: string | null;
  caption: string | null;
  created_at: string;
  
  // Aggregated metrics
  metrics: {
    impressions: number;
    clicks: number;
    spend: number | null;
    conversions: number;
    revenue: number | null;
    likes: number;
    comments: number;
    shares: number;
    saves: number;
    ctr: number | null;
    cpm: number | null;
    roas: number | null;
    engagement_rate: number | null;
  };
  
  // LLM annotations
  annotations: {
    hook_type: string | null;
    hook_strength_score: number | null;
    cta_type: string | null;
    cta_clarity_score: number | null;
    sentiment_overall: string | null;
    pacing_style: string | null;
    virality_score: number | null;
  } | null;
  
  // Vision features (optional)
  vision_features?: {
    num_shots: number | null;
    first_product_appearance_sec: number | null;
    product_on_screen_ratio: number | null;
    scene_tags: string[];
    style_tags: string[];
  } | null;
}

export interface TopCreativesResponse {
  items: CreativeWithMetrics[];
  total: number;
  params: TopCreativesParams;
}

/**
 * GET /v1/creatives/viral - Viral creatives
 */
export interface ViralCreativesParams {
  niche: string;
  platform?: string;
  source_type?: 'paid' | 'organic' | 'ugc';
  interval_days?: number;
  limit?: number;
}

export interface ViralCreativesResponse {
  items: (CreativeWithMetrics & { performance_bucket: string })[];
  total: number;
}

/**
 * GET /v1/creatives/:creative_id - Single creative details
 */
export interface CreativeDetailResponse {
  creative: {
    creative_id: string;
    platform: string;
    source_type: string;
    niche: string;
    media_type: string;
    duration_seconds: number | null;
    storage_uri: string;
    thumbnail_uri: string | null;
    caption: string | null;
    hashtags: string[];
    creator_username: string | null;
    created_at: string;
    analysis_status: string;
  };
  metrics: {
    impressions: number;
    clicks: number;
    spend: number | null;
    conversions: number;
    revenue: number | null;
    likes: number;
    comments: number;
    shares: number;
    saves: number;
    ctr: number | null;
    roas: number | null;
    engagement_rate: number | null;
  };
  vision_features: {
    num_shots: number | null;
    avg_shot_length_sec: number | null;
    first_face_appearance_sec: number | null;
    first_product_appearance_sec: number | null;
    product_on_screen_ratio: number | null;
    has_overlay_text: boolean;
    scene_tags: string[];
    style_tags: string[];
    object_tags: string[];
  } | null;
  annotations: {
    hook_type: string | null;
    hook_text: string | null;
    hook_strength_score: number | null;
    cta_type: string | null;
    cta_text: string | null;
    cta_clarity_score: number | null;
    sentiment_overall: string | null;
    emotional_tone_tags: string[];
    pacing_style: string | null;
    content_structure: string | null;
    transcript_first_5s: string | null;
    virality_score: number | null;
    virality_factors: string[];
  } | null;
}

/**
 * GET /v1/creatives/:creative_id/similar - Similar creatives
 */
export interface SimilarCreativesParams {
  niche?: string;
  platform?: string;
  top_k?: number;  // default 10
  min_performance_bucket?: 'top10pc' | 'mid';  // filter by performance
}

export interface SimilarCreativeResult {
  creative_id: string;
  similarity_score: number;
  platform: string;
  niche: string;
  thumbnail_uri: string | null;
  hook_type: string | null;
  performance_bucket: string | null;
}

export interface SimilarCreativesResponse {
  seed_creative_id: string;
  similar: SimilarCreativeResult[];
}

// ============================================================================
// VECTOR SERVICE TYPES
// ============================================================================

/**
 * POST /v1/vectors/upsert
 */
export const VectorUpsertSchema = z.object({
  namespace: z.string().default('creatives'),
  vectors: z.array(z.object({
    id: z.string().min(1),
    values: z.array(z.number()),
    metadata: z.record(z.unknown()).optional(),
  })),
});

export type VectorUpsertRequest = z.infer<typeof VectorUpsertSchema>;

export interface VectorUpsertResponse {
  upserted_count: number;
}

/**
 * POST /v1/vectors/query
 */
export const VectorQuerySchema = z.object({
  namespace: z.string().default('creatives'),
  vector: z.array(z.number()),
  top_k: z.number().int().min(1).max(100).default(10),
  filter: z.record(z.unknown()).optional(),
});

export type VectorQueryRequest = z.infer<typeof VectorQuerySchema>;

export interface VectorQueryResponse {
  matches: Array<{
    id: string;
    score: number;
    metadata?: Record<string, unknown>;
  }>;
}

// ============================================================================
// COMMON TYPES
// ============================================================================

export interface APIError {
  error: string;
  message: string;
  details?: unknown;
}

export type Platform = 'meta_ads' | 'tiktok' | 'ltk' | 'instagram' | 'youtube';
export type SourceType = 'paid' | 'organic' | 'ugc';
export type MediaType = 'image' | 'video' | 'carousel';
export type PerformanceBucket = 'top10pc' | 'mid' | 'bottom50pc';

export const NICHES = [
  'beauty',
  'fashion',
  'home',
  'fitness',
  'food',
  'travel',
  'tech',
  'parenting',
  'lifestyle',
  'finance',
] as const;

export type Niche = typeof NICHES[number];
