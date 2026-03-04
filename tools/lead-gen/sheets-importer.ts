// ============================================================
// Lead Gen Automation — Google Sheets Importer
// ============================================================
// Pulls prospect data directly from Google Sheets, auto-maps
// columns to ProspectData fields, and feeds into the lead-gen
// pipeline. Supports any spreadsheet structure — auto-detects
// column names using fuzzy matching.
//
// Usage:
//   npx tsx tools/lead-gen/sheets-importer.ts --sheet-id <id>
//   npx tsx tools/lead-gen/sheets-importer.ts --sheet-id <id> --tab "Sheet1" --generate
//
// Env: GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY
//      (same creds already in your Doppler / .env)
// ============================================================

import { google, sheets_v4 } from 'googleapis';
import * as fs from 'fs';
import * as path from 'path';
import 'dotenv/config';
import { ProspectData } from './types';

// ── Types ────────────────────────────────────────────────────

export interface SheetImportConfig {
  /** Google Sheets spreadsheet ID (from the URL) */
  spreadsheetId: string;
  /** Tab/sheet name (defaults to first sheet) */
  sheetName?: string;
  /** Range override (e.g., 'A1:Z100') */
  range?: string;
  /** Custom column mapping overrides */
  columnMapping?: Record<string, string>;
  /** Skip rows where name is empty */
  skipEmptyNames?: boolean;
}

export interface SheetImportResult {
  prospects: ProspectData[];
  rawHeaders: string[];
  mappedFields: Record<string, string>;
  unmappedColumns: string[];
  totalRows: number;
  importedRows: number;
  skippedRows: number;
  spreadsheetTitle?: string;
}

// ── Column Mapping ───────────────────────────────────────────
// Maps common spreadsheet column names → ProspectData fields.
// Uses fuzzy matching — "Instagram Handle" matches "instagram",
// "IG Followers" matches "instagram_followers", etc.

