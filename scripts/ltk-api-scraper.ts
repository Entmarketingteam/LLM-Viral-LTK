#!/usr/bin/env tsx
/**
 * LTK API Scraper - Intercepts REST API calls from ShopLTK
 *
 * This scraper uses Puppeteer to:
 * 1. Navigate to LTK pages
 * 2. Intercept API calls to api-gateway.shopltk.com
 * 3. Extract structured data including direct media URLs
 *
 * Usage:
 *   npx tsx scripts/ltk-api-scraper.ts --category ltkfindsunder50
 *   npx tsx scripts/ltk-api-scraper.ts --download-media
 */

import puppeteer, { Page, Browser, HTTPResponse } from 'puppeteer-core';
import * as fs from 'fs';
import * as path from 'path';
import { ScrapedPost, LTK_CATEGORIES, LTKCategorySlug } from '../types/ltk';

// Configuration
const CONFIG = {
  baseUrl: 'https://www.shopltk.com',
  apiGateway: 'api-gateway.shopltk.com',
  outputDir: path.join(process.cwd(), 'data', 'scraped'),
  mediaDir: path.join(process.cwd(), 'data', 'media'),
  scrollCount: 5, // Number of scroll operations
  scrollDelay: 1500, // ms between scrolls
  headless: true,
};

