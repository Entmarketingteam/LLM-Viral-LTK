#!/usr/bin/env tsx
/**
 * Upload Scraped LTK Data to Google Sheets
 *
 * Appends scraped post data to a Google Sheet for tracking and analysis.
 * Creates headers if the sheet is empty, otherwise appends new rows.
 *
 * Usage:
 *   npx tsx scripts/upload-to-sheets.ts
 *   npx tsx scripts/upload-to-sheets.ts --file data/scraped/specific-file.json
 *
 * Required environment variables:
 *   GOOGLE_SERVICE_ACCOUNT_EMAIL - Service account email
 *   GOOGLE_PRIVATE_KEY - Service account private key
 *   GOOGLE_SHEET_ID - The spreadsheet ID from the URL
 */

import { google } from 'googleapis';
import * as fs from 'fs';
import * as path from 'path';
import 'dotenv/config';

// Configuration
const CONFIG = {
  spreadsheetId: process.env.GOOGLE_SHEET_ID || '1QHPLOUCOHcJp8GnHk9D2DNEhUq6slMNR-lZa-ffJn_M',
  sheetName: 'LTK Posts',
  scrapedDir: path.join(process.cwd(), 'data', 'scraped'),
};

// Column headers for the sheet
const HEADERS = [
  'scrape_date',
  'post_id',
  'post_url',
  'creator_username',
  'creator_profile_url',
  'creator_avatar',
  'caption',
  'full_caption',
  'hashtags',
  'has_video',
  'video_url',
  'hero_image_url',
  'product_count',
  'product_1_url',
  'product_1_image',
  'product_2_url',
  'product_2_image',
  'product_3_url',
  'product_3_image',
  'share_url',
  'category',
  'scraped_at',
];

/**
 * Initialize Google Sheets API client
 */
async function getGoogleSheetsClient() {
  // Try service account credentials from environment
  const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!serviceAccountEmail || !privateKey) {
    // Try using Application Default Credentials or key file
    const keyFile = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (keyFile && fs.existsSync(keyFile)) {
      const auth = new google.auth.GoogleAuth({
        keyFile,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });
      return google.sheets({ version: 'v4', auth });
    }

    throw new Error(
      'Missing Google credentials. Set GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY, ' +
      'or GOOGLE_APPLICATION_CREDENTIALS pointing to a service account key file.'
    );
  }

  const auth = new google.auth.JWT({
    email: serviceAccountEmail,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  return google.sheets({ version: 'v4', auth });
}

/**
 * Check if sheet has headers, add them if not
 */
async function ensureHeaders(sheets: any, spreadsheetId: string): Promise<void> {
  try {
    // Try to read the first row
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'A1:V1',
    });

    const existingHeaders = response.data.values?.[0];

    if (!existingHeaders || existingHeaders.length === 0) {
      console.log('📝 Adding headers to sheet...');
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'A1:V1',
        valueInputOption: 'RAW',
        requestBody: {
          values: [HEADERS],
        },
      });
      console.log('   ✅ Headers added');
    } else {
      console.log('   Headers already exist');
    }
  } catch (error: any) {
    if (error.code === 404) {
      throw new Error(`Spreadsheet not found: ${spreadsheetId}`);
    }
    throw error;
  }
}

/**
 * Convert a post object to a row array matching HEADERS
 */
