#!/bin/bash
# Deploy Analysis Worker to Cloud Run
# 
# Usage:
#   ./deploy.sh
#   ./deploy.sh --region us-central1
#   ./deploy.sh --project my-project --region us-central1

set -e

# Defaults
PROJECT_ID="${GOOGLE_PROJECT_ID:-}"
REGION="${REGION:-us-central1}"
SERVICE_NAME="analysis-worker"
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --project)
      PROJECT_ID="$2"
      shift 2
      ;;
    --region)
      REGION="$2"
      shift 2
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

if [ -z "$PROJECT_ID" ]; then
  echo "❌ Error: GOOGLE_PROJECT_ID not set"
  echo "   Set it with: export GOOGLE_PROJECT_ID=your-project-id"
  exit 1
fi

echo "🚀 Deploying Analysis Worker to Cloud Run"
echo "   Project: $PROJECT_ID"
echo "   Region: $REGION"
echo "   Service: $SERVICE_NAME"
echo ""

# Set project
gcloud config set project "$PROJECT_ID"

# Enable required APIs
echo "📦 Enabling required APIs..."
gcloud services enable \
  cloudbuild.googleapis.com \
  run.googleapis.com \
  pubsub.googleapis.com \
  artifactregistry.googleapis.com \
  --quiet

# Build and push Docker image
echo "🐳 Building Docker image..."
gcloud builds submit \
  --tag "$IMAGE_NAME" \
  --project "$PROJECT_ID" \
  --config workers/analysis/cloudbuild.yaml \
  .

# Deploy to Cloud Run
echo "☁️  Deploying to Cloud Run..."
gcloud run deploy "$SERVICE_NAME" \
  --image "$IMAGE_NAME" \
  --platform managed \
  --region "$REGION" \
  --project "$PROJECT_ID" \
  --allow-unauthenticated \
  --memory 8Gi \
  --cpu 4 \
  --gpu 1 \
  --gpu-type nvidia-t4 \
  --timeout 3600 \
  --max-instances 10 \
  --min-instances 0 \
  --set-env-vars "GOOGLE_PROJECT_ID=$PROJECT_ID,BIGQUERY_DATASET=creator_pulse,GCS_BUCKET=ltk-trending" \
  --set-secrets "PINECONE_API_KEY=PINECONE_API_KEY:latest,OPENAI_API_KEY=OPENAI_API_KEY:latest" \
  --quiet

# Get service URL
SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" \
  --platform managed \
  --region "$REGION" \
  --project "$PROJECT_ID" \
  --format 'value(status.url)')

echo ""
echo "✅ Deployment complete!"
echo "   Service URL: $SERVICE_URL"
echo ""
echo "📋 Next steps:"
echo "   1. Set up Pub/Sub subscription: ./setup-pubsub.sh"
echo "   2. Test the worker: curl $SERVICE_URL/health"
echo ""
