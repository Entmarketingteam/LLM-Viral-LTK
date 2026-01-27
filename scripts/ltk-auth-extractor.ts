#!/usr/bin/env tsx
/**
 * LTK Auth Token Extractor (Automated)
 * 
 * Uses Puppeteer to automatically extract auth tokens from LTK.
 * 
 * Options:
 * 1. Use existing browser session (if logged in)
 * 2. Wait for manual login (opens browser, you log in)
 * 3. Extract tokens from network requests
 * 
 * Usage:
 *   npx tsx scripts/ltk-auth-extractor.ts
 *   npx tsx scripts/ltk-auth-extractor.ts --wait-for-login
 *   npx tsx scripts/ltk-auth-extractor.ts --save-to-env
 */

import puppeteer, { Browser, Page, HTTPRequest } from 'puppeteer-core';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const CONFIG = {
  creatorUrl: 'https://creator.shopltk.com',
  shopltkUrl: 'https://www.shopltk.com',
  userDataDir: path.join(os.homedir(), '.ltk-browser-data'), // Persistent browser data
  outputFile: path.join(process.cwd(), '.ltk-auth.json'),
};

interface ExtractedAuth {
  cookies: Record<string, string>;
  tokens: {
    idToken?: string;
    accessToken?: string;
    bearerToken?: string;
  };
  localStorage: Record<string, string>;
  sessionStorage: Record<string, string>;
  extractedAt: string;
}

/**
 * Find Chrome executable
 */
function findChrome(): string {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }

  const possiblePaths = [
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  ];

  for (const chromePath of possiblePaths) {
    if (fs.existsSync(chromePath)) {
      return chromePath;
    }
  }

  throw new Error('Chrome not found. Set PUPPETEER_EXECUTABLE_PATH or install Chrome.');
}

/**
 * Extract tokens from network requests
 */
function setupTokenCapture(page: Page): Promise<ExtractedAuth['tokens']> {
  return new Promise((resolve) => {
    const tokens: ExtractedAuth['tokens'] = {};

    page.on('request', (request: HTTPRequest) => {
      const headers = request.headers();
      
      // Check Authorization header
      if (headers['authorization']) {
        const authHeader = headers['authorization'];
        if (authHeader.startsWith('Bearer ')) {
          tokens.bearerToken = authHeader.substring(7);
          console.log('   ✅ Found Bearer token in Authorization header');
        }
      }

      // Check Cookie header for auth tokens
      if (headers['cookie']) {
        const cookies = headers['cookie'].split(';');
        cookies.forEach(cookie => {
          const [name, value] = cookie.trim().split('=');
          if (name.includes('_id_token') || name.includes('id_token')) {
            tokens.idToken = value;
            console.log(`   ✅ Found ID token in cookie: ${name}`);
          }
          if (name.includes('access_token') || name.includes('access-token')) {
            tokens.accessToken = value;
            console.log(`   ✅ Found access token in cookie: ${name}`);
          }
        });
      }
    });

    // Resolve after a delay (give time for requests)
    setTimeout(() => resolve(tokens), 5000);
  });
}

/**
 * Extract localStorage and sessionStorage
 */
async function extractStorage(page: Page): Promise<{
  localStorage: Record<string, string>;
  sessionStorage: Record<string, string>;
}> {
  const storage = await page.evaluate(() => {
    const local: Record<string, string> = {};
    const session: Record<string, string> = {};

    // Get localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const value = localStorage.getItem(key);
        if (value && (key.toLowerCase().includes('auth') || key.toLowerCase().includes('token'))) {
          local[key] = value;
        }
      }
    }

    // Get sessionStorage
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key) {
        const value = sessionStorage.getItem(key);
        if (value && (key.toLowerCase().includes('auth') || key.toLowerCase().includes('token'))) {
          session[key] = value;
        }
      }
    }

    return { localStorage: local, sessionStorage: session };
  });

  return storage;
}

/**
 * Extract cookies (including httpOnly)
 */
async function extractCookies(page: Page): Promise<Record<string, string>> {
  const cookies = await page.cookies();
  const authCookies: Record<string, string> = {};

  cookies.forEach(cookie => {
    const name = cookie.name.toLowerCase();
    if (
      name.includes('auth') ||
      name.includes('token') ||
      name.includes('ltk') ||
      name.includes('id_token') ||
      name.includes('access_token')
    ) {
      authCookies[cookie.name] = cookie.value;
      console.log(`   ✅ Found cookie: ${cookie.name} (httpOnly: ${cookie.httpOnly})`);
    }
  });

  return authCookies;
}

/**
 * Save to .env file
 */
