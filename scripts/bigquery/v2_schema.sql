-- ============================================================================
-- CREATIVE INTELLIGENCE PLATFORM - V2 SCHEMA
-- ============================================================================
-- Run this in BigQuery Console or via bq command line
-- Dataset: creator_pulse (already exists)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- TABLE: creatives
-- Core creative metadata - source of truth for all creatives
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `creator_pulse.creatives` (
  creative_id STRING NOT NULL,
  platform STRING NOT NULL,              -- 'meta_ads', 'tiktok', 'ltk', 'instagram'
  source_type STRING NOT NULL,           -- 'paid', 'organic', 'ugc'
  account_id STRING,
  campaign_id STRING,
  adset_id STRING,
  niche STRING NOT NULL,                 -- 'beauty', 'fashion', 'home', etc.
  media_type STRING NOT NULL,            -- 'image', 'video', 'carousel'
  duration_seconds FLOAT64,              -- NULL for images
  storage_uri STRING,                    -- GCS URI: gs://bucket/path/file.mp4
  thumbnail_uri STRING,                  -- GCS URI for thumbnail
  caption STRING,
  hashtags ARRAY<STRING>,
  creator_id STRING,
  creator_username STRING,
  created_at TIMESTAMP NOT NULL,
  ingested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
  
  -- Status tracking
  analysis_status STRING DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  analysis_started_at TIMESTAMP,
  analysis_completed_at TIMESTAMP
)
PARTITION BY DATE(created_at)
CLUSTER BY niche, platform, source_type;

-- ----------------------------------------------------------------------------
-- TABLE: creative_metrics_daily
-- Daily performance metrics for each creative
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `creator_pulse.creative_metrics_daily` (
  creative_id STRING NOT NULL,
  date DATE NOT NULL,
  
  -- Core metrics
  impressions INT64 DEFAULT 0,
  clicks INT64 DEFAULT 0,
  spend NUMERIC,                         -- In USD
  conversions INT64 DEFAULT 0,
  revenue NUMERIC,                       -- In USD
  
  -- Engagement (for organic)
  likes INT64 DEFAULT 0,
  comments INT64 DEFAULT 0,
  shares INT64 DEFAULT 0,
  saves INT64 DEFAULT 0,
  
  -- Video metrics
  video_views INT64 DEFAULT 0,
  video_completions INT64 DEFAULT 0,
  avg_watch_time_seconds FLOAT64,
  
  -- Timestamps
  ingested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
)
PARTITION BY date
CLUSTER BY creative_id;

-- ----------------------------------------------------------------------------
-- TABLE: creative_vision_features
-- Computer vision extracted features (SAM2 + CLIP)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `creator_pulse.creative_vision_features` (
  creative_id STRING NOT NULL,
  
  -- Shot/scene analysis
  num_shots INT64,                       -- Number of distinct shots/cuts
  avg_shot_length_sec FLOAT64,           -- Average shot duration
  
  -- Object detection timing
  first_face_appearance_sec FLOAT64,     -- When first face appears
  first_product_appearance_sec FLOAT64,  -- When first product appears
  product_on_screen_ratio FLOAT64,       -- % of frames with product visible
  face_on_screen_ratio FLOAT64,          -- % of frames with face visible
  
  -- Visual elements
  has_overlay_text BOOL DEFAULT FALSE,
  has_logo BOOL DEFAULT FALSE,
  has_captions BOOL DEFAULT FALSE,
  dominant_colors ARRAY<STRING>,         -- ['#FF5733', '#3366FF']
  
  -- Tags from CLIP/vision model
  scene_tags ARRAY<STRING>,              -- ['indoor', 'kitchen', 'lifestyle']
  style_tags ARRAY<STRING>,              -- ['minimal', 'bright', 'aesthetic']
  object_tags ARRAY<STRING>,             -- ['lipstick', 'mirror', 'skincare']
  
  -- Embedding info
  clip_embedding_id STRING,              -- Reference to Pinecone vector
  embedding_model STRING,                -- 'ViT-B/32', 'ViT-L/14', etc.
  
  -- Processing metadata
  processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
  model_version STRING,
  frames_analyzed INT64
)
CLUSTER BY creative_id;