// Ensure directories exist
[CONFIG.outputDir, CONFIG.mediaDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

/**
 * Raw LTK API response structure
 */
interface LTKApiResponse {
  ltks?: LTKApiPost[];
  profiles?: LTKApiProfile[];
  products?: LTKApiProduct[];
  next_cursor?: string;
}

interface LTKApiPost {
  id: string;
  ltk_url?: string;
  share_url?: string;
  hero_image?: string;
  video_media_url?: string;
  caption?: string;
  profile_id?: string;
  product_ids?: string[];
  date_created?: string;
  date_updated?: string;
}

interface LTKApiProfile {
  id: string;
  display_name?: string;
  username?: string;
  avatar_url?: string;
  hero_image?: string;
  bio?: string;
  follower_count?: number;
}

interface LTKApiProduct {
  id: string;
  name?: string;
  brand?: string;
  retailer_display_name?: string;
  image_url?: string;
  hyperlink?: string;
  price?: number;
  sale_price?: number;
}

/**
 * Captured API data
 */
interface CapturedData {
  posts: LTKApiPost[];
  profiles: Map<string, LTKApiProfile>;
  products: Map<string, LTKApiProduct>;
}

/**
 * Sleep utility
 */
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Parse hashtags from caption
 */
function parseHashtags(caption: string): string[] {
  const matches = caption.match(/#[\w]+/g);
  return matches ? matches.map(tag => tag.toLowerCase()) : [];
}

/**
 * Setup network interception to capture API responses
 */
async function setupNetworkInterception(page: Page, captured: CapturedData): Promise<void> {
  // Enable request interception
  await page.setRequestInterception(true);

  page.on('request', request => {
    request.continue();
  });

  page.on('response', async (response: HTTPResponse) => {
    const url = response.url();

    // Only capture API gateway responses
    if (!url.includes(CONFIG.apiGateway)) return;

    try {
      const contentType = response.headers()['content-type'] || '';
      if (!contentType.includes('application/json')) return;

      const data: LTKApiResponse = await response.json();

      // Capture posts (ltks)
      if (data.ltks && Array.isArray(data.ltks)) {
        console.log(`📦 Captured ${data.ltks.length} posts from API`);
        captured.posts.push(...data.ltks);
      }

      // Capture profiles
      if (data.profiles && Array.isArray(data.profiles)) {
        data.profiles.forEach(profile => {
          captured.profiles.set(profile.id, profile);
        });
        console.log(`👤 Captured ${data.profiles.length} profiles`);
      }

      // Capture products
      if (data.products && Array.isArray(data.products)) {
        data.products.forEach(product => {
          captured.products.set(product.id, product);
        });
        console.log(`🛍️ Captured ${data.products.length} products`);
      }
    } catch (e) {
      // Not JSON or parse error - skip
    }
  });
}

/**
 * Scroll page to trigger infinite loading
 */
async function scrollPage(page: Page, scrollCount: number): Promise<void> {
  console.log(`📜 Scrolling page ${scrollCount} times to load more content...`);

  for (let i = 0; i < scrollCount; i++) {
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    console.log(`   Scroll ${i + 1}/${scrollCount}`);
    await sleep(CONFIG.scrollDelay);
  }

  // Scroll back to top
  await page.evaluate(() => {
    window.scrollTo(0, 0);
  });
}

/**
 * Transform captured API data into our ScrapedPost format
 */
function transformToScrapedPosts(
  captured: CapturedData,
  category: string,
  sourceUrl: string
): ScrapedPost[] {
  const posts: ScrapedPost[] = [];

  for (const apiPost of captured.posts) {
    // Get associated profile
    const profile = apiPost.profile_id
      ? captured.profiles.get(apiPost.profile_id)
      : undefined;

    // Get associated products
    const products = (apiPost.product_ids || [])
      .map(id => captured.products.get(id))
      .filter(Boolean);

    const post: ScrapedPost = {
      post_id: apiPost.id,
      post_url: apiPost.ltk_url || apiPost.share_url || '',

      creator_username: profile?.username || profile?.display_name || '',
      creator_avatar: profile?.avatar_url || '',
      creator_profile_url: profile?.username
        ? `${CONFIG.baseUrl}/explore/${profile.username}`
        : '',

      caption: apiPost.caption || '',
      hashtags: parseHashtags(apiPost.caption || ''),

      hero_image_url: apiPost.hero_image || '',
      thumbnail_url: apiPost.hero_image
        ? apiPost.hero_image.replace(/w=\d+/, 'w=150')
        : '',
      all_image_urls: apiPost.hero_image ? [apiPost.hero_image] : [],
      video_url: apiPost.video_media_url || null,

      product_links: products.map(p => ({
        title: p!.name || '',
        brand: p!.brand || p!.retailer_display_name || '',
        price: p!.price || p!.sale_price || null,
        url: p!.hyperlink || '',
        image_url: p!.image_url || '',
      })),

      category: category,
      source_page: sourceUrl,
      scraped_at: new Date().toISOString(),
      published_at: apiPost.date_created || null,
    };

    posts.push(post);
  }

  return posts;
}

/**
 * Download media file
 */
async function downloadMedia(url: string, filename: string): Promise<void> {
  try {
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();
    const filepath = path.join(CONFIG.mediaDir, filename);
    fs.writeFileSync(filepath, Buffer.from(buffer));
    console.log(`   ✅ Downloaded: ${filename}`);
  } catch (error) {
    console.warn(`   ⚠️ Failed to download: ${filename}`);
  }
}

/**
 * Download all media from scraped posts
 */
async function downloadAllMedia(posts: ScrapedPost[]): Promise<void> {
  console.log(`\n📥 Downloading media for ${posts.length} posts...`);

  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];
    const prefix = `${post.post_id}`;

    // Download hero image
    if (post.hero_image_url) {
      const ext = post.hero_image_url.includes('.webp') ? 'webp' : 'jpg';
      await downloadMedia(post.hero_image_url, `${prefix}_hero.${ext}`);
    }

    // Download video
    if (post.video_url) {
      const ext = post.video_url.includes('.m3u8') ? 'm3u8' : 'mp4';
      await downloadMedia(post.video_url, `${prefix}_video.${ext}`);
    }

    // Rate limiting
    if (i % 10 === 0) {
      await sleep(500);
    }
  }

  console.log(`✅ Media download complete`);
}

/**
 * Scrape a category using API interception
 */
async function scrapeCategory(
  browser: Browser,
  categorySlug: string,
  downloadMedia: boolean = false
): Promise<ScrapedPost[]> {
  const url = `${CONFIG.baseUrl}/categories/${categorySlug}`;
  const categoryName = LTK_CATEGORIES[categorySlug as LTKCategorySlug] || categorySlug;

  console.log(`\n🔍 Scraping: ${categoryName}`);
  console.log(`   URL: ${url}`);

  const page = await browser.newPage();

  // Set viewport and user agent
  await page.setViewport({ width: 1920, height: 1080 });
  await page.setUserAgent(
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  );

  // Setup data capture
  const captured: CapturedData = {
    posts: [],
    profiles: new Map(),
    products: new Map(),
  };

  await setupNetworkInterception(page, captured);

  // Navigate to page
  console.log('   Loading page...');
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

  // Wait for content to load
  await sleep(2000);

  // Scroll to load more content
  await scrollPage(page, CONFIG.scrollCount);

  // Wait for final requests to complete
  await sleep(3000);

  // Transform data
  const posts = transformToScrapedPosts(captured, categoryName, url);

  // Remove duplicates
  const uniquePosts = posts.filter((post, index, self) =>
    index === self.findIndex(p => p.post_id === post.post_id)
  );

  console.log(`✅ Captured ${uniquePosts.length} unique posts`);

  // Optionally download media
  if (downloadMedia && uniquePosts.length > 0) {
    await downloadAllMedia(uniquePosts);
  }

  await page.close();
  return uniquePosts;
}

