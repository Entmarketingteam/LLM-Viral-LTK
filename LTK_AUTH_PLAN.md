# LTK / ShopMy Auth Plan

**Aligned with:** [Affiliate Platform Auth Readiness Assessment — ENT Agency, February 2026](#reference-assessment)

This doc defines how we handle **LTK (Like To Know It) / ShopMy** authentication for Creative Pulse: programmatic API auth (preferred) and browser-based extraction (fallback).

---

## Summary

| Method | Use case | Status | Action |
|--------|----------|--------|--------|
| **ShopMy API** (session + CSRF) | Programmatic login → apiv3.shopmy.us → data endpoints | ✅ **READY** (per assessment) | Implement in app/scripts; activate n8n when ready |
| **Browser / extractor** | creator.shopltk.com, api-gateway.shopltk.com scraping | ✅ **CURRENT** | Keep for flows that still need creator UI / gateway |

---

## 1. ShopMy API auth (preferred for data workflows)

From the assessment, **ShopMy** (apiv3.shopmy.us) is auth-ready with a simple session + CSRF pattern.

### Auth flow (verified)

```
1. POST https://apiv3.shopmy.us/api/Auth/session
   Body: { "username": "<email>", "password": "<password>" }
   → Response: Set-Cookie (session + shopmy_csrf_token)

2. Extract x-csrf-token from the shopmy_csrf_token cookie value.

3. All subsequent requests:
   - Header: Cookie: <session cookie(s) from step 1>
   - Header: x-csrf-token: <value from shopmy_csrf_token cookie>
```

### Data endpoints (ShopMy API)

| Endpoint | Purpose | Method |
|----------|---------|--------|
| `/api/Users/find_by_email` | Get User_id by email | POST |
| `/api/Payments/by_user/{id}` | Payment history | GET |
| `/api/Payouts/payout_summary/{id}` | Earnings summary | GET |
| `/api/Pins?User_id={id}` | Links/pins data | GET |
| `/api/Pins?downloadAllToCsv=1` | CSV export | GET |
| `/api/Payouts/download_commissions` | Commission CSV | POST |

### Credentials

- **Store:** Server-side only (e.g. env vars, secret manager, or n8n Credentials). Never in repo or HAR.
- **Needed:** ShopMy account email + password (e.g. agency email; assessment referenced `marketingteam@nickient.com` — use your own credentials).
- **Action:** Verify current password and that n8n/app credentials are configured.

### Implementation options

- **Option A — App/scripts:** Add a small module (e.g. `lib/shopmy-auth.ts`) that:
  - POSTs to `https://apiv3.shopmy.us/api/Auth/session` with `SHOPMY_EMAIL` / `SHOPMY_PASSWORD`,
  - Parses Set-Cookie and extracts CSRF token,
  - Exposes `getShopMySession()` returning `{ cookieHeader, csrfToken }` for use by scrapers or API routes that call apiv3.shopmy.us.
- **Option B — n8n:** Use the assessment’s “ShopMy Workflow” (schedule → POST session → extract cookies/CSRF → call find_by_email, Payments, Payouts, Pins → parse → store). Activate when credentials and targets (e.g. Airtable) are ready.

---

## 2. Browser / extractor auth (current)

Used for **creator.shopltk.com** and **api-gateway.shopltk.com** when we rely on creator UI or gateway (e.g. scraping that isn’t yet available via ShopMy API).

### Flow

1. **Puppeteer extractor** (preferred): `npm run ltk:extract-auth` or `npm run ltk:extract-auth:login` → writes `.ltk-auth.json` (and optionally `.env`).
2. **Manual:** DevTools (Application/Network) or console script on creator.shopltk.com → copy cookies/tokens → paste into Settings → LTK Auth (or `.env`).

### What we use today

- **Domains:** creator.shopltk.com, www.shopltk.com, api-gateway.shopltk.com.
- **Storage:** `.ltk-auth.json` (gitignored), optional `LTK_AUTH_TOKEN` in `.env`; Settings page stores token in browser `localStorage` (client-side only).
- **Code:** `lib/ltk-auth.ts` (loads `.ltk-auth.json`, exposes `getLtkAuthHeaders()`, `getLtkCookies()`, `hasLtkAuth()`); scrapers use these when present.

### When to use which

- **ShopMy API:** Payments, payouts, pins, commissions, user-by-email — use session + CSRF (apiv3.shopmy.us).
- **Browser/extractor:** Anything that still hits creator.shopltk.com or api-gateway.shopltk.com (e.g. existing scrapers until migrated).

---

## 3. Security (aligned with assessment)

### Do

- Store ShopMy and LTK credentials in **env vars or a secrets manager** (and n8n Credentials for n8n).
- Use **encrypted credentials** in n8n if available.
- **Rotate passwords** if they were ever in HAR or shared docs (assessment: change Mavely password immediately; same principle for any exposed credential).
- Keep **HAR and auth dumps out of repo and shared storage**; delete from shared locations after use.

### Don’t

- Commit `.ltk-auth.json`, `.env`, or any file containing passwords or session cookies.
- Put passwords or tokens in workflow JSON or code.
- Expose ShopMy/LTK credentials to the client (Settings page should only handle tokens for browser-stored use; server-side session auth stays on server).

### Credential storage (reference)

| What | Where |
|------|--------|
| ShopMy (apiv3) email/password | Env (e.g. `SHOPMY_EMAIL`, `SHOPMY_PASSWORD`) or n8n Credentials |
| Extractor output (cookies/tokens) | `.ltk-auth.json` (local, gitignored) or server-side secret store if we persist them |

---

## 4. Action items

### From assessment (ShopMy)

- [ ] Verify ShopMy credentials (email + password) and that they work with `POST /api/Auth/session`.
- [ ] Implement ShopMy session auth in app (e.g. `lib/shopmy-auth.ts`) and use it for any new apiv3.shopmy.us calls.
- [ ] When using n8n: configure ShopMy credentials in n8n, test manual run, then activate scheduled workflow; add Slack (or other) failure alerts.

### In this repo

- [ ] Optional: add a “ShopMy session” path in Settings or an internal tool that checks `SHOPMY_*` env and displays “Session OK” / “Session missing or invalid” (without exposing secrets).
- [ ] Migrate any scrapers that can be replaced by ShopMy API (Payments, Payouts, Pins, commissions) to use `lib/shopmy-auth` + apiv3.shopmy.us.
- [ ] Keep browser extractor and `lib/ltk-auth.ts` for remaining creator.shopltk.com / api-gateway.shopltk.com usage.

### Security

- [ ] Ensure no HAR or assessment files with real passwords are committed; delete from shared locations after reading.
- [ ] Rotate any credential that may have been exposed (HAR, docs, or logs).

---

## 5. Other affiliate platforms (assessment reference)

The same assessment covers **Mavely** and **Amazon Associates**. For Creative Pulse we focus on **LTK/ShopMy**; the plan above does not change. If we later integrate Mavely or Amazon:

- **Mavely:** NextAuth (CSRF → credentials → session); data via `/_next/data/{buildId}/analytics.json` and `shop.json`; buildId from page or `__NEXT_DATA__`. Store credentials in n8n; change default password if it was in HAR.
- **Amazon:** Check Creators API first; if not available, use browser automation (e.g. Browserbase) for 2FA and CSV export.

See the full assessment doc for Mavely/Amazon details and n8n workflow outlines.

---

## Reference: existing docs

- **scripts/README-LTK-AUTH.md** — Puppeteer extractor and `.ltk-auth.json` usage.
- **scripts/README-AUTH.md** — Manual token extraction (DevTools, Network, console).
- **lib/ltk-auth.ts** — Loader and headers/cookies for browser-extracted auth.
- **lib/shopmy-auth.ts** — ShopMy API session (POST session → cookie + CSRF); use for apiv3.shopmy.us.
- **app/(dashboard)/settings/ltk-auth/** — UI: ShopMy session status + browser token paste (client-side only).

---

## Reference: assessment

*Affiliate Platform Auth Readiness Assessment — ENT Agency, February 2026.*  
Full text: **[docs/AUTH_READINESS_ASSESSMENT.md](docs/AUTH_READINESS_ASSESSMENT.md)** (passwords redacted).

- **ShopMy:** Auth pattern (session + CSRF), data endpoints, credentials, n8n workflow plan.
- **Mavely:** NextAuth flow, buildId, analytics/shop endpoints, credential security.
- **Amazon:** 2FA, Creators API vs browser automation, credential handling.

Use this plan as the single source of truth for **LTK/ShopMy auth** in Creative Pulse; update it when we add ShopMy session implementation or change credential storage.
