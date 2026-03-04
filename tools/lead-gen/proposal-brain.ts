// ============================================================
// Lead Gen Automation — Proposal Brain Engine
// ============================================================
// Auto-determines the best growth lane for a prospect and
// generates tailored strategy notes, content concepts,
// brand targets, and pitch angles.
// ============================================================

import {
  ProspectData,
  GrowthLane,
  BrandTarget,
  PitchAngle,
  ContentConcept,
} from './types';
import { getBrandTargetsForNiche, getDeliverablesForLane } from './deliverables-library';

// ── Growth Lane Determination ───────────────────────────────

export function determineGrowthLane(prospect: ProspectData): GrowthLane {
  let scores: Record<GrowthLane, number> = {
    'ltk-first': 0,
    'amazon-affiliate-plus': 0,
    'amazon-scr': 0,
    'hybrid': 0,
    'brand-partnerships': 0,
  };

  // LTK signals
  if (prospect.ltkStatus.active) {
    scores['ltk-first'] += 25;
    scores['hybrid'] += 15;
  }
  if (prospect.ltkUrl) {
    scores['ltk-first'] += 10;
    scores['hybrid'] += 5;
  }
  if (prospect.ltkStatus.boardCount && prospect.ltkStatus.boardCount > 10) {
    scores['ltk-first'] += 10;
  }

  // Amazon signals
  if (prospect.amazonStatus.hasStorefront) {
    scores['amazon-affiliate-plus'] += 20;
    scores['hybrid'] += 10;
  }
  if (prospect.amazonStatus.hasCreatorConnections) {
    scores['amazon-affiliate-plus'] += 15;
    scores['amazon-scr'] += 10;
  }
  if (prospect.amazonStatus.hasAssociates) {
    scores['amazon-affiliate-plus'] += 5;
  }

  // Brand partnership signals
  if (prospect.currentBrandPartners && prospect.currentBrandPartners.length > 2) {
    scores['brand-partnerships'] += 20;
    scores['hybrid'] += 10;
  }
  if (prospect.painPoints?.some((p) => p.toLowerCase().includes('brand'))) {
    scores['brand-partnerships'] += 10;
  }

  // Platform presence
  const totalFollowers = prospect.platforms.reduce((sum, p) => sum + (p.followers || 0), 0);
  if (totalFollowers > 100000) {
    scores['brand-partnerships'] += 10;
    scores['hybrid'] += 15;
  } else if (totalFollowers > 30000) {
    scores['hybrid'] += 10;
  }

  // Multi-platform bonus
  if (prospect.platforms.length >= 3) {
    scores['hybrid'] += 15;
  }

  // Content style — video-heavy = Amazon, static = LTK
  const videoKeywords = ['video', 'reel', 'tiktok', 'youtube', 'shorts'];
  const hasVideoStrength = prospect.contentStyleStrengths?.some((s) =>
    videoKeywords.some((k) => s.toLowerCase().includes(k)),
  );
  if (hasVideoStrength) {
    scores['amazon-affiliate-plus'] += 10;
    scores['amazon-scr'] += 10;
  }

  // Category weighting
  const ltkStrongCategories = ['fashion', 'home', 'beauty', 'lifestyle', 'family'];
  const amazonStrongCategories = ['tech', 'fitness', 'kitchen', 'tools', 'electronics'];
  const normalizedCategory = prospect.category.toLowerCase();

  if (ltkStrongCategories.some((c) => normalizedCategory.includes(c))) {
    scores['ltk-first'] += 10;
  }
  if (amazonStrongCategories.some((c) => normalizedCategory.includes(c))) {
    scores['amazon-affiliate-plus'] += 10;
  }

  // Find the winner
  let bestLane: GrowthLane = 'hybrid';
  let bestScore = 0;
  for (const [lane, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      bestLane = lane as GrowthLane;
    }
  }

  return bestLane;
}

// ── Strategy Notes Generation ───────────────────────────────

export interface StrategyOutput {
  growthLane: GrowthLane;
  internalNotes: string[];
  brandTargets: BrandTarget[];
  pitchAngles: PitchAngle[];
  contentConcepts: ContentConcept[];
  ninetyDayPlan: string[];
}

export function generateStrategy(prospect: ProspectData): StrategyOutput {
  const lane = determineGrowthLane(prospect);
  const brands = getBrandTargetsForNiche(prospect.category);
  const deliverableSet = getDeliverablesForLane(lane);

  const brandTargets: BrandTarget[] = brands.slice(0, 10).map((name) => ({
    name,
    reason: getBrandReason(name, prospect),
  }));

  const pitchAngles = generatePitchAngles(prospect, lane);
  const contentConcepts = generateContentConcepts(prospect, lane);
  const internalNotes = generateInternalNotes(prospect, lane);
  const ninetyDayPlan = generateNinetyDayPlan(prospect, lane);

  return {
    growthLane: lane,
    internalNotes,
    brandTargets,
    pitchAngles,
    contentConcepts,
    ninetyDayPlan,
  };
}

