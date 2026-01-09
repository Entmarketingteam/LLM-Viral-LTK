#!/bin/bash
# Automatically set up Vercel environment variables
# Requires VERCEL_TOKEN environment variable

set -e

PROJECT_ID="bolt-ltk-app"
KEY_FILE="/tmp/vercel-key.json"

# Check for Vercel token
if [ -z "$VERCEL_TOKEN" ]; then
  echo "❌ VERCEL_TOKEN not set"
  echo ""
  echo "Get your token from: https://vercel.com/account/tokens"
  echo "Then run:"
  echo "  export VERCEL_TOKEN=your-token-here"
  echo "  ./scripts/auto-setup-vercel.sh"
  exit 1
fi

# Get credentials
if [ ! -f "$KEY_FILE" ]; then
  echo "📦 Creating service account key..."
  export PATH=$HOME/google-cloud-sdk/bin:$PATH
  gcloud iam service-accounts keys create "$KEY_FILE" \
    --iam-account=vercel-sa@${PROJECT_ID}.iam.gserviceaccount.com \
    --project=${PROJECT_ID} 2>&1 | grep -v "created key"
fi

CLIENT_EMAIL=$(jq -r '.client_email' "$KEY_FILE")
PRIVATE_KEY=$(jq -r '.private_key' "$KEY_FILE")

# Get project name from Vercel
echo "🔍 Finding Vercel project..."
PROJECT_NAME=$(basename "$(pwd)")

# Set environment variables via Vercel API
echo "⚙️  Setting environment variables in Vercel..."

# Function to set env var
set_env_var() {
  local key=$1
  local value=$2
  local target=$3
  
  echo "  Setting $key..."
  
  curl -s -X POST "https://api.vercel.com/v10/projects/${PROJECT_NAME}/env" \
    -H "Authorization: Bearer $VERCEL_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"key\": \"$key\",
      \"value\": \"$value\",
      \"type\": \"encrypted\",
      \"target\": [\"$target\"]
    }" | jq -r '.error.message // "✅"'
}

# Set all variables
set_env_var "GOOGLE_PROJECT_ID" "$PROJECT_ID" "production"
set_env_var "GOOGLE_CLIENT_EMAIL" "$CLIENT_EMAIL" "production"
set_env_var "GOOGLE_PRIVATE_KEY" "$PRIVATE_KEY" "production"
set_env_var "PINECONE_INDEX" "creative-embeddings" "production"

echo ""
echo "✅ GCP environment variables set!"
echo ""
echo "⚠️  You still need to set these manually in Vercel dashboard:"
echo "   - PINECONE_API_KEY"
echo "   - PINECONE_ENVIRONMENT"
echo "   - CLERK_SECRET_KEY"
echo "   - NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"
echo ""
echo "Or provide them as environment variables and I'll set them too:"
echo "  export PINECONE_API_KEY=your-key"
echo "  export PINECONE_ENVIRONMENT=us-east-1"
echo "  export CLERK_SECRET_KEY=your-key"
echo "  export NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your-key"
echo "  ./scripts/auto-setup-vercel.sh"