/**
 * Also extract data from DOM as fallback
 */
async function extractFromDOM(page: Page): Promise<Partial<ScrapedPost>[]> {
  return page.evaluate(() => {
    const results: any[] = [];

    // Find all post links
    document.querySelectorAll('a[href*="/explore/"]').forEach(link => {
      const href = (link as HTMLAnchorElement).href;
      if (!href.includes('/posts/')) return;

      const img = link.querySelector('img');
      const video = link.querySelector('video source');

      results.push({
        post_url: href,
        hero_image_url: img?.src || null,
        video_url: video?.getAttribute('src') || null,
      });
    });

    return results;
  });
}

/**
 * Save data to file
 */
function saveToFile(posts: ScrapedPost[], filename: string): string {
  const filepath = path.join(CONFIG.outputDir, filename);
  fs.writeFileSync(filepath, JSON.stringify(posts, null, 2));
  console.log(`💾 Saved to: ${filepath}`);
  return filepath;
}

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  return {
    category: args.find((_, i) => args[i - 1] === '--category') || 'ltkfindsunder50',
    downloadMedia: args.includes('--download-media'),
    allCategories: args.includes('--all-categories'),
    headless: !args.includes('--visible'),
  };
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 LTK API Scraper Starting...');
  console.log('   Using Puppeteer to intercept API calls\n');

  const args = parseArgs();
  CONFIG.headless = args.headless;

  // Find Chrome executable
  const getChromePath = (): string => {
    // Check environment variable first (for CI/CD)
    if (process.env.PUPPETEER_EXECUTABLE_PATH) {
      return process.env.PUPPETEER_EXECUTABLE_PATH;
    }
    // Common Chrome paths
    const paths = [
      '/usr/bin/google-chrome-stable',
      '/usr/bin/google-chrome',
      '/usr/bin/chromium-browser',
      '/usr/bin/chromium',
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    ];
    for (const p of paths) {
      if (fs.existsSync(p)) return p;
    }
    throw new Error('Chrome not found. Set PUPPETEER_EXECUTABLE_PATH or install Chrome.');
  };

  // Launch browser
  const browser = await puppeteer.launch({
    headless: CONFIG.headless,
    executablePath: getChromePath(),
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  let allPosts: ScrapedPost[] = [];

  try {
    if (args.allCategories) {
      // Scrape all categories
      const categories = Object.keys(LTK_CATEGORIES) as LTKCategorySlug[];
      for (const category of categories) {
        const posts = await scrapeCategory(browser, category, args.downloadMedia);
        allPosts = allPosts.concat(posts);
        await sleep(2000); // Delay between categories
      }
    } else {
      // Scrape single category
      allPosts = await scrapeCategory(browser, args.category, args.downloadMedia);
    }

    // Generate filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `ltk-api-${args.category}-${timestamp}.json`;

    // Save results
    saveToFile(allPosts, filename);

    // Summary
    console.log('\n📊 Summary:');
    console.log(`   Total posts: ${allPosts.length}`);
    console.log(`   With videos: ${allPosts.filter(p => p.video_url).length}`);
    console.log(`   With products: ${allPosts.filter(p => p.product_links.length > 0).length}`);

    // Stats by creator
    const byCreator = allPosts.reduce((acc, p) => {
      acc[p.creator_username] = (acc[p.creator_username] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topCreators = Object.entries(byCreator)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    if (topCreators.length > 0) {
      console.log('\n   Top creators in this scrape:');
      topCreators.forEach(([name, count]) => {
        console.log(`   - ${name}: ${count} posts`);
      });
    }
  } finally {
    await browser.close();
  }
}

// Run
main().catch(console.error);
