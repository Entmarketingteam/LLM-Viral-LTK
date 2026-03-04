// ============================================================
// Lead Gen Automation — Creator Signal Scorer & Research
// ============================================================
// Automates the research process for cold outbound:
// - Scores creators based on signals (LTK activity, followers,
//   engagement, sponsored content, monetization indicators)
// - Determines if they should be a brand client vs. an
//   affiliate-only play
// - Segments into outreach tiers (hot/warm/cold/nurture)
// - Tracks follow-up signals
// ============================================================

import { ProspectData, GrowthLane } from './types';
import { calculateCreatorScore, CREATOR_SCORING_SIGNALS } from './deliverables-library';
import { determineGrowthLane } from './proposal-brain';

// ── Signal Definitions ──────────────────────────────────────

export interface ResearchSignal {
  id: string;
  name: string;
  category: 'activity' | 'audience' | 'monetization' | 'engagement' | 'intent';
  weight: number;
  description: string;
  howToCheck: string;
  automatable: boolean;
}

/** All signals we check during creator research */
export const ALL_RESEARCH_SIGNALS: ResearchSignal[] = [
  // ── Activity Signals ──
  {
    id: 'ltk_active_30d',
    name: 'Active on LTK (last 30 days)',
    category: 'activity',
    weight: 15,
    description: 'Creator has posted at least 1 LTK board in the last 30 days',
    howToCheck: 'Check LTK profile URL for recent board posts. Look at date stamps on latest boards.',
    automatable: true,
  },
  {
    id: 'ltk_post_volume',
    name: 'LTK Post Volume',
    category: 'activity',
    weight: 10,
    description: 'Number of LTK boards posted in the last 30 days',
    howToCheck: 'Count boards with dates in last 30 days. Score: 20+/month = 10pts, 10-19 = 7pts, 5-9 = 4pts, <5 = 2pts',
    automatable: true,
  },
  {
    id: 'ig_post_frequency',
    name: 'Instagram Post Frequency',
    category: 'activity',
    weight: 8,
    description: 'Posts on Instagram at least 3x per week',
    howToCheck: 'Check last 12 posts — are they spread over ~4 weeks? 3+/week = full, 1-2/week = half, <1/week = low',
    automatable: true,
  },
  {
    id: 'story_activity',
    name: 'Instagram Story Activity',
    category: 'activity',
    weight: 8,
    description: 'Regularly posts stories with product links/swipe-ups',
    howToCheck: 'Check story highlights for shopping-related highlights (e.g., "Shop", "Finds", "Favorites", "Links")',
    automatable: false,
  },
  {
    id: 'tiktok_active',
    name: 'Active on TikTok',
    category: 'activity',
    weight: 5,
    description: 'Has a TikTok account with posts in the last 30 days',
    howToCheck: 'Search TikTok for username, check last post date',
    automatable: true,
  },
  {
    id: 'youtube_active',
    name: 'Active on YouTube',
    category: 'activity',
    weight: 5,
    description: 'Has a YouTube channel with uploads in the last 90 days',
    howToCheck: 'Search YouTube for channel, check last upload date',
    automatable: true,
  },

  // ── Audience Signals ──
  {
    id: 'ig_followers',
    name: 'Instagram Follower Count',
    category: 'audience',
    weight: 10,
    description: 'Instagram follower count — sweet spot is 10K-500K',
    howToCheck: 'API or profile scrape. 10K-50K=5pts, 50K-150K=8pts, 150K-500K=10pts, 500K+=7pts (too big, harder to close)',
    automatable: true,
  },
  {
    id: 'audience_demo_match',
    name: 'Audience Demographics Match',
    category: 'audience',
    weight: 7,
    description: 'Audience is primarily women 25-45 with purchasing power (key demo for LTK/Amazon)',
    howToCheck: 'Infer from content type, comments, and niche. Fashion/beauty/home/lifestyle = strong match.',
    automatable: false,
  },
  {
    id: 'niche_clarity',
    name: 'Clear Niche Focus',
    category: 'audience',
    weight: 7,
    description: 'Creator has a clear, specific niche (not generic "lifestyle")',
    howToCheck: 'Review last 20 posts — is there a consistent theme? Fashion, home, beauty, fitness = clear. Random mix = unclear.',
    automatable: false,
  },
  {
    id: 'multi_platform',
    name: 'Multi-Platform Presence',
    category: 'audience',
    weight: 5,
    description: 'Active on 3+ platforms (IG + TikTok + YouTube/Pinterest/Blog)',
    howToCheck: 'Check link in bio for other platform links. Count active platforms: 3+ = full, 2 = half, 1 = low',
    automatable: true,
  },

  // ── Engagement Signals ──
  {
    id: 'engagement_rate',
    name: 'Engagement Rate',
    category: 'engagement',
    weight: 12,
    description: 'Likes + comments per post relative to follower count',
    howToCheck: 'Sample last 12 posts: (avg likes+comments) / followers. >3% = 12pts, 2-3% = 8pts, 1-2% = 5pts, <1% = 2pts',
    automatable: true,
  },
  {
    id: 'comment_quality',
    name: 'Comment Quality',
    category: 'engagement',
    weight: 5,
    description: 'Comments show purchase intent ("where is this from?", "link?", "need this!")',
    howToCheck: 'Read 20-30 comments across recent posts. Look for shopping-related questions and product interest.',
    automatable: false,
  },
  {
    id: 'saves_shares',
    name: 'Save/Share Signals',
    category: 'engagement',
    weight: 3,
    description: 'Posts appear to get saved/shared (indicates high purchase intent)',
    howToCheck: 'Look for posts with disproportionately high engagement — roundup posts, "best of" lists tend to get saved.',
    automatable: false,
  },

  // ── Monetization Signals ──
  {
    id: 'has_ltk_profile',
    name: 'Has LTK Profile',
    category: 'monetization',
    weight: 12,
    description: 'Creator has an LTK profile (regardless of activity level)',
    howToCheck: 'Search liketoknow.it for username or check link in bio for LTK link',
    automatable: true,
  },
  {
    id: 'has_amazon_storefront',
    name: 'Has Amazon Storefront',
    category: 'monetization',
    weight: 10,
    description: 'Creator has an Amazon Influencer storefront',
    howToCheck: 'Check link in bio for amazon.com/shop/ link. Also check linktree/bio link tools.',
    automatable: true,
  },
  {
    id: 'uses_link_tool',
    name: 'Uses Link-in-Bio Tool',
    category: 'monetization',
    weight: 5,
    description: 'Uses Linktree, Stan Store, Beacons, etc. (indicates business mindset)',
    howToCheck: 'Check the "website" field on IG profile for linktr.ee, stan.store, beacons.ai, etc.',
    automatable: true,
  },
  {
    id: 'discount_codes',
    name: 'Uses Discount Codes',
    category: 'monetization',
    weight: 5,
    description: 'Shares discount codes in posts/stories (active affiliate/ambassador)',
    howToCheck: 'Search last 30 captions for patterns: "code", "discount", "% off", "use my code"',
    automatable: true,
  },
  {
    id: 'link_in_bio_cta',
    name: '"Link in Bio" CTAs',
    category: 'monetization',
    weight: 4,
    description: 'Frequently uses "link in bio" or "shop my" CTAs',
    howToCheck: 'Search last 20 captions for "link in bio", "shop my", "tap to shop", "linked in"',
    automatable: true,
  },
  {
    id: 'has_blog',
    name: 'Has Blog/Website',
    category: 'monetization',
    weight: 4,
    description: 'Has a personal blog or website (not just social)',
    howToCheck: 'Check link in bio for a personal domain (not just linktree)',
    automatable: true,
  },

  // ── Intent Signals (are they making money / open to partnerships?) ──
  {
    id: 'sponsored_posts_30d',
    name: 'Sponsored Posts (Last 30 Days)',
    category: 'intent',
    weight: 10,
    description: '#ad, #sponsored, #partner, "paid partnership" labels in last 30 days',
    howToCheck: 'Search last 30 days of posts for: #ad, #sponsored, #partner, "paid partnership" label, #gifted, #collab',
    automatable: true,
  },
  {
    id: 'brand_tags',
    name: 'Tags Brands in Content',
    category: 'intent',
    weight: 5,
    description: 'Regularly tags brands in posts/stories',
    howToCheck: 'Check last 20 posts for @brand tags (not just friends/other creators)',
    automatable: true,
  },
  {
    id: 'affiliate_links_active',
    name: 'Actively Shares Affiliate Links',
    category: 'intent',
    weight: 8,
    description: 'Shares affiliate/shopping links in stories, posts, or bio',
    howToCheck: 'Check stories/highlights for swipe-up links, check LTK for recent activity, check Amazon storefront',
    automatable: true,
  },
  {
    id: 'media_kit_available',
    name: 'Has Media Kit / Rate Card',
    category: 'intent',
    weight: 3,
    description: 'Has a media kit or rate card linked in bio/website',
    howToCheck: 'Check link in bio for "media kit", "work with me", "partnerships" page',
    automatable: false,
  },
];

