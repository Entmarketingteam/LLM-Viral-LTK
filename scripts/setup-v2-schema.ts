#!/usr/bin/env tsx
/**
 * Setup V2 Schema in BigQuery
 * 
 * This script:
 * 1. Creates all new tables from v2_schema.sql
 * 2. Inserts test data to verify everything works
 * 
 * Usage:
 *   npx tsx scripts/setup-v2-schema.ts
 *   npx tsx scripts/setup-v2-schema.ts --test-data
 */

import { BigQuery } from '@google-cloud/bigquery';
import * as fs from 'fs';
import * as path from 'path';
import 'dotenv/config';

const bigquery = new BigQuery({
  projectId: process.env.GOOGLE_PROJECT_ID,
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
});

const DATASET = 'creator_pulse';
const PROJECT_ID = process.env.GOOGLE_PROJECT_ID || 'bolt-ltk-app';

// Test data for verification
const TEST_CREATIVE = {
  creative_id: 'test_creative_001',
  platform: 'ltk',
  source_type: 'organic',
  account_id: 'test_account',
  niche: 'beauty',
  media_type: 'video',
  duration_seconds: 45.5,
  storage_uri: 'gs://ltk-trending/test/video_001.mp4',
  thumbnail_uri: 'gs://ltk-trending/test/thumb_001.jpg',
  caption: 'Testing the new schema! #beauty #skincare',
  hashtags: ['beauty', 'skincare'],
  creator_id: 'creator_123',
  creator_username: 'test_creator',
  created_at: new Date().toISOString(),
};

const TEST_METRICS = {
  creative_id: 'test_creative_001',
  date: new Date().toISOString().split('T')[0],
  impressions: 10000,
  clicks: 500,
  likes: 1200,
  comments: 85,
  shares: 45,
  saves: 320,
  video_views: 8500,
};

const TEST_VISION_FEATURES = {
  creative_id: 'test_creative_001',
  num_shots: 5,
  avg_shot_length_sec: 9.1,
  first_face_appearance_sec: 0.5,
  first_product_appearance_sec: 2.3,
  product_on_screen_ratio: 0.65,
  face_on_screen_ratio: 0.8,
  has_overlay_text: true,
  has_logo: false,
  scene_tags: ['indoor', 'bathroom', 'lifestyle'],
  style_tags: ['minimal', 'bright', 'clean'],
  object_tags: ['skincare', 'serum', 'mirror'],
  embedding_model: 'ViT-B/32',
  model_version: 'sam2-v1.0',
  frames_analyzed: 45,
};

const TEST_LLM_ANNOTATIONS = {
  creative_id: 'test_creative_001',
  hook_type: 'question',
  hook_text: 'Want to know my secret for glowing skin?',
  hook_strength_score: 0.85,
  cta_type: 'link_bio',
  cta_text: 'Link in bio for the full routine!',
  cta_clarity_score: 0.9,
  cta_timestamp_sec: 42.0,
  sentiment_overall: 'positive',
  sentiment_score: 0.75,
  emotional_tone_tags: ['excited', 'friendly', 'helpful'],
  pacing_style: 'medium',
  content_structure: 'tutorial',
  transcript_first_5s: 'Want to know my secret for glowing skin?',
  transcript_language: 'en',
  virality_score: 0.72,
  virality_factors: ['strong_hook', 'clear_cta', 'trending_topic'],
  model_name: 'gpt-4o',
  prompt_version: 'v1.0',
  annotation_version: 'v1.0',
};

/**
 * Run SQL statements from file
 */
async function runSchema(): Promise<void> {
  console.log('📊 Setting up V2 Schema in BigQuery...\n');
  
  const sqlPath = path.join(__dirname, 'bigquery', 'v2_schema.sql');
  const sql = fs.readFileSync(sqlPath, 'utf-8');
  
  // Split by semicolons but keep CREATE OR REPLACE VIEW statements together
  const statements = sql
    .split(/;\s*\n/)
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));
  
  console.log(`Found ${statements.length} SQL statements to execute\n`);
  
  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    const firstLine = stmt.split('\n')[0].substring(0, 60);
    
    console.log(`[${i + 1}/${statements.length}] ${firstLine}...`);
    
    try {
      await bigquery.query({ query: stmt });
      console.log('   ✅ Success\n');
    } catch (error: any) {
      // Ignore "already exists" errors
      if (error.message?.includes('Already Exists')) {
        console.log('   ⚠️  Already exists (skipping)\n');
      } else {
        console.error(`   ❌ Error: ${error.message}\n`);
        throw error;
      }
    }
  }
  
  console.log('✅ Schema setup complete!\n');
}

