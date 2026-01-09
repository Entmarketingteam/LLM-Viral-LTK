# 🔐 Quick Authentication Guide

gcloud is installed! Now you just need to authenticate.

## Option 1: Browser Authentication (Easiest)

Run this in your terminal:

```bash
export PATH=$HOME/google-cloud-sdk/bin:$PATH
gcloud auth login
```

This will:
1. Open a browser window
2. Ask you to sign in to Google
3. Grant permissions
4. Complete authentication

## Option 2: Service Account Key

If you have a service account JSON key:

```bash
export PATH=$HOME/google-cloud-sdk/bin:$PATH
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/your-key.json
gcloud auth activate-service-account --key-file=/path/to/your-key.json
```

## After Authentication

Once authenticated, I can automatically:
1. ✅ Set project to `bolt-ltk-app`
2. ✅ Run `./scripts/auto-deploy-all.sh`
3. ✅ Set up all GCP infrastructure
4. ✅ Deploy the worker

## Quick Check

After authenticating, verify:

```bash
gcloud auth list
gcloud config get-value project
```

Should show:
- Your account
- Project: `bolt-ltk-app`

Then tell me: **"I'm authenticated"** and I'll proceed with the full setup!
