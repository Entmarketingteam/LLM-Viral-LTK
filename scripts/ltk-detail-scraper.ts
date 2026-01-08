#!/usr/bin/env tsx
/**
 * LTK Post Detail Scraper
 *
 * Scrapes individual post pages to extract:
 * - Full captions with hashtags
 * - All product links (rstyle.me affiliate URLs)
 * - Product images
 * - Video URLs
 * - Creator information
 *
 * Usage:
 *   npx tsx scripts/ltk-detail-scraper.ts --url "https://www.shopltk.com/explore/user/posts/id"
 *   npx tsx scripts/ltk-detail-scraper.ts --category ltkfindsunder50 --limit 10
 */

import puppeteer, { Page, Browser } from 'puppeteer-core';
import * as fs from 'fs';
import * as path from 'path';
import { DetailedPost, DetailedProduct, LTK_CATEGORIES, LTKCategorySlug } from '../types/ltk';

const CONFIG = {
  baseUrl: 'https://www.shopltk.com',
  outputDir: path.join(process.cwd(), 'data', 'scraped'),
  mediaDir: path.join(process.cwd(), 'data', 'media'),
  delayBetweenRequests: 1500,
  headless: true,
};

// Ensure directories exist
[CONFIG.outputDir, CONFIG.mediaDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Find Chrome executable path
 */
function getChromePath(): string {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }
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
}

/**
 * Extract post IDs from a category page
 */
async function getPostUrlsFromCategory(
  browser: Browser,
  categorySlug: string,
  limit: number = 20
): Promise<string[]> {
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  const url = `${CONFIG.baseUrl}/categories/${categorySlug}`;
  console.log(`📂 Fetching posts from category: ${categorySlug}`);

  await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
  await sleep(2000);

  // Scroll to load more posts
  for (let i = 0; i < 3; i++) {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await sleep(1500);
  }

  // Extract post URLs
  const postUrls = await page.evaluate(() => {
    const links = document.querySelectorAll('a[href*="/posts/"]');
    const urls: string[] = [];
    links.forEach(link => {
      const href = (link as HTMLAnchorElement).href;
      if (href.includes('/explore/') && href.includes('/posts/')) {
        urls.push(href);
      }
    });
    return [...new Set(urls)]; // Remove duplicates
  });

  await page.close();

  console.log(`   Found ${postUrls.length} posts, limiting to ${limit}`);
  return postUrls.slice(0, limit);
}

/**
 * Extract detailed data from a single post page
 */
