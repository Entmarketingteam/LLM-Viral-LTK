// ============================================================
// Lead Gen Automation — Main Entry Point & CLI
// ============================================================
// Usage:
//   npx tsx tools/lead-gen/index.ts --prospect <json-file>
//   npx tsx tools/lead-gen/index.ts --spreadsheet <csv-file>
//   npx tsx tools/lead-gen/index.ts --demo
//
// Generates all deliverables for a prospect or batch of
// prospects: proposal, outreach, audit, pitch deck, score card.
// ============================================================

import * as fs from 'fs';
import * as path from 'path';
import { ProspectData } from './types';
import { generateProposal } from './proposal-generator';
import { generateOutreach, renderOutreachHTML } from './outreach-generator';
import { generateAudit } from './audit-generator';
import { generatePitchDeck } from './pitch-deck-generator';
import { generateStrategy } from './proposal-brain';
import { scoreCreator, batchScoreCreators, renderScoreCardHTML, renderBatchReportHTML } from './signal-scorer';

// ── Re-exports ───────────────────────────────────────────────

export { generateProposal } from './proposal-generator';
export { generateOutreach, renderOutreachHTML } from './outreach-generator';
export { generateAudit } from './audit-generator';
export { generatePitchDeck } from './pitch-deck-generator';
export { generateStrategy, determineGrowthLane } from './proposal-brain';
export { scoreCreator, batchScoreCreators, renderScoreCardHTML, renderBatchReportHTML } from './signal-scorer';
export { researchCreator, fetchCreatorProfile, fetchCreatorPosts } from './instagram-fetcher';
export { captureCreatorScreenshots, screenshotLTKStorefront, screenshotInstagramProfile } from './screenshot-automation';
export { runCreatorResearch, batchResearchCreators } from './creator-research-engine';
export { generateVisualPitchDeck } from './visual-pitch-deck';
export { runAutoReplyPipeline, batchAutoReply } from './auto-reply-pipeline';
export * from './types';
export * from './deliverables-library';

// ── CLI ──────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.length === 0) {
    printHelp();
    return;
  }

  if (args.includes('--demo')) {
    await runDemo();
    return;
  }

  if (args.includes('--prospect')) {
    const filePath = args[args.indexOf('--prospect') + 1];
    if (!filePath) {
      console.error('Error: --prospect requires a JSON file path');
      process.exit(1);
    }
    await runSingleProspect(filePath);
    return;
  }

  if (args.includes('--spreadsheet') || args.includes('--csv')) {
    const flag = args.includes('--spreadsheet') ? '--spreadsheet' : '--csv';
    const filePath = args[args.indexOf(flag) + 1];
    if (!filePath) {
      console.error(`Error: ${flag} requires a CSV file path`);
      process.exit(1);
    }
    await runBatch(filePath);
    return;
  }

  console.error('Unknown arguments. Use --help for usage.');
  process.exit(1);
}

// ── Single Prospect ─────────────────────────────────────────

async function runSingleProspect(filePath: string) {
  const raw = fs.readFileSync(path.resolve(filePath), 'utf-8');
  const prospect: ProspectData = JSON.parse(raw);

  console.log(`\nGenerating deliverables for: ${prospect.name}`);
  console.log('='.repeat(50));

  const outDir = path.resolve('output', sanitizeFilename(prospect.name));
  fs.mkdirSync(outDir, { recursive: true });

  // Generate all deliverables
  const proposal = generateProposal(prospect);
  fs.writeFileSync(path.join(outDir, 'proposal.html'), proposal.html);
  console.log(`  [done] Proposal → ${outDir}/proposal.html`);

  const outreach = generateOutreach(prospect);
  const outreachHTML = renderOutreachHTML(outreach);
  fs.writeFileSync(path.join(outDir, 'outreach.html'), outreachHTML);
  console.log(`  [done] Outreach → ${outDir}/outreach.html`);

  const audit = generateAudit(prospect);
  fs.writeFileSync(path.join(outDir, 'audit.html'), audit.html);
  console.log(`  [done] Audit → ${outDir}/audit.html`);

  const pitchDeck = generatePitchDeck(prospect);
  fs.writeFileSync(path.join(outDir, 'pitch-deck.html'), pitchDeck.html);
  console.log(`  [done] Pitch Deck → ${outDir}/pitch-deck.html`);

  const scored = scoreCreator(prospect);
  const scoreCard = renderScoreCardHTML(scored);
  fs.writeFileSync(path.join(outDir, 'score-card.html'), scoreCard);
  console.log(`  [done] Score Card → ${outDir}/score-card.html`);

  const strategy = generateStrategy(prospect);
  fs.writeFileSync(path.join(outDir, 'strategy.json'), JSON.stringify(strategy, null, 2));
  console.log(`  [done] Strategy → ${outDir}/strategy.json`);

  // Summary
  console.log('\n--- Summary ---');
  console.log(`Growth Lane: ${strategy.growthLane}`);
  console.log(`Score: ${scored.percentage}% (${scored.tier})`);
  console.log(`Brand Client Fit: ${scored.shouldBeBrandClient ? 'Yes' : 'No'}`);
  console.log(`Outreach Priority: ${scored.outreachPriority}/100`);
  console.log(`Files generated in: ${outDir}`);
}

