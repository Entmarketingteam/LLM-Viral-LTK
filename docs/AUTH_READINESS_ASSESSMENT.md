# Affiliate Platform Auth Readiness Assessment
## ENT Agency — February 2026

---

## Executive Summary

| Platform | Auth Pattern | HAR Data Available | Auth Ready | Data Endpoints Ready | Action Needed |
|----------|-------------|-------------------|------------|---------------------|---------------|
| **ShopMy** | Session Cookie + CSRF | ✅ Documented | ✅ **READY** | ✅ **READY** | Activate workflows |
| **Mavely** | NextAuth (Session) | ✅ **COMPLETE** | ✅ **READY** | ✅ **READY** | Build n8n workflow |
| **Amazon Associates** | Session Cookie + 2FA | ❌ No HAR | ⚠️ **REQUIRES BROWSER** | ⚠️ API Volume-gated | Check Creators API access |

---

## 🟢 ShopMy — FULLY READY

### Auth Flow (Verified)
```
1. POST https://apiv3.shopmy.us/api/Auth/session
   Body: { username, password }
   → Returns: Set-Cookie (session + shopmy_csrf_token)

2. Extract x-csrf-token from shopmy_csrf_token cookie

3. Use Cookie + x-csrf-token on all subsequent requests
```

### Available Data Endpoints
| Endpoint | Purpose | Method |
|----------|---------|--------|
| `/api/Users/find_by_email` | Get User_id | POST |
| `/api/Payments/by_user/{id}` | Payment history | GET |
| `/api/Payouts/payout_summary/{id}` | Earnings summary | GET |
| `/api/Pins?User_id={id}` | Links/pins data | GET |
| `/api/Pins?downloadAllToCsv=1` | CSV export | GET |
| `/api/Payouts/download_commissions` | Commission CSV | POST |

### Credentials Needed
- ✅ Email: `marketingteam@nickient.com`
- ⚠️ Password: Need to verify current password

### Action Items
- [ ] Verify n8n credentials are configured
- [ ] Test manual workflow run
- [ ] Activate scheduled workflow
- [ ] Set up Slack failure alerts

---

## 🟢 Mavely — AUTH FULLY MAPPED FROM HAR

### Auth Flow (Extracted from HAR)

**Step 1: Get CSRF Token**
```http
GET https://creators.mave.ly/api/auth/csrf
Accept: application/json
Referer: https://creators.mave.ly/auth/login

Response: {"csrfToken": "782ffd2e4572723e850c4fb63de0d8f6aa698de67039254de3..."}
```

**Step 2: Login with Credentials**
```http
POST https://creators.mave.ly/api/auth/callback/credentials
Content-Type: application/x-www-form-urlencoded
Origin: https://creators.mave.ly
Referer: https://creators.mave.ly/auth/login

Body:
  email=marketingteam%40nickient.com
  password=***REDACTED***
  callbackUrl=https%3A%2F%2Fcreators.mave.ly%2Fhome
  csrfToken={csrfToken_from_step_1}
  json=true

Response: Status 200
Sets Cookies:
  - next-auth.session-token
  - next-auth.csrf-token  
  - next-auth.callback-url
```

**Step 3: Verify Session (Optional)**
```http
GET https://creators.mave.ly/api/auth/session
Cookie: {session_cookies_from_step_2}

Response: Session data with user info
```

### Data Endpoints (Discovered in HAR)

#### Next.js Data API Pattern
Mavely uses Next.js with client-side data fetching via `/_next/data/{buildId}/` endpoints.

**Build ID**: `-62oXUl0rRmpMmeqYO3L8` (changes with deployments)

| Endpoint | Purpose | Parameters |
|----------|---------|------------|
| `/_next/data/{buildId}/analytics.json` | Dashboard metrics | `topPerformMetric`, `chart`, `metric`, `entity` |
| `/_next/data/{buildId}/shop.json` | Shop data | `page` (walmart, target) |

#### Query Parameters for Analytics
```
topPerformMetric: commission | clicksCount | salesCount | conversion
chart: PIE
metric: commission | clicksCount | salesCount
entity: TRAFFIC_SOURCE
```

#### Example Requests from HAR
```
GET /_next/data/-62oXUl0rRmpMmeqYO3L8/analytics.json
GET /_next/data/-62oXUl0rRmpMmeqYO3L8/analytics.json?topPerformMetric=commission
GET /_next/data/-62oXUl0rRmpMmeqYO3L8/analytics.json?topPerformMetric=clicksCount
GET /_next/data/-62oXUl0rRmpMmeqYO3L8/analytics.json?topPerformMetric=salesCount
GET /_next/data/-62oXUl0rRmpMmeqYO3L8/analytics.json?topPerformMetric=conversion
GET /_next/data/-62oXUl0rRmpMmeqYO3L8/analytics.json?topPerformMetric=conversion&chart=PIE
GET /_next/data/-62oXUl0rRmpMmeqYO3L8/analytics.json?topPerformMetric=conversion&chart=PIE&metric=clicksCount&entity=TRAFFIC_SOURCE
GET /_next/data/-62oXUl0rRmpMmeqYO3L8/shop.json
GET /_next/data/-62oXUl0rRmpMmeqYO3L8/shop.json?page=walmart
GET /_next/data/-62oXUl0rRmpMmeqYO3L8/shop.json?page=target
```