// ── Scoring Engine ──────────────────────────────────────────

export interface ScoredCreator {
  prospect: ProspectData;
  totalScore: number;
  maxScore: number;
  percentage: number;
  tier: 'hot' | 'warm' | 'cold' | 'nurture';
  signalBreakdown: SignalScore[];
  categoryBreakdown: CategoryScore[];
  recommendedLane: GrowthLane;
  shouldBeBrandClient: boolean;
  outreachPriority: number;
  nextSteps: string[];
}

export interface SignalScore {
  signalId: string;
  signalName: string;
  score: number;
  maxScore: number;
  notes: string;
}

export interface CategoryScore {
  category: string;
  score: number;
  maxScore: number;
  percentage: number;
}

export function scoreCreator(
  prospect: ProspectData,
  manualSignals?: Record<string, { score: number; notes: string }>,
): ScoredCreator {
  const signalBreakdown: SignalScore[] = [];
  let totalScore = 0;
  const maxScore = ALL_RESEARCH_SIGNALS.reduce((sum, s) => sum + s.weight, 0);

  for (const signal of ALL_RESEARCH_SIGNALS) {
    let score = 0;
    let notes = '';

    // Check if manual score was provided
    if (manualSignals?.[signal.id]) {
      score = Math.min(manualSignals[signal.id].score, signal.weight);
      notes = manualSignals[signal.id].notes;
    } else {
      // Auto-score based on prospect data
      const autoResult = autoScoreSignal(signal, prospect);
      score = autoResult.score;
      notes = autoResult.notes;
    }

    signalBreakdown.push({
      signalId: signal.id,
      signalName: signal.name,
      score,
      maxScore: signal.weight,
      notes,
    });

    totalScore += score;
  }

  // Category breakdown
  const categories = ['activity', 'audience', 'monetization', 'engagement', 'intent'] as const;
  const categoryBreakdown: CategoryScore[] = categories.map((cat) => {
    const signals = ALL_RESEARCH_SIGNALS.filter((s) => s.category === cat);
    const catMax = signals.reduce((sum, s) => sum + s.weight, 0);
    const catScore = signalBreakdown
      .filter((sb) => signals.some((s) => s.id === sb.signalId))
      .reduce((sum, sb) => sum + sb.score, 0);
    return {
      category: cat,
      score: catScore,
      maxScore: catMax,
      percentage: catMax > 0 ? Math.round((catScore / catMax) * 100) : 0,
    };
  });

  const percentage = Math.round((totalScore / maxScore) * 100);
  let tier: 'hot' | 'warm' | 'cold' | 'nurture';
  if (percentage >= 70) tier = 'hot';
  else if (percentage >= 45) tier = 'warm';
  else if (percentage >= 25) tier = 'cold';
  else tier = 'nurture';

  const recommendedLane = determineGrowthLane(prospect);
  const shouldBeBrandClient = determineBrandClientFit(prospect, signalBreakdown, totalFollowers(prospect));
  const outreachPriority = calculateOutreachPriority(tier, shouldBeBrandClient, prospect);
  const nextSteps = generateNextSteps(tier, prospect, signalBreakdown);

  return {
    prospect,
    totalScore,
    maxScore,
    percentage,
    tier,
    signalBreakdown,
    categoryBreakdown,
    recommendedLane,
    shouldBeBrandClient,
    outreachPriority,
    nextSteps,
  };
}

