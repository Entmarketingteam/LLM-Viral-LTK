// ============================================================
// Lead Gen Automation — Deliverables Library
// ============================================================
// Ready-to-use deliverable sets for proposals, grouped by
// growth lane. The Proposal Brain picks the right set(s)
// based on the prospect profile.
// ============================================================

import { GrowthLane } from './types';

export interface DeliverableSet {
  lane: GrowthLane;
  title: string;
  deliverables: DeliverableItem[];
}

export interface DeliverableItem {
  name: string;
  description: string;
  frequency?: string;
  examples?: string[];
}

// ── LTK Creator Growth ──────────────────────────────────────

export const LTK_DELIVERABLES: DeliverableSet = {
  lane: 'ltk-first',
  title: 'LTK Creator Growth',
  deliverables: [
    {
      name: 'LTK Storefront Overhaul',
      description: 'Cover image, shop tabs, seasonal collections, pinned best sellers',
      frequency: 'one-time + quarterly refresh',
      examples: [
        'Capsule wardrobe collection',
        'Amazon Finds board',
        'Holiday Gift Guide hub',
        'Best Sellers showcase',
      ],
    },
    {
      name: '4-Week LTK Content Calendar',
      description: 'Capsules + occasions + retail moments mapped to a posting cadence',
      frequency: 'monthly',
      examples: [
        'Monday: Outfit of the Day',
        'Wednesday: Amazon Finds',
        'Friday: Weekend Picks',
        'Saturday: Sale Alerts',
      ],
    },
    {
      name: '3-Angle Content Briefs',
      description: 'Problem → Proof → Payoff structure per product',
      frequency: 'per campaign',
      examples: [
        'Problem: "Finding jeans that fit postpartum"',
        'Proof: Side-by-side try-on video',
        'Payoff: "These are my most-linked jeans for a reason"',
      ],
    },
    {
      name: 'LTK Board Creation & Linking',
      description: 'Build and manage 40-80 LTK boards per month with optimized captions',
      frequency: '40-80 boards/month',
      examples: [
        'Styled outfit boards',
        'Best sellers roundup',
        'Daily deals',
        'Seasonal finds',
      ],
    },
    {
      name: 'Offer Stack Structure',
      description: '"LTK Exclusive Edit" + bundle logic + "shop my picks" CTA strategy',
      frequency: 'monthly strategy',
    },
    {
      name: 'Weekly Brand Outreach Pack',
      description: '15 target brands + 5 custom pitch angles + 3 follow-ups per week',
      frequency: 'weekly',
    },
    {
      name: 'Monthly Reporting Snapshot',
      description: 'Top retailers, EPC trends, best formats, conversion drivers',
      frequency: 'monthly',
      examples: [
        'Top 10 products by clicks',
        'Conversion rate by board type',
        'Revenue trend analysis',
        'Recommendations for next month',
      ],
    },
    {
      name: 'Product Linking & Caption Optimization',
      description: 'Handle all product linking, caption writing, and SEO optimization',
      frequency: 'ongoing',
    },
    {
      name: 'Content Repurposing System',
      description: '1 Reel → 5 LTK posts → Amazon storefront → Pinterest pins',
      frequency: 'per content piece',
    },
  ],
};

// ── Amazon Influencer: Affiliate+ ───────────────────────────

export const AMAZON_AFFILIATE_PLUS_DELIVERABLES: DeliverableSet = {
  lane: 'amazon-affiliate-plus',
  title: 'Amazon Creator Connections — Affiliate+',
  deliverables: [
    {
      name: 'Campaign Scouting & Selection',
      description: 'Identify and opt into brand campaigns aligned to audience/category',
      frequency: 'weekly',
    },
    {
      name: 'Video Topic Backlog',
      description: '20-40 video ideas mapped to high-intent keywords',
      frequency: 'monthly',
      examples: [
        '"5 Amazon fashion finds that look designer"',
        '"My most-worn Amazon outfits"',
        '"What I actually rebuy on Amazon"',
        '"Amazon home finds under $50"',
      ],
    },
    {
      name: 'Amazon Content Plan',
      description: 'Shoppable videos + offsite traffic posts + "mini review series"',
      frequency: 'monthly',
    },
    {
      name: 'Storefront Optimization',
      description: 'Structure storefront categories, featured products, and seasonal collections',
      frequency: 'monthly refresh',
    },
    {
      name: 'Performance Tracking & Learnings',
      description: 'Which products convert + repeatable formats + clicks/orders/earnings reporting',
      frequency: 'weekly',
    },
    {
      name: 'Brand Relationship Layer',
      description: 'Direct messages to brands after campaign acceptance for assets/brief clarity',
      frequency: 'per campaign',
    },
  ],
};