const COLUMN_MAP: Array<{
  field: string;
  patterns: string[];
  transform?: (value: string) => unknown;
}> = [
  // ── Name ──
  {
    field: 'name',
    patterns: ['name', 'creator', 'creator_name', 'full_name', 'contact', 'contact_name', 'influencer'],
  },
  // ── Username / Handle ──
  {
    field: 'username',
    patterns: ['username', 'handle', 'ig_handle', 'instagram_handle', 'ig_username', 'insta_handle', 'social_handle'],
  },
  // ── Category / Niche ──
  {
    field: 'category',
    patterns: ['category', 'niche', 'vertical', 'industry', 'content_type', 'genre', 'type'],
  },
  // ── Email ──
  {
    field: 'email',
    patterns: ['email', 'email_address', 'contact_email', 'e-mail'],
  },
  // ── Instagram URL ──
  {
    field: 'instagramUrl',
    patterns: ['instagram_url', 'ig_url', 'instagram_link', 'ig_link', 'instagram_profile'],
  },
  // ── Instagram Followers ──
  {
    field: 'instagramFollowers',
    patterns: ['followers', 'instagram_followers', 'ig_followers', 'follower_count', 'ig_follower_count', 'total_followers'],
    transform: (v) => parseNumber(v),
  },
  // ── LTK URL ──
  {
    field: 'ltkUrl',
    patterns: ['ltk_url', 'ltk_link', 'ltk_profile', 'shopltk', 'liketoknow'],
  },
  // ── LTK Status ──
  {
    field: 'ltkActive',
    patterns: ['ltk_status', 'ltk_active', 'ltk', 'has_ltk', 'ltk_verified'],
    transform: (v) => parseBool(v),
  },
  // ── Amazon Storefront ──
  {
    field: 'amazonStorefront',
    patterns: ['amazon_storefront', 'amazon_url', 'amazon', 'has_amazon', 'amazon_shop', 'amazon_influencer'],
    transform: (v) => parseBool(v),
  },
  // ── TikTok ──
  {
    field: 'tiktokUrl',
    patterns: ['tiktok', 'tiktok_url', 'tiktok_link', 'tiktok_profile'],
  },
  // ── TikTok Followers ──
  {
    field: 'tiktokFollowers',
    patterns: ['tiktok_followers', 'tt_followers'],
    transform: (v) => parseNumber(v),
  },
  // ── YouTube ──
  {
    field: 'youtubeUrl',
    patterns: ['youtube', 'youtube_url', 'youtube_link', 'yt_url', 'youtube_channel'],
  },
  // ── YouTube Followers ──
  {
    field: 'youtubeFollowers',
    patterns: ['youtube_followers', 'youtube_subs', 'yt_followers', 'yt_subs', 'youtube_subscribers'],
    transform: (v) => parseNumber(v),
  },
  // ── Pinterest ──
  {
    field: 'pinterestUrl',
    patterns: ['pinterest', 'pinterest_url', 'pinterest_link'],
  },
  // ── Blog / Website ──
  {
    field: 'websiteUrl',
    patterns: ['website', 'blog', 'blog_url', 'website_url', 'url', 'site'],
  },
  // ── Priority / Score ──
  {
    field: 'priorityScore',
    patterns: ['priority', 'priority_score', 'score', 'rank', 'rating', 'tier'],
    transform: (v) => parseNumber(v),
  },
  // ── Verified ──
  {
    field: 'verified',
    patterns: ['verified', 'is_verified', 'ltk_verified', 'verification'],
    transform: (v) => parseBool(v),
  },
  // ── Engagement Rate ──
  {
    field: 'engagementRate',
    patterns: ['engagement', 'engagement_rate', 'er', 'eng_rate'],
    transform: (v) => parseNumber(v),
  },
  // ── Brand Partners ──
  {
    field: 'brandPartners',
    patterns: ['brand_partners', 'brands', 'current_brands', 'partnerships', 'brand_collabs'],
  },
  // ── Pain Points ──
  {
    field: 'painPoints',
    patterns: ['pain_points', 'pain', 'challenges', 'frustrations', 'problems'],
  },
  // ── Content Style ──
  {
    field: 'contentStyle',
    patterns: ['content_style', 'content_type', 'style', 'content_strengths', 'strengths'],
  },
  // ── Notes ──
  {
    field: 'notes',
    patterns: ['notes', 'comments', 'additional_notes', 'internal_notes', 'remarks'],
  },
  // ── Status / Stage ──
  {
    field: 'outreachStatus',
    patterns: ['status', 'stage', 'outreach_status', 'pipeline_stage', 'lead_status'],
  },
  // ── Last Contact Date ──
  {
    field: 'lastContactDate',
    patterns: ['last_contact', 'last_contacted', 'last_email', 'date_contacted', 'contacted_date'],
  },
  // ── Revenue / Income ──
  {
    field: 'desiredIncome',
    patterns: ['income', 'revenue', 'desired_income', 'income_goal', 'monthly_income', 'target_income'],
    transform: (v) => parseNumber(v),
  },
  // ── Location ──
  {
    field: 'location',
    patterns: ['location', 'city', 'state', 'country', 'region'],
  },
];

// ── Google Sheets Client ─────────────────────────────────────