// ── Auto-Scoring ────────────────────────────────────────────

function autoScoreSignal(
  signal: ResearchSignal,
  p: ProspectData,
): { score: number; notes: string } {
  switch (signal.id) {
    case 'ltk_active_30d':
      if (p.ltkStatus.active) return { score: signal.weight, notes: 'LTK profile is active' };
      if (p.ltkUrl) return { score: Math.floor(signal.weight * 0.5), notes: 'Has LTK URL but activity unknown' };
      return { score: 0, notes: 'No LTK activity detected' };

    case 'ltk_post_volume':
      if (p.ltkStatus.boardCount) {
        if (p.ltkStatus.boardCount >= 20) return { score: signal.weight, notes: `${p.ltkStatus.boardCount} boards/month — high volume` };
        if (p.ltkStatus.boardCount >= 10) return { score: Math.floor(signal.weight * 0.7), notes: `${p.ltkStatus.boardCount} boards/month — moderate` };
        if (p.ltkStatus.boardCount >= 5) return { score: Math.floor(signal.weight * 0.4), notes: `${p.ltkStatus.boardCount} boards/month — low` };
        return { score: Math.floor(signal.weight * 0.2), notes: `${p.ltkStatus.boardCount} boards/month — very low` };
      }
      return { score: 0, notes: 'Board count unknown' };

    case 'ig_followers': {
      const igFollowers = p.platforms.find((pl) => pl.platform === 'instagram')?.followers || 0;
      if (igFollowers >= 150000 && igFollowers <= 500000) return { score: signal.weight, notes: `${formatNumber(igFollowers)} — ideal range` };
      if (igFollowers >= 50000) return { score: Math.floor(signal.weight * 0.8), notes: `${formatNumber(igFollowers)} — good range` };
      if (igFollowers >= 10000) return { score: Math.floor(signal.weight * 0.5), notes: `${formatNumber(igFollowers)} — smaller but workable` };
      if (igFollowers > 500000) return { score: Math.floor(signal.weight * 0.7), notes: `${formatNumber(igFollowers)} — large (harder to close)` };
      return { score: 0, notes: 'Follower count unknown or too low' };
    }

    case 'has_ltk_profile':
      if (p.ltkUrl || p.ltkStatus.active) return { score: signal.weight, notes: 'Has LTK profile' };
      return { score: 0, notes: 'No LTK profile found' };

    case 'has_amazon_storefront':
      if (p.amazonStatus.hasStorefront) return { score: signal.weight, notes: 'Has Amazon storefront' };
      return { score: 0, notes: 'No Amazon storefront' };

    case 'multi_platform': {
      const count = p.platforms.length;
      if (count >= 3) return { score: signal.weight, notes: `${count} platforms — strong multi-platform` };
      if (count === 2) return { score: Math.floor(signal.weight * 0.6), notes: '2 platforms' };
      return { score: Math.floor(signal.weight * 0.2), notes: '1 platform' };
    }

    case 'sponsored_posts_30d': {
      const hasSponsored = p.painPoints?.some((pp) =>
        pp.toLowerCase().includes('sponsored') || pp.toLowerCase().includes('#ad'),
      ) || (p.currentBrandPartners && p.currentBrandPartners.length > 0);
      if (hasSponsored) return { score: signal.weight, notes: 'Sponsored content indicators found' };
      return { score: 0, notes: 'No sponsored content signals — needs manual check' };
    }

    default:
      return { score: 0, notes: 'Needs manual research' };
  }
}