// ── Amazon Creator Connections: SCR (Sponsored Content) ─────

export const AMAZON_SCR_DELIVERABLES: DeliverableSet = {
  lane: 'amazon-scr',
  title: 'Amazon Creator Connections — Sponsored Content Requests',
  deliverables: [
    {
      name: 'Rate Card Optimization',
      description: 'Positioning + price architecture by content type (SCR is flat-fee, creator sets rates)',
      frequency: 'quarterly',
    },
    {
      name: 'SCR Decision Framework',
      description: 'Accept/decline matrix based on effort, usage rights, deliverable fit',
      frequency: 'per request',
    },
    {
      name: 'Content Production System',
      description: 'Scripting templates + shot lists + hooks for SCR content',
      frequency: 'per campaign',
      examples: [
        'Hook-first video scripts',
        'Product demo shot lists',
        'Before/after sequences',
        'Lifestyle integration scripts',
      ],
    },
    {
      name: 'Revision Handling SOP',
      description: 'Respond fast, keep scope clean, archive approvals (brands get 2 rounds of feedback)',
      frequency: 'ongoing',
    },
    {
      name: 'Licensing Checklist',
      description: 'Term (90-day default), usage, placements (organic + Sponsored Brands), renewal plan',
      frequency: 'per deal',
    },
    {
      name: 'Payment Operations',
      description: 'Net-60 payment tracking (Amazon does not support agency split inside the tool)',
      frequency: 'monthly',
    },
  ],
};

// ── Brand Partnerships (Non-Amazon) ─────────────────────────

export const BRAND_PARTNERSHIP_DELIVERABLES: DeliverableSet = {
  lane: 'brand-partnerships',
  title: 'Brand Partnerships',
  deliverables: [
    {
      name: 'Brand List Build',
      description: 'Category fit + budget tiering + decision-maker targeting (30-50 brands)',
      frequency: 'monthly',
    },
    {
      name: 'Pitch Angles',
      description: '5 hooks tailored to audience pains + brand outcomes per target',
      frequency: 'per brand',
    },
    {
      name: 'Deal Structure Menu',
      description: 'Flat fee / CPA / hybrid / whitelisting / usage rights framework',
      frequency: 'per deal',
    },
    {
      name: 'Creative Production Plan',
      description: '6-12 deliverables/month with iteration cycles',
      frequency: 'monthly',
    },
    {
      name: 'Performance Narrative',
      description: 'What we test, what we learn, what we scale — data-driven iteration reports',
      frequency: 'monthly',
    },
    {
      name: 'Media Kit Creation',
      description: 'Professional media kit with audience demographics, case studies, and rate card',
      frequency: 'quarterly refresh',
    },
  ],
};

// ── Hybrid (LTK + Amazon + Brands) ─────────────────────────

export const HYBRID_DELIVERABLES: DeliverableSet = {
  lane: 'hybrid',
  title: 'Full Monetization System (LTK + Amazon + Brand Partnerships)',
  deliverables: [
    ...LTK_DELIVERABLES.deliverables.slice(0, 5),
    ...AMAZON_AFFILIATE_PLUS_DELIVERABLES.deliverables.slice(0, 3),
    ...BRAND_PARTNERSHIP_DELIVERABLES.deliverables.slice(0, 3),
    {
      name: 'Cross-Platform Content Loop',
      description: 'Instagram Reel → LTK Collection → Amazon Storefront → Email list → Pinterest',
      frequency: 'per content piece',
    },
    {
      name: 'Unified Revenue Dashboard',
      description: 'Combined LTK + Amazon + brand deal revenue tracking with weekly snapshots',
      frequency: 'weekly',
    },
  ],
};

