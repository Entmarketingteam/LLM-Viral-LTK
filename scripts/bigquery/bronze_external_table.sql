CREATE OR REPLACE EXTERNAL TABLE `creator_pulse.bronze_ltk_raw`
OPTIONS (
  format = 'JSON',
  uris = ['gs://ltk-trending/*.json']
);