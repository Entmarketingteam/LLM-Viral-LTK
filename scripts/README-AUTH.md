# Getting LTK Authentication Tokens

If you need to scrape LTK data that requires authentication (e.g., creator dashboard data), you'll need to extract auth tokens from your browser session.

## Method 1: Browser Console Script

1. **Open** `creator.shopltk.com` (or `www.shopltk.com`) in Chrome
2. **Open DevTools** (F12) → **Console** tab
3. **Copy-paste** the script from `scripts/extract-ltk-auth.js` into the console
4. **Check the output** for tokens

## Method 2: DevTools Application Tab

1. **Open DevTools** → **Application** tab
2. **Cookies** → Expand `creator.shopltk.com` or `.shopltk.com`
3. **Look for:**
   - `auth._id_token.auth0`
   - `auth._access_token.auth0`
   - `auth0.` prefixed cookies
   - Any cookie with `token` or `auth` in the name

**Note:** If cookies are **httpOnly**, they won't show in `document.cookie` but will be visible here.

## Method 3: Network Tab (Most Reliable)

1. **Open DevTools** → **Network** tab
2. **Filter** by: `api` or `gateway` or `auth`
3. **Click** on any API request (e.g., to `api-gateway.shopltk.com`)
4. **Headers** tab → **Request Headers**
5. **Look for:**
   - `Authorization: Bearer <token>`
   - `Cookie: auth._id_token.auth0=<token>`
   - `X-Auth-Token: <token>`

**Copy the token value** (the part after `Bearer ` or `=`).

## Method 4: Check All Cookies (Manual)

In the console, run:

```javascript
// List all cookies
document.cookie.split(';').forEach(c => {
  const [name, value] = c.trim().split('=');
  if (name.toLowerCase().includes('auth') || name.toLowerCase().includes('token')) {
    console.log(name, '=', value?.substring(0, 50));
  }
});

// Or get all cookies (including httpOnly ones via DevTools)
// Application → Cookies → Right-click → Copy all as cURL or Copy as Node.js fetch
```

## Using the Token

Once you have a token, you can:

1. **Add to `.env`:**
   ```bash
   LTK_AUTH_TOKEN=your-token-here
   ```

2. **Use in scripts:**
   ```typescript
   const token = process.env.LTK_AUTH_TOKEN;
   const response = await fetch('https://api-gateway.shopltk.com/...', {
     headers: {
       'Authorization': `Bearer ${token}`,
       // or
       'Cookie': `auth._id_token.auth0=${token}`,
     },
   });
   ```

## Why `undefined`?

The cookie `auth._id_token.auth0` might be:

1. **httpOnly** - Not accessible via `document.cookie` (security feature)
2. **Different domain** - Set on `.shopltk.com` but you're on `creator.shopltk.com`
3. **Different name** - LTK might use a different cookie name
4. **Expired** - Token might have expired, refresh the page

**Solution:** Use Method 3 (Network tab) - it's the most reliable way to see what tokens are actually being sent.
