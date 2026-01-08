import { NextRequest, NextResponse } from 'next/server';
import { requireUser, authError } from '@/lib/auth';

// LTK category mapping
const LTK_CATEGORIES: Record<string, string> = {
  'ltkfindsunder50': 'Finds Under $50',
  'ltkfindsunder100': 'Finds Under $100',
  'ltksalealert': 'Sale Alert',
  'ltkholiday': 'Holiday',
  'ltkfamily': 'Family',
  'ltkhome': 'Home',
  'ltkbeauty': 'Beauty',
  'ltkfit': 'Fitness',
  'ltkworkwear': 'Workwear',
  'ltktravel': 'Travel',
};

interface ScrapedPost {
  post_id: string;
  post_url: string;
  creator_username: string;
  creator_avatar: string;
  creator_profile_url: string;
  hero_image_url: string;
  thumbnail_url: string;
  category: string;
  source_page: string;
  scraped_at: string;
}

/**
 * Extract posts from LTK page HTML
 */
function extractPostsFromHtml(html: string, category: string, sourceUrl: string): ScrapedPost[] {
  const posts: ScrapedPost[] = [];

  // Pattern to match post URLs
  const postUrlPattern = /href="(https:\/\/www\.shopltk\.com\/explore\/([^"\/]+)\/posts\/([^"]+))"/g;
  const avatarPattern = /(https:\/\/avatar-cdn\.liketoknow\.it\/[^"]+)/g;
  const postImagePattern = /(https:\/\/product-images-cdn\.liketoknow\.it\/[^"]+)/g;

  const postUrls = [...html.matchAll(postUrlPattern)];
  const avatars = [...html.matchAll(avatarPattern)];
  const postImages = [...html.matchAll(postImagePattern)];

  // Get unique post URLs
  const uniquePosts = new Map<string, { url: string; username: string; postId: string }>();
  for (const match of postUrls) {
    const [, url, username, postId] = match;
    if (!uniquePosts.has(postId)) {
      uniquePosts.set(postId, { url, username, postId });
    }
  }

  let imageIndex = 0;
  let avatarIndex = 0;

  for (const [postId, { url, username }] of uniquePosts) {
    const post: ScrapedPost = {
      post_id: postId,
      post_url: url,
      creator_username: username,
      creator_avatar: avatars[avatarIndex]?.[1] || '',
      creator_profile_url: `https://www.shopltk.com/explore/${username}`,
      hero_image_url: postImages[imageIndex]?.[1] || '',
      thumbnail_url: postImages[imageIndex]?.[1]?.replace('w=450', 'w=150') || '',
      category: category,
      source_page: sourceUrl,
      scraped_at: new Date().toISOString(),
    };

    posts.push(post);
    imageIndex++;
    avatarIndex++;
  }

  return posts;
}

/**
 * Fetch and scrape a single category
 */
async function scrapeCategory(categorySlug: string): Promise<ScrapedPost[]> {
  const url = `https://www.shopltk.com/categories/${categorySlug}`;
  const categoryName = LTK_CATEGORIES[categorySlug] || categorySlug;

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }

  const html = await response.text();
  return extractPostsFromHtml(html, categoryName, url);
}

/**
 * GET /api/scrape?category=ltkfindsunder50
 * Scrape LTK category and return results
 */
export async function GET(request: NextRequest) {
  // Require authentication
  const user = await requireUser();
  if (!user) return authError();

  const searchParams = request.nextUrl.searchParams;
  const category = searchParams.get('category') || 'ltkfindsunder50';

  // Validate category
  if (!LTK_CATEGORIES[category]) {
    return NextResponse.json(
      { error: 'Invalid category', validCategories: Object.keys(LTK_CATEGORIES) },
      { status: 400 }
    );
  }

  try {
    const posts = await scrapeCategory(category);

    return NextResponse.json({
      success: true,
      category: LTK_CATEGORIES[category],
      count: posts.length,
      posts,
      scraped_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Scrape error:', error);
    return NextResponse.json(
      { error: 'Failed to scrape category', details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * POST /api/scrape
 * Scrape multiple categories
 * Body: { categories: ['ltkfindsunder50', 'ltkbeauty'] }
 */
export async function POST(request: NextRequest) {
  const user = await requireUser();
  if (!user) return authError();

  try {
    const body = await request.json();
    const categories = body.categories || ['ltkfindsunder50'];

    const results: { category: string; posts: ScrapedPost[] }[] = [];

    for (const category of categories) {
      if (LTK_CATEGORIES[category]) {
        const posts = await scrapeCategory(category);
        results.push({ category: LTK_CATEGORIES[category], posts });
      }
    }

    const totalPosts = results.reduce((sum, r) => sum + r.posts.length, 0);

    return NextResponse.json({
      success: true,
      total_posts: totalPosts,
      results,
      scraped_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Scrape error:', error);
    return NextResponse.json(
      { error: 'Failed to scrape categories', details: String(error) },
      { status: 500 }
    );
  }
}