function saveToEnv(auth: ExtractedAuth): void {
  const envPath = path.join(process.cwd(), '.env');
  let envContent = '';

  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf-8');
  }

  // Remove old LTK auth vars
  envContent = envContent
    .split('\n')
    .filter(line => !line.startsWith('LTK_'))
    .join('\n');

  // Add new tokens
  const newVars: string[] = [];
  
  if (auth.tokens.idToken) {
    newVars.push(`LTK_ID_TOKEN=${auth.tokens.idToken}`);
  }
  if (auth.tokens.accessToken) {
    newVars.push(`LTK_ACCESS_TOKEN=${auth.tokens.accessToken}`);
  }
  if (auth.tokens.bearerToken) {
    newVars.push(`LTK_BEARER_TOKEN=${auth.tokens.bearerToken}`);
  }

  // Use first auth cookie if no tokens found
  const firstCookie = Object.entries(auth.cookies)[0];
  if (firstCookie && !auth.tokens.idToken && !auth.tokens.bearerToken) {
    newVars.push(`LTK_AUTH_COOKIE=${firstCookie[0]}=${firstCookie[1]}`);
  }

  if (newVars.length > 0) {
    envContent += '\n\n# LTK Authentication (auto-extracted)\n';
    envContent += newVars.join('\n') + '\n';
    fs.writeFileSync(envPath, envContent);
    console.log(`\n✅ Saved tokens to .env`);
  } else {
    console.log(`\n⚠️  No tokens found to save`);
  }
}

/**
 * Main extraction function
 */
async function extractAuth(waitForLogin: boolean = false, saveToEnvFile: boolean = false): Promise<void> {
  console.log('🔐 LTK Auth Token Extractor\n');
  console.log('='.repeat(50));

  const chromePath = findChrome();
  console.log(`📦 Using Chrome: ${chromePath}\n`);

  // Launch browser with persistent user data (keeps cookies)
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: false, // Show browser so user can log in if needed
    userDataDir: CONFIG.userDataDir,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
    ],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    // Setup token capture from network requests
    console.log('📡 Setting up network interception...');
    const tokenPromise = setupTokenCapture(page);

    // Navigate to creator dashboard
    console.log(`\n🌐 Navigating to ${CONFIG.creatorUrl}...`);
    await page.goto(CONFIG.creatorUrl, { waitUntil: 'networkidle2', timeout: 60000 });

    // Wait for login if requested
    if (waitForLogin) {
      console.log('\n⏳ Waiting for you to log in...');
      console.log('   (The browser is open - please log in manually)');
      console.log('   Press Enter in this terminal when done...');
      
      // Wait for user input
      await new Promise<void>((resolve) => {
        process.stdin.once('data', () => resolve());
      });

      // Wait a bit more for auth to complete
      await page.waitForTimeout(3000);
    } else {
      // Check if already logged in
      const currentUrl = page.url();
      if (currentUrl.includes('login') || currentUrl.includes('auth')) {
        console.log('\n⚠️  Not logged in. Use --wait-for-login flag to log in manually.');
        console.log('   Or log in now and press Enter...');
        await new Promise<void>((resolve) => {
          process.stdin.once('data', () => resolve());
        });
      } else {
        console.log('   ✅ Already logged in (or public page)');
      }
    }

    // Trigger some API calls to capture tokens
    console.log('\n📥 Triggering API calls to capture tokens...');
    await page.waitForTimeout(2000);

    // Extract everything
    console.log('\n🔍 Extracting auth data...\n');
    
    const [cookies, storage, tokens] = await Promise.all([
      extractCookies(page),
      extractStorage(page),
      tokenPromise,
    ]);

    const auth: ExtractedAuth = {
      cookies,
      tokens,
      localStorage: storage.localStorage,
      sessionStorage: storage.sessionStorage,
      extractedAt: new Date().toISOString(),
    };

    // Save to JSON file
    fs.writeFileSync(CONFIG.outputFile, JSON.stringify(auth, null, 2));
    console.log(`\n✅ Saved auth data to ${CONFIG.outputFile}`);

    // Summary
    console.log('\n📊 Summary:');
    console.log(`   Cookies: ${Object.keys(cookies).length}`);
    console.log(`   Tokens: ${Object.keys(tokens).filter(k => tokens[k as keyof typeof tokens]).length}`);
    console.log(`   localStorage: ${Object.keys(storage.localStorage).length}`);
    console.log(`   sessionStorage: ${Object.keys(storage.sessionStorage).length}`);

    // Save to .env if requested
    if (saveToEnvFile) {
      saveToEnv(auth);
    }

    console.log('\n✅ Extraction complete!');
    console.log(`\n💡 To use in scripts, load from: ${CONFIG.outputFile}`);
    console.log('   Or use: require("./.ltk-auth.json")');

  } finally {
    // Keep browser open for a moment so user can see
    await page.waitForTimeout(2000);
    await browser.close();
  }
}

/**
 * Main
 */
async function main() {
  const args = process.argv.slice(2);
  const waitForLogin = args.includes('--wait-for-login');
  const saveToEnv = args.includes('--save-to-env');

  try {
    await extractAuth(waitForLogin, saveToEnv);
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

main();