async function getSheetsClient(): Promise<sheets_v4.Sheets> {
  const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!serviceAccountEmail || !privateKey) {
    const keyFile = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (keyFile && fs.existsSync(keyFile)) {
      const auth = new google.auth.GoogleAuth({
        keyFile,
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
      });
      return google.sheets({ version: 'v4', auth });
    }
    throw new Error(
      'Missing Google credentials. Set GOOGLE_SERVICE_ACCOUNT_EMAIL + GOOGLE_PRIVATE_KEY, ' +
      'or GOOGLE_APPLICATION_CREDENTIALS.',
    );
  }

  const auth = new google.auth.JWT({
    email: serviceAccountEmail,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  return google.sheets({ version: 'v4', auth });
}

// ── Import from Google Sheets ────────────────────────────────

export async function importFromGoogleSheets(
  config: SheetImportConfig,
): Promise<SheetImportResult> {
  const sheets = await getSheetsClient();

  // Get spreadsheet metadata
  const spreadsheet = await sheets.spreadsheets.get({
    spreadsheetId: config.spreadsheetId,
  });
  const spreadsheetTitle = spreadsheet.data.properties?.title;
  const firstSheetName = spreadsheet.data.sheets?.[0]?.properties?.title || 'Sheet1';
  const sheetName = config.sheetName || firstSheetName;

  // Read all data
  const range = config.range || `'${sheetName}'`;
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: config.spreadsheetId,
    range,
  });

  const rows = response.data.values;
  if (!rows || rows.length < 2) {
    return {
      prospects: [],
      rawHeaders: [],
      mappedFields: {},
      unmappedColumns: [],
      totalRows: 0,
      importedRows: 0,
      skippedRows: 0,
      spreadsheetTitle,
    };
  }

  // First row = headers
  const rawHeaders = rows[0].map((h: string) => String(h).trim());
  const dataRows = rows.slice(1);

  // Auto-map columns
  const { mappedFields, unmappedColumns } = autoMapColumns(rawHeaders, config.columnMapping);

  // Convert rows to prospects
  const prospects: ProspectData[] = [];
  let skipped = 0;

  for (const row of dataRows) {
    const mapped = mapRowToFields(row, rawHeaders, mappedFields);
    if (!mapped) {
      skipped++;
      continue;
    }

    const prospect = buildProspectFromMapped(mapped);
    if (!prospect) {
      skipped++;
      continue;
    }

    if (config.skipEmptyNames !== false && !prospect.name) {
      skipped++;
      continue;
    }

    prospects.push(prospect);
  }

  return {
    prospects,
    rawHeaders,
    mappedFields,
    unmappedColumns,
    totalRows: dataRows.length,
    importedRows: prospects.length,
    skippedRows: skipped,
    spreadsheetTitle,
  };
}

// ── Column Auto-Mapping ──────────────────────────────────────

function autoMapColumns(
  headers: string[],
  overrides?: Record<string, string>,
): { mappedFields: Record<string, string>; unmappedColumns: string[] } {
  const mappedFields: Record<string, string> = {};
  const usedHeaders = new Set<string>();

  // Apply overrides first
  if (overrides) {
    for (const [header, field] of Object.entries(overrides)) {
      const normalizedHeader = normalize(header);
      const matchingHeader = headers.find((h) => normalize(h) === normalizedHeader);
      if (matchingHeader) {
        mappedFields[matchingHeader] = field;
        usedHeaders.add(matchingHeader);
      }
    }
  }

  // Auto-map remaining columns
  for (const header of headers) {
    if (usedHeaders.has(header)) continue;

    const normalized = normalize(header);
    let bestMatch: string | null = null;
    let bestScore = 0;

    for (const mapping of COLUMN_MAP) {
      for (const pattern of mapping.patterns) {
        const score = matchScore(normalized, pattern);
        if (score > bestScore && score >= 0.6) {
          bestScore = score;
          bestMatch = mapping.field;
        }
      }
    }

    // Also check if the header contains a URL that hints at the field
    if (!bestMatch) {
      if (normalized.includes('instagram') || normalized.includes('ig')) {
        if (normalized.includes('follower') || normalized.includes('count')) {
          bestMatch = 'instagramFollowers';
        } else {
          bestMatch = 'instagramUrl';
        }
      } else if (normalized.includes('ltk') || normalized.includes('liketoknow')) {
        bestMatch = 'ltkUrl';
      } else if (normalized.includes('amazon')) {
        bestMatch = 'amazonStorefront';
      }
    }

    if (bestMatch) {
      mappedFields[header] = bestMatch;
      usedHeaders.add(header);
    }
  }

  const unmappedColumns = headers.filter((h) => !usedHeaders.has(h));
  return { mappedFields, unmappedColumns };
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
}

function matchScore(input: string, pattern: string): number {
  if (input === pattern) return 1.0;
  if (input.includes(pattern)) return 0.9;
  if (pattern.includes(input)) return 0.7;

  // Word overlap
  const inputWords = input.split('_').filter(Boolean);
  const patternWords = pattern.split('_').filter(Boolean);
  const overlap = inputWords.filter((w) => patternWords.some((pw) => pw.includes(w) || w.includes(pw)));
  if (overlap.length > 0) {
    return 0.6 + (overlap.length / Math.max(inputWords.length, patternWords.length)) * 0.3;
  }

  return 0;
}

