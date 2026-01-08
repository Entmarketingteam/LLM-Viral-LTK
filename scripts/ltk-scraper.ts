#!/usr/bin/env tsx
/**
 * LTK Scraper - Extracts posts, images, videos, and product links from ShopLTK
 *
 * Uses two methods:
 * 1. Network interception to capture API responses (preferred)
 * 2. DOM parsing as fallback
 *
 * Usage:
 *   npx tsx scripts/ltk-scraper.ts --category ltkfindsunder50
 *   npx tsx scripts/ltk-scraper.ts --url "https://www.shopltk.com/categories/ltkfindsunder50"
 *   npx tsx scripts/ltk-scraper.ts --all-categories
 */

import * as fs from 'fs';
import * as path from 'path';
import { ScrapedPost, ScrapedProductLink, LTK_CATEGORIES, LTKCategorySlug } from '../types/ltk';

// Configuration
const CONFIG = {
  baseUrl: 'https://www.shopltk.com',
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  outputDir: path.join(process.cwd(), 'data', 'scraped'),
  delayBetweenRequests: 2000, // 2 seconds
  maxScrolls: 10, // Number of times to scroll for infinite loading
};

// Ensure output directory exists
if (!fs.existsSync(CONFIG.outputDir)) {
  fs.mkdirSync(CONFIG.outputDir, { recursive: true });
}

/**
 * Extract post ID from URL
 */
function extractPostId(url: string): string {
  const match = url.match(/\/posts\/([a-f0-9-]+)/);
  return match ? match[1] : url;
}

/**
 * Extract username from profile URL
 */
function extractUsername(url: string): string {
  const match = url.match(/\/explore\/([^/]+)/);
  return match ? match[1] : '';
}

/**
 * Parse hashtags from caption
 */