// ── Brand Client Determination ──────────────────────────────

function determineBrandClientFit(
  p: ProspectData,
  signals: SignalScore[],
  followers: number,
): boolean {
  // A creator should be positioned as a "brand client" if:
  // 1. They have 50K+ followers
  // 2. They already do sponsored content
  // 3. They have clear niche alignment
  // 4. Their engagement rate is decent

  let brandFitScore = 0;

  if (followers >= 100000) brandFitScore += 3;
  else if (followers >= 50000) brandFitScore += 2;
  else if (followers >= 20000) brandFitScore += 1;

  if (p.currentBrandPartners && p.currentBrandPartners.length > 0) brandFitScore += 2;

  const sponsoredSignal = signals.find((s) => s.signalId === 'sponsored_posts_30d');
  if (sponsoredSignal && sponsoredSignal.score > 0) brandFitScore += 2;

  const engagementSignal = signals.find((s) => s.signalId === 'engagement_rate');
  if (engagementSignal && engagementSignal.score >= 5) brandFitScore += 1;

  return brandFitScore >= 4;
}

// ── Outreach Priority ───────────────────────────────────────

function calculateOutreachPriority(
  tier: string,
  isBrandClient: boolean,
  p: ProspectData,
): number {
  let priority = 0;

  // Tier base
  switch (tier) {
    case 'hot': priority = 80; break;
    case 'warm': priority = 50; break;
    case 'cold': priority = 25; break;
    default: priority = 10;
  }

  // Brand client bonus
  if (isBrandClient) priority += 10;

  // LTK active bonus (our core service)
  if (p.ltkStatus.active) priority += 5;

  // Priority score from spreadsheet
  if (p.priorityScore) priority = Math.min(100, priority + Math.floor(p.priorityScore / 10));

  return Math.min(100, priority);
}

