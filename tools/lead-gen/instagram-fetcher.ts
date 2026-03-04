// ============================================================
// Lead Gen Automation — Meta Graph API Instagram Data Fetcher
// ============================================================
// Pulls real Instagram data for creator research:
// - Profile info (bio, follower count, media count)
// - Recent posts (images, captions, engagement)
// - Business discovery (look up any public business/creator account)
//
// Requires: META_GRAPH_API_TOKEN (long-lived token from Doppler)
// ============================================================

import * as fs from 'fs';
import * as path from 'path';

// ── Types ────────────────────────────────────────────────────

export interface IGProfile {
  id: string;
  username: string;
  name: string;
  biography: string;
  followers_count: number;
  follows_count: number;
  media_count: number;
  profile_picture_url?: string;
  website?: string;
}

export interface IGPost {
  id: string;
  caption?: string;
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
  media_url?: string;
  thumbnail_url?: string;
  permalink: string;
  timestamp: string;
  like_count?: number;
  comments_count?: number;
  // Derived
  engagement_rate?: number;
  hashtags?: string[];
  mentions?: string[];
  has_affiliate_link?: boolean;
  has_ad_disclosure?: boolean;
}

export interface IGCreatorResearch {
  profile: IGProfile;
  recentPosts: IGPost[];
  engagement: {
    avgLikes: number;
    avgComments: number;
    avgEngagementRate: number;
    topPostByLikes?: IGPost;
    topPostByComments?: IGPost;
    postingFrequency: string;
  };
  monetization: {
    sponsoredPostCount: number;
    affiliateLinkCount: number;
    brandMentions: string[];
    discountCodeCount: number;
  };
  contentAnalysis: {
    primaryContentType: string;
    topHashtags: string[];
    postingDays: Record<string, number>;
    avgCaptionLength: number;
  };
  fetchedAt: string;
}

// ── Config ───────────────────────────────────────────────────

function getToken(): string {
  const token = process.env.META_GRAPH_API_TOKEN
    || process.env.INSTAGRAM_ACCESS_TOKEN
    || process.env.META_ACCESS_TOKEN;
  if (!token) {
    throw new Error(
      'Missing Meta Graph API token. Set META_GRAPH_API_TOKEN in your environment (Doppler or .env).',
    );
  }
  return token;
}

const GRAPH_API_BASE = 'https://graph.facebook.com/v19.0';

// ── API Calls ────────────────────────────────────────────────

/**
 * Look up a creator's Instagram profile via Business Discovery.
 * Requires your IG account to have a business/creator account connected.
 */
export async function fetchCreatorProfile(
  username: string,
  igAccountId?: string,
): Promise<IGProfile> {
  const token = getToken();
  const accountId = igAccountId || process.env.META_IG_ACCOUNT_ID;
  if (!accountId) {
    throw new Error('Missing META_IG_ACCOUNT_ID — your Instagram business account ID.');
  }

  const fields = [
    'username', 'name', 'biography', 'followers_count',
    'follows_count', 'media_count', 'profile_picture_url', 'website',
  ].join(',');

  const url = `${GRAPH_API_BASE}/${accountId}?fields=business_discovery.fields(${fields}){username=${username}}&access_token=${token}`;

  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Instagram API error: ${res.status} — ${JSON.stringify(err)}`);
  }

  const data = await res.json();
  const bd = data.business_discovery;

  return {
    id: bd.id,
    username: bd.username,
    name: bd.name || bd.username,
    biography: bd.biography || '',
    followers_count: bd.followers_count || 0,
    follows_count: bd.follows_count || 0,
    media_count: bd.media_count || 0,
    profile_picture_url: bd.profile_picture_url,
    website: bd.website,
  };
}

/**
 * Fetch recent posts for a creator via Business Discovery.
 */
export async function fetchCreatorPosts(
  username: string,
  limit: number = 25,
  igAccountId?: string,
): Promise<IGPost[]> {
  const token = getToken();
  const accountId = igAccountId || process.env.META_IG_ACCOUNT_ID;
  if (!accountId) {
    throw new Error('Missing META_IG_ACCOUNT_ID — your Instagram business account ID.');
  }

  const mediaFields = [
    'id', 'caption', 'media_type', 'media_url', 'thumbnail_url',
    'permalink', 'timestamp', 'like_count', 'comments_count',
  ].join(',');

  const url = `${GRAPH_API_BASE}/${accountId}?fields=business_discovery.fields(media.limit(${limit}){${mediaFields}}){username=${username}}&access_token=${token}`;

  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Instagram API error: ${res.status} — ${JSON.stringify(err)}`);
  }

  const data = await res.json();
  const media = data.business_discovery?.media?.data || [];

  return media.map((post: Record<string, unknown>) => {
    const caption = (post.caption as string) || '';
    return {
      id: post.id as string,
      caption,
      media_type: post.media_type as IGPost['media_type'],
      media_url: post.media_url as string | undefined,
      thumbnail_url: post.thumbnail_url as string | undefined,
      permalink: post.permalink as string,
      timestamp: post.timestamp as string,
      like_count: post.like_count as number | undefined,
      comments_count: post.comments_count as number | undefined,
      hashtags: extractHashtags(caption),
      mentions: extractMentions(caption),
      has_affiliate_link: detectAffiliateLink(caption),
      has_ad_disclosure: detectAdDisclosure(caption),
    };
  });
}