// ── Row Mapping ──────────────────────────────────────────────

function mapRowToFields(
  row: string[],
  headers: string[],
  mappedFields: Record<string, string>,
): Record<string, string> | null {
  const result: Record<string, string> = {};
  let hasAnyValue = false;

  for (let i = 0; i < headers.length; i++) {
    const header = headers[i];
    const field = mappedFields[header];
    const value = (row[i] || '').trim();

    if (field && value) {
      result[field] = value;
      hasAnyValue = true;
    }

    // Also store raw unmapped values under the header name
    if (value && !field) {
      result[`_raw_${normalize(header)}`] = value;
    }
  }

  return hasAnyValue ? result : null;
}

// ── Build ProspectData from Mapped Fields ────────────────────

function buildProspectFromMapped(mapped: Record<string, string>): ProspectData | null {
  const name = mapped.name || '';
  if (!name) return null;

  const username = mapped.username || extractUsername(mapped.instagramUrl) || '';
  const category = mapped.category || 'Lifestyle';

  // Build platforms array
  const platforms: ProspectData['platforms'] = [];

  const igFollowers = mapped.instagramFollowers ? parseNumber(mapped.instagramFollowers) : undefined;
  if (igFollowers || mapped.instagramUrl || username) {
    platforms.push({
      platform: 'instagram',
      url: mapped.instagramUrl,
      followers: igFollowers as number | undefined,
    });
  }

  if (mapped.ltkUrl || mapped.ltkActive) {
    platforms.push({ platform: 'ltk', url: mapped.ltkUrl });
  }

  if (mapped.tiktokUrl || mapped.tiktokFollowers) {
    platforms.push({
      platform: 'tiktok',
      url: mapped.tiktokUrl,
      followers: mapped.tiktokFollowers ? parseNumber(mapped.tiktokFollowers) as number : undefined,
    });
  }

  if (mapped.youtubeUrl || mapped.youtubeFollowers) {
    platforms.push({
      platform: 'youtube',
      url: mapped.youtubeUrl,
      followers: mapped.youtubeFollowers ? parseNumber(mapped.youtubeFollowers) as number : undefined,
    });
  }

  if (mapped.pinterestUrl) {
    platforms.push({ platform: 'pinterest', url: mapped.pinterestUrl });
  }

  if (mapped.websiteUrl) {
    platforms.push({ platform: 'blog', url: mapped.websiteUrl });
  }

  // Determine LTK status
  const ltkActive = mapped.ltkActive
    ? parseBool(mapped.ltkActive)
    : !!mapped.ltkUrl;

  // Determine Amazon status
  const hasAmazon = mapped.amazonStorefront
    ? (typeof mapped.amazonStorefront === 'string' && mapped.amazonStorefront.includes('amazon.com'))
      || parseBool(mapped.amazonStorefront)
    : false;

  return {
    name,
    username: username || undefined,
    category,
    platforms,
    ltkStatus: {
      active: ltkActive as boolean,
    },
    amazonStatus: {
      hasStorefront: hasAmazon as boolean,
      hasAssociates: false,
    },
    contentStyleStrengths: mapped.contentStyle ? splitList(mapped.contentStyle) : undefined,
    painPoints: mapped.painPoints ? splitList(mapped.painPoints) : undefined,
    currentBrandPartners: mapped.brandPartners ? splitList(mapped.brandPartners) : undefined,
    desiredMonthlyIncome: mapped.desiredIncome ? parseNumber(mapped.desiredIncome) as number : undefined,
    priorityScore: mapped.priorityScore ? parseNumber(mapped.priorityScore) as number : undefined,
    verified: mapped.verified ? parseBool(mapped.verified) as boolean : undefined,
    instagramUrl: mapped.instagramUrl || undefined,
    ltkUrl: mapped.ltkUrl || undefined,
    amazonStorefrontUrl: hasAmazon && typeof mapped.amazonStorefront === 'string' && mapped.amazonStorefront.includes('http')
      ? mapped.amazonStorefront : undefined,
    email: mapped.email || undefined,
    notes: mapped.notes || undefined,
  };
}

