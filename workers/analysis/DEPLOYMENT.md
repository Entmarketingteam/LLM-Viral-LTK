# Cloud Run Deployment Guide

## Prerequisites

1. **GCP Project** with billing enabled
2. **gcloud CLI** installed and authenticated
3. **Required APIs enabled**:
   - Cloud Run API
   - Cloud Build API
   - Pub/Sub API
   - Artifact Registry API

## Step 1: Set Environment Variables

```bash
export GOOGLE_PROJECT_ID=your-project-id
export REGION=us-central1  # Optional, defaults to us-central1
```

## Step 2: Create Secrets

Store your API keys as GCP secrets:

```bash
# Pinecone API Key
echo -n "your-pinecone-api-key" | gcloud secrets create PINECONE_API_KEY \
  --project=$GOOGLE_PROJECT_ID \
  --data-file=-

# OpenAI API Key (or Anthropic)
echo -n "your-openai-api-key" | gcloud secrets create OPENAI_API_KEY \
  --project=$GOOGLE_PROJECT_ID \
  --data-file=-
```

Grant Cloud Run access to secrets:

```bash
PROJECT_NUMBER=$(gcloud projects describe $GOOGLE_PROJECT_ID --format='value(projectNumber)')

gcloud secrets add-iam-policy-binding PINECONE_API_KEY \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor" \
  --project=$GOOGLE_PROJECT_ID

gcloud secrets add-iam-policy-binding OPENAI_API_KEY \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor" \
  --project=$GOOGLE_PROJECT_ID
```

## Step 3: Deploy Worker

```bash
cd workers/analysis
./deploy.sh
```

This will:
1. Enable required GCP APIs
2. Build Docker image
3. Push to Container Registry
4. Deploy to Cloud Run with GPU

## Step 4: Set Up Pub/Sub

```bash
./setup-pubsub.sh
```

This creates:
- Pub/Sub topic: `creative-analysis-queue`
- Push subscription pointing to Cloud Run service

## Step 5: Update Ingestion API

Update your Ingestion API to publish to Pub/Sub:

```typescript
// In app/api/v1/ingestion/creative/route.ts
import { PubSub } from '@google-cloud/pubsub';

const pubsub = new PubSub();
const topic = pubsub.topic('creative-analysis-queue');

// After inserting creative to BigQuery:
await topic.publishMessage({
  json: {
    creative_id: data.creative_id,
    force_recompute: false,
  },
});
```

## Step 6: Test

```bash
# Get service URL
SERVICE_URL=$(gcloud run services describe analysis-worker \
  --region us-central1 \
  --format 'value(status.url)')

# Health check
curl $SERVICE_URL/health

# Test direct processing
curl -X POST $SERVICE_URL/process \
  -H "Content-Type: application/json" \
  -d '{"creative_id": "test_creative_001"}'

# Test Pub/Sub message
gcloud pubsub topics publish creative-analysis-queue \
  --message '{"creative_id":"test_001","force_recompute":false}'
```

## Monitoring

### View Logs

```bash
gcloud run services logs read analysis-worker \
  --region us-central1 \
  --limit 50
```

### View Metrics

Visit: https://console.cloud.google.com/run/detail/us-central1/analysis-worker/metrics

## Cost Optimization

- **Min instances**: Set to 0 (scales to zero when idle)
- **Max instances**: Adjust based on load (default: 10)
- **GPU**: Only pay when processing
- **Timeout**: 3600s (1 hour) for long-running jobs

## Troubleshooting

### GPU Not Available

Check GPU quota:
```bash
gcloud compute project-info describe --project=$GOOGLE_PROJECT_ID
```

Request GPU quota increase if needed.

### Secrets Not Found

Ensure secrets exist and Cloud Run service account has access:
```bash
gcloud secrets list
gcloud run services describe analysis-worker --region us-central1
```

### Build Fails

Check Cloud Build logs:
```bash
gcloud builds list --limit 5
gcloud builds log <BUILD_ID>
```

## Next Steps

1. Implement SAM2, CLIP, Whisper integrations in `src/main.py`
2. Add retry logic for failed jobs
3. Set up monitoring alerts
4. Configure auto-scaling based on queue depth
