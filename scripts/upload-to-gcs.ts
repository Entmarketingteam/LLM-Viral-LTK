#!/usr/bin/env tsx
/**
 * Upload Scraped LTK Data to Google Cloud Storage
 *
 * This script uploads scraped JSON data to GCS, making it available
 * for the BigQuery external table to process.
 *
 * Usage:
 *   npx tsx scripts/upload-to-gcs.ts                    # Upload latest file
 *   npx tsx scripts/upload-to-gcs.ts --file data.json  # Upload specific file
 *   npx tsx scripts/upload-to-gcs.ts --all              # Upload all scraped files
 */

import { Storage } from '@google-cloud/storage';
import * as fs from 'fs';
import * as path from 'path';
import 'dotenv/config';

// Configuration
const CONFIG = {
  projectId: process.env.GCP_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || 'bolt-ltk-app',
  bucketName: process.env.GCS_BUCKET || 'ltk-trending',
  scrapedDir: path.join(process.cwd(), 'data', 'scraped'),
  gcsPrefix: 'scraped/', // Folder prefix in GCS
};

// Initialize Storage client
const storage = new Storage({
  projectId: CONFIG.projectId,
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
});

/**
 * Get the most recently modified JSON file in the scraped directory
 */
function getLatestFile(): string | null {
  if (!fs.existsSync(CONFIG.scrapedDir)) {
    console.error(`❌ Directory not found: ${CONFIG.scrapedDir}`);
    return null;
  }

  const files = fs.readdirSync(CONFIG.scrapedDir)
    .filter(f => f.endsWith('.json'))
    .map(f => ({
      name: f,
      path: path.join(CONFIG.scrapedDir, f),
      mtime: fs.statSync(path.join(CONFIG.scrapedDir, f)).mtime,
    }))
    .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

  return files.length > 0 ? files[0].path : null;
}

/**
 * Get all JSON files in the scraped directory
 */
function getAllFiles(): string[] {
  if (!fs.existsSync(CONFIG.scrapedDir)) {
    return [];
  }

  return fs.readdirSync(CONFIG.scrapedDir)
    .filter(f => f.endsWith('.json'))
    .map(f => path.join(CONFIG.scrapedDir, f));
}

/**
 * Upload a single file to GCS
 */
async function uploadFile(localPath: string): Promise<void> {
  const filename = path.basename(localPath);
  const gcsPath = `${CONFIG.gcsPrefix}${filename}`;

  console.log(`📤 Uploading: ${filename}`);
  console.log(`   Local: ${localPath}`);
  console.log(`   GCS: gs://${CONFIG.bucketName}/${gcsPath}`);

  try {
    const bucket = storage.bucket(CONFIG.bucketName);

    // Check if bucket exists
    const [exists] = await bucket.exists();
    if (!exists) {
      console.log(`   Creating bucket: ${CONFIG.bucketName}`);
      await storage.createBucket(CONFIG.bucketName, {
        location: 'US',
        storageClass: 'STANDARD',
      });
    }

    // Upload file
    await bucket.upload(localPath, {
      destination: gcsPath,
      metadata: {
        contentType: 'application/json',
        metadata: {
          uploadedAt: new Date().toISOString(),
          source: 'ltk-scraper',
        },
      },
    });

    // Get file info
    const [metadata] = await bucket.file(gcsPath).getMetadata();
    const sizeKB = Math.round((metadata.size as number) / 1024);

    console.log(`   ✅ Uploaded successfully (${sizeKB} KB)`);
  } catch (error: any) {
    console.error(`   ❌ Upload failed: ${error.message}`);
    throw error;
  }
}

/**
 * Transform scraped data to BigQuery-compatible format
 * This ensures the JSON structure matches the external table schema
 */
function transformForBigQuery(inputPath: string): string {
  const data = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));

  // Transform to match expected BigQuery schema
  const transformed = data.map((post: any) => ({
    // Core fields
    post_id: post.post_id,
    post_url: post.post_url,

    // Creator
    creator_username: post.creator_username,
    creator_avatar: post.creator_avatar,
    creator_profile_url: post.creator_profile_url,

    // Content
    caption: post.caption,
    hashtags: post.hashtags?.join(',') || '', // Convert array to comma-separated

    // Media
    hero_image_url: post.hero_image_url,
    thumbnail_url: post.thumbnail_url,
    video_url: post.video_url,
    has_video: !!post.video_url,

    // Products (as JSON string for BigQuery)
    product_count: post.product_links?.length || 0,
    products_json: JSON.stringify(post.product_links || []),

    // Metadata
    category: post.category,
    source_page: post.source_page,
    scraped_at: post.scraped_at,
    published_at: post.published_at,
  }));

  // Write transformed file
  const outputPath = inputPath.replace('.json', '-bq.json');
  fs.writeFileSync(outputPath, transformed.map((r: any) => JSON.stringify(r)).join('\n'));

  console.log(`   📝 Transformed to newline-delimited JSON: ${path.basename(outputPath)}`);
  return outputPath;
}

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  return {
    file: args.find((_, i) => args[i - 1] === '--file'),
    all: args.includes('--all'),
    transform: !args.includes('--no-transform'),
  };
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 GCS Upload Script');
  console.log(`   Project: ${CONFIG.projectId}`);
  console.log(`   Bucket: ${CONFIG.bucketName}\n`);

  const args = parseArgs();
  let filesToUpload: string[] = [];

  if (args.file) {
    // Upload specific file
    const filepath = path.isAbsolute(args.file)
      ? args.file
      : path.join(process.cwd(), args.file);

    if (!fs.existsSync(filepath)) {
      console.error(`❌ File not found: ${filepath}`);
      process.exit(1);
    }
    filesToUpload = [filepath];
  } else if (args.all) {
    // Upload all files
    filesToUpload = getAllFiles();
    if (filesToUpload.length === 0) {
      console.log('📭 No files to upload');
      return;
    }
    console.log(`📁 Found ${filesToUpload.length} files to upload\n`);
  } else {
    // Upload latest file
    const latest = getLatestFile();
    if (!latest) {
      console.log('📭 No scraped files found');
      console.log('   Run `npm run scrape:api` first to generate data');
      return;
    }
    filesToUpload = [latest];
  }

  // Upload each file
  let successCount = 0;
  for (const filepath of filesToUpload) {
    try {
      let uploadPath = filepath;

      // Transform to BigQuery format if needed
      if (args.transform && !filepath.endsWith('-bq.json')) {
        uploadPath = transformForBigQuery(filepath);
      }

      await uploadFile(uploadPath);
      successCount++;
    } catch (error) {
      console.error(`Failed to upload: ${filepath}`);
    }
    console.log('');
  }

  // Summary
  console.log('📊 Upload Summary:');
  console.log(`   Successful: ${successCount}/${filesToUpload.length}`);
  console.log(`   Bucket: gs://${CONFIG.bucketName}/${CONFIG.gcsPrefix}`);

  if (successCount > 0) {
    console.log('\n💡 Next steps:');
    console.log('   1. Data is now available in GCS');
    console.log('   2. Run BigQuery merge to process: npm run setup:bq');
    console.log('   3. View data in dashboard: npm run dev');
  }
}

// Run
main().catch(console.error);