// ── List All Sheets in a Spreadsheet ─────────────────────────

export async function listSheetTabs(spreadsheetId: string): Promise<string[]> {
  const sheets = await getSheetsClient();
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
  return (spreadsheet.data.sheets || []).map(
    (s) => s.properties?.title || 'Untitled',
  );
}

// ── Save Imported Data ───────────────────────────────────────

export function saveImportedProspects(
  result: SheetImportResult,
  outputDir: string = path.join(process.cwd(), 'data', 'imported'),
): string {
  fs.mkdirSync(outputDir, { recursive: true });
  const filename = `prospects-${Date.now()}.json`;
  const filepath = path.join(outputDir, filename);
  fs.writeFileSync(filepath, JSON.stringify(result.prospects, null, 2));
  return filepath;
}

// ── Helpers ──────────────────────────────────────────────────

function parseNumber(value: string): number | undefined {
  if (!value) return undefined;
  // Handle "180K", "1.5M", "$5,000", etc.
  const cleaned = value.replace(/[$,\s]/g, '').toLowerCase();
  if (cleaned.endsWith('k')) return parseFloat(cleaned) * 1000;
  if (cleaned.endsWith('m')) return parseFloat(cleaned) * 1000000;
  const num = parseFloat(cleaned);
  return isNaN(num) ? undefined : num;
}

function parseBool(value: string): boolean {
  const v = String(value).toLowerCase().trim();
  return ['true', '1', 'yes', 'y', 'active', 'verified', 'x', '✓', '✔'].includes(v);
}

function splitList(value: string): string[] {
  return value.split(/[,;|]/).map((s) => s.trim()).filter(Boolean);
}

function extractUsername(url?: string): string {
  if (!url) return '';
  // Extract from Instagram URL: instagram.com/username
  const match = url.match(/instagram\.com\/([^/?]+)/);
  return match ? match[1] : '';
}

// ── Extract Spreadsheet ID from URL ──────────────────────────