-- ----------------------------------------------------------------------------
-- TABLE: creative_llm_annotations
-- LLM-generated annotations and scores
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `creator_pulse.creative_llm_annotations` (
  creative_id STRING NOT NULL,
  
  -- Hook analysis
  hook_type STRING,                      -- 'question', 'statement', 'shock', 'tutorial', 'story'
  hook_text STRING,                      -- Actual hook text/transcript
  hook_strength_score FLOAT64,           -- 0-1 score
  
  -- CTA analysis
  cta_type STRING,                       -- 'shop_now', 'link_bio', 'swipe_up', 'comment', 'none'
  cta_text STRING,
  cta_clarity_score FLOAT64,             -- 0-1 score
  cta_timestamp_sec FLOAT64,             -- When CTA appears
  
  -- Sentiment & tone
  sentiment_overall STRING,              -- 'positive', 'neutral', 'negative'
  sentiment_score FLOAT64,               -- -1 to 1
  emotional_tone_tags ARRAY<STRING>,     -- ['excited', 'calm', 'urgent', 'friendly']
  
  -- Pacing & structure
  pacing_style STRING,                   -- 'fast', 'medium', 'slow', 'dynamic'
  content_structure STRING,              -- 'problem_solution', 'tutorial', 'showcase', 'story'
  
  -- Transcript
  transcript_full STRING,
  transcript_first_5s STRING,
  transcript_language STRING,
  
  -- Virality prediction
  virality_score FLOAT64,                -- 0-1 model prediction
  virality_factors ARRAY<STRING>,        -- ['strong_hook', 'clear_cta', 'trending_audio']
  
  -- Model versioning (critical for iteration)
  model_name STRING NOT NULL,            -- 'gpt-4o', 'claude-3-opus', etc.
  prompt_version STRING NOT NULL,        -- 'v1.0', 'v1.1', etc.
  annotation_version STRING NOT NULL,    -- Allows re-running with new prompts
  
  -- Processing metadata
  processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
  processing_time_ms INT64,
  token_count INT64
)
CLUSTER BY creative_id;

-- ----------------------------------------------------------------------------
-- TABLE: frame_embeddings_meta
-- Metadata for frame-level embeddings stored in Pinecone
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `creator_pulse.frame_embeddings_meta` (
  creative_id STRING NOT NULL,
  frame_id STRING NOT NULL,              -- '{creative_id}_frame_{n}'
  
  -- Frame info
  frame_number INT64,
  timestamp_sec FLOAT64,
  
  -- Pinecone reference
  pinecone_id STRING NOT NULL,           -- ID in Pinecone index
  pinecone_namespace STRING DEFAULT 'frames',
  
  -- Embedding info
  embedding_model STRING,                -- 'ViT-B/32'
  embedding_dim INT64,                   -- 512, 768, 1024
  
  -- Frame features (quick lookup without Pinecone)
  is_keyframe BOOL DEFAULT FALSE,
  has_face BOOL DEFAULT FALSE,
  has_product BOOL DEFAULT FALSE,
  has_text BOOL DEFAULT FALSE,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
)
CLUSTER BY creative_id;

