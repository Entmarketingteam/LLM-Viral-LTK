-- ============================================
-- BigQuery Setup Scripts
-- Run these in order in the BigQuery Console
-- ============================================

-- Step 1: Create Bronze External Table
-- This reads JSON files from Google Cloud Storage
CREATE OR REPLACE EXTERNAL TABLE `bolt-ltk-app.creator_pulse.bronze_ltk_raw`
OPTIONS (
  format = 'JSON',
  uris = ['gs://ltk-trending/*.json']
);

-- Step 2: Create Bronze Posts Table
-- This transforms the raw data into a structured format
CREATE OR REPLACE TABLE `bolt-ltk-app.creator_pulse.bronze_posts` AS
SELECT
  post_id,
  creator_handle,
  category,
  engagement_score,
  DATE(timestamp) AS post_date
FROM `bolt-ltk-app.creator_pulse.bronze_ltk_raw`;

-- Step 3: Create Gold Tables
-- Gold Viral Posts - Posts with calculated scores
CREATE OR REPLACE TABLE `bolt-ltk-app.creator_pulse.gold_viral_posts` AS
SELECT
  *,
  engagement_score * 1.0 AS score
FROM `bolt-ltk-app.creator_pulse.bronze_posts`;

-- Gold Creators - Aggregated creator statistics
CREATE OR REPLACE TABLE `bolt-ltk-app.creator_pulse.gold_creators` AS
SELECT
  creator_handle,
  AVG(score) AS avg_score,
  COUNT(*) AS post_count
FROM `bolt-ltk-app.creator_pulse.gold_viral_posts`
GROUP BY creator_handle;

