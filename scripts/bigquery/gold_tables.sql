CREATE OR REPLACE TABLE `creator_pulse.gold_viral_posts` AS
SELECT
  *,
  engagement_score * 1.0 AS score
FROM `creator_pulse.bronze_posts`;

CREATE OR REPLACE TABLE `creator_pulse.gold_creators` AS
SELECT
  creator_handle,
  AVG(score) AS avg_score,
  COUNT(*) AS post_count
FROM `creator_pulse.gold_viral_posts`
GROUP BY creator_handle;