// ── Next Steps Generation ───────────────────────────────────

function generateNextSteps(
  tier: string,
  p: ProspectData,
  signals: SignalScore[],
): string[] {
  const steps: string[] = [];

  // Research gaps — what do we still need to find out?
  const unknownSignals = signals.filter((s) => s.notes.includes('unknown') || s.notes.includes('manual'));
  if (unknownSignals.length > 0) {
    steps.push(`Complete manual research for: ${unknownSignals.slice(0, 3).map((s) => s.signalName).join(', ')}`);
  }

  // Outreach action
  switch (tier) {
    case 'hot':
      steps.push('Send personalized DM (warm-direct variant) immediately');
      steps.push('Prepare monetization audit to send after first reply');
      steps.push('Queue email follow-up for 48 hours');
      break;
    case 'warm':
      steps.push('Send personalized DM (soft-invite variant)');
      steps.push('Add to email nurture sequence');
      steps.push('Schedule follow-up DM in 7 days if no response');
      break;
    case 'cold':
      steps.push('Add to email outreach batch (data-driven variant)');
      steps.push('Monitor for activity signals (new posts, brand partnerships)');
      steps.push('Re-score in 30 days');
      break;
    default:
      steps.push('Add to long-term nurture list');
      steps.push('Set re-evaluation reminder for 60 days');
      break;
  }

  // Specific opportunities
  if (!p.amazonStatus.hasStorefront) {
    steps.push('Mention Amazon storefront opportunity in outreach (strong hook)');
  }
  if (!p.ltkStatus.active && p.ltkUrl) {
    steps.push('Mention LTK reactivation opportunity (they have a dormant profile)');
  }

  return steps;
}

// ── Batch Scoring ───────────────────────────────────────────

export function batchScoreCreators(
  prospects: ProspectData[],
): ScoredCreator[] {
  return prospects
    .map((p) => scoreCreator(p))
    .sort((a, b) => b.outreachPriority - a.outreachPriority);
}

// ── HTML Report ─────────────────────────────────────────────