/**
 * Insert test data to verify tables work
 */
async function insertTestData(): Promise<void> {
  console.log('🧪 Inserting test data...\n');
  
  const tables = [
    { name: 'creatives', data: TEST_CREATIVE },
    { name: 'creative_metrics_daily', data: TEST_METRICS },
    { name: 'creative_vision_features', data: TEST_VISION_FEATURES },
    { name: 'creative_llm_annotations', data: TEST_LLM_ANNOTATIONS },
  ];
  
  for (const { name, data } of tables) {
    console.log(`Inserting into ${name}...`);
    
    try {
      const table = bigquery.dataset(DATASET).table(name);
      await table.insert([data]);
      console.log(`   ✅ Inserted into ${name}\n`);
    } catch (error: any) {
      if (error.name === 'PartialFailureError') {
        console.log(`   ⚠️  Partial failure (might be duplicate): ${error.errors?.[0]?.errors?.[0]?.message}\n`);
      } else {
        console.error(`   ❌ Error: ${error.message}\n`);
      }
    }
  }
}

/**
 * Verify tables exist and query test data
 */
async function verifySetup(): Promise<void> {
  console.log('🔍 Verifying setup...\n');
  
  const tables = [
    'creatives',
    'creative_metrics_daily',
    'creative_vision_features',
    'creative_llm_annotations',
    'frame_embeddings_meta',
  ];
  
  for (const table of tables) {
    try {
      const [rows] = await bigquery.query({
        query: `SELECT COUNT(*) as count FROM \`${PROJECT_ID}.${DATASET}.${table}\``,
      });
      console.log(`   ✅ ${table}: ${rows[0].count} rows`);
    } catch (error: any) {
      console.log(`   ❌ ${table}: ${error.message}`);
    }
  }
  
  // Test the view
  console.log('\n📊 Testing v_creative_performance view...');
  try {
    const [rows] = await bigquery.query({
      query: `
        SELECT creative_id, platform, niche, total_impressions, engagement_rate
        FROM \`${PROJECT_ID}.${DATASET}.v_creative_performance\`
        LIMIT 5
      `,
    });
    console.log(`   ✅ View works! Found ${rows.length} rows`);
    if (rows.length > 0) {
      console.log('   Sample row:', JSON.stringify(rows[0], null, 2));
    }
  } catch (error: any) {
    console.log(`   ❌ View error: ${error.message}`);
  }
}

/**
 * Clean up test data
 */
async function cleanupTestData(): Promise<void> {
  console.log('\n🧹 Cleaning up test data...');
  
  const tables = [
    'creative_llm_annotations',
    'creative_vision_features',
    'creative_metrics_daily',
    'frame_embeddings_meta',
    'creatives',
  ];
  
  for (const table of tables) {
    try {
      await bigquery.query({
        query: `DELETE FROM \`${PROJECT_ID}.${DATASET}.${table}\` WHERE creative_id = 'test_creative_001'`,
      });
      console.log(`   ✅ Cleaned ${table}`);
    } catch (error: any) {
      console.log(`   ⚠️  ${table}: ${error.message}`);
    }
  }
}

/**
 * Main
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const insertTest = args.includes('--test-data');
  const cleanup = args.includes('--cleanup');
  const verifyOnly = args.includes('--verify');
  
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  Creative Intelligence Platform - V2 Schema Setup');
  console.log('═══════════════════════════════════════════════════════════\n');
  console.log(`Project: ${PROJECT_ID}`);
  console.log(`Dataset: ${DATASET}\n`);
  
  if (cleanup) {
    await cleanupTestData();
    return;
  }
  
  if (verifyOnly) {
    await verifySetup();
    return;
  }
  
  // Run schema
  await runSchema();
  
  // Insert test data if requested
  if (insertTest) {
    await insertTestData();
  }
  
  // Verify
  await verifySetup();
  
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  Setup Complete!');
  console.log('═══════════════════════════════════════════════════════════\n');
  console.log('Next steps:');
  console.log('  1. Run with --test-data to insert sample data');
  console.log('  2. Run with --verify to check table status');
  console.log('  3. Run with --cleanup to remove test data\n');
}

main().catch(console.error);