// ── Full Creator Research ────────────────────────────────────

/**
 * Run a full research profile on a creator: profile + posts + analysis.
 */
export async function researchCreator(
  username: string,
  igAccountId?: string,
): Promise<IGCreatorResearch> {
  const [profile, posts] = await Promise.all([
    fetchCreatorProfile(username, igAccountId),
    fetchCreatorPosts(username, 25, igAccountId),
  ]);

  const engagement = analyzeEngagement(posts, profile.followers_count);
  const monetization = analyzeMonetization(posts);
  const contentAnalysis = analyzeContent(posts);

  return {
    profile,
    recentPosts: posts,
    engagement,
    monetization,
    contentAnalysis,
    fetchedAt: new Date().toISOString(),
  };
}

// ── Analysis Functions ───────────────────────────────────────

function analyzeEngagement(posts: IGPost[], followers: number) {
  const postsWithEngagement = posts.filter((p) => p.like_count !== undefined);
  const totalLikes = postsWithEngagement.reduce((sum, p) => sum + (p.like_count || 0), 0);
  const totalComments = postsWithEngagement.reduce((sum, p) => sum + (p.comments_count || 0), 0);
  const count = postsWithEngagement.length || 1;

  const avgLikes = Math.round(totalLikes / count);
  const avgComments = Math.round(totalComments / count);
  const avgEngagementRate = followers > 0
    ? parseFloat(((totalLikes + totalComments) / count / followers * 100).toFixed(2))
    : 0;

  const sortedByLikes = [...postsWithEngagement].sort((a, b) => (b.like_count || 0) - (a.like_count || 0));
  const sortedByComments = [...postsWithEngagement].sort((a, b) => (b.comments_count || 0) - (a.comments_count || 0));

  // Posting frequency
  let postingFrequency = 'unknown';
  if (posts.length >= 2) {
    const dates = posts.map((p) => new Date(p.timestamp).getTime()).sort((a, b) => b - a);
    const spanDays = (dates[0] - dates[dates.length - 1]) / (1000 * 60 * 60 * 24);
    const postsPerWeek = spanDays > 0 ? (posts.length / spanDays) * 7 : 0;
    if (postsPerWeek >= 7) postingFrequency = 'daily';
    else if (postsPerWeek >= 4) postingFrequency = '4-6x/week';
    else if (postsPerWeek >= 2) postingFrequency = '2-3x/week';
    else if (postsPerWeek >= 1) postingFrequency = '1x/week';
    else postingFrequency = 'less than weekly';
  }

  return {
    avgLikes,
    avgComments,
    avgEngagementRate,
    topPostByLikes: sortedByLikes[0],
    topPostByComments: sortedByComments[0],
    postingFrequency,
  };
}

function analyzeMonetization(posts: IGPost[]) {
  const sponsoredPostCount = posts.filter((p) => p.has_ad_disclosure).length;
  const affiliateLinkCount = posts.filter((p) => p.has_affiliate_link).length;
  const discountCodeCount = posts.filter((p) => detectDiscountCode(p.caption || '')).length;

  // Extract brand mentions (mentions that look like brands, not friends)
  const allMentions = posts.flatMap((p) => p.mentions || []);
  const mentionCounts = new Map<string, number>();
  for (const m of allMentions) {
    mentionCounts.set(m, (mentionCounts.get(m) || 0) + 1);
  }
  // Brands are usually mentioned multiple times
  const brandMentions = [...mentionCounts.entries()]
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .map(([mention]) => mention);

  return {
    sponsoredPostCount,
    affiliateLinkCount,
    brandMentions,
    discountCodeCount,
  };
}

