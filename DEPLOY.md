# 🚀 Cloud Deployment Guide

Deploy everything to the cloud - no local testing needed.

## Prerequisites

1. **GCP Project** with billing enabled
2. **Vercel account** (free tier works) - for Next.js app
3. **Pinecone account** - for vector database
4. **gcloud CLI** installed and authenticated

---

## Step 1: Set Up GCP Infrastructure

```bash
# Set your project
export GOOGLE_PROJECT_ID=your-project-id

# Run infrastructure setup
chmod +x scripts/setup-cloud-infra.sh
./scripts/setup-cloud-infra.sh
```

This creates:
- ✅ BigQuery dataset and tables
- ✅ Pub/Sub topic
- ✅ GCS bucket
- ✅ Service account permissions

---

## Step 2: Set Up Pinecone

1. **Create account:** [app.pinecone.io](https://app.pinecone.io)
2. **Create index:**
   - Name: `creative-embeddings`
   - Dimensions: `512` (for ViT-B/32)
   - Metric: `cosine`
3. **Get API key** - save for Step 4

---

## Step 3: Deploy Analysis Worker to Cloud Run

```bash
cd workers/analysis

# Set project
export GOOGLE_PROJECT_ID=your-project-id

# Deploy
./deploy.sh
```

This will:
- Build Docker image
- Push to Container Registry
- Deploy to Cloud Run with GPU

**Set secrets:**
```bash
# Store API keys
echo -n "your-pinecone-key" | gcloud secrets create PINECONE_API_KEY --data-file=-
echo -n "your-openai-key" | gcloud secrets create OPENAI_API_KEY --data-file=-

# Grant access
PROJECT_NUMBER=$(gcloud projects describe $GOOGLE_PROJECT_ID --format='value(projectNumber)')
gcloud secrets add-iam-policy-binding PINECONE_API_KEY \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

**Set up Pub/Sub:**
```bash
./setup-pubsub.sh
```

---

## Step 4: Deploy Next.js App to Vercel

### Option A: Deploy via Vercel CLI (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

### Option B: Deploy via GitHub Integration

1. **Push to GitHub** (already done ✅)
2. **Go to [vercel.com](https://vercel.com)**
3. **Import your repository**
4. **Configure environment variables** (see below)

---

## Step 5: Set Environment Variables

### In Vercel Dashboard:

Go to: Project Settings → Environment Variables

Add these:

```bash
# Clerk Auth
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...

# GCP
GOOGLE_PROJECT_ID=your-project-id
GOOGLE_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Pinecone
PINECONE_API_KEY=your-pinecone-key
PINECONE_INDEX=creative-embeddings

# GCS
GCS_BUCKET=ltk-trending

# LLM (optional for now)
OPENAI_API_KEY=sk-...
```

**Important:** 
- Use **production** Clerk keys (not test)
- The `GOOGLE_PRIVATE_KEY` needs to be the full key with `\n` for newlines
- Set all variables for **Production**, **Preview**, and **Development**

---

## Step 6: Verify Deployment

### Check Vercel Deployment

```bash
# Get your app URL
vercel ls

# Or check Vercel dashboard
```

### Test APIs

```bash
# Replace with your Vercel URL
APP_URL=https://your-app.vercel.app

# Health check
curl $APP_URL/api/test

# Test ingestion
curl -X POST $APP_URL/api/v1/ingestion/creative \
  -H "Content-Type: application/json" \
  -d '{
    "creative_id": "test_001",
    "platform": "ltk",
    "source_type": "organic",
    "niche": "beauty",
    "media_type": "video",
    "storage_uri": "gs://ltk-trending/test/video.mp4",
    "created_at": "2024-01-01T00:00:00Z"
  }'
```

### Check Cloud Run Worker

```bash
# Get service URL
SERVICE_URL=$(gcloud run services describe analysis-worker \
  --region us-central1 \
  --format 'value(status.url)')

# Health check
curl $SERVICE_URL/health
```

---

## Step 7: Set Up Custom Domain (Optional)

1. In Vercel dashboard → Settings → Domains
2. Add your domain
3. Follow DNS instructions

---

## Monitoring

### Vercel Analytics

- Built-in analytics in Vercel dashboard
- View API usage, errors, performance

### Cloud Run Logs

```bash
gcloud run services logs read analysis-worker \
  --region us-central1 \
  --limit 50
```

### BigQuery

Check data in BigQuery console:
- `creator_pulse.creatives`
- `creator_pulse.creative_metrics_daily`
- etc.

---

## Cost Estimates

### Vercel (Next.js App)
- **Free tier:** 100GB bandwidth/month
- **Pro:** $20/month (if you exceed free tier)

### Cloud Run (Worker)
- **Pay per use:** Only when processing
- **GPU:** ~$0.35/hour when running
- **CPU/Memory:** ~$0.10/hour when running

### BigQuery
- **Free tier:** 10GB storage, 1TB queries/month
- **Pay as you go:** $5/TB queries

### Pinecone
- **Free tier:** 1 index, 100K vectors
- **Starter:** $70/month (1M vectors)

---

## Troubleshooting

### Vercel Build Fails

Check build logs in Vercel dashboard. Common issues:
- Missing environment variables
- TypeScript errors
- Missing dependencies

### Cloud Run Not Receiving Messages

```bash
# Check Pub/Sub subscription
gcloud pubsub subscriptions describe creative-analysis-queue-sub

# Test publishing
gcloud pubsub topics publish creative-analysis-queue \
  --message '{"creative_id":"test","force_recompute":false}'
```

### BigQuery Errors

```bash
# Verify tables exist
bq ls $GOOGLE_PROJECT_ID:creator_pulse

# Check service account permissions
gcloud projects get-iam-policy $GOOGLE_PROJECT_ID
```

---

## Quick Deploy Checklist

- [ ] GCP project created
- [ ] `./scripts/setup-cloud-infra.sh` run
- [ ] Pinecone index created
- [ ] Analysis worker deployed (`./workers/analysis/deploy.sh`)
- [ ] Pub/Sub set up (`./workers/analysis/setup-pubsub.sh`)
- [ ] Vercel account created
- [ ] Next.js app deployed to Vercel
- [ ] Environment variables set in Vercel
- [ ] APIs tested

---

## Need Help?

- **GCP Issues:** Check `scripts/setup-cloud-infra.sh` output
- **Vercel Issues:** Check Vercel dashboard → Deployments
- **Worker Issues:** Check Cloud Run logs
- **API Issues:** Check Vercel function logs