export function renderScoreCardHTML(scored: ScoredCreator): string {
  const p = scored.prospect;
  const tierColors: Record<string, string> = {
    hot: '#ef4444',
    warm: '#f59e0b',
    cold: '#3b82f6',
    nurture: '#6b7280',
  };
  const tierColor = tierColors[scored.tier] || '#6b7280';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Creator Score Card — ${esc(p.name)}</title>
<style>
  :root { --accent: #4F9CF7; --bg: #0f1117; --surface: #181b23; --border: #2a2e3b; --text: #e4e6ed; --text-muted: #8b8fa3; --text-bright: #fff; --tier: ${tierColor}; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif; background: var(--bg); color: var(--text); line-height: 1.65; }
  .container { max-width: 800px; margin: 0 auto; padding: 50px 40px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; padding-bottom: 30px; border-bottom: 1px solid var(--border); }
  .header-left h1 { font-size: 24px; color: var(--text-bright); margin-bottom: 4px; }
  .header-left .sub { font-size: 13px; color: var(--text-muted); }
  .tier-badge { padding: 8px 20px; border-radius: 20px; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; background: ${tierColor}22; color: var(--tier); border: 1px solid ${tierColor}44; }

  .score-ring { text-align: center; margin-bottom: 40px; }
  .score-ring .big { font-size: 64px; font-weight: 700; color: var(--tier); }
  .score-ring .of { font-size: 18px; color: var(--text-muted); }
  .score-ring .pct { font-size: 14px; color: var(--text-muted); margin-top: 4px; }

  .cat-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; margin-bottom: 40px; }
  .cat-card { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 16px; text-align: center; }
  .cat-card .cat-label { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: var(--text-muted); margin-bottom: 6px; }
  .cat-card .cat-score { font-size: 22px; font-weight: 700; color: var(--accent); }
  .cat-card .cat-pct { font-size: 11px; color: var(--text-muted); }

  .bar { height: 6px; background: var(--border); border-radius: 3px; margin-top: 6px; }
  .bar-fill { height: 100%; border-radius: 3px; background: var(--accent); }

  .section { margin-bottom: 36px; }
  .section h2 { font-size: 16px; color: var(--text-bright); margin-bottom: 14px; }

  .signal-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: var(--surface); border: 1px solid var(--border); border-radius: 6px; margin-bottom: 6px; font-size: 13px; }
  .signal-name { color: var(--text); flex: 1; }
  .signal-score { color: var(--accent); font-weight: 600; min-width: 50px; text-align: right; }
  .signal-note { color: var(--text-muted); font-size: 11px; max-width: 250px; text-align: right; }

  .next-step { padding: 10px 14px 10px 24px; background: var(--surface); border: 1px solid var(--border); border-radius: 6px; margin-bottom: 6px; font-size: 13px; position: relative; }
  .next-step::before { content: ''; position: absolute; left: 10px; top: 16px; width: 6px; height: 6px; background: var(--accent); border-radius: 50%; }

  .meta-row { display: flex; gap: 16px; margin-bottom: 20px; flex-wrap: wrap; }
  .meta-tag { background: var(--surface); border: 1px solid var(--border); padding: 6px 14px; border-radius: 6px; font-size: 12px; }
  .meta-tag strong { color: var(--accent); }

  @media (max-width: 600px) { .container { padding: 30px 20px; } .cat-grid { grid-template-columns: repeat(3, 1fr); } }
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <div class="header-left">
      <h1>${esc(p.name)}</h1>
      <div class="sub">${esc(p.category)} &bull; ${p.platforms.map((pl) => pl.platform).join(', ')}</div>
    </div>
    <div class="tier-badge">${scored.tier}</div>
  </div>

  <div class="score-ring">
    <div class="big">${scored.totalScore}</div>
    <div class="of">/ ${scored.maxScore}</div>
    <div class="pct">${scored.percentage}% &bull; Outreach Priority: ${scored.outreachPriority}/100</div>
  </div>

  <div class="meta-row">
    <div class="meta-tag">Lane: <strong>${scored.recommendedLane}</strong></div>
    <div class="meta-tag">Brand Client: <strong>${scored.shouldBeBrandClient ? 'Yes' : 'No'}</strong></div>
    <div class="meta-tag">Priority: <strong>${scored.outreachPriority}/100</strong></div>
  </div>

  <div class="cat-grid">
    ${scored.categoryBreakdown.map((cat) => `
    <div class="cat-card">
      <div class="cat-label">${esc(cat.category)}</div>
      <div class="cat-score">${cat.score}</div>
      <div class="cat-pct">${cat.percentage}%</div>
      <div class="bar"><div class="bar-fill" style="width: ${cat.percentage}%"></div></div>
    </div>`).join('')}
  </div>

  <div class="section">
    <h2>Signal Breakdown</h2>
    ${scored.signalBreakdown.map((s) => `
    <div class="signal-row">
      <span class="signal-name">${esc(s.signalName)}</span>
      <span class="signal-note">${esc(s.notes)}</span>
      <span class="signal-score">${s.score}/${s.maxScore}</span>
    </div>`).join('')}
  </div>

  <div class="section">
    <h2>Recommended Next Steps</h2>
    ${scored.nextSteps.map((step) => `<div class="next-step">${esc(step)}</div>`).join('')}
  </div>
