# Vercel Deployment Setup

## ✅ If You Deployed via Dashboard

If you deployed through the Vercel dashboard, you need to set these environment variables:

### Required Environment Variables

Go to: **Your Project → Settings → Environment Variables**

Add these:

1. **GOOGLE_PROJECT_ID**
   - Value: `bolt-ltk-app`

2. **GOOGLE_CLIENT_EMAIL**
   - Get from: GCP Console → IAM & Admin → Service Accounts
   - Or create one: `gcloud iam service-accounts create vercel-sa --display-name="Vercel Service Account"`

3. **GOOGLE_PRIVATE_KEY**
   - Download service account key JSON
   - Extract the `private_key` field (keep the `\n` newlines)

4. **PINECONE_API_KEY**
   - Your Pinecone API key

5. **PINECONE_INDEX**
   - Value: `creative-embeddings` (or your index name)

6. **PINECONE_ENVIRONMENT**
   - Your Pinecone environment (e.g., `us-east-1`)

7. **CLERK_SECRET_KEY**
   - Your Clerk secret key

8. **NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY**
   - Your Clerk publishable key

### Quick Service Account Setup

If you need to create a service account for Vercel:

```bash
# Create service account
gcloud iam service-accounts create vercel-sa \
  --display-name="Vercel Service Account" \
  --project=bolt-ltk-app

# Grant permissions
gcloud projects add-iam-policy-binding bolt-ltk-app \
  --member="serviceAccount:vercel-sa@bolt-ltk-app.iam.gserviceaccount.com" \
  --role="roles/bigquery.dataEditor"

gcloud projects add-iam-policy-binding bolt-ltk-app \
  --member="serviceAccount:vercel-sa@bolt-ltk-app.iam.gserviceaccount.com" \
  --role="roles/pubsub.publisher"

# Create and download key
gcloud iam service-accounts keys create vercel-key.json \
  --iam-account=vercel-sa@bolt-ltk-app.iam.gserviceaccount.com \
  --project=bolt-ltk-app
```

Then extract from `vercel-key.json`:
- `client_email` → `GOOGLE_CLIENT_EMAIL`
- `private_key` → `GOOGLE_PRIVATE_KEY`

## 🔍 Verify Deployment

1. Check your Vercel dashboard: https://vercel.com/dashboard
2. Find your project URL (usually `your-project.vercel.app`)
3. Test the health endpoint: `https://your-project.vercel.app/api/health` (if you have one)

## 📋 Next Steps

Once environment variables are set:
1. Redeploy in Vercel (Settings → Deployments → Redeploy)
2. Test your APIs:
   - `/api/v1/creatives/top`
   - `/api/v1/ingestion/creative`
   - `/api/v1/vectors/query`

## 🚨 Common Issues

- **BigQuery errors**: Check service account has `roles/bigquery.dataEditor`
- **Pub/Sub errors**: Check service account has `roles/pubsub.publisher`
- **Pinecone errors**: Verify API key and index name
- **Clerk errors**: Check secret keys match
