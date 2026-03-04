// ============================================================
// Lead Gen Automation — Creator Research Engine
// ============================================================
// Combines all data sources into a single research pipeline:
// 1. Meta Graph API → real IG data (profile, posts, engagement)
// 2. Browser screenshots → visual captures of storefronts
// 3. Signal scoring → automated creator scoring
// 4. Content analysis → actionable insights + advice
//
// Outputs a complete research package that feeds into the
// pitch deck and proposal generators.
// ============================================================

import * as fs from 'fs';
import * as path from 'path';
import { ProspectData, GrowthLane } from './types';
import { IGCreatorResearch, researchCreator, fetchCreatorProfile } from './instagram-fetcher';
import {
  CreatorScreenshots,
  captureCreatorScreenshots,
  screenshotsToBase64Map,
} from './screenshot-automation';
import { scoreCreator, ScoredCreator } from './signal-scorer';
import { determineGrowthLane, generateStrategy, StrategyOutput } from './proposal-brain';
import { getBrandTargetsForNiche } from './deliverables-library';

// ── Types ────────────────────────────────────────────────────

export interface CreatorResearchPackage {
  prospect: ProspectData;
  instagram?: IGCreatorResearch;
  screenshots?: CreatorScreenshots;
  scoring: ScoredCreator;
  strategy: StrategyOutput;
  actionableAdvice: ActionableAdvice[];
  screenshotBase64Map?: Record<string, string>;
  researchedAt: string;
}

export interface ActionableAdvice {
  category: 'ltk' | 'amazon' | 'instagram' | 'brand' | 'content' | 'monetization';
  title: string;
  observation: string;
  recommendation: string;
  impact: 'high' | 'medium' | 'low';
  effort: 'quick-win' | 'moderate' | 'project';
}

export interface ResearchConfig {
  /** Pull Instagram data via Meta Graph API */
  fetchInstagram: boolean;
  /** Take browser screenshots */
  captureScreenshots: boolean;
  /** Convert screenshots to base64 for embedding in HTML */
  embedScreenshots: boolean;
  /** Run headless browser */
  headless: boolean;
  /** Output directory */
  outputDir: string;
}

const DEFAULT_RESEARCH_CONFIG: ResearchConfig = {
  fetchInstagram: true,
  captureScreenshots: true,
  embedScreenshots: true,
  headless: true,
  outputDir: path.join(process.cwd(), 'output', 'research'),
};

// ── Main Research Pipeline ───────────────────────────────────

export async function runCreatorResearch(
  prospect: ProspectData,
  config: Partial<ResearchConfig> = {},
): Promise<CreatorResearchPackage> {
  const cfg = { ...DEFAULT_RESEARCH_CONFIG, ...config };
  const creatorDir = path.join(cfg.outputDir, sanitize(prospect.name));
  fs.mkdirSync(creatorDir, { recursive: true });

  console.log(`\nResearching ${prospect.name}...`);

  // ── 1. Instagram API data ──
  let instagram: IGCreatorResearch | undefined;
  if (cfg.fetchInstagram && prospect.username) {
    try {
      console.log(`  Fetching Instagram data for @${prospect.username}...`);
      instagram = await researchCreator(prospect.username);
      // Enrich prospect with real data
      enrichProspectFromIG(prospect, instagram);
      console.log(`  IG: ${instagram.profile.followers_count.toLocaleString()} followers, ${instagram.engagement.avgEngagementRate}% ER`);
    } catch (err) {
      console.log(`  IG API skipped: ${err instanceof Error ? err.message : 'unavailable'}`);
    }
  }

  // ── 2. Browser screenshots ──
  let screenshots: CreatorScreenshots | undefined;
  if (cfg.captureScreenshots) {
    try {
      screenshots = await captureCreatorScreenshots(
        prospect.name,
        {
          ltkUrl: prospect.ltkUrl,
          instagramUsername: prospect.username,
          amazonStorefrontUrl: prospect.amazonStorefrontUrl,
        },
        { headless: cfg.headless, outputDir: cfg.outputDir },
      );
      console.log(`  Captured ${screenshots.screenshots.length} screenshots`);
    } catch (err) {
      console.log(`  Screenshots skipped: ${err instanceof Error ? err.message : 'unavailable'}`);
    }
  }

  // ── 3. Signal scoring ──
  const manualSignals = instagram ? buildSignalsFromIG(instagram) : undefined;
  const scoring = scoreCreator(prospect, manualSignals);
  console.log(`  Score: ${scoring.percentage}% (${scoring.tier}) — Priority: ${scoring.outreachPriority}/100`);

  // ── 4. Strategy ──
  const strategy = generateStrategy(prospect);

  // ── 5. Actionable advice ──
  const actionableAdvice = generateActionableAdvice(prospect, instagram, scoring);

  // ── 6. Screenshot base64 for embedding ──
  let screenshotBase64Map: Record<string, string> | undefined;
  if (cfg.embedScreenshots && screenshots) {
    screenshotBase64Map = screenshotsToBase64Map(screenshots.screenshots);
  }

  const researchPackage: CreatorResearchPackage = {
    prospect,
    instagram,
    screenshots,
    scoring,
    strategy,
    actionableAdvice,
    screenshotBase64Map,
    researchedAt: new Date().toISOString(),
  };

  // Save research package
  fs.writeFileSync(
    path.join(creatorDir, 'research-package.json'),
    JSON.stringify({ ...researchPackage, screenshotBase64Map: undefined }, null, 2),
  );

  return researchPackage;
}

