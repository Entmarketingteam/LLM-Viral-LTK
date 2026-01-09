#!/bin/bash
# Auto-generate Vercel environment variables
# This script extracts GCP credentials and formats them for Vercel

set -e

PROJECT_ID="bolt-ltk-app"
KEY_FILE="/tmp/vercel-key.json"

if [ ! -f "$KEY_FILE" ]; then
  echo "❌ Service account key not found. Creating..."
  export PATH=$HOME/google-cloud-sdk/bin:$PATH
  gcloud iam service-accounts keys create "$KEY_FILE" \
    --iam-account=vercel-sa@${PROJECT_ID}.iam.gserviceaccount.com \
    --project=${PROJECT_ID}
fi

# Extract credentials
CLIENT_EMAIL=$(jq -r '.client_email' "$KEY_FILE")
PRIVATE_KEY=$(jq -r '.private_key' "$KEY_FILE")

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  VERCEL ENVIRONMENT VARIABLES"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "Copy these to Vercel Dashboard → Settings → Environment Variables:"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "GOOGLE_PROJECT_ID"
echo "$PROJECT_ID"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "GOOGLE_CLIENT_EMAIL"
echo "$CLIENT_EMAIL"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "GOOGLE_PRIVATE_KEY"
echo "$PRIVATE_KEY"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "PINECONE_INDEX"
echo "creative-embeddings"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "⚠️  You still need to set these manually:"
echo "   - PINECONE_API_KEY (your Pinecone key)"
echo "   - PINECONE_ENVIRONMENT (e.g., us-east-1)"
echo "   - CLERK_SECRET_KEY (your Clerk secret)"
echo "   - NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY (your Clerk publishable key)"
echo ""
echo "═══════════════════════════════════════════════════════════"