-- ============================================================================
-- VIEWS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- VIEW: v_creative_performance
-- Joins creatives with aggregated metrics and annotations
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW `creator_pulse.v_creative_performance` AS
SELECT
  c.creative_id,
  c.platform,
  c.source_type,
  c.niche,
  c.media_type,
  c.duration_seconds,
  c.creator_username,
  c.created_at,
  c.storage_uri,
  c.thumbnail_uri,
  c.caption,
  
  -- Aggregated metrics (last 30 days)
  SUM(m.impressions) AS total_impressions,
  SUM(m.clicks) AS total_clicks,
  SUM(m.spend) AS total_spend,
  SUM(m.conversions) AS total_conversions,
  SUM(m.revenue) AS total_revenue,
  SUM(m.likes) AS total_likes,
  SUM(m.comments) AS total_comments,
  SUM(m.shares) AS total_shares,
  SUM(m.saves) AS total_saves,
  
  -- Calculated metrics
  SAFE_DIVIDE(SUM(m.clicks), SUM(m.impressions)) AS ctr,
  SAFE_DIVIDE(SUM(m.spend) * 1000, SUM(m.impressions)) AS cpm,
  SAFE_DIVIDE(SUM(m.spend), SUM(m.clicks)) AS cpc,
  SAFE_DIVIDE(SUM(m.conversions), SUM(m.clicks)) AS cvr,
  SAFE_DIVIDE(SUM(m.revenue), SUM(m.spend)) AS roas,
  
  -- Engagement rate (for organic)
  SAFE_DIVIDE(
    SUM(m.likes) + SUM(m.comments) + SUM(m.shares) + SUM(m.saves),
    SUM(m.impressions)
  ) AS engagement_rate,
  
  -- LLM annotations
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

FROM `creator_pulse.creatives` c
LEFT JOIN `creator_pulse.creative_metrics_daily` m 
  ON c.creative_id = m.creative_id
  AND m.date >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
LEFT JOIN `creator_pulse.creative_llm_annotations` a 
  ON c.creative_id = a.creative_id
LEFT JOIN `creator_pulse.creative_vision_features` v 
  ON c.creative_id = v.creative_id
GROUP BY
  c.creative_id, c.platform, c.source_type, c.niche, c.media_type,
  c.duration_seconds, c.creator_username, c.created_at, c.storage_uri,
  c.thumbnail_uri, c.caption,
  a.hook_type, a.hook_strength_score, a.cta_type, a.cta_clarity_score,
  a.sentiment_overall, a.pacing_style, a.virality_score,
  v.num_shots, v.first_product_appearance_sec, v.product_on_screen_ratio,
  v.scene_tags, v.style_tags;

-- ----------------------------------------------------------------------------
-- VIEW: v_viral_creatives
-- Top performing creatives by niche (organic viral detection)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW `creator_pulse.v_viral_creatives` AS
WITH ranked AS (
  SELECT
    *,
    -- Rank by engagement within niche
    PERCENT_RANK() OVER (
      PARTITION BY niche, platform 
      ORDER BY engagement_rate DESC
    ) AS engagement_percentile,
    -- Rank by ROAS for paid
    PERCENT_RANK() OVER (
      PARTITION BY niche, platform 
      ORDER BY roas DESC
    ) AS roas_percentile
  FROM `creator_pulse.v_creative_performance`
  WHERE total_impressions >= 1000  -- Minimum threshold
)
SELECT
  *,
  CASE
    WHEN engagement_percentile >= 0.9 OR roas_percentile >= 0.9 THEN 'top10pc'
    WHEN engagement_percentile >= 0.5 OR roas_percentile >= 0.5 THEN 'mid'
    ELSE 'bottom50pc'
  END AS performance_bucket
FROM ranked
WHERE engagement_percentile >= 0.7 OR roas_percentile >= 0.7;

-- ----------------------------------------------------------------------------
-- VIEW: v_top_creators
-- Aggregated creator performance
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW `creator_pulse.v_top_creators` AS
SELECT
  creator_username,
  niche,
  platform,
  COUNT(DISTINCT creative_id) AS creative_count,
  AVG(engagement_rate) AS avg_engagement_rate,
  AVG(roas) AS avg_roas,
  SUM(total_impressions) AS total_impressions,
  AVG(hook_strength_score) AS avg_hook_strength,
  AVG(virality_score) AS avg_virality_score
FROM `creator_pulse.v_creative_performance`
WHERE creator_username IS NOT NULL
GROUP BY creator_username, niche, platform
HAVING creative_count >= 3;