</div>
</body>
</html>`;
}

// ── Batch Report ────────────────────────────────────────────

export function renderBatchReportHTML(scoredCreators: ScoredCreator[]): string {
  const hot = scoredCreators.filter((s) => s.tier === 'hot');
  const warm = scoredCreators.filter((s) => s.tier === 'warm');
  const cold = scoredCreators.filter((s) => s.tier === 'cold');
  const nurture = scoredCreators.filter((s) => s.tier === 'nurture');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Creator Outreach Pipeline — ${scoredCreators.length} Creators</title>
<style>
  :root { --bg: #0f1117; --surface: #181b23; --border: #2a2e3b; --text: #e4e6ed; --text-muted: #8b8fa3; --text-bright: #fff; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif; background: var(--bg); color: var(--text); line-height: 1.65; }
  .container { max-width: 1100px; margin: 0 auto; padding: 50px 40px; }
  h1 { font-size: 28px; color: var(--text-bright); margin-bottom: 6px; }
  .sub { color: var(--text-muted); margin-bottom: 30px; }

  .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 40px; }
  .summary-card { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 20px; text-align: center; }
  .summary-card .count { font-size: 36px; font-weight: 700; }
  .summary-card .label { font-size: 12px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; }
  .hot .count { color: #ef4444; }
  .warm .count { color: #f59e0b; }
  .cold .count { color: #3b82f6; }
  .nurture-card .count { color: #6b7280; }

  .tier-section { margin-bottom: 36px; }
  .tier-header { font-size: 16px; color: var(--text-bright); margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }
  .tier-dot { width: 10px; height: 10px; border-radius: 50%; }

  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: var(--text-muted); padding: 10px 12px; border-bottom: 1px solid var(--border); }
  td { padding: 12px; font-size: 13px; border-bottom: 1px solid var(--border); }
  tr:hover { background: var(--surface); }
  .score-cell { font-weight: 600; }
  .lane-cell { font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
</style>
</head>
<body>
<div class="container">
  <h1>Creator Outreach Pipeline</h1>
  <div class="sub">${scoredCreators.length} creators scored &bull; ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>

  <div class="summary">
    <div class="summary-card hot"><div class="count">${hot.length}</div><div class="label">Hot</div></div>
    <div class="summary-card warm"><div class="count">${warm.length}</div><div class="label">Warm</div></div>
    <div class="summary-card cold"><div class="count">${cold.length}</div><div class="label">Cold</div></div>
    <div class="summary-card nurture-card"><div class="count">${nurture.length}</div><div class="label">Nurture</div></div>
  </div>

  ${renderTierTable('Hot — Reach Out Immediately', '#ef4444', hot)}
  ${renderTierTable('Warm — Personalized Outreach', '#f59e0b', warm)}
  ${renderTierTable('Cold — Batch Outreach', '#3b82f6', cold)}
  ${renderTierTable('Nurture — Long-Term', '#6b7280', nurture)}
</div>
</body>
</html>`;
}

function renderTierTable(title: string, color: string, creators: ScoredCreator[]): string {
  if (creators.length === 0) return '';
  return `
  <div class="tier-section">
    <div class="tier-header"><div class="tier-dot" style="background: ${color}"></div> ${title} (${creators.length})</div>
    <table>
      <thead><tr><th>Name</th><th>Category</th><th>Score</th><th>Priority</th><th>Lane</th><th>Brand Client?</th><th>Next Step</th></tr></thead>
      <tbody>
        ${creators.map((c) => `
        <tr>
          <td style="color: var(--text-bright); font-weight: 500;">${esc(c.prospect.name)}</td>
          <td>${esc(c.prospect.category)}</td>
          <td class="score-cell" style="color: ${color}">${c.percentage}%</td>
          <td>${c.outreachPriority}/100</td>
          <td class="lane-cell">${esc(c.recommendedLane)}</td>
          <td>${c.shouldBeBrandClient ? 'Yes' : 'No'}</td>
          <td style="color: var(--text-muted); font-size: 12px;">${esc(c.nextSteps[0] || '')}</td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>`;
}

// ── Helpers ──────────────────────────────────────────────────

function totalFollowers(p: ProspectData): number {
  return p.platforms.reduce((sum, pl) => sum + (pl.followers || 0), 0);
}

function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
  return n.toString();
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
