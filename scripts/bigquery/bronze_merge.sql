CREATE OR REPLACE TABLE `creator_pulse.bronze_posts` AS
SELECT
  post_id,
  creator_handle,
  category,
  engagement_score,
  DATE(timestamp) AS post_date
FROM `creator_pulse.bronze_ltk_raw`;