// ── Batch Processing ────────────────────────────────────────

async function runBatch(csvPath: string) {
  const raw = fs.readFileSync(path.resolve(csvPath), 'utf-8');
  const prospects = parseCSV(raw);

  console.log(`\nProcessing ${prospects.length} prospects from: ${csvPath}`);
  console.log('='.repeat(50));

  const outDir = path.resolve('output', 'batch-' + Date.now());
  fs.mkdirSync(outDir, { recursive: true });

  const scoredCreators = batchScoreCreators(prospects);

  // Generate batch report
  const batchReport = renderBatchReportHTML(scoredCreators);
  fs.writeFileSync(path.join(outDir, 'pipeline-report.html'), batchReport);
  console.log(`  [done] Pipeline Report → ${outDir}/pipeline-report.html`);

  // Generate per-creator deliverables
  for (const scored of scoredCreators) {
    const p = scored.prospect;
    const creatorDir = path.join(outDir, sanitizeFilename(p.name));
    fs.mkdirSync(creatorDir, { recursive: true });

    const proposal = generateProposal(p);
    fs.writeFileSync(path.join(creatorDir, 'proposal.html'), proposal.html);

    const outreach = generateOutreach(p);
    fs.writeFileSync(path.join(creatorDir, 'outreach.html'), renderOutreachHTML(outreach));

    const audit = generateAudit(p);
    fs.writeFileSync(path.join(creatorDir, 'audit.html'), audit.html);

    const scoreCard = renderScoreCardHTML(scored);
    fs.writeFileSync(path.join(creatorDir, 'score-card.html'), scoreCard);

    console.log(`  [done] ${p.name} (${scored.tier} — ${scored.percentage}%) → ${creatorDir}/`);
  }

  // Summary
  const hot = scoredCreators.filter((s) => s.tier === 'hot');
  const warm = scoredCreators.filter((s) => s.tier === 'warm');
  console.log('\n--- Pipeline Summary ---');
  console.log(`Hot: ${hot.length} | Warm: ${warm.length} | Cold: ${scoredCreators.length - hot.length - warm.length}`);
  console.log(`Files generated in: ${outDir}`);
}

// ── Demo Mode ────────────────────────────────────────────────