function postToRow(post: any): (string | number | boolean)[] {
  const products = post.products || post.product_links || [];

  return [
    new Date().toISOString().split('T')[0], // scrape_date
    post.post_id || '',
    post.post_url || '',
    post.creator_username || '',
    post.creator_profile_url || '',
    post.creator_avatar || '',
    (post.caption || '').slice(0, 500), // Truncate for sheet
    (post.full_caption || post.caption || '').slice(0, 1000),
    (post.hashtags || []).join(', '),
    post.has_video ? 'Yes' : 'No',
    post.video_url || '',
    post.hero_image_url || '',
    post.product_count || products.length || 0,
    products[0]?.affiliate_url || products[0]?.url || '',
    products[0]?.product_image_url || products[0]?.image_url || '',
    products[1]?.affiliate_url || products[1]?.url || '',
    products[1]?.product_image_url || products[1]?.image_url || '',
    products[2]?.affiliate_url || products[2]?.url || '',
    products[2]?.product_image_url || products[2]?.image_url || '',
    post.share_url || '',
    post.category || '',
    post.scraped_at || new Date().toISOString(),
  ];
}

/**
 * Get the latest scraped JSON file
 */
function getLatestFile(): string | null {
  if (!fs.existsSync(CONFIG.scrapedDir)) {
    return null;
  }

  const files = fs.readdirSync(CONFIG.scrapedDir)
    .filter(f => f.endsWith('.json') && !f.endsWith('-bq.json'))
    .map(f => ({
      name: f,
      path: path.join(CONFIG.scrapedDir, f),
      mtime: fs.statSync(path.join(CONFIG.scrapedDir, f)).mtime,
    }))
    .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

  return files.length > 0 ? files[0].path : null;
}

/**
 * Append rows to the sheet
 */
async function appendToSheet(sheets: any, spreadsheetId: string, rows: any[][]): Promise<number> {
  const response = await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: 'A:V',
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: {
      values: rows,
    },
  });

  return response.data.updates?.updatedRows || rows.length;
}

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  return {
    file: args.find((_, i) => args[i - 1] === '--file'),
    sheetId: args.find((_, i) => args[i - 1] === '--sheet-id'),
  };
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Google Sheets Upload Script');
  console.log(`   Spreadsheet ID: ${CONFIG.spreadsheetId}\n`);

  const args = parseArgs();

  // Override sheet ID if provided
  if (args.sheetId) {
    CONFIG.spreadsheetId = args.sheetId;
  }

  // Find file to upload
  let filePath: string;
  if (args.file) {
    filePath = path.isAbsolute(args.file) ? args.file : path.join(process.cwd(), args.file);
  } else {
    const latest = getLatestFile();
    if (!latest) {
      console.log('❌ No scraped files found');
      console.log('   Run `npm run scrape:detail` first to generate data');
      process.exit(1);
    }
    filePath = latest;
  }

  console.log(`📂 Loading data from: ${path.basename(filePath)}`);

  // Load data
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  const posts = Array.isArray(data) ? data : [data];

  if (posts.length === 0) {
    console.log('📭 No posts to upload');
    return;
  }

  console.log(`   Found ${posts.length} posts\n`);

  // Initialize Sheets client
  console.log('🔑 Authenticating with Google Sheets...');
  const sheets = await getGoogleSheetsClient();
  console.log('   ✅ Authenticated\n');

  // Ensure headers exist
  await ensureHeaders(sheets, CONFIG.spreadsheetId);

  // Convert posts to rows
  const rows = posts.map(postToRow);

  // Append to sheet
  console.log(`\n📤 Uploading ${rows.length} rows to Google Sheets...`);
  const uploadedCount = await appendToSheet(sheets, CONFIG.spreadsheetId, rows);
  console.log(`   ✅ Uploaded ${uploadedCount} rows`);

  // Summary
  console.log('\n📊 Upload Summary:');
  console.log(`   Posts uploaded: ${posts.length}`);
  console.log(`   Sheet: https://docs.google.com/spreadsheets/d/${CONFIG.spreadsheetId}`);

  // Show sample of what was uploaded
  console.log('\n📋 Sample data uploaded:');
  posts.slice(0, 3).forEach((post: any, i: number) => {
    console.log(`   ${i + 1}. @${post.creator_username || 'unknown'} - ${post.product_count || 0} products - ${post.has_video ? 'Video' : 'Image'}`);
  });
}

// Run
main().catch(error => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});
