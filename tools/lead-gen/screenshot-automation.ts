// ============================================================
// Lead Gen Automation — Browser Screenshot Automation
// ============================================================
// Takes screenshots of creator storefronts, social profiles,
// and content for use in pitch decks and proposals.
//
// Captures:
// - LTK storefront (full page + individual boards)
// - Instagram profile (grid view)
// - Amazon storefront (if available)
// - Individual content posts
//
// Outputs annotated screenshots + metadata.
// ============================================================

import * as fs from 'fs';
import * as path from 'path';

// Puppeteer is a devDependency — import dynamically to avoid
// breaking builds when not installed.
type PuppeteerBrowser = import('puppeteer-core').Browser;
type PuppeteerPage = import('puppeteer-core').Page;

// ── Types ────────────────────────────────────────────────────

export interface ScreenshotResult {
  url: string;
  filepath: string;
  width: number;
  height: number;
  label: string;
  capturedAt: string;
}

export interface CreatorScreenshots {
  creatorName: string;
  outputDir: string;
  screenshots: ScreenshotResult[];
  ltkStorefront?: ScreenshotResult;
  ltkBoards?: ScreenshotResult[];
  instagramGrid?: ScreenshotResult;
  amazonStorefront?: ScreenshotResult;
  contentPosts?: ScreenshotResult[];
}

export interface ScreenshotConfig {
  outputDir?: string;
  viewport?: { width: number; height: number };
  headless?: boolean;
  waitForSelector?: string;
  scrollToBottom?: boolean;
  delay?: number;
}

const DEFAULT_SCREENSHOT_CONFIG: ScreenshotConfig = {
  viewport: { width: 1440, height: 900 },
  headless: true,
  delay: 2000,
};

// ── Chrome Path Detection (reused from existing scrapers) ────

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

// ── Browser Management ───────────────────────────────────────

async function launchBrowser(headless: boolean = true): Promise<PuppeteerBrowser> {
  const puppeteer = await import('puppeteer-core');
  return puppeteer.default.launch({
    headless,
    executablePath: getChromePath(),
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--window-size=1440,900',
    ],
  });
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// ── Core Screenshot Function ─────────────────────────────────

async function takeScreenshot(
  page: PuppeteerPage,
  url: string,
  filepath: string,
  label: string,
  config: ScreenshotConfig = {},
): Promise<ScreenshotResult> {
  const viewport = config.viewport || DEFAULT_SCREENSHOT_CONFIG.viewport!;

  await page.setViewport(viewport);
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

  if (config.waitForSelector) {
    await page.waitForSelector(config.waitForSelector, { timeout: 10000 }).catch(() => {});
  }

  await sleep(config.delay || 2000);

  // Scroll to load lazy content
  if (config.scrollToBottom) {
    await autoScroll(page);
    await sleep(1000);
  }

  // Dismiss overlays/popups
  await dismissPopups(page);

  await page.screenshot({ path: filepath, fullPage: config.scrollToBottom });

  return {
    url,
    filepath,
    width: viewport.width,
    height: viewport.height,
    label,
    capturedAt: new Date().toISOString(),
  };
}

async function autoScroll(page: PuppeteerPage): Promise<void> {
  await page.evaluate(async () => {
    await new Promise<void>((resolve) => {
      let totalHeight = 0;
      const distance = 400;
      const timer = setInterval(() => {
        window.scrollBy(0, distance);
        totalHeight += distance;
        if (totalHeight >= document.body.scrollHeight || totalHeight >= 8000) {
          clearInterval(timer);
          window.scrollTo(0, 0);
          resolve();
        }
      }, 200);
    });
  });
}

async function dismissPopups(page: PuppeteerPage): Promise<void> {
  // Common popup/overlay selectors
  const popupSelectors = [
    '[data-testid="modal-close"]',
    '.modal-close',
    '[aria-label="Close"]',
    '.popup-close',
    'button[class*="close"]',
    '[class*="cookie"] button',
    '[class*="consent"] button',
  ];

  for (const selector of popupSelectors) {
    try {
      const el = await page.$(selector);
      if (el) await el.click();
    } catch {
      // Ignore — popup may not exist
    }
  }
}

// ── LTK Storefront Screenshots ──────────────────────────────