async function runDemo() {
  console.log('\n Running demo with sample creators...\n');

  const demoProspects: ProspectData[] = [
    {
      name: 'Brittany Sjogren',
      username: 'loverlygrey',
      category: 'Fashion',
      platforms: [
        { platform: 'instagram', followers: 180000 },
        { platform: 'ltk' },
        { platform: 'pinterest', followers: 45000 },
      ],
      ltkStatus: { active: true, boardCount: 25, postFrequency: '5-6/week' },
      amazonStatus: { hasStorefront: false, hasAssociates: false },
      contentStyleStrengths: ['outfit styling', 'try-ons', 'seasonal capsules'],
      painPoints: ['overwhelmed with linking', 'not structured for scale'],
      currentBrandPartners: ['Nordstrom', 'Abercrombie'],
      priorityScore: 85,
      verified: true,
      ltkUrl: 'https://www.shopltk.com/explore/loverlygrey',
    },
    {
      name: 'Jen Adams',
      username: 'interiordesignerella',
      category: 'Home & Interior',
      platforms: [
        { platform: 'instagram', followers: 95000 },
        { platform: 'ltk' },
        { platform: 'blog' },
      ],
      ltkStatus: { active: true, boardCount: 12 },
      amazonStatus: { hasStorefront: true, hasAssociates: true },
      contentStyleStrengths: ['room makeovers', 'product roundups', 'before/after'],
      painPoints: ['Amazon storefront underutilized', 'no brand outreach system'],
      currentBrandPartners: [],
      priorityScore: 72,
      verified: true,
      instagramUrl: 'https://instagram.com/interiordesignerella',
    },
    {
      name: 'Morgan Bullard',
      username: 'morganbullard',
      category: 'Lifestyle',
      platforms: [
        { platform: 'instagram', followers: 62000 },
        { platform: 'tiktok', followers: 28000 },
        { platform: 'ltk' },
      ],
      ltkStatus: { active: true, boardCount: 8 },
      amazonStatus: { hasStorefront: false, hasAssociates: false },
      contentStyleStrengths: ['lifestyle content', 'product recommendations', 'daily finds'],
      painPoints: ['inconsistent posting', 'no Amazon presence'],
      currentBrandPartners: ['Target'],
      priorityScore: 65,
      verified: true,
    },
    {
      name: 'Jessica Brown',
      username: 'fashionablyjess',
      category: 'Fashion & Beauty',
      platforms: [
        { platform: 'instagram', followers: 210000 },
        { platform: 'youtube', followers: 35000 },
        { platform: 'ltk' },
        { platform: 'amazon' },
      ],
      ltkStatus: { active: true, boardCount: 30, estimatedEarnings: 4000 },
      amazonStatus: { hasStorefront: true, hasAssociates: true, hasCreatorConnections: true },
      contentStyleStrengths: ['video content', 'reels', 'try-on hauls', 'beauty tutorials'],
      painPoints: ['brand deals below market rate', 'no negotiation support'],
      currentBrandPartners: ['Sephora', 'Free People', 'Nordstrom'],
      priorityScore: 90,
      verified: true,
    },
  ];

  const outDir = path.resolve('output', 'demo');
  fs.mkdirSync(outDir, { recursive: true });

  // Batch score
  const scored = batchScoreCreators(demoProspects);
  fs.writeFileSync(path.join(outDir, 'pipeline-report.html'), renderBatchReportHTML(scored));
  console.log(`Pipeline Report → ${outDir}/pipeline-report.html`);

  // Generate full deliverables for each
  for (const s of scored) {
    const p = s.prospect;
    const dir = path.join(outDir, sanitizeFilename(p.name));
    fs.mkdirSync(dir, { recursive: true });

    fs.writeFileSync(path.join(dir, 'proposal.html'), generateProposal(p).html);
    fs.writeFileSync(path.join(dir, 'outreach.html'), renderOutreachHTML(generateOutreach(p)));
    fs.writeFileSync(path.join(dir, 'audit.html'), generateAudit(p).html);
    fs.writeFileSync(path.join(dir, 'pitch-deck.html'), generatePitchDeck(p).html);
    fs.writeFileSync(path.join(dir, 'score-card.html'), renderScoreCardHTML(s));
    fs.writeFileSync(path.join(dir, 'strategy.json'), JSON.stringify(generateStrategy(p), null, 2));

    console.log(`  ${p.name} (${s.tier}, ${s.percentage}%) → ${dir}/`);
  }

  console.log('\nDemo complete! Open the HTML files in your browser.');
}

// ── CSV Parser ───────────────────────────────────────────────

function parseCSV(csv: string): ProspectData[] {
  const lines = csv.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_'));
  const prospects: ProspectData[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length < 2) continue;

    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = (values[idx] || '').trim();
    });

    const prospect = mapRowToProspect(row);
    if (prospect) prospects.push(prospect);
  }

  return prospects;
}

function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current);
  return values;
}