// ── Lookup ───────────────────────────────────────────────────

export const DELIVERABLES_BY_LANE: Record<GrowthLane, DeliverableSet> = {
  'ltk-first': LTK_DELIVERABLES,
  'amazon-affiliate-plus': AMAZON_AFFILIATE_PLUS_DELIVERABLES,
  'amazon-scr': AMAZON_SCR_DELIVERABLES,
  'hybrid': HYBRID_DELIVERABLES,
  'brand-partnerships': BRAND_PARTNERSHIP_DELIVERABLES,
};

export function getDeliverablesForLane(lane: GrowthLane): DeliverableSet {
  return DELIVERABLES_BY_LANE[lane];
}

export function getAllDeliverableSets(): DeliverableSet[] {
  return Object.values(DELIVERABLES_BY_LANE);
}

// ── Niche-Specific Brand Targets ────────────────────────────

export const BRAND_TARGETS_BY_NICHE: Record<string, string[]> = {
  fashion: [
    'Abercrombie', 'Nordstrom', 'Quince', 'Spanx', 'Tuckernuck',
    'Amazon Fashion', 'Free People', 'Madewell', 'J.Crew', 'Revolve',
    'ASOS', 'Zara', 'H&M', 'Target Style', 'Old Navy',
  ],
  beauty: [
    'Sephora', 'Ulta', 'Charlotte Tilbury', 'Rare Beauty', 'Tarte',
    'ColourPop', 'Fenty Beauty', 'Laura Mercier', 'IT Cosmetics', 'Glossier',
    'Drunk Elephant', 'The Ordinary', 'Olaplex', 'Dyson Beauty', 'Tatcha',
  ],
  home: [
    'Pottery Barn', 'West Elm', 'Target Home', 'Amazon Home', 'Wayfair',
    'CB2', 'Crate & Barrel', 'Anthropologie Home', 'McGee & Co', 'Serena & Lily',
    'Ruggable', 'Lulu and Georgia', 'Article', 'IKEA', 'HomeGoods',
  ],
  lifestyle: [
    'Amazon', 'Target', 'Walmart', 'Costco', 'Nordstrom',
    'Anthropologie', 'Free People', 'Lululemon', 'Stanley', 'Hydro Flask',
    'Apple', 'Dyson', 'Barefoot Dreams', 'Vuori', 'Alo Yoga',
  ],
  fitness: [
    'Lululemon', 'Nike', 'Adidas', 'Alo Yoga', 'Vuori',
    'Gymshark', 'Beyond Yoga', 'Athleta', 'Amazon Activewear', 'Under Armour',
    'Peloton', 'NOBULL', 'Outdoor Voices', 'New Balance', 'Hoka',
  ],
  family: [
    'Target', 'Amazon', 'buybuy BABY', 'Pottery Barn Kids', 'Primary',
    'Carter\'s', 'Hanna Andersson', 'Maisonette', 'Old Navy Kids', 'Nike Kids',
    'Nugget', 'Lovevery', 'Melissa & Doug', 'Monica + Andy', 'Tea Collection',
  ],
  food: [
    'Whole Foods', 'Thrive Market', 'Butcher Box', 'HelloFresh', 'Hungryroot',
    'Amazon Grocery', 'Walmart Grocery', 'Target Grocery', 'Instacart', 'Imperfect Foods',
    'Our Place', 'Caraway', 'Le Creuset', 'KitchenAid', 'Lodge Cast Iron',
  ],
  travel: [
    'Away', 'Samsonite', 'Beis', 'Monos', 'Amazon Travel',
    'Airbnb', 'Booking.com', 'Hotels.com', 'Expedia', 'Viator',
    'Calpak', 'Paravel', 'Tumi', 'Dagne Dover', 'Lo & Sons',
  ],
};

export function getBrandTargetsForNiche(niche: string): string[] {
  const normalizedNiche = niche.toLowerCase().trim();
  for (const [key, brands] of Object.entries(BRAND_TARGETS_BY_NICHE)) {
    if (normalizedNiche.includes(key) || key.includes(normalizedNiche)) {
      return brands;
    }
  }
  // Fallback to lifestyle
  return BRAND_TARGETS_BY_NICHE.lifestyle;
}