export async function screenshotLTKStorefront(
  ltkUrl: string,
  outputDir: string,
  config: ScreenshotConfig = {},
): Promise<{ storefront: ScreenshotResult; boards: ScreenshotResult[] }> {
  const browser = await launchBrowser(config.headless ?? true);
  const page = await browser.newPage();

  // Set a realistic user agent
  await page.setUserAgent(
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  );

  fs.mkdirSync(outputDir, { recursive: true });

  try {
    // Full storefront screenshot
    const storefront = await takeScreenshot(
      page,
      ltkUrl,
      path.join(outputDir, 'ltk-storefront.png'),
      'LTK Storefront',
      { ...config, scrollToBottom: true },
    );

    // Capture individual board thumbnails by scrolling and capturing sections
    const boards: ScreenshotResult[] = [];

    // Get board URLs from the storefront
    const boardUrls = await page.evaluate(() => {
      const links = document.querySelectorAll('a[href*="/explore/"]');
      const urls: string[] = [];
      links.forEach((link) => {
        const href = (link as HTMLAnchorElement).href;
        if (href && !urls.includes(href) && href.includes('/posts/')) {
          urls.push(href);
        }
      });
      return urls.slice(0, 6); // First 6 boards
    });

    for (let i = 0; i < boardUrls.length; i++) {
      try {
        const boardShot = await takeScreenshot(
          page,
          boardUrls[i],
          path.join(outputDir, `ltk-board-${i + 1}.png`),
          `LTK Board ${i + 1}`,
          config,
        );
        boards.push(boardShot);
      } catch {
        // Skip individual board errors
      }
    }

    return { storefront, boards };
  } finally {
    await browser.close();
  }
}

// ── Instagram Profile Screenshot ─────────────────────────────

export async function screenshotInstagramProfile(
  username: string,
  outputDir: string,
  config: ScreenshotConfig = {},
): Promise<ScreenshotResult> {
  const browser = await launchBrowser(config.headless ?? true);
  const page = await browser.newPage();

  await page.setUserAgent(
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  );

  fs.mkdirSync(outputDir, { recursive: true });

  try {
    const url = `https://www.instagram.com/${username}/`;
    const result = await takeScreenshot(
      page,
      url,
      path.join(outputDir, 'instagram-profile.png'),
      'Instagram Profile Grid',
      { ...config, delay: 3000 },
    );
    return result;
  } finally {
    await browser.close();
  }
}

// ── Amazon Storefront Screenshot ─────────────────────────────

export async function screenshotAmazonStorefront(
  storefrontUrl: string,
  outputDir: string,
  config: ScreenshotConfig = {},
): Promise<ScreenshotResult> {
  const browser = await launchBrowser(config.headless ?? true);
  const page = await browser.newPage();

  await page.setUserAgent(
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  );

  fs.mkdirSync(outputDir, { recursive: true });

  try {
    const result = await takeScreenshot(
      page,
      storefrontUrl,
      path.join(outputDir, 'amazon-storefront.png'),
      'Amazon Storefront',
      { ...config, scrollToBottom: true, delay: 3000 },
    );
    return result;
  } finally {
    await browser.close();
  }
}

// ── Full Creator Screenshot Suite ────────────────────────────