### Build ID Challenge
The `buildId` changes with each Next.js deployment. Solutions:
1. **Dynamic extraction**: Fetch `/analytics` page HTML, extract from `<script id="__NEXT_DATA__">`
2. **HEAD request**: Try known endpoint, extract buildId from redirect
3. **Fallback**: If buildId extraction fails, parse `__NEXT_DATA__` from HTML

### Credentials Found in HAR
- ✅ Email: `marketingteam@nickient.com`
- ⚠️ Password: **(EXPOSED IN HAR — change immediately; do not re-commit)**

### Action Items
- [ ] **CRITICAL: Change Mavely password immediately**
- [ ] Build n8n auth workflow (CSRF → Login → Session)
- [ ] Test data endpoint with session cookies
- [ ] Implement buildId extraction logic
- [ ] Store credentials securely in n8n

---

## 🟡 Amazon Associates — REQUIRES SPECIAL HANDLING

### Auth Challenge
Amazon Associates has the **most complex auth** due to:
- Mandatory 2FA (OTP required)
- Aggressive bot detection
- CAPTCHA challenges
- No public API for reports (unless high volume)

### Two Approaches

#### Option A: Creators API (If Available)
Check Associates Central → Tools → Creators API

**Requirements**:
- High volume (tens of thousands of sales/month)
- Creators API credentials (separate from AWS keys)

**If available**, auth is simple API key/secret:
```python
api = AmazonApi(
    credential_id="YOUR_CREDENTIAL_ID",
    credential_secret="YOUR_CREDENTIAL_SECRET",
    tag="your-associate-tag",
    country="US"
)
```

#### Option B: Browser Automation (Universal Fallback)
Requires Browserbase or Playwright with persistent session:

```
1. Browser: Navigate to https://affiliate-program.amazon.com/signin
2. Fill: Email + Password
3. Handle: 2FA (manual or automated OTP entry)
4. Extract: Session cookies
5. Navigate: To reports section
6. Download: CSV reports
```

### Why No HAR Was Captured
Amazon's 2FA and bot detection make HAR capture difficult:
- Session requires OTP validation
- Cookies are short-lived
- Multiple redirects during auth
- Browser fingerprinting

### Credentials Needed
- ✅ Amazon Associates login email
- ✅ Amazon Associates password
- ✅ 2FA device/method (OTP app or phone)

### Action Items
- [ ] Check if Creators API Reports is enabled in Associates Central
- [ ] If yes: Get Creators API credentials, build HTTP workflow
- [ ] If no: Set up Browserbase for browser automation
- [ ] Create manual CSV export fallback process

---

## n8n Workflow Implementation Plan

### 1. ShopMy Workflow (Ready to Activate)
```
Schedule Trigger (Daily 6am)
  → HTTP: POST Auth/session
  → Code: Extract cookies + CSRF
  → HTTP: POST find_by_email
  → HTTP: GET Payments, Payouts, Pins (parallel)
  → Code: Parse data
  → Airtable: Store metrics
```

### 2. Mavely Workflow (Build This Week)
```
Schedule Trigger (Daily 6am)
  → HTTP: GET /api/auth/csrf
  → HTTP: POST /api/auth/callback/credentials
  → Code: Extract session cookies
  → HTTP: GET /api/auth/session (verify)
  → HTTP: GET /_next/data/{buildId}/analytics.json (with cookies)
  → Code: Parse pageProps from JSON
  → Airtable: Store metrics
```

### 3. Amazon Workflow (Pending API Check)
```
IF Creators API available:
  Schedule Trigger → HTTP: Creators API → Parse CSV → Airtable

ELSE (Browser automation):
  Schedule Trigger → Browserbase: Login + 2FA → Navigate → Download CSV → Parse → Airtable
```

---

## Security Checklist

### Immediate Actions Required
- [ ] **CRITICAL**: Change Mavely password (exposed in HAR)
- [ ] Delete HAR files from shared locations
- [ ] Store all credentials in n8n Credentials (not in workflows)
- [ ] Enable n8n Credentials encryption

### Credential Storage
| Platform | Store In | Notes |
|----------|----------|-------|
| ShopMy | n8n Credentials | Email + Password |
| Mavely | n8n Credentials | Email + Password |
| Amazon | n8n Credentials + Env | Email + Password + 2FA seed (if using TOTP) |

---

## Summary

| Platform | Auth | Data | Overall Status |
|----------|------|------|----------------|
| **ShopMy** | ✅ | ✅ | **GO** — Activate existing workflow |
| **Mavely** | ✅ | ✅ | **GO** — Build n8n workflow this week |
| **Amazon** | ⚠️ | ⚠️ | **PENDING** — Check Creators API, else Browserbase |

**Next Steps**:
1. Change Mavely password immediately
2. Activate ShopMy workflow
3. Build Mavely n8n workflow
4. Check Amazon Creators API access
5. Set up Browserbase if needed for Amazon