// ── Creator Scoring Signals ─────────────────────────────────

export interface CreatorSignal {
  name: string;
  weight: number;
  description: string;
  evaluator: string;
}

export const CREATOR_SCORING_SIGNALS: CreatorSignal[] = [
  {
    name: 'ltk_active',
    weight: 15,
    description: 'Has an active LTK profile with recent posts',
    evaluator: 'Check LTK URL for recent activity (last 30 days)',
  },
  {
    name: 'ltk_post_frequency',
    weight: 10,
    description: 'Frequency of LTK board postings',
    evaluator: 'Count boards posted in last 30 days — high (20+), medium (10-19), low (<10)',
  },
  {
    name: 'amazon_storefront',
    weight: 10,
    description: 'Has an Amazon Influencer storefront',
    evaluator: 'Check for amazon.com/shop/ link in bio or linktree',
  },
  {
    name: 'instagram_followers',
    weight: 10,
    description: 'Instagram follower count (sweet spot: 10K-500K)',
    evaluator: 'API or scrape — 10K-50K=5pts, 50K-150K=8pts, 150K-500K=10pts, 500K+=7pts',
  },
  {
    name: 'engagement_rate',
    weight: 12,
    description: 'Instagram engagement rate (likes+comments / followers)',
    evaluator: 'Sample last 12 posts — >3%=12pts, 2-3%=8pts, 1-2%=5pts, <1%=2pts',
  },
  {
    name: 'story_activity',
    weight: 8,
    description: 'Posts Instagram stories regularly with product links',
    evaluator: 'Check story highlights for shopping/affiliate content',
  },
  {
    name: 'sponsored_content_signals',
    weight: 10,
    description: 'Recent #ad, #sponsored, #partner, "paid partnership" posts in last 30 days',
    evaluator: 'Search last 30 days of posts for ad disclosure hashtags/labels',
  },
  {
    name: 'content_quality',
    weight: 8,
    description: 'Visual quality and consistency of content',
    evaluator: 'Assess photo/video quality, consistency of aesthetic, professional feel',
  },
  {
    name: 'niche_alignment',
    weight: 7,
    description: 'Clear niche focus that aligns with affiliate monetization',
    evaluator: 'Category clarity — fashion/beauty/home/lifestyle = high, mixed/unclear = low',
  },
  {
    name: 'blog_presence',
    weight: 5,
    description: 'Has a blog or website (indicates business mindset)',
    evaluator: 'Check link in bio for personal website/blog',
  },
  {
    name: 'multi_platform',
    weight: 5,
    description: 'Active on multiple platforms (IG + TikTok + YouTube + Pinterest)',
    evaluator: 'Count active platforms — 3+=5pts, 2=3pts, 1=1pt',
  },
  {
    name: 'revenue_indicators',
    weight: 10,
    description: 'Indicators they are actively monetizing (link in bio tools, discount codes, affiliate links)',
    evaluator: 'Check for Linktree/Stan Store, discount codes in captions, "link in bio" CTAs',
  },
];

export function calculateCreatorScore(signals: Record<string, number>): {
  totalScore: number;
  maxScore: number;
  percentage: number;
  tier: 'hot' | 'warm' | 'cold' | 'nurture';
} {
  let totalScore = 0;
  const maxScore = CREATOR_SCORING_SIGNALS.reduce((sum, s) => sum + s.weight, 0);

  for (const signal of CREATOR_SCORING_SIGNALS) {
    const value = signals[signal.name] ?? 0;
    totalScore += Math.min(value, signal.weight);
  }

  const percentage = Math.round((totalScore / maxScore) * 100);
  let tier: 'hot' | 'warm' | 'cold' | 'nurture';
  if (percentage >= 75) tier = 'hot';
  else if (percentage >= 50) tier = 'warm';
  else if (percentage >= 30) tier = 'cold';
  else tier = 'nurture';

  return { totalScore, maxScore, percentage, tier };
}