export async function captureCreatorScreenshots(
  creatorName: string,
  urls: {
    ltkUrl?: string;
    instagramUsername?: string;
    amazonStorefrontUrl?: string;
    additionalUrls?: Array<{ url: string; label: string }>;
  },
  config: ScreenshotConfig = {},
): Promise<CreatorScreenshots> {
  const baseOutputDir = config.outputDir || path.join(process.cwd(), 'output', 'screenshots');
  const creatorDir = path.join(baseOutputDir, sanitizeFilename(creatorName));
  fs.mkdirSync(creatorDir, { recursive: true });

  const result: CreatorScreenshots = {
    creatorName,
    outputDir: creatorDir,
    screenshots: [],
  };

  // LTK storefront
  if (urls.ltkUrl) {
    try {
      console.log(`  Capturing LTK storefront for ${creatorName}...`);
      const ltk = await screenshotLTKStorefront(urls.ltkUrl, creatorDir, config);
      result.ltkStorefront = ltk.storefront;
      result.ltkBoards = ltk.boards;
      result.screenshots.push(ltk.storefront, ...ltk.boards);
    } catch (err) {
      console.error(`  Failed to capture LTK: ${err instanceof Error ? err.message : err}`);
    }
  }

  // Instagram profile
  if (urls.instagramUsername) {
    try {
      console.log(`  Capturing Instagram for @${urls.instagramUsername}...`);
      const ig = await screenshotInstagramProfile(urls.instagramUsername, creatorDir, config);
      result.instagramGrid = ig;
      result.screenshots.push(ig);
    } catch (err) {
      console.error(`  Failed to capture Instagram: ${err instanceof Error ? err.message : err}`);
    }
  }

  // Amazon storefront
  if (urls.amazonStorefrontUrl) {
    try {
      console.log(`  Capturing Amazon storefront...`);
      const amazon = await screenshotAmazonStorefront(urls.amazonStorefrontUrl, creatorDir, config);
      result.amazonStorefront = amazon;
      result.screenshots.push(amazon);
    } catch (err) {
      console.error(`  Failed to capture Amazon: ${err instanceof Error ? err.message : err}`);
    }
  }

  // Additional URLs
  if (urls.additionalUrls) {
    for (const { url, label } of urls.additionalUrls) {
      try {
        const browser = await launchBrowser(config.headless ?? true);
        const page = await browser.newPage();
        const filename = `${sanitizeFilename(label)}.png`;
        const shot = await takeScreenshot(page, url, path.join(creatorDir, filename), label, config);
        result.screenshots.push(shot);
        result.contentPosts = result.contentPosts || [];
        result.contentPosts.push(shot);
        await browser.close();
      } catch (err) {
        console.error(`  Failed to capture ${label}: ${err instanceof Error ? err.message : err}`);
      }
    }
  }

  // Save metadata
  const metadataPath = path.join(creatorDir, 'screenshots-meta.json');
  fs.writeFileSync(metadataPath, JSON.stringify(result, null, 2));

  return result;
}

// ── Convert Screenshots to Base64 for HTML Embedding ─────────

export function screenshotToBase64(filepath: string): string {
  const buffer = fs.readFileSync(filepath);
  return `data:image/png;base64,${buffer.toString('base64')}`;
}

export function screenshotsToBase64Map(screenshots: ScreenshotResult[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const shot of screenshots) {
    if (fs.existsSync(shot.filepath)) {
      map[shot.label] = screenshotToBase64(shot.filepath);
    }
  }
  return map;
}

// ── Helpers ──────────────────────────────────────────────────

function sanitizeFilename(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// ── CLI ──────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes('--help')) {
    console.log(`
Screenshot Automation — Creator Research
=========================================
Usage:
  npx tsx tools/lead-gen/screenshot-automation.ts --ltk <url>
  npx tsx tools/lead-gen/screenshot-automation.ts --ig <username>
  npx tsx tools/lead-gen/screenshot-automation.ts --amazon <url>
  npx tsx tools/lead-gen/screenshot-automation.ts --all --name "Creator Name" --ltk <url> --ig <username>

Options:
  --ltk <url>        LTK storefront URL
  --ig <username>    Instagram username
  --amazon <url>     Amazon storefront URL
  --name <name>      Creator name (for output directory)
  --visible          Show browser window (default: headless)
  --output <dir>     Output directory (default: output/screenshots/)
`);
    return;
  }

  const getName = () => args[args.indexOf('--name') + 1] || 'unknown-creator';
  const headless = !args.includes('--visible');
  const outputDir = args.includes('--output') ? args[args.indexOf('--output') + 1] : undefined;

  const urls: Parameters<typeof captureCreatorScreenshots>[1] = {};
  if (args.includes('--ltk')) urls.ltkUrl = args[args.indexOf('--ltk') + 1];
  if (args.includes('--ig')) urls.instagramUsername = args[args.indexOf('--ig') + 1];
  if (args.includes('--amazon')) urls.amazonStorefrontUrl = args[args.indexOf('--amazon') + 1];

  console.log(`\nCapturing screenshots for ${getName()}...\n`);

  const result = await captureCreatorScreenshots(getName(), urls, {
    headless,
    outputDir,
  });

  console.log(`\nCaptured ${result.screenshots.length} screenshots → ${result.outputDir}`);
}

if (require.main === module) {
  main();
}
