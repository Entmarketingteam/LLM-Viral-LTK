#!/bin/bash
# Set up Pub/Sub topic and subscription for Analysis Worker
#
# Usage:
#   ./setup-pubsub.sh
#   ./setup-pubsub.sh --project my-project

set -e

PROJECT_ID="${GOOGLE_PROJECT_ID:-}"
REGION="${REGION:-us-central1}"
TOPIC_NAME="creative-analysis-queue"
SUBSCRIPTION_NAME="creative-analysis-queue-sub"
SERVICE_NAME="analysis-worker"

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
  exit 1
fi

echo "📨 Setting up Pub/Sub for Analysis Worker"
echo "   Project: $PROJECT_ID"
echo "   Topic: $TOPIC_NAME"
echo "   Subscription: $SUBSCRIPTION_NAME"
echo ""

# Set project
gcloud config set project "$PROJECT_ID"

# Enable Pub/Sub API
gcloud services enable pubsub.googleapis.com --quiet

# Create topic (idempotent)
echo "📬 Creating topic..."
gcloud pubsub topics create "$TOPIC_NAME" --project "$PROJECT_ID" 2>/dev/null || echo "   Topic already exists"

# Get Cloud Run service URL
SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" \
  --platform managed \
  --region "$REGION" \
  --project "$PROJECT_ID" \
  --format 'value(status.url)' 2>/dev/null || echo "")

if [ -z "$SERVICE_URL" ]; then
  echo "⚠️  Warning: Cloud Run service not found. Creating push subscription manually."
  echo "   You'll need to create the subscription after deployment."
else
  # Create push subscription to Cloud Run
  echo "🔗 Creating push subscription to Cloud Run..."
  gcloud pubsub subscriptions create "$SUBSCRIPTION_NAME" \
    --topic "$TOPIC_NAME" \
    --push-endpoint "$SERVICE_URL" \
    --project "$PROJECT_ID" \
    --ack-deadline 600 \
    2>/dev/null || echo "   Subscription already exists"
fi

echo ""
echo "✅ Pub/Sub setup complete!"
echo ""
echo "📋 Topic: projects/$PROJECT_ID/topics/$TOPIC_NAME"
echo "📋 Subscription: projects/$PROJECT_ID/subscriptions/$SUBSCRIPTION_NAME"
echo ""
echo "🧪 Test publishing a message:"
echo "   gcloud pubsub topics publish $TOPIC_NAME \\"
echo "     --message '{\"creative_id\":\"test_001\",\"force_recompute\":false}'"
echo ""