function analyzeContent(posts: IGPost[]) {
  // Primary content type
  const typeCounts: Record<string, number> = {};
  for (const p of posts) {
    typeCounts[p.media_type] = (typeCounts[p.media_type] || 0) + 1;
  }
  const primaryContentType = Object.entries(typeCounts)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || 'IMAGE';

  // Top hashtags
  const hashtagCounts = new Map<string, number>();
  for (const p of posts) {
    for (const tag of p.hashtags || []) {
      hashtagCounts.set(tag, (hashtagCounts.get(tag) || 0) + 1);
    }
  }
  const topHashtags = [...hashtagCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([tag]) => tag);

  // Posting days
  const postingDays: Record<string, number> = {};
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  for (const p of posts) {
    const day = dayNames[new Date(p.timestamp).getDay()];
    postingDays[day] = (postingDays[day] || 0) + 1;
  }

  // Average caption length
  const avgCaptionLength = posts.length > 0
    ? Math.round(posts.reduce((sum, p) => sum + (p.caption?.length || 0), 0) / posts.length)
    : 0;

  return {
    primaryContentType,
    topHashtags,
    postingDays,
    avgCaptionLength,
  };
}

// ── Text Analysis Helpers ────────────────────────────────────

function extractHashtags(text: string): string[] {
  const matches = text.match(/#\w+/g);
  return matches ? matches.map((h) => h.toLowerCase()) : [];
}

function extractMentions(text: string): string[] {
  const matches = text.match(/@[\w.]+/g);
  return matches ? matches.map((m) => m.toLowerCase()) : [];
}

function detectAdDisclosure(text: string): boolean {
  const lower = text.toLowerCase();
  const adPatterns = [
    '#ad', '#sponsored', '#partner', '#collab',
    '#gifted', '#paidpartnership', 'paid partnership',
    '#brandpartner', '#ambassado', '#promo',
  ];
  return adPatterns.some((p) => lower.includes(p));
}

function detectAffiliateLink(text: string): boolean {
  const lower = text.toLowerCase();
  const affiliatePatterns = [
    'link in bio', 'shop my', 'tap to shop', 'linked in',
    'ltk.app', 'liketoknow.it', 'shopltk', 'rstyle.me',
    'amazon.com/shop', 'amzn.to', 'commission',
    'affiliate', 'swipe up', 'link in profile',
  ];
  return affiliatePatterns.some((p) => lower.includes(p));
}

function detectDiscountCode(text: string): boolean {
  const lower = text.toLowerCase();
  const codePatterns = [
    'code ', 'discount', '% off', 'use my code',
    'promo code', 'coupon', 'save with',
  ];
  return codePatterns.some((p) => lower.includes(p));
}

// ── Save Research Data ───────────────────────────────────────

export function saveResearchData(
  research: IGCreatorResearch,
  outputDir: string = path.join(process.cwd(), 'data', 'research'),
): string {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  const filename = `${research.profile.username}-${Date.now()}.json`;
  const filepath = path.join(outputDir, filename);
  fs.writeFileSync(filepath, JSON.stringify(research, null, 2));
  return filepath;
}

// ── CLI ──────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes('--help')) {
    console.log(`
Instagram Creator Research — Meta Graph API
============================================
Usage:
  npx tsx tools/lead-gen/instagram-fetcher.ts <username>
  npx tsx tools/lead-gen/instagram-fetcher.ts <username> --save

Environment:
  META_GRAPH_API_TOKEN     Long-lived access token (from Doppler)
  META_IG_ACCOUNT_ID       Your Instagram business account ID

Example:
  npx tsx tools/lead-gen/instagram-fetcher.ts loverlygrey --save
`);
    return;
  }

  const username = args[0].replace('@', '');
  const shouldSave = args.includes('--save');

  console.log(`\nResearching @${username}...\n`);

  try {
    const research = await researchCreator(username);

    console.log(`Profile: ${research.profile.name} (@${research.profile.username})`);
    console.log(`Followers: ${research.profile.followers_count.toLocaleString()}`);
    console.log(`Posts analyzed: ${research.recentPosts.length}`);
    console.log(`\nEngagement:`);
    console.log(`  Avg likes: ${research.engagement.avgLikes.toLocaleString()}`);
    console.log(`  Avg comments: ${research.engagement.avgComments.toLocaleString()}`);
    console.log(`  Engagement rate: ${research.engagement.avgEngagementRate}%`);
    console.log(`  Posting frequency: ${research.engagement.postingFrequency}`);
    console.log(`\nMonetization signals:`);
    console.log(`  Sponsored posts: ${research.monetization.sponsoredPostCount}`);
    console.log(`  Affiliate link mentions: ${research.monetization.affiliateLinkCount}`);
    console.log(`  Discount codes: ${research.monetization.discountCodeCount}`);
    console.log(`  Brand mentions: ${research.monetization.brandMentions.join(', ') || 'none detected'}`);
    console.log(`\nContent:`);
    console.log(`  Primary type: ${research.contentAnalysis.primaryContentType}`);
    console.log(`  Top hashtags: ${research.contentAnalysis.topHashtags.slice(0, 8).join(', ')}`);

    if (shouldSave) {
      const filepath = saveResearchData(research);
      console.log(`\nSaved to: ${filepath}`);
    }
  } catch (err) {
    console.error('Error:', err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
