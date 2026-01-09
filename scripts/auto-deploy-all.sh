#!/bin/bash
# Automated Full Deployment - Everything in One Script
#
# This deploys:
# 1. GCP infrastructure
# 2. Analysis worker to Cloud Run
# 3. Sets up Pub/Sub
#
# Usage: ./scripts/auto-deploy-all.sh

set -e

PROJECT_ID="${GOOGLE_PROJECT_ID:-}"
REGION="${REGION:-us-central1}"

if [ -z "$PROJECT_ID" ]; then
  echo "❌ Error: GOOGLE_PROJECT_ID not set"
  echo "   Run: export GOOGLE_PROJECT_ID=your-project-id"
  exit 1
fi

echo "🚀 Automated Full Deployment"
echo "   Project: $PROJECT_ID"
echo ""

# Step 1: Set up GCP infrastructure
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 1/3: Setting up GCP Infrastructure"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
./scripts/auto-setup-gcp.sh

# Step 2: Deploy analysis worker
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 2/3: Deploying Analysis Worker"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
cd workers/analysis
./deploy.sh
cd ../..

# Step 3: Set up Pub/Sub
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 3/3: Setting up Pub/Sub"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
cd workers/analysis
./setup-pubsub.sh
cd ../..

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Deployment Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 What's deployed:"
echo "   ✅ GCP infrastructure (BigQuery, Pub/Sub, GCS)"
echo "   ✅ Analysis worker on Cloud Run"
echo "   ✅ Pub/Sub subscription"
echo ""
echo "📋 Next steps:"
echo "   1. Set secrets:"
echo "      echo -n 'your-key' | gcloud secrets create PINECONE_API_KEY --data-file=-"
echo "      echo -n 'your-key' | gcloud secrets create OPENAI_API_KEY --data-file=-"
echo ""
echo "   2. Deploy Next.js app:"
echo "      vercel --prod"
echo ""
echo "   3. Set environment variables in Vercel dashboard"
echo ""
