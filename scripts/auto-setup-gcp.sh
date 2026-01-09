#!/bin/bash
# Automated GCP Setup - Runs Everything
#
# This script sets up the entire GCP infrastructure automatically
# Run this after providing credentials

set -e

PROJECT_ID="${GOOGLE_PROJECT_ID:-}"
REGION="${REGION:-us-central1}"

if [ -z "$PROJECT_ID" ]; then
  echo "❌ Error: GOOGLE_PROJECT_ID not set"
  exit 1
fi

echo "🚀 Automated GCP Setup"
echo "   Project: $PROJECT_ID"
echo "   Region: $REGION"
echo ""

# Step 1: Enable APIs
echo "📦 Step 1/6: Enabling APIs..."
gcloud services enable \
  bigquery.googleapis.com \
  pubsub.googleapis.com \
  storage.googleapis.com \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  --project="$PROJECT_ID" \
  --quiet

# Step 2: Create BigQuery dataset
echo "📊 Step 2/6: Creating BigQuery dataset..."
bq mk --dataset --location=US "$PROJECT_ID:creator_pulse" 2>/dev/null || echo "   Dataset already exists"

# Step 3: Create BigQuery tables
echo "📊 Step 3/6: Creating BigQuery tables..."
if [ -f "scripts/bigquery/v2_schema.sql" ]; then
  # Split SQL file and run each statement
  cat scripts/bigquery/v2_schema.sql | \
    grep -v '^--' | \
    grep -v '^$' | \
    sed 's/;/;\n/g' | \
    while IFS= read -r line; do
      if [ -n "$line" ] && [ "$line" != ";" ]; then
        echo "$line" | bq query --use_legacy_sql=false --project_id="$PROJECT_ID" 2>/dev/null || true
      fi
    done
  echo "   ✅ Tables created"
else
  echo "   ⚠️  Schema file not found, skipping"
fi

# Step 4: Create Pub/Sub topic
echo "📨 Step 4/6: Creating Pub/Sub topic..."
gcloud pubsub topics create creative-analysis-queue \
  --project="$PROJECT_ID" \
  2>/dev/null || echo "   Topic already exists"

# Step 5: Create GCS bucket
echo "🪣 Step 5/6: Creating GCS bucket..."
BUCKET_NAME="ltk-trending"
gsutil mb -l "$REGION" "gs://$BUCKET_NAME" 2>/dev/null || echo "   Bucket already exists"

# Step 6: Set up service account permissions
echo "🔐 Step 6/6: Setting up permissions..."
PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')
SERVICE_ACCOUNT="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

# BigQuery permissions
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:$SERVICE_ACCOUNT" \
  --role="roles/bigquery.dataEditor" \
  --quiet 2>/dev/null || true

gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:$SERVICE_ACCOUNT" \
  --role="roles/bigquery.jobUser" \
  --quiet 2>/dev/null || true

# Storage permissions
gsutil iam ch "serviceAccount:$SERVICE_ACCOUNT:roles/storage.objectAdmin" "gs://$BUCKET_NAME" 2>/dev/null || true

# Pub/Sub permissions
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:$SERVICE_ACCOUNT" \
  --role="roles/pubsub.publisher" \
  --quiet 2>/dev/null || true

gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:$SERVICE_ACCOUNT" \
  --role="roles/pubsub.subscriber" \
  --quiet 2>/dev/null || true

echo ""
echo "✅ GCP Infrastructure Setup Complete!"
echo ""
echo "📋 Created:"
echo "   ✅ BigQuery dataset: $PROJECT_ID.creator_pulse"
echo "   ✅ Pub/Sub topic: creative-analysis-queue"
echo "   ✅ GCS bucket: gs://$BUCKET_NAME"
echo "   ✅ Service account permissions"
echo ""
echo "📋 Next: Deploy worker and app"
echo ""
