# LLM-Viral-LTK

Phase 1 analytics platform for identifying viral LTK content.

## Project Structure

```
├── app/
│   ├── api/              # Next.js API routes
│   │   ├── categories/   # Category analytics endpoint
│   │   ├── creators/     # Top creators endpoint
│   │   └── winners/      # Viral posts endpoint
│   ├── globals.css       # Global styles
│   ├── layout.tsx        # Root layout with Clerk auth
│   └── page.tsx          # Main dashboard page
├── components/
│   └── ui/               # UI components
├── lib/
│   ├── auth.ts          # Clerk authentication utilities
│   ├── bq.ts            # BigQuery client configuration
│   └── utils.ts         # Utility functions
├── scripts/
│   └── bigquery/        # SQL scripts for data pipeline
└── package.json
```

## Setup

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Google Cloud Project with BigQuery enabled
- Clerk account for authentication

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
   - Copy `.env.example` to `.env` (if it exists) or create a `.env` file with:
   ```
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
   CLERK_SECRET_KEY=sk_test_...
   GOOGLE_PROJECT_ID=your-project-id
   GOOGLE_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
   GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   ```

3. Set up BigQuery:
   - Run the SQL scripts in `scripts/bigquery/` in order:
     1. `bronze_external_table.sql` - Creates external table from GCS
     2. `bronze_merge.sql` - Transforms raw data
     3. `gold_tables.sql` - Creates aggregated tables

4. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## API Endpoints

All endpoints require authentication via Clerk.

- `GET /api/categories` - Get category distribution
- `GET /api/creators` - Get top 100 creators by average score
- `GET /api/winners?date=YYYY-MM-DD` - Get top 50 viral posts for a date

## Data Pipeline

The project uses a bronze/silver/gold architecture:

1. **Bronze**: External table reading JSON from GCS (`gs://ltk-trending/*.json`)
2. **Bronze Merge**: Structured posts table with engagement scores
3. **Gold**: Aggregated tables for viral posts and top creators

## Tech Stack

- **Framework**: Next.js 14
- **Authentication**: Clerk
- **Database**: Google Cloud BigQuery
- **Styling**: Tailwind CSS
- **Language**: TypeScript