// ── Batch Research ───────────────────────────────────────────

export async function batchResearchCreators(
  prospects: ProspectData[],
  config: Partial<ResearchConfig> = {},
): Promise<CreatorResearchPackage[]> {
  const results: CreatorResearchPackage[] = [];

  for (const prospect of prospects) {
    try {
      const research = await runCreatorResearch(prospect, config);
      results.push(research);
    } catch (err) {
      console.error(`Failed to research ${prospect.name}:`, err);
    }
  }

  return results.sort((a, b) => b.scoring.outreachPriority - a.scoring.outreachPriority);
}

// ── Enrich Prospect from IG Data ─────────────────────────────

function enrichProspectFromIG(prospect: ProspectData, ig: IGCreatorResearch): void {
  // Update follower count with real data
  const igPlatform = prospect.platforms.find((p) => p.platform === 'instagram');
  if (igPlatform) {
    igPlatform.followers = ig.profile.followers_count;
  } else {
    prospect.platforms.push({
      platform: 'instagram',
      followers: ig.profile.followers_count,
    });
  }

  // Enrich content style strengths
  if (!prospect.contentStyleStrengths || prospect.contentStyleStrengths.length === 0) {
    const styles: string[] = [];
    if (ig.contentAnalysis.primaryContentType === 'VIDEO') styles.push('video content', 'reels');
    if (ig.contentAnalysis.primaryContentType === 'CAROUSEL_ALBUM') styles.push('carousels', 'multi-image');
    if (ig.contentAnalysis.primaryContentType === 'IMAGE') styles.push('photo content', 'styling');
    prospect.contentStyleStrengths = styles;
  }

  // Enrich brand partners from IG mentions
  if ((!prospect.currentBrandPartners || prospect.currentBrandPartners.length === 0)
    && ig.monetization.brandMentions.length > 0) {
    prospect.currentBrandPartners = ig.monetization.brandMentions.map((m) =>
      m.replace('@', ''),
    );
  }
}

// ── Build Scoring Signals from IG Data ───────────────────────