function parseHashtags(caption: string): string[] {
  const matches = caption.match(/#[\w]+/g);
  return matches ? matches.map(tag => tag.toLowerCase()) : [];
}

/**
 * Fetch page HTML using native fetch
 */
async function fetchPage(url: string): Promise<string> {
  console.log(`📥 Fetching: ${url}`);

  const response = await fetch(url, {
    headers: {
      'User-Agent': CONFIG.userAgent,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return response.text();
}

/**
 * Extract JSON data embedded in the page (Next.js __NEXT_DATA__)
 */
function extractNextData(html: string): any {
  const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([^<]+)<\/script>/);
  if (match) {
    try {
      return JSON.parse(match[1]);
    } catch (e) {
      console.warn('⚠️ Failed to parse __NEXT_DATA__');
    }
  }
  return null;
}

/**
 * Extract posts from HTML using regex patterns
 * This is the fallback method when API interception isn't available
 */
function extractPostsFromHtml(html: string, category: string, sourceUrl: string): ScrapedPost[] {
  const posts: ScrapedPost[] = [];

  // Try to extract Next.js data first
  const nextData = extractNextData(html);
  if (nextData?.props?.pageProps?.posts) {
    console.log('✅ Found posts in __NEXT_DATA__');
    return parseNextDataPosts(nextData.props.pageProps.posts, category, sourceUrl);
  }

  // Pattern to match post cards with all their data
  // Based on the structure you provided:
  // - Profile link: href to /explore/{username}
  // - Avatar: avatar-cdn.liketoknow.it
  // - Username: text-truncate class
  // - Post link: href to /explore/{username}/posts/{id}
  // - Post image: product-images-cdn.liketoknow.it

  // Extract profile URLs and usernames
  const profilePattern = /href="(https:\/\/www\.shopltk\.com\/explore\/([^"\/]+))"/g;
  const avatarPattern = /(https:\/\/avatar-cdn\.liketoknow\.it\/[^"]+)/g;
  const postUrlPattern = /href="(https:\/\/www\.shopltk\.com\/explore\/[^"]+\/posts\/[^"]+)"/g;
  const postImagePattern = /(https:\/\/product-images-cdn\.liketoknow\.it\/[^"]+)/g;

  const profiles = [...html.matchAll(profilePattern)];
  const avatars = [...html.matchAll(avatarPattern)];
  const postUrls = [...html.matchAll(postUrlPattern)];
  const postImages = [...html.matchAll(postImagePattern)];

  console.log(`📊 Found: ${profiles.length} profiles, ${postUrls.length} posts, ${postImages.length} images`);

  // Match posts with their creators
  const uniquePostUrls = [...new Set(postUrls.map(m => m[1]))];

  for (const postUrl of uniquePostUrls) {
    const username = extractUsername(postUrl);
    const postId = extractPostId(postUrl);

    // Find matching avatar
    const profileUrl = `https://www.shopltk.com/explore/${username}`;
    const avatarMatch = avatars.find(a => {
      // Avatars are near their profile links in the HTML
      const avatarIndex = html.indexOf(a[1]);
      const profileIndex = html.indexOf(profileUrl);
      return Math.abs(avatarIndex - profileIndex) < 2000;
    });

    // Find matching post image
    const postImageMatch = postImages.find(img => {
      const imgIndex = html.indexOf(img[1]);
      const postIndex = html.indexOf(postUrl);
      return Math.abs(imgIndex - postIndex) < 1000;
    });

    const post: ScrapedPost = {
      post_id: postId,
      post_url: postUrl,
      creator_username: username,
      creator_avatar: avatarMatch ? avatarMatch[1] : '',
      creator_profile_url: profileUrl,
      caption: '', // Would need to fetch individual post page
      hashtags: [],
      hero_image_url: postImageMatch ? postImageMatch[1] : '',
      thumbnail_url: postImageMatch ? postImageMatch[1].replace('w=450', 'w=150') : '',
      all_image_urls: postImageMatch ? [postImageMatch[1]] : [],
      video_url: null,
      product_links: [],
      category: category,
      source_page: sourceUrl,
      scraped_at: new Date().toISOString(),
      published_at: null,
    };

    posts.push(post);
  }

  return posts;
}

/**
 * Parse posts from Next.js __NEXT_DATA__
 */
function parseNextDataPosts(rawPosts: any[], category: string, sourceUrl: string): ScrapedPost[] {
  return rawPosts.map((raw: any) => {
    const post: ScrapedPost = {
      post_id: raw.id || raw.post_id || '',
      post_url: raw.url || `https://www.shopltk.com/explore/${raw.creator?.username}/posts/${raw.id}`,
      creator_username: raw.creator?.username || raw.username || '',
      creator_avatar: raw.creator?.avatar_url || raw.avatar_url || '',
      creator_profile_url: `https://www.shopltk.com/explore/${raw.creator?.username || raw.username}`,
      caption: raw.caption || raw.description || '',
      hashtags: raw.hashtags || parseHashtags(raw.caption || ''),
      hero_image_url: raw.hero_image || raw.image_url || raw.media?.[0]?.url || '',
      thumbnail_url: raw.thumbnail_url || raw.hero_image || '',
      all_image_urls: raw.images || raw.media?.filter((m: any) => m.type === 'image').map((m: any) => m.url) || [],
      video_url: raw.video_url || raw.media?.find((m: any) => m.type === 'video')?.url || null,
      product_links: (raw.products || raw.product_links || []).map((p: any) => ({
        title: p.title || p.name || '',
        brand: p.brand || '',
        price: p.price || p.sale_price || null,
        url: p.url || p.link || '',
        image_url: p.image_url || p.image || '',
      })),
      category: category,
      source_page: sourceUrl,
      scraped_at: new Date().toISOString(),
      published_at: raw.published_at || raw.created_at || null,
    };
    return post;
  });
}

/**
 * Fetch detailed post data from individual post page
 */
async function fetchPostDetails(postUrl: string): Promise<Partial<ScrapedPost>> {
  try {
    const html = await fetchPage(postUrl);

    // Extract caption from meta tags or page content
    const captionMatch = html.match(/<meta property="og:description" content="([^"]+)"/);
    const caption = captionMatch ? captionMatch[1] : '';

    // Extract video URL if present
    const videoMatch = html.match(/(https:\/\/[^"]+\.mp4[^"]*)/);
    const videoUrl = videoMatch ? videoMatch[1] : null;

    // Extract all product images
    const productImages = [...html.matchAll(/(https:\/\/product-images-cdn\.liketoknow\.it\/[^"]+)/g)]
      .map(m => m[1])
      .filter((v, i, a) => a.indexOf(v) === i); // Unique

    // Extract product links
    const productLinks: ScrapedProductLink[] = [];
    const productPattern = /"product":\s*(\{[^}]+\})/g;
    const productMatches = [...html.matchAll(productPattern)];
    for (const match of productMatches) {
      try {
        const product = JSON.parse(match[1]);
        productLinks.push({
          title: product.name || product.title || '',
          brand: product.brand || '',
          price: product.price || null,
          url: product.url || '',
          image_url: product.image || '',
        });
      } catch (e) {
        // Skip malformed JSON
      }
    }

    return {
      caption,
      hashtags: parseHashtags(caption),
      video_url: videoUrl,
      all_image_urls: productImages,
      product_links: productLinks,
    };
  } catch (error) {
    console.warn(`⚠️ Failed to fetch post details: ${postUrl}`);
    return {};
  }
}

/**
 * Scrape a category page
 */
async function scrapeCategory(categorySlug: string): Promise<ScrapedPost[]> {
  const url = `${CONFIG.baseUrl}/categories/${categorySlug}`;
  const categoryName = LTK_CATEGORIES[categorySlug as LTKCategorySlug] || categorySlug;

  console.log(`\n🔍 Scraping category: ${categoryName}`);
  console.log(`   URL: ${url}`);

  try {
    const html = await fetchPage(url);
    const posts = extractPostsFromHtml(html, categoryName, url);

    console.log(`✅ Extracted ${posts.length} posts from ${categoryName}`);

    // Optionally fetch details for each post (slower but more complete)
    if (process.env.FETCH_DETAILS === 'true') {
      console.log('📥 Fetching detailed post data...');
      for (let i = 0; i < Math.min(posts.length, 10); i++) {
        const details = await fetchPostDetails(posts[i].post_url);
        Object.assign(posts[i], details);
        await sleep(CONFIG.delayBetweenRequests);
      }
    }

    return posts;
  } catch (error) {
    console.error(`❌ Error scraping ${categoryName}:`, error);
    return [];
  }
}

/**
 * Scrape a custom URL
 */
async function scrapeUrl(url: string): Promise<ScrapedPost[]> {
  console.log(`\n🔍 Scraping URL: ${url}`);

  try {
    const html = await fetchPage(url);
    const category = url.split('/').pop() || 'custom';
    const posts = extractPostsFromHtml(html, category, url);

    console.log(`✅ Extracted ${posts.length} posts`);
    return posts;
  } catch (error) {
    console.error(`❌ Error scraping URL:`, error);
    return [];
  }
}

/**
 * Save scraped data to JSON file
 */
function saveToFile(posts: ScrapedPost[], filename: string): string {
  const filepath = path.join(CONFIG.outputDir, filename);
  fs.writeFileSync(filepath, JSON.stringify(posts, null, 2));
  console.log(`💾 Saved ${posts.length} posts to: ${filepath}`);
  return filepath;
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Parse command line arguments
 */
function parseArgs(): { category?: string; url?: string; allCategories?: boolean } {
  const args = process.argv.slice(2);
  const result: { category?: string; url?: string; allCategories?: boolean } = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--category' && args[i + 1]) {
      result.category = args[i + 1];
      i++;
    } else if (args[i] === '--url' && args[i + 1]) {
      result.url = args[i + 1];
      i++;
    } else if (args[i] === '--all-categories') {
      result.allCategories = true;
    }
  }

  return result;
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 LTK Scraper Starting...\n');

  const args = parseArgs();
  let allPosts: ScrapedPost[] = [];

  if (args.allCategories) {
    // Scrape all categories
    const categories = Object.keys(LTK_CATEGORIES) as LTKCategorySlug[];
    for (const category of categories) {
      const posts = await scrapeCategory(category);
      allPosts = allPosts.concat(posts);
      await sleep(CONFIG.delayBetweenRequests);
    }
  } else if (args.category) {
    // Scrape single category
    const posts = await scrapeCategory(args.category);
    allPosts = posts;
  } else if (args.url) {
    // Scrape custom URL
    const posts = await scrapeUrl(args.url);
    allPosts = posts;
  } else {
    // Default: scrape Finds Under $50
    const posts = await scrapeCategory('ltkfindsunder50');
    allPosts = posts;
  }

  // Generate filename with timestamp
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `ltk-posts-${timestamp}.json`;

  // Save results
  const filepath = saveToFile(allPosts, filename);

  // Summary
  console.log('\n📊 Scraping Summary:');
  console.log(`   Total posts: ${allPosts.length}`);
  console.log(`   Categories: ${[...new Set(allPosts.map(p => p.category))].join(', ')}`);
  console.log(`   Output file: ${filepath}`);

  // Output stats by category
  const byCategory = allPosts.reduce((acc, post) => {
    acc[post.category] = (acc[post.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  console.log('\n   Posts by category:');
  Object.entries(byCategory).forEach(([cat, count]) => {
    console.log(`   - ${cat}: ${count}`);
  });
}

// Run
main().catch(console.error);
