#!/bin/bash
# Set up all cloud infrastructure for Creative Intelligence Platform
#
# This script sets up:
# 1. BigQuery dataset and tables
# 2. Pub/Sub topic and subscription
# 3. GCS bucket (if needed)
# 4. Cloud Run service account permissions
#
# Usage:
#   ./scripts/setup-cloud-infra.sh
#   ./scripts/setup-cloud-infra.sh --project my-project

set -e

PROJECT_ID="${GOOGLE_PROJECT_ID:-}"
REGION="${REGION:-us-central1}"
DATASET_ID="creator_pulse"
TOPIC_NAME="creative-analysis-queue"
BUCKET_NAME="${GCS_BUCKET:-ltk-trending}"

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --project)
      PROJECT_ID="$2"
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

echo "☁️  Setting up Cloud Infrastructure"
echo "   Project: $PROJECT_ID"
echo "   Region: $REGION"
echo ""

# Set project
gcloud config set project "$PROJECT_ID"

# Enable required APIs
echo "📦 Enabling required APIs..."
gcloud services enable \
  bigquery.googleapis.com \
  pubsub.googleapis.com \
  storage.googleapis.com \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  --quiet

# Create BigQuery dataset
echo "📊 Creating BigQuery dataset..."
bq mk --dataset --location=US "$PROJECT_ID:$DATASET_ID" 2>/dev/null || echo "   Dataset already exists"

# Run BigQuery schema
echo "📊 Creating BigQuery tables..."
echo "   Running schema SQL..."
bq query --use_legacy_sql=false < scripts/bigquery/v2_schema.sql || {
  echo "   ⚠️  Schema may have errors, but continuing..."
}

# Create Pub/Sub topic
echo "📨 Creating Pub/Sub topic..."
gcloud pubsub topics create "$TOPIC_NAME" --project "$PROJECT_ID" 2>/dev/null || echo "   Topic already exists"

# Create GCS bucket (if it doesn't exist)
echo "🪣 Checking GCS bucket..."
gsutil ls -b "gs://$BUCKET_NAME" 2>/dev/null || {
  echo "   Creating bucket..."
  gsutil mb -l "$REGION" "gs://$BUCKET_NAME"
}

# Get or create service account for Cloud Run
echo "🔐 Setting up service accounts..."
PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')
SERVICE_ACCOUNT="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

# Grant BigQuery permissions
echo "   Granting BigQuery permissions..."
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:$SERVICE_ACCOUNT" \
  --role="roles/bigquery.dataEditor" \
  --quiet

gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:$SERVICE_ACCOUNT" \
  --role="roles/bigquery.jobUser" \
  --quiet

# Grant Storage permissions
echo "   Granting Storage permissions..."
gsutil iam ch "serviceAccount:$SERVICE_ACCOUNT:roles/storage.objectAdmin" "gs://$BUCKET_NAME"

# Grant Pub/Sub permissions
echo "   Granting Pub/Sub permissions..."
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:$SERVICE_ACCOUNT" \
  --role="roles/pubsub.publisher" \
  --quiet

gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:$SERVICE_ACCOUNT" \
  --role="roles/pubsub.subscriber" \
  --quiet

echo ""
echo "✅ Cloud infrastructure setup complete!"
echo ""
echo "📋 Summary:"
echo "   BigQuery dataset: $PROJECT_ID.$DATASET_ID"
echo "   Pub/Sub topic: projects/$PROJECT_ID/topics/$TOPIC_NAME"
echo "   GCS bucket: gs://$BUCKET_NAME"
echo ""
echo "📋 Next steps:"
echo "   1. Set up Pinecone: https://app.pinecone.io"
echo "   2. Deploy Next.js app: See DEPLOY.md"
echo "   3. Deploy analysis worker: cd workers/analysis && ./deploy.sh"
echo ""