// ── Internal Notes ──────────────────────────────────────────

function generateInternalNotes(p: ProspectData, lane: GrowthLane): string[] {
  const notes: string[] = [];

  notes.push(`Primary growth lane: ${lane}`);
  notes.push(`Category: ${p.category}`);

  // LTK assessment
  if (p.ltkStatus.active) {
    notes.push(`LTK: Active — look for optimization opportunities (board frequency, caption quality, storefront layout)`);
    if (p.ltkStatus.boardCount) {
      notes.push(`LTK boards: ${p.ltkStatus.boardCount} — ${p.ltkStatus.boardCount > 20 ? 'good volume, focus on conversion' : 'room to increase posting frequency'}`);
    }
  } else {
    notes.push(`LTK: Not active or unverified — opportunity to launch and activate`);
  }

  // Amazon assessment
  if (p.amazonStatus.hasStorefront) {
    notes.push(`Amazon: Has storefront — check for Creator Connections eligibility`);
  } else {
    notes.push(`Amazon: No storefront — low-hanging fruit to set up`);
  }

  // Platform assessment
  const totalFollowers = p.platforms.reduce((sum, pl) => sum + (pl.followers || 0), 0);
  if (totalFollowers > 0) {
    notes.push(`Total audience: ~${formatNumber(totalFollowers)} across ${p.platforms.length} platform(s)`);
  }

  // Pain points
  if (p.painPoints && p.painPoints.length > 0) {
    notes.push(`Key pain points to address in outreach: ${p.painPoints.join(', ')}`);
  }

  // Revenue
  if (p.desiredMonthlyIncome) {
    notes.push(`Income target: $${formatNumber(p.desiredMonthlyIncome)}/month — calibrate pricing tier accordingly`);
  }

  // Priority
  if (p.priorityScore) {
    notes.push(`Priority score: ${p.priorityScore}/100 — ${p.priorityScore >= 70 ? 'HIGH PRIORITY' : p.priorityScore >= 40 ? 'medium priority' : 'nurture track'}`);
  }

  return notes;
}

// ── Pitch Angles ────────────────────────────────────────────

function generatePitchAngles(p: ProspectData, lane: GrowthLane): PitchAngle[] {
  const angles: PitchAngle[] = [];

  // Always include the core positioning angle
  angles.push({
    title: `${p.category} Monetization Authority`,
    hook: `${p.name}'s audience trusts their ${p.category} recommendations — positioning products as curated picks inside their ecosystem drives repeat conversions.`,
    value: `Turn organic trust into structured affiliate revenue with a system that works on autopilot.`,
  });

  // LTK-specific
  if (lane === 'ltk-first' || lane === 'hybrid') {
    angles.push({
      title: 'LTK Revenue Multiplier',
      hook: `${p.name} has the audience — but LTK revenue is capped without a structured posting system, optimized captions, and conversion-focused board strategy.`,
      value: `We build the backend system: 40-80 boards/month, linking, captions, and reporting — so the creator focuses on content.`,
    });
  }

  // Amazon-specific
  if (lane === 'amazon-affiliate-plus' || lane === 'amazon-scr' || lane === 'hybrid') {
    angles.push({
      title: 'Amazon Storefront Growth Engine',
      hook: `Amazon's Creator Connections program offers bonus commission on qualifying sales — most creators leave this money on the table.`,
      value: `We activate and manage Amazon campaigns, build video content plans, and track performance to maximize storefront revenue.`,
    });
  }

  // Brand deals
  angles.push({
    title: 'Brand Deal Architect',
    hook: `With ${p.platforms.length} active platform(s) and a ${p.category} audience, ${p.name} should be commanding premium retainers from brands in this space.`,
    value: `We build brand pipelines, structure deals (flat fee + performance hybrid), and negotiate on behalf of the creator.`,
  });

  return angles;
}

// ── Content Concepts ────────────────────────────────────────