async function scrapePostDetail(
  browser: Browser,
  postUrl: string
): Promise<DetailedPost | null> {
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  // Track video URLs from network requests
  let capturedVideoUrl: string | null = null;

  await page.setRequestInterception(true);
  page.on('request', request => request.continue());

  page.on('response', async response => {
    const url = response.url();
    // Capture video URLs (m3u8 or mp4)
    if (url.includes('.m3u8') || url.includes('.mp4') || url.includes('video')) {
      if (url.includes('liketoknow') || url.includes('ltk') || url.includes('cloudfront')) {
        capturedVideoUrl = url;
      }
    }
  });

  try {
    console.log(`📄 Scraping: ${postUrl}`);
    await page.goto(postUrl, { waitUntil: 'networkidle2', timeout: 60000 });
    await sleep(2000);

    // Extract data from page
    const data = await page.evaluate(() => {
      // Helper to safely get text content
      const getText = (selector: string): string => {
        const el = document.querySelector(selector);
        return el?.textContent?.trim() || '';
      };

      // Helper to get attribute
      const getAttr = (selector: string, attr: string): string => {
        const el = document.querySelector(selector);
        return el?.getAttribute(attr) || '';
      };

      // Extract caption (look for ltk-caption class or similar)
      let caption = '';
      const captionEl = document.querySelector('.ltk-caption') ||
                       document.querySelector('[class*="caption"]') ||
                       document.querySelector('meta[property="og:description"]');
      if (captionEl) {
        caption = captionEl.textContent || captionEl.getAttribute('content') || '';
      }

      // Extract hashtags from caption
      const hashtagMatches = caption.match(/#[\w]+/g) || [];
      const hashtags = hashtagMatches.map(h => h.toLowerCase());

      // Extract mentions
      const mentionMatches = caption.match(/@[\w.]+/g) || [];
      const mentions = mentionMatches.map(m => m.toLowerCase());

      // Extract creator info
      const creatorLink = document.querySelector('a[href*="/explore/"][class*="ltk-black"]') as HTMLAnchorElement;
      const creatorUsername = creatorLink?.href?.match(/\/explore\/([^/]+)/)?.[1] || '';
      const avatarImg = document.querySelector('img[src*="avatar-cdn"]') as HTMLImageElement;
      const creatorAvatar = avatarImg?.src || '';

      // Extract hero image
      const heroImg = document.querySelector('img[src*="product-images-cdn"]') as HTMLImageElement;
      const heroImageUrl = heroImg?.src || '';

      // Check for video
      const videoEl = document.querySelector('video');
      const hasVideo = !!videoEl;
      const videoSrc = videoEl?.querySelector('source')?.src || videoEl?.src || '';

      // Extract all product links (rstyle.me)
      const productLinks = document.querySelectorAll('a[href*="rstyle.me"]');
      const products: any[] = [];

      productLinks.forEach((link, index) => {
        const anchor = link as HTMLAnchorElement;
        const productUrl = anchor.href;

        // Find associated image
        const img = link.querySelector('img') || link.closest('[class*="block"]')?.querySelector('img');
        const imageUrl = (img as HTMLImageElement)?.src || '';

        // Try to extract product ID from URL
        const idMatch = productUrl.match(/rstyle\.me\/\+([^?]+)/);
        const productId = idMatch ? idMatch[1] : `product-${index}`;

        products.push({
          id: productId,
          affiliate_url: productUrl,
          product_image_url: imageUrl,
          name: '',
          brand: '',
          retailer: '',
          price: null,
          sale_price: null,
          currency: 'USD',
        });
      });

      // Extract all product images
      const productImages = document.querySelectorAll('img[src*="product-images-cdn"]');
      const allImageUrls: string[] = [];
      productImages.forEach(img => {
        const src = (img as HTMLImageElement).src;
        if (src && !allImageUrls.includes(src)) {
          allImageUrls.push(src);
        }
      });

      // Extract share links
      const fbShare = document.querySelector('a[href*="facebook.com/dialog"]') as HTMLAnchorElement;
      const pinShare = document.querySelector('a[href*="pinterest.com/pin"]') as HTMLAnchorElement;
      const twShare = document.querySelector('a[href*="twitter.com/intent"]') as HTMLAnchorElement;
      const shareLink = document.querySelector('a[href*="liketk.it"]') as HTMLAnchorElement;

      return {
        caption: caption.trim(),
        hashtags,
        mentions,
        creatorUsername,
        creatorAvatar,
        creatorProfileUrl: creatorUsername ? `https://www.shopltk.com/explore/${creatorUsername}` : '',
        heroImageUrl,
        allImageUrls,
        hasVideo,
        videoSrc,
        products,
        productCount: products.length,
        shareUrl: shareLink?.href || '',
        facebookShareUrl: fbShare?.href || '',
        pinterestShareUrl: pinShare?.href || '',
        twitterShareUrl: twShare?.href || '',
      };
    });

    // Build DetailedPost object
    const postId = postUrl.match(/\/posts\/([^/?]+)/)?.[1] || '';

    const detailedPost: DetailedPost = {
      // Basic info
      post_id: postId,
      post_url: postUrl,

      // Creator
      creator_username: data.creatorUsername,
      creator_avatar: data.creatorAvatar,
      creator_profile_url: data.creatorProfileUrl,

      // Content
      caption: data.caption.split('\n')[0] || '', // First line
      full_caption: data.caption,
      hashtags: data.hashtags,
      mention_tags: data.mentions,

      // Media
      hero_image_url: data.heroImageUrl,
      thumbnail_url: data.heroImageUrl?.replace(/w=\d+/, 'w=150') || '',
      all_image_urls: data.allImageUrls,
      video_url: capturedVideoUrl || data.videoSrc || null,
      has_video: data.hasVideo,

      // Products
      product_count: data.productCount,
      products: data.products as DetailedProduct[],
      product_links: data.products.map((p: any) => ({
        title: p.name,
        brand: p.brand,
        price: p.price,
        url: p.affiliate_url,
        affiliate_url: p.affiliate_url,
        image_url: p.product_image_url,
        retailer: p.retailer,
      })),

      // Share links
      share_url: data.shareUrl,
      facebook_share_url: data.facebookShareUrl,
      pinterest_share_url: data.pinterestShareUrl,
      twitter_share_url: data.twitterShareUrl,

      // Metadata
      category: '',
      source_page: postUrl,
      scraped_at: new Date().toISOString(),
      published_at: null,
    };

    await page.close();
    return detailedPost;

  } catch (error) {
    console.error(`   ❌ Error scraping ${postUrl}:`, error);
    await page.close();
    return null;
  }
}

/**
 * Save results to JSON
 */
function saveResults(posts: DetailedPost[], filename: string): string {
  const filepath = path.join(CONFIG.outputDir, filename);
  fs.writeFileSync(filepath, JSON.stringify(posts, null, 2));
  console.log(`💾 Saved ${posts.length} posts to: ${filepath}`);
  return filepath;
}

/**
 * Print sample table of results
 */
function printSampleTable(posts: DetailedPost[]) {
  console.log('\n📊 Sample Data:');
  console.log('─'.repeat(100));
  console.log(
    'Creator'.padEnd(20) +
    'Products'.padEnd(10) +
    'Has Video'.padEnd(12) +
    'Hashtags'.padEnd(30) +
    'Caption Preview'
  );
  console.log('─'.repeat(100));

  posts.slice(0, 10).forEach(post => {
    const creator = (post.creator_username || 'unknown').slice(0, 18).padEnd(20);
    const products = String(post.product_count).padEnd(10);
    const hasVideo = (post.has_video ? 'Yes' : 'No').padEnd(12);
    const hashtags = post.hashtags.slice(0, 3).join(' ').slice(0, 28).padEnd(30);
    const caption = (post.caption || '').slice(0, 30);
    console.log(`${creator}${products}${hasVideo}${hashtags}${caption}`);
  });

  console.log('─'.repeat(100));
}

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  return {
    url: args.find((_, i) => args[i - 1] === '--url'),
    category: args.find((_, i) => args[i - 1] === '--category'),
    limit: parseInt(args.find((_, i) => args[i - 1] === '--limit') || '10'),
    visible: args.includes('--visible'),
  };
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 LTK Post Detail Scraper Starting...\n');

  const args = parseArgs();
  CONFIG.headless = !args.visible;

  const browser = await puppeteer.launch({
    headless: CONFIG.headless,
    executablePath: getChromePath(),
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const allPosts: DetailedPost[] = [];

  try {
    let postUrls: string[] = [];

    if (args.url) {
      // Scrape single post
      postUrls = [args.url];
    } else if (args.category) {
      // Get posts from category
      postUrls = await getPostUrlsFromCategory(browser, args.category, args.limit);
    } else {
      // Default: get from ltkfindsunder50
      postUrls = await getPostUrlsFromCategory(browser, 'ltkfindsunder50', args.limit);
    }

    console.log(`\n📋 Scraping ${postUrls.length} posts...\n`);

    for (let i = 0; i < postUrls.length; i++) {
      const post = await scrapePostDetail(browser, postUrls[i]);
      if (post) {
        post.category = args.category ? (LTK_CATEGORIES[args.category as LTKCategorySlug] || args.category) : 'Unknown';
        allPosts.push(post);
        console.log(`   ✅ ${i + 1}/${postUrls.length} - ${post.creator_username} - ${post.product_count} products`);
      }
      await sleep(CONFIG.delayBetweenRequests);
    }

    // Save results
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const category = args.category || 'custom';
    const filename = `ltk-detailed-${category}-${timestamp}.json`;
    saveResults(allPosts, filename);

    // Print summary
    printSampleTable(allPosts);

    console.log('\n📈 Summary:');
    console.log(`   Total posts: ${allPosts.length}`);
    console.log(`   Posts with video: ${allPosts.filter(p => p.has_video).length}`);
    console.log(`   Total products: ${allPosts.reduce((sum, p) => sum + p.product_count, 0)}`);
    console.log(`   Unique creators: ${new Set(allPosts.map(p => p.creator_username)).size}`);

  } finally {
    await browser.close();
  }
}

main().catch(console.error);