function buildSignalsFromIG(ig: IGCreatorResearch): Record<string, { score: number; notes: string }> {
  const signals: Record<string, { score: number; notes: string }> = {};

  // Engagement rate
  const er = ig.engagement.avgEngagementRate;
  if (er >= 3) signals.engagement_rate = { score: 12, notes: `${er}% — excellent` };
  else if (er >= 2) signals.engagement_rate = { score: 8, notes: `${er}% — good` };
  else if (er >= 1) signals.engagement_rate = { score: 5, notes: `${er}% — average` };
  else signals.engagement_rate = { score: 2, notes: `${er}% — below average` };

  // Follower count
  const followers = ig.profile.followers_count;
  if (followers >= 150000 && followers <= 500000) signals.ig_followers = { score: 10, notes: `${fmtNum(followers)} — ideal range` };
  else if (followers >= 50000) signals.ig_followers = { score: 8, notes: `${fmtNum(followers)} — good` };
  else if (followers >= 10000) signals.ig_followers = { score: 5, notes: `${fmtNum(followers)} — smaller` };
  else signals.ig_followers = { score: 2, notes: `${fmtNum(followers)} — small` };

  // Posting frequency
  const freq = ig.engagement.postingFrequency;
  if (freq === 'daily' || freq === '4-6x/week') {
    signals.ig_post_frequency = { score: 8, notes: `${freq} — very active` };
  } else if (freq === '2-3x/week') {
    signals.ig_post_frequency = { score: 5, notes: `${freq} — moderate` };
  } else {
    signals.ig_post_frequency = { score: 2, notes: `${freq} — low` };
  }

  // Sponsored content
  if (ig.monetization.sponsoredPostCount >= 3) {
    signals.sponsored_posts_30d = { score: 10, notes: `${ig.monetization.sponsoredPostCount} sponsored posts found` };
  } else if (ig.monetization.sponsoredPostCount >= 1) {
    signals.sponsored_posts_30d = { score: 5, notes: `${ig.monetization.sponsoredPostCount} sponsored post(s)` };
  }

  // Affiliate links
  if (ig.monetization.affiliateLinkCount >= 3) {
    signals.affiliate_links_active = { score: 8, notes: `${ig.monetization.affiliateLinkCount} posts with affiliate signals` };
  } else if (ig.monetization.affiliateLinkCount >= 1) {
    signals.affiliate_links_active = { score: 4, notes: `${ig.monetization.affiliateLinkCount} post(s) with affiliate signals` };
  }

  // Discount codes
  if (ig.monetization.discountCodeCount > 0) {
    signals.discount_codes = { score: 5, notes: `${ig.monetization.discountCodeCount} posts with discount codes` };
  }

  // Brand tags
  if (ig.monetization.brandMentions.length >= 3) {
    signals.brand_tags = { score: 5, notes: `${ig.monetization.brandMentions.length} recurring brand mentions` };
  }

  return signals;
}

// ── Actionable Advice Generation ─────────────────────────────

function generateActionableAdvice(
  prospect: ProspectData,
  ig?: IGCreatorResearch,
  scoring?: ScoredCreator,
): ActionableAdvice[] {
  const advice: ActionableAdvice[] = [];

  // ── LTK Advice ──
  if (!prospect.ltkStatus.active) {
    advice.push({
      category: 'ltk',
      title: 'Launch Your LTK Storefront',
      observation: 'You don\'t appear to have an active LTK storefront — this is the #1 affiliate platform for fashion/lifestyle creators.',
      recommendation: 'We\'ll set up your LTK profile, create optimized boards, and start posting 40-80 boards per month to turn your existing content into affiliate revenue.',
      impact: 'high',
      effort: 'moderate',
    });
  } else {
    if (prospect.ltkStatus.boardCount && prospect.ltkStatus.boardCount < 20) {
      advice.push({
        category: 'ltk',
        title: 'Increase LTK Posting Frequency',
        observation: `You're posting ~${prospect.ltkStatus.boardCount} LTK boards/month. Top earners post 40-80.`,
        recommendation: 'Double your board output with a structured posting system: best sellers, daily deals, seasonal finds, and styled outfits. We handle the linking and captions.',
        impact: 'high',
        effort: 'quick-win',
      });
    }
    advice.push({
      category: 'ltk',
      title: 'Optimize LTK Caption Strategy',
      observation: 'Most creators use generic captions. Conversion-focused captions with clear CTAs can increase click-through rate by 30-50%.',
      recommendation: 'We\'ll rewrite your board captions using our 3-angle framework: Problem → Proof → Payoff. Each caption is designed to drive clicks.',
      impact: 'medium',
      effort: 'quick-win',
    });
  }

  // ── Amazon Advice ──
  if (!prospect.amazonStatus.hasStorefront) {
    advice.push({
      category: 'amazon',
      title: 'Set Up Amazon Influencer Storefront',
      observation: 'No Amazon storefront detected. Your audience is already buying on Amazon — you should be earning commission on those purchases.',
      recommendation: 'We\'ll set up your Amazon Influencer storefront with structured categories and begin Creator Connections campaigns for bonus commissions.',
      impact: 'high',
      effort: 'moderate',
    });
  }

  // ── Instagram Advice ──
  if (ig) {
    if (ig.engagement.avgEngagementRate < 2) {
      advice.push({
        category: 'instagram',
        title: 'Boost Engagement Rate',
        observation: `Your engagement rate is ${ig.engagement.avgEngagementRate}%. The sweet spot for brand partnerships is 2-4%.`,
        recommendation: 'Focus on hook-first content, use direct CTAs in captions ("Which one would you pick?"), and post during your audience\'s peak hours.',
        impact: 'medium',
        effort: 'moderate',
      });
    }

    if (ig.contentAnalysis.primaryContentType !== 'VIDEO') {
      advice.push({
        category: 'content',
        title: 'Add More Video Content (Reels)',
        observation: `Your content is primarily ${ig.contentAnalysis.primaryContentType.toLowerCase()}. Video/Reels drive 3-5x more affiliate conversions.`,
        recommendation: 'Add 2-3 Reels per week: try-ons, product reviews, and "get ready with me" formats. Each Reel should link to an LTK board.',
        impact: 'high',
        effort: 'moderate',
      });
    }

    if (ig.monetization.sponsoredPostCount === 0) {
      advice.push({
        category: 'brand',
        title: 'Start Landing Brand Partnerships',
        observation: 'No sponsored content detected in your recent posts. With your audience size, you should be commanding brand retainers.',
        recommendation: 'We\'ll build a brand pipeline of 30+ targets in your niche and run structured outreach campaigns on your behalf.',
        impact: 'high',
        effort: 'moderate',
      });
    }
  }

  // ── Content Strategy Advice ──
  advice.push({
    category: 'content',
    title: 'Implement Content Repurposing Loop',
    observation: 'Most creators monetize only 10-20% of their content. A repurposing system captures the other 80%.',
    recommendation: 'Every content piece becomes 5+ touchpoints: Instagram Reel → LTK Board → Amazon Video → Pinterest Pin → Email Feature.',
    impact: 'high',
    effort: 'quick-win',
  });

  // ── Monetization Architecture ──
  const totalFollowers = prospect.platforms.reduce((sum, p) => sum + (p.followers || 0), 0);
  if (totalFollowers > 30000) {
    advice.push({
      category: 'monetization',
      title: 'Structure Your Revenue Streams',
      observation: `With ${fmtNum(totalFollowers)}+ followers, you should have 3+ revenue streams: affiliate commissions, brand partnerships, and content licensing.`,
      recommendation: 'We\'ll architect your monetization stack: LTK affiliate + Amazon storefront + brand retainers + content licensing. Most creators at your level should earn $3K-$10K/month minimum.',
      impact: 'high',
      effort: 'project',
    });
  }

  return advice;
}

