# 🤖 Setup Instructions for AI Assistant

To have the AI assistant set up your entire GCP infrastructure automatically, provide the following:

## Required Information

### 1. GCP Project ID
```bash
# Your GCP project ID (e.g., "my-creative-platform")
export GOOGLE_PROJECT_ID=your-project-id
```

**How to find it:**
- Go to [GCP Console](https://console.cloud.google.com)
- Your project ID is shown in the top bar

### 2. Authenticate gcloud CLI

**Option A: If gcloud is already authenticated**
```bash
# Just verify
gcloud auth list
```

**Option B: If you need to authenticate**
```bash
# Login
gcloud auth login

# Set default project
gcloud config set project YOUR_PROJECT_ID
```

**Option C: Service Account Key (if you prefer)**
- Create service account in GCP Console
- Download JSON key
- Set: `export GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json`

## What the AI Will Do

Once you provide the project ID and authentication, the AI will:

1. ✅ Enable all required GCP APIs
2. ✅ Create BigQuery dataset and tables
3. ✅ Create Pub/Sub topic
4. ✅ Create GCS bucket
5. ✅ Set up service account permissions
6. ✅ Deploy analysis worker to Cloud Run
7. ✅ Set up Pub/Sub subscription

## Commands the AI Will Run

```bash
# Set your project
export GOOGLE_PROJECT_ID=your-project-id

# Run automated setup
./scripts/auto-deploy-all.sh
```

## Optional: API Keys (for secrets)

If you want the AI to also set up secrets, provide:

- **Pinecone API Key** (from [pinecone.io](https://app.pinecone.io))
- **OpenAI API Key** (optional, for LLM annotations)

The AI can then run:
```bash
echo -n "your-pinecone-key" | gcloud secrets create PINECONE_API_KEY --data-file=-
echo -n "your-openai-key" | gcloud secrets create OPENAI_API_KEY --data-file=-
```

## What You Need to Do

1. **Provide your GCP Project ID**
2. **Ensure gcloud is authenticated** (or provide service account key)
3. **Tell the AI: "Set up GCP with project ID: [your-project-id]"**

That's it! The AI will handle everything else.

## Verification

After setup, you can verify:

```bash
# Check BigQuery
bq ls $GOOGLE_PROJECT_ID:creator_pulse

# Check Pub/Sub
gcloud pubsub topics list

# Check Cloud Run
gcloud run services list

# Check GCS
gsutil ls
```
