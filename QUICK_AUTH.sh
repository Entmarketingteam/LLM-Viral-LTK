#!/bin/bash
# Quick script to set up gcloud and authenticate

# Add gcloud to PATH
export PATH=$HOME/google-cloud-sdk/bin:$PATH

# Set project
export GOOGLE_PROJECT_ID=bolt-ltk-app
gcloud config set project bolt-ltk-app

echo "✅ gcloud is ready!"
echo ""
echo "Now run: gcloud auth login"
echo ""