// ── Helpers ──────────────────────────────────────────────────

function sanitize(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function fmtNum(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
  return n.toString();
}

// ── CLI ──────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.length === 0) {
    console.log(`
Creator Research Engine
========================
Usage:
  npx tsx tools/lead-gen/creator-research-engine.ts --name "Name" --username handle --category Fashion [options]

Options:
  --name <name>           Creator name (required)
  --username <handle>     Instagram username
  --category <category>   Creator category (Fashion, Beauty, Home, etc.)
  --ltk <url>             LTK storefront URL
  --amazon <url>          Amazon storefront URL
  --no-ig                 Skip Instagram API fetch
  --no-screenshots        Skip browser screenshots
  --visible               Show browser windows
  --output <dir>          Output directory
`);
    return;
  }

  const getArg = (flag: string) => {
    const idx = args.indexOf(flag);
    return idx >= 0 ? args[idx + 1] : undefined;
  };

  const name = getArg('--name') || 'Unknown Creator';
  const username = getArg('--username') || getArg('--ig');
  const category = getArg('--category') || 'Lifestyle';

  const prospect: ProspectData = {
    name,
    username: username || undefined,
    category,
    platforms: username ? [{ platform: 'instagram' }] : [],
    ltkStatus: { active: !!getArg('--ltk') },
    amazonStatus: { hasStorefront: !!getArg('--amazon'), hasAssociates: false },
    ltkUrl: getArg('--ltk'),
    amazonStorefrontUrl: getArg('--amazon'),
  };

  const research = await runCreatorResearch(prospect, {
    fetchInstagram: !args.includes('--no-ig'),
    captureScreenshots: !args.includes('--no-screenshots'),
    headless: !args.includes('--visible'),
    outputDir: getArg('--output') || undefined,
  });

  console.log(`\n--- Research Complete ---`);
  console.log(`Score: ${research.scoring.percentage}% (${research.scoring.tier})`);
  console.log(`Lane: ${research.strategy.growthLane}`);
  console.log(`Actionable advice: ${research.actionableAdvice.length} items`);
  console.log(`Screenshots: ${research.screenshots?.screenshots.length || 0}`);
}

if (require.main === module) {
  main();
}
