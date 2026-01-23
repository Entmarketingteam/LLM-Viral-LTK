# LLM-Viral-LTK / Creative Pulse

Creative intelligence platform for identifying viral LTK content with AI-powered analysis.

## Features

- **Dashboard**: Overview metrics, top creatives, engagement trends
- **Creative Explorer**: Browse and filter creatives by niche, platform, source type
- **Analytics**: Charts for engagement trends, performance by niche
- **Creative Detail**: Deep dive into individual creatives with metrics, annotations, vision features
- **Mock Mode**: Works without GCP - shows demo data when BigQuery isn't configured

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

Copy `.env.example` to `.env` and add:

**Required (for auth):**
```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

**Optional (for real data):**
```bash
GOOGLE_PROJECT_ID=bolt-ltk-app
GOOGLE_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

**Optional (for vector search):**
```bash
PINECONE_API_KEY=...
PINECONE_INDEX=creative-embeddings
```

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Sign in with Clerk to access the dashboard.

**Note:** Without GCP credentials, the app runs in **demo mode** with 3 sample creatives. Add `GOOGLE_*` vars to connect to BigQuery for real data.

## Project Structure

```
├── app/
│   ├── (dashboard)/          # Dashboard pages (requires auth)
│   │   ├── dashboard/        # Overview with metrics
│   │   ├── explorer/        # Creative browser
│   │   ├── analytics/       # Charts and trends
│   │   ├── search/          # Search & discovery
│   │   ├── compare/         # Creative comparison
│   │   └── creatives/[id]/  # Creative detail page
│   ├── api/
│   │   ├── v1/              # V2 API endpoints
│   │   │   ├── creatives/   # Get creatives, details, similar
│   │   │   ├── dashboard/   # Dashboard stats
│   │   │   ├── ingestion/   # Ingest creatives & metrics
│   │   │   └── vectors/     # Vector search (Pinecone)
│   │   ├── health/          # Health check endpoint
│   │   └── test/            # BigQuery connection test
│   ├── layout.tsx           # Root layout with Clerk
│   └── page.tsx             # Redirects to /dashboard
├── components/
│   ├── layout/              # Sidebar, Header, DashboardLayout
│   ├── creatives/           # TopCreatives, CreativeDetail
│   └── ui/                  # Button, Input, Card, Badge, etc.
├── lib/
│   ├── auth.ts             # Clerk auth utilities
│   ├── bq.ts               # BigQuery client
│   ├── mock-creatives.ts   # Fallback demo data
│   └── utils.ts            # Utility functions
└── scripts/
    ├── bigquery/           # SQL schema scripts
    └── generate-mock-data.ts
```

## API Endpoints

### Health & Status

- `GET /api/health` - Health check (no auth required)
- `GET /api/test` - Test BigQuery connection (requires auth)

### V2 Creative Intelligence API

All `/api/v1/*` endpoints require Clerk authentication.

**Data APIs:**
- `GET /api/v1/creatives/top?niche=beauty&limit=20` - Top creatives
- `GET /api/v1/creatives/[id]` - Creative details
- `GET /api/v1/creatives/[id]/similar` - Similar creatives (needs Pinecone)
- `GET /api/v1/dashboard/stats` - Overview metrics

**Ingestion APIs:**
- `POST /api/v1/ingestion/creative` - Register a creative
- `POST /api/v1/ingestion/metrics` - Ingest daily metrics

**Vector APIs:**
- `POST /api/v1/vectors/upsert` - Store embeddings
- `POST /api/v1/vectors/query` - Vector similarity search

### Legacy APIs (Phase 1)

- `GET /api/categories` - Category distribution
- `GET /api/creators` - Top creators
- `GET /api/winners?date=YYYY-MM-DD` - Viral posts

## Mock / Demo Mode

When BigQuery isn't configured (missing `GOOGLE_*` env vars), the app automatically falls back to demo data:

- **Overview & Explorer**: Shows 3 sample creatives (beauty, fashion, fitness)
- **Creative Detail**: Works for `mock_demo_1`, `mock_demo_2`, `mock_demo_3`
- **Dashboard Stats**: Returns zeros/null (no real aggregates)

This lets you explore the UI without setting up GCP. See `CURRENT_STATUS.md` for details.

## Setup BigQuery (for Real Data)

1. **Create GCP Service Account:**
   - [GCP Console](https://console.cloud.google.com/iam-admin/serviceaccounts) → Create service account
   - Grant roles: BigQuery Admin, Storage Admin, Pub/Sub Admin
   - Create JSON key → download

2. **Add to `.env`:**
   ```bash
   GOOGLE_PROJECT_ID=your-project-id
   GOOGLE_CLIENT_EMAIL=service-account@project.iam.gserviceaccount.com
   GOOGLE_PRIVATE_KEY="<paste private_key from JSON, with \n for newlines>"
   ```

3. **Create BigQuery Schema:**
   ```bash
   npm run db:setup-v2
   ```

   Or run SQL manually from `scripts/bigquery/v2_schema.sql`

4. **Verify:**
   ```bash
   npm run db:verify
   ```

## Scripts

```bash
npm run dev              # Start dev server
npm run build            # Production build
npm run mock:generate    # Generate test data in data/mock/
npm run test:api         # Test all API endpoints
npm run db:setup-v2      # Create BigQuery tables
npm run db:verify        # Verify BigQuery connection
```

## Deployment

### Vercel

1. Connect repo to Vercel
2. Add environment variables in Vercel dashboard (same as `.env`)
3. Deploy automatically on push to `main`

See `CURRENT_STATUS.md` for deployment status.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Authentication**: Clerk
- **Database**: Google Cloud BigQuery
- **Vector DB**: Pinecone (optional)
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Icons**: Lucide React
- **Language**: TypeScript

## Documentation

- `CURRENT_STATUS.md` - What works now, what needs setup
- `DASHBOARD_BUILD_PLAN.md` - Dashboard implementation plan
- `NEXT_STEPS.md` - Next steps for development
- `DEPLOYED.md` - Deployment status and URLs