export function extractSheetId(urlOrId: string): string {
  // If it's already just an ID
  if (!urlOrId.includes('/')) return urlOrId;
  // Extract from URL: https://docs.google.com/spreadsheets/d/SHEET_ID/...
  const match = urlOrId.match(/\/d\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : urlOrId;
}

// ── CLI ──────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.length === 0) {
    console.log(`
Google Sheets → Lead Gen Importer
====================================
Imports prospect data from any Google Sheet and converts it to
ProspectData format for the lead-gen pipeline.

Usage:
  npx tsx tools/lead-gen/sheets-importer.ts --sheet-id <id-or-url>
  npx tsx tools/lead-gen/sheets-importer.ts --sheet-id <id-or-url> --tab "Sheet1"
  npx tsx tools/lead-gen/sheets-importer.ts --sheet-id <id-or-url> --generate
  npx tsx tools/lead-gen/sheets-importer.ts --sheet-id <id-or-url> --generate --auto-reply

Options:
  --sheet-id <id>     Spreadsheet ID or full URL
  --tab <name>        Specific tab/sheet name (defaults to first)
  --save              Save imported prospects to data/imported/
  --generate          Run lead-gen pipeline after import
  --auto-reply        Run auto-reply pipeline (with --generate)
  --no-ig             Skip Instagram API when generating
  --no-screenshots    Skip screenshots when generating

Environment:
  GOOGLE_SERVICE_ACCOUNT_EMAIL   Service account email
  GOOGLE_PRIVATE_KEY             Service account private key

Supported Column Names (auto-detected):
  Name, Username/Handle, Category/Niche, Email, Instagram URL,
  Followers, LTK URL, LTK Status, Amazon Storefront, TikTok,
  YouTube, Pinterest, Priority/Score, Brand Partners, Notes, etc.
`);
    return;
  }

  const getArg = (flag: string) => {
    const idx = args.indexOf(flag);
    return idx >= 0 ? args[idx + 1] : undefined;
  };

  const sheetInput = getArg('--sheet-id') || getArg('--url') || getArg('--id');
  if (!sheetInput) {
    console.error('Error: --sheet-id is required');
    process.exit(1);
  }

  const spreadsheetId = extractSheetId(sheetInput);
  const sheetName = getArg('--tab') || getArg('--sheet');

  console.log(`\nImporting from Google Sheets...`);
  console.log(`Sheet ID: ${spreadsheetId}`);

  try {
    // List available tabs
    const tabs = await listSheetTabs(spreadsheetId);
    console.log(`Available tabs: ${tabs.join(', ')}`);

    // Import
    const result = await importFromGoogleSheets({
      spreadsheetId,
      sheetName,
      skipEmptyNames: true,
    });

    console.log(`\nSpreadsheet: ${result.spreadsheetTitle || 'Untitled'}`);
    console.log(`Headers: ${result.rawHeaders.join(', ')}`);
    console.log(`\nColumn Mapping:`);
    for (const [header, field] of Object.entries(result.mappedFields)) {
      console.log(`  "${header}" → ${field}`);
    }
    if (result.unmappedColumns.length > 0) {
      console.log(`\nUnmapped columns: ${result.unmappedColumns.join(', ')}`);
    }

    console.log(`\nResults:`);
    console.log(`  Total rows: ${result.totalRows}`);
    console.log(`  Imported: ${result.importedRows}`);
    console.log(`  Skipped: ${result.skippedRows}`);

    // Show sample
    if (result.prospects.length > 0) {
      console.log(`\nSample prospects:`);
      result.prospects.slice(0, 5).forEach((p, i) => {
        const followers = p.platforms.reduce((sum, pl) => sum + (pl.followers || 0), 0);
        console.log(`  ${i + 1}. ${p.name} — ${p.category} — ${followers > 0 ? followers.toLocaleString() + ' followers' : 'no follower data'} — LTK: ${p.ltkStatus.active ? 'active' : 'no'}`);
      });
    }

    // Save
    if (args.includes('--save')) {
      const filepath = saveImportedProspects(result);
      console.log(`\nSaved to: ${filepath}`);
    }

    // Generate deliverables
    if (args.includes('--generate')) {
      console.log(`\nGenerating deliverables for ${result.prospects.length} prospects...`);

      if (args.includes('--auto-reply')) {
        const { batchAutoReply } = await import('./auto-reply-pipeline');
        const outputs = await batchAutoReply(
          result.prospects.map((p) => ({
            prospect: p,
            skipScreenshots: args.includes('--no-screenshots'),
            skipInstagram: args.includes('--no-ig'),
          })),
        );
        console.log(`\nGenerated auto-reply packages for ${outputs.length} creators.`);
      } else {
        const { generateProposal } = await import('./proposal-generator');
        const { generateOutreach, renderOutreachHTML } = await import('./outreach-generator');
        const { generateAudit } = await import('./audit-generator');
        const { scoreCreator, renderScoreCardHTML, renderBatchReportHTML, batchScoreCreators } = await import('./signal-scorer');

        const outDir = path.join(process.cwd(), 'output', 'sheets-import-' + Date.now());
        fs.mkdirSync(outDir, { recursive: true });

        // Batch score
        const scored = batchScoreCreators(result.prospects);
        fs.writeFileSync(path.join(outDir, 'pipeline-report.html'), renderBatchReportHTML(scored));

        // Per-creator
        for (const s of scored) {
          const p = s.prospect;
          const dir = path.join(outDir, sanitize(p.name));
          fs.mkdirSync(dir, { recursive: true });

          fs.writeFileSync(path.join(dir, 'proposal.html'), generateProposal(p).html);
          fs.writeFileSync(path.join(dir, 'outreach.html'), renderOutreachHTML(generateOutreach(p)));
          fs.writeFileSync(path.join(dir, 'audit.html'), generateAudit(p).html);
          fs.writeFileSync(path.join(dir, 'score-card.html'), renderScoreCardHTML(s));

          console.log(`  ${p.name} (${s.tier}, ${s.percentage}%) → ${dir}/`);
        }

        console.log(`\nAll deliverables → ${outDir}`);
      }
    }
  } catch (err) {
    console.error('Error:', err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

function sanitize(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

if (require.main === module) {
  main();
}
