#!/usr/bin/env tsx
/**
 * Generate Mock Data for Testing
 * 
 * Creates realistic mock data for testing the V2 APIs without GCP
 * 
 * Usage:
 *   npx tsx scripts/generate-mock-data.ts
 *   npx tsx scripts/generate-mock-data.ts --count 50
 */

import * as fs from 'fs';
import * as path from 'path';

const OUTPUT_DIR = path.join(process.cwd(), 'data', 'mock');
const NICHES = ['beauty', 'fashion', 'home', 'fitness', 'food', 'travel'];
const PLATFORMS = ['ltk', 'meta_ads', 'tiktok', 'instagram'];
const SOURCE_TYPES = ['paid', 'organic', 'ugc'] as const;
const HOOK_TYPES = ['question', 'statement', 'shock', 'tutorial', 'story'];
const CTA_TYPES = ['shop_now', 'link_bio', 'swipe_up', 'comment', 'none'];
const SENTIMENTS = ['positive', 'neutral', 'negative'];
const PACING_STYLES = ['fast', 'medium', 'slow', 'dynamic'];

/**
 * Generate random number in range
 */
function random(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDate(daysAgo: number = 30): string {
  const date = new Date();
  date.setDate(date.getDate() - random(0, daysAgo));
  return date.toISOString().split('T')[0];
}

function randomTimestamp(daysAgo: number = 30): string {
  const date = new Date();
  date.setDate(date.getDate() - random(0, daysAgo));
  date.setHours(random(0, 23), random(0, 59), random(0, 59));
  return date.toISOString();
}

/**
 * Generate mock creative
 */
function generateCreative(index: number) {
  const niche = randomChoice(NICHES);
  const platform = randomChoice(PLATFORMS);
  const sourceType = randomChoice(SOURCE_TYPES);
  const mediaType = randomChoice(['image', 'video', 'carousel']);
  
  return {
    creative_id: `mock_creative_${String(index).padStart(4, '0')}`,
    platform,
    source_type: sourceType,
    account_id: `account_${random(1, 10)}`,
    campaign_id: sourceType === 'paid' ? `campaign_${random(1, 5)}` : null,
    adset_id: sourceType === 'paid' ? `adset_${random(1, 10)}` : null,
    niche,
    media_type: mediaType,
    duration_seconds: mediaType === 'video' ? random(15, 120) : null,
    storage_uri: `gs://ltk-trending/mock/${platform}/${niche}/creative_${index}.${mediaType === 'video' ? 'mp4' : 'jpg'}`,
    thumbnail_uri: `gs://ltk-trending/mock/${platform}/${niche}/thumb_${index}.jpg`,
    caption: `Check out this amazing ${niche} find! #${niche} #fashion #trending`,
    hashtags: [niche, 'fashion', 'trending', 'style'],
    creator_id: `creator_${random(1, 50)}`,
    creator_username: `creator_${random(1, 50)}`,
    created_at: randomTimestamp(60),
  };
}

/**
 * Generate mock metrics for a creative
 */
function generateMetrics(creativeId: string, days: number = 30) {
  const metrics = [];
  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    // Simulate performance decay over time
    const decay = 1 - (i / days) * 0.5;
    
    const impressions = Math.floor(random(100, 10000) * decay);
    const clicks = Math.floor(impressions * random(1, 5) / 100);
    const spend = impressions > 1000 ? random(10, 500) * decay : null;
    const conversions = clicks > 0 ? Math.floor(clicks * random(1, 10) / 100) : 0;
    const revenue = conversions > 0 ? random(50, 500) * conversions : null;
    
    metrics.push({
      creative_id: creativeId,
      date: dateStr,
      impressions,
      clicks,
      spend,
      conversions,
      revenue,
      likes: Math.floor(impressions * random(2, 8) / 100),
      comments: Math.floor(impressions * random(0.5, 2) / 100),
      shares: Math.floor(impressions * random(0.1, 1) / 100),
      saves: Math.floor(impressions * random(1, 5) / 100),
      video_views: impressions,
      video_completions: Math.floor(impressions * random(30, 70) / 100),
      avg_watch_time_seconds: random(10, 45),
    });
  }
  return metrics;
}

/**
 * Generate mock vision features
 */
function generateVisionFeatures(creativeId: string, mediaType: string) {
  const isVideo = mediaType === 'video';
  
  return {
    creative_id: creativeId,
    num_shots: isVideo ? random(3, 10) : 1,
    avg_shot_length_sec: isVideo ? random(3, 15) : null,
    first_face_appearance_sec: random(0, 5),
    first_product_appearance_sec: random(1, 10),
    product_on_screen_ratio: random(30, 90) / 100,
    face_on_screen_ratio: random(40, 100) / 100,
    has_overlay_text: random(0, 1) === 1,
    has_logo: random(0, 1) === 0,
    has_captions: isVideo && random(0, 1) === 1,
    dominant_colors: [`#${random(0, 0xFFFFFF).toString(16).padStart(6, '0')}`, `#${random(0, 0xFFFFFF).toString(16).padStart(6, '0')}`],
    scene_tags: randomChoice([
      ['indoor', 'kitchen', 'lifestyle'],
      ['outdoor', 'beach', 'summer'],
      ['studio', 'minimal', 'professional'],
      ['home', 'cozy', 'aesthetic'],
    ]),
    style_tags: randomChoice([
      ['minimal', 'bright', 'clean'],
      ['vibrant', 'colorful', 'energetic'],
      ['dark', 'moody', 'dramatic'],
      ['soft', 'pastel', 'gentle'],
    ]),
    object_tags: randomChoice([
      ['skincare', 'serum', 'mirror'],
      ['dress', 'shoes', 'accessories'],
      ['furniture', 'decor', 'plants'],
      ['dumbbells', 'yoga', 'fitness'],
    ]),
    clip_embedding_id: creativeId,
    embedding_model: 'ViT-B/32',
    model_version: 'sam2-v1.0',
    frames_analyzed: isVideo ? random(30, 120) : 1,
  };
}

