#!/bin/bash
# Quick status check for the app
# Usage: ./scripts/check-status.sh

echo "🔍 Creative Pulse - Status Check"
echo "================================"
echo ""

# Check .env exists
if [ ! -f .env ]; then
  echo "❌ .env file not found"
  echo "   Copy env.example to .env and add your keys"
  exit 1
fi

echo "✅ .env file exists"
echo ""

# Check Clerk
if grep -q "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_" .env && ! grep -q "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_\.\.\." .env; then
  echo "✅ Clerk: Configured"
else
  echo "⚠️  Clerk: Not configured (or placeholder)"
fi

# Check GCP
if grep -q "GOOGLE_PROJECT_ID=bolt-ltk-app" .env || (grep -q "GOOGLE_PROJECT_ID=" .env && ! grep -q "GOOGLE_PROJECT_ID=your-project-id" .env); then
  if grep -q "GOOGLE_CLIENT_EMAIL=" .env && grep -q "GOOGLE_PRIVATE_KEY=" .env; then
    echo "✅ GCP: Configured"
  else
    echo "⚠️  GCP: Project ID set, but missing CLIENT_EMAIL or PRIVATE_KEY"
  fi
else
  echo "⚠️  GCP: Not configured (will use demo mode)"
fi

# Check Pinecone
if grep -q "PINECONE_API_KEY=" .env && ! grep -q "PINECONE_API_KEY=your-pinecone" .env; then
  echo "✅ Pinecone: Configured"
else
  echo "⚠️  Pinecone: Not configured (optional)"
fi

echo ""
echo "📋 Next steps:"
echo "   1. Run: npm run dev"
echo "   2. Open: http://localhost:3000"
echo "   3. Check health: curl http://localhost:3000/api/health"
echo ""