function generateContentConcepts(p: ProspectData, lane: GrowthLane): ContentConcept[] {
  const concepts: ContentConcept[] = [];
  const cat = p.category.toLowerCase();

  // Category-specific concepts
  if (cat.includes('fashion') || cat.includes('style')) {
    concepts.push(
      {
        title: 'Capsule Wardrobe Series',
        format: 'Instagram Reel + LTK Collection',
        description: `Seasonal capsule wardrobe: 15 pieces, 30 outfits.`,
        deliverables: ['3 Instagram Reels', '1 LTK Collection', '5 Amazon shoppable videos'],
      },
      {
        title: 'Amazon Fashion Finds',
        format: 'Shoppable Video + LTK Board',
        description: `"Amazon finds that look designer" — high-converting format.`,
        deliverables: ['5 Amazon product videos', '2 LTK boards', '1 IG carousel'],
      },
      {
        title: 'Try-On Haul',
        format: 'Reel + Story Set + LTK Board',
        description: `Retailer-specific try-on content — drives storefront visits.`,
        deliverables: ['1 Reel', '8-10 Story slides', '1 LTK board per retailer'],
      },
    );
  } else if (cat.includes('home') || cat.includes('interior') || cat.includes('decor')) {
    concepts.push(
      {
        title: 'Room Refresh Series',
        format: 'Before/After Reel + LTK Board',
        description: `Room transformation content linked to shoppable product boards.`,
        deliverables: ['2 Reels', '1 LTK Collection', '3 Amazon product videos'],
      },
      {
        title: 'Amazon Home Finds Under $50',
        format: 'Shoppable Video + Amazon Storefront',
        description: `Budget-friendly home finds — high intent, high conversion.`,
        deliverables: ['5 Amazon videos', '2 LTK boards', '1 Pinterest pin set'],
      },
      {
        title: 'Seasonal Decor Guide',
        format: 'Blog Post + LTK Collection + Email',
        description: `Comprehensive seasonal guide driving traffic to curated product collections.`,
        deliverables: ['1 blog post', '1 LTK collection', '1 email feature', '3 story slides'],
      },
    );
  } else if (cat.includes('beauty') || cat.includes('skincare')) {
    concepts.push(
      {
        title: 'Morning/Night Routine',
        format: 'Reel + LTK Board + Amazon Videos',
        description: `Routine-based content linking every product used.`,
        deliverables: ['1 Reel', '1 LTK board', '5 Amazon product videos'],
      },
      {
        title: 'Dupe vs Splurge',
        format: 'Carousel + LTK Board',
        description: `Side-by-side comparison content — extremely shareable + shoppable.`,
        deliverables: ['1 IG carousel', '2 LTK boards (luxury + budget)', '3 Amazon videos'],
      },
      {
        title: 'Monthly Favorites',
        format: 'Video + LTK Board + Email',
        description: `Recurring series building loyalty and repeat traffic.`,
        deliverables: ['1 Reel', '1 LTK board', '1 email blast'],
      },
    );
  } else {
    // Generic/lifestyle
    concepts.push(
      {
        title: 'Weekly Favorites',
        format: 'Reel + LTK Board',
        description: `Curated weekly picks across categories — builds a habit loop with audience.`,
        deliverables: ['1 Reel', '1 LTK collection', '5 Amazon shoppable videos'],
      },
      {
        title: 'Amazon Must-Haves',
        format: 'Shoppable Video Series',
        description: `"Things I actually rebuy on Amazon" — high-intent evergreen content.`,
        deliverables: ['5 Amazon videos', '2 LTK boards', '1 Pinterest set'],
      },
      {
        title: 'Day in My Life + Shop My Look',
        format: 'Story Series + LTK Board',
        description: `Lifestyle content naturally linking to shoppable products throughout the day.`,
        deliverables: ['10 Story slides', '1 LTK board', '1 Amazon storefront update'],
      },
    );
  }

  return concepts;
}

// ── 90-Day Plan ─────────────────────────────────────────────

function generateNinetyDayPlan(p: ProspectData, lane: GrowthLane): string[] {
  return [
    'Week 1: Kickoff call + full monetization audit (LTK, Amazon, brand partnerships, content)',
    'Week 1: Storefront optimization plan delivered',
    'Week 2: LTK storefront overhaul + Amazon storefront setup/refresh',
    'Week 2: Brand target list (30+ brands) + pitch angles drafted',
    'Week 3: Content calendar delivered (month 1) + first batch of boards posted',
    'Week 3: First brand outreach wave launched (15 brands)',
    'Week 4: Weekly reporting begins + content briefs delivered',
    'Week 5-6: Campaign volume ramps to full pace (40-80 boards/month)',
    'Week 5-6: Amazon Creator Connections campaigns activated',
    'Week 6: First brand partnership responses + negotiations',
    'Week 7-8: Second brand outreach wave + deal structuring',
    'Week 7-8: Content optimization based on first month data',
    'Week 8: Midpoint performance review + strategy adjustment',
    'Week 9-10: Brand deals in execution + affiliate revenue growing',
    'Week 10-12: Scale: increase volume, expand brand pipeline, add platforms',
    'Week 12: Full quarterly report + next quarter strategy roadmap',
  ];
}

// ── Helpers ──────────────────────────────────────────────────

function getBrandReason(brandName: string, p: ProspectData): string {
  const cat = p.category.toLowerCase();
  return `${brandName} aligns with ${p.name}'s ${cat} audience and has active affiliate/partnership programs in this category.`;
}

function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
  return n.toString();
}
