# Automated LTK Auth Token Extraction

Extract LTK authentication tokens automatically using Puppeteer - no manual copying needed!

## Quick Start

### 1. Extract Auth Tokens

**Option A: Use existing browser session**
```bash
npm run ltk:extract-auth
```

Opens browser, uses existing cookies if you're already logged in.

**Option B: Wait for manual login**
```bash
npm run ltk:extract-auth:login
```

Opens browser, waits for you to log in, then extracts tokens and saves to `.env`.

### 2. Tokens are saved to:
- `.ltk-auth.json` - Full auth data (cookies, tokens, storage)
- `.env` - If you used `--save-to-env` flag

### 3. Use in scripts

The scrapers (`ltk-api-scraper.ts`, etc.) automatically use extracted tokens if available.

## How It Works

1. **Launches Puppeteer** with persistent user data directory (`~/.ltk-browser-data`)
   - Keeps cookies between runs
   - No need to log in every time

2. **Navigates** to `creator.shopltk.com` or `www.shopltk.com`

3. **Extracts**:
   - **Cookies** (including httpOnly ones via `page.cookies()`)
   - **Tokens** from network requests (Authorization headers)
   - **localStorage** / **sessionStorage** (auth-related keys)

4. **Saves** to `.ltk-auth.json` and optionally `.env`

## Manual Usage

```bash
# Extract tokens (uses existing session)
npx tsx scripts/ltk-auth-extractor.ts

# Wait for login, then extract
npx tsx scripts/ltk-auth-extractor.ts --wait-for-login

# Save to .env file
npx tsx scripts/ltk-auth-extractor.ts --save-to-env

# Both: wait for login AND save to .env
npx tsx scripts/ltk-auth-extractor.ts --wait-for-login --save-to-env
```

## Using Extracted Tokens in Code

```typescript
import { getLtkAuthHeaders, getLtkCookies, hasLtkAuth } from '../lib/ltk-auth';

// Check if auth is available
if (hasLtkAuth()) {
  // Get headers for fetch requests
  const headers = getLtkAuthHeaders();
  // headers = { Authorization: 'Bearer ...', Cookie: '...' }
  
  // Get cookies for Puppeteer
  const cookies = getLtkCookies();
  await page.setCookie(...cookies);
}
```

## Troubleshooting

**"No tokens found"**
- Make sure you're logged in to `creator.shopltk.com` in the browser
- Use `--wait-for-login` to log in manually
- Check `.ltk-auth.json` to see what was extracted

**"Chrome not found"**
- Set `PUPPETEER_EXECUTABLE_PATH` in `.env`:
  ```bash
  PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable
  ```

**"Cookies not working in scrapers"**
- Make sure `.ltk-auth.json` exists (run extractor first)
- Check that cookies have correct domain (`.shopltk.com`)
- Try re-extracting tokens

## Files

- `scripts/ltk-auth-extractor.ts` - Main extraction script
- `lib/ltk-auth.ts` - Helper to load/use tokens
- `.ltk-auth.json` - Extracted auth data (gitignored)
- `~/.ltk-browser-data/` - Persistent browser session (keeps cookies)