function mapRowToProspect(row: Record<string, string>): ProspectData | null {
  const name = row.name || row.creator_name || row.full_name || '';
  if (!name) return null;

  const username = row.username || row.handle || row.ig_handle || '';
  const category = row.category || row.niche || row.vertical || 'Lifestyle';
  const igFollowers = parseInt(row.instagram_followers || row.ig_followers || row.followers || '0', 10);
  const priorityScore = parseInt(row.priority || row.priority_score || row.score || '0', 10);
  const verified = row.verified === 'true' || row.verified === '1' || row.verified === 'yes';

  const platforms: ProspectData['platforms'] = [];
  if (igFollowers > 0 || row.instagram_url || row.ig_url) {
    platforms.push({ platform: 'instagram', url: row.instagram_url || row.ig_url, followers: igFollowers || undefined });
  }
  if (row.ltk_url || row.ltk_profile) {
    platforms.push({ platform: 'ltk', url: row.ltk_url || row.ltk_profile });
  }
  if (row.tiktok_url || row.tiktok_followers) {
    platforms.push({ platform: 'tiktok', url: row.tiktok_url, followers: parseInt(row.tiktok_followers || '0', 10) || undefined });
  }
  if (row.youtube_url || row.youtube_followers) {
    platforms.push({ platform: 'youtube', url: row.youtube_url, followers: parseInt(row.youtube_followers || '0', 10) || undefined });
  }
  if (row.pinterest_url || row.pinterest_followers) {
    platforms.push({ platform: 'pinterest', url: row.pinterest_url, followers: parseInt(row.pinterest_followers || '0', 10) || undefined });
  }

  const ltkActive = row.ltk_status === 'active' || row.ltk_active === 'true' || row.ltk_active === '1' || !!row.ltk_url;

  return {
    name,
    username: username || undefined,
    category,
    platforms,
    ltkStatus: {
      active: ltkActive,
      boardCount: parseInt(row.ltk_boards || row.board_count || '0', 10) || undefined,
    },
    amazonStatus: {
      hasStorefront: row.amazon_storefront === 'true' || row.amazon_storefront === '1' || row.has_amazon === 'true',
      hasAssociates: row.amazon_associates === 'true' || row.amazon_associates === '1',
    },
    contentStyleStrengths: row.content_style ? row.content_style.split(';').map((s) => s.trim()) : undefined,
    painPoints: row.pain_points ? row.pain_points.split(';').map((s) => s.trim()) : undefined,
    currentBrandPartners: row.brand_partners ? row.brand_partners.split(';').map((s) => s.trim()) : undefined,
    desiredMonthlyIncome: parseInt(row.income_goal || row.desired_income || '0', 10) || undefined,
    priorityScore: priorityScore || undefined,
    verified: verified || undefined,
    instagramUrl: row.instagram_url || row.ig_url || undefined,
    ltkUrl: row.ltk_url || row.ltk_profile || undefined,
    amazonStorefrontUrl: row.amazon_url || row.amazon_storefront_url || undefined,
    email: row.email || undefined,
    notes: row.notes || undefined,
  };
}

// ── Helpers ──────────────────────────────────────────────────

function sanitizeFilename(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function printHelp() {
  console.log(`
Lead Gen Automation Suite — Creative Pulse Agency
==================================================

Usage:
  npx tsx tools/lead-gen/index.ts [options]

Options:
  --demo                    Run demo with sample creators
  --prospect <file.json>    Generate all deliverables for a single prospect
  --spreadsheet <file.csv>  Batch process a CSV spreadsheet of prospects
  --csv <file.csv>          Alias for --spreadsheet
  --help                    Show this help message

Output:
  All files are generated in the ./output/ directory:
  - proposal.html       Premium dark-theme client proposal
  - outreach.html       Personalized DM + Email + LinkedIn messages
  - audit.html          Free monetization audit (lead magnet)
  - pitch-deck.html     Brand partnership pitch deck
  - score-card.html     Creator signal score card
  - strategy.json       Internal strategy notes
  - pipeline-report.html  Batch scoring + segmentation report

CSV Format:
  Required columns: name, category
  Optional: username, instagram_url, ltk_url, instagram_followers,
  ltk_status, amazon_storefront, priority, verified, content_style,
  pain_points, brand_partners, email, notes

Examples:
  npx tsx tools/lead-gen/index.ts --demo
  npx tsx tools/lead-gen/index.ts --prospect data/prospects/creator.json
  npx tsx tools/lead-gen/index.ts --csv data/ltk-master-list.csv
`);
}

// ── Run ──────────────────────────────────────────────────────

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