/**
 * Generate mock LLM annotations
 */
function generateLLMAnnotations(creativeId: string) {
  const hookType = randomChoice(HOOK_TYPES);
  const ctaType = randomChoice(CTA_TYPES);
  
  return {
    creative_id: creativeId,
    hook_type: hookType,
    hook_text: randomChoice([
      'Want to know my secret for glowing skin?',
      'This changed everything for me!',
      'You NEED to see this!',
      'I found the perfect solution',
      'This is a game changer',
    ]),
    hook_strength_score: random(60, 95) / 100,
    cta_type: ctaType,
    cta_text: randomChoice([
      'Link in bio for the full routine!',
      'Shop now and save 20%!',
      'Swipe up to see more',
      'Comment your favorite!',
      'Check out my latest post',
    ]),
    cta_clarity_score: random(70, 100) / 100,
    cta_timestamp_sec: random(30, 60),
    sentiment_overall: randomChoice(SENTIMENTS),
    sentiment_score: random(-50, 100) / 100,
    emotional_tone_tags: randomChoice([
      ['excited', 'friendly', 'helpful'],
      ['calm', 'professional', 'trustworthy'],
      ['urgent', 'energetic', 'motivational'],
      ['warm', 'inviting', 'welcoming'],
    ]),
    pacing_style: randomChoice(PACING_STYLES),
    content_structure: randomChoice(['problem_solution', 'tutorial', 'showcase', 'story']),
    transcript_full: 'This is a full transcript of the video content...',
    transcript_first_5s: 'Want to know my secret for glowing skin?',
    transcript_language: 'en',
    virality_score: random(50, 90) / 100,
    virality_factors: randomChoice([
      ['strong_hook', 'clear_cta', 'trending_topic'],
      ['emotional_appeal', 'visual_quality', 'timing'],
      ['influencer_credibility', 'product_demo', 'social_proof'],
    ]),
    model_name: 'gpt-4o',
    prompt_version: 'v1.0',
    annotation_version: 'v1.0',
  };
}

/**
 * Generate mock embedding vector
 */
function generateEmbedding(dimensions: number = 512): number[] {
  // Generate normalized random vector
  const vector = Array.from({ length: dimensions }, () => (Math.random() - 0.5) * 2);
  const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
  return vector.map(v => v / magnitude);
}

/**
 * Main
 */
async function main() {
  const args = process.argv.slice(2);
  const count = parseInt(args.find(a => a.startsWith('--count='))?.split('=')[1] || '20');
  
  console.log('🎲 Generating Mock Data...\n');
  console.log(`   Count: ${count} creatives`);
  console.log(`   Output: ${OUTPUT_DIR}\n`);
  
  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  
  const creatives = [];
  const allMetrics = [];
  const visionFeatures = [];
  const annotations = [];
  const embeddings = [];
  
  for (let i = 1; i <= count; i++) {
    const creative = generateCreative(i);
    creatives.push(creative);
    
    // Generate related data
    allMetrics.push(...generateMetrics(creative.creative_id, 30));
    visionFeatures.push(generateVisionFeatures(creative.creative_id, creative.media_type));
    annotations.push(generateLLMAnnotations(creative.creative_id));
    
    // Generate embedding
    const embedding = generateEmbedding(512);
    embeddings.push({
      id: creative.creative_id,
      values: embedding,
      metadata: {
        creative_id: creative.creative_id,
        platform: creative.platform,
        niche: creative.niche,
        media_type: creative.media_type,
        source_type: creative.source_type,
        created_at_epoch: Math.floor(new Date(creative.created_at).getTime() / 1000),
      },
    });
    
    if (i % 10 === 0) {
      console.log(`   Generated ${i}/${count} creatives...`);
    }
  }
  
  // Write files
  console.log('\n💾 Writing files...\n');
  
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'creatives.json'),
    JSON.stringify(creatives, null, 2)
  );
  console.log(`   ✅ creatives.json (${creatives.length} items)`);
  
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'metrics.json'),
    JSON.stringify(allMetrics, null, 2)
  );
  console.log(`   ✅ metrics.json (${allMetrics.length} items)`);
  
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'vision_features.json'),
    JSON.stringify(visionFeatures, null, 2)
  );
  console.log(`   ✅ vision_features.json (${visionFeatures.length} items)`);
  
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'annotations.json'),
    JSON.stringify(annotations, null, 2)
  );
  console.log(`   ✅ annotations.json (${annotations.length} items)`);
  
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'embeddings.json'),
    JSON.stringify(embeddings, null, 2)
  );
  console.log(`   ✅ embeddings.json (${embeddings.length} items)`);
  
  // Create sample API request files
  const sampleIngestion = {
    creative: creatives[0],
    metrics: allMetrics.filter(m => m.creative_id === creatives[0].creative_id).slice(0, 7),
  };
  
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'sample-ingestion-request.json'),
    JSON.stringify(sampleIngestion, null, 2)
  );
  console.log(`   ✅ sample-ingestion-request.json`);
  
  console.log('\n✅ Mock data generation complete!\n');
  console.log('Next steps:');
  console.log('  1. Use these files to test your APIs');
  console.log('  2. Import into BigQuery when GCP is set up');
  console.log('  3. Use embeddings.json to test Pinecone\n');
}

main().catch(console.error);
