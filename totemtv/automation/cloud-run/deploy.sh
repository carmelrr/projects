#!/bin/bash
# Deploy TotemTV Video Processor to Google Cloud Run
# Usage: ./deploy.sh PROJECT_ID [REGION]

set -e

PROJECT_ID="${1:?Usage: ./deploy.sh PROJECT_ID [REGION]}"
REGION="${2:-me-west1}"
SERVICE_NAME="totemtv-processor"
REPO_NAME="totemtv"

echo "=== TotemTV Cloud Run Deployment ==="
echo "Project: $PROJECT_ID"
echo "Region:  $REGION"
echo "Service: $SERVICE_NAME"
echo ""

# Set project
gcloud config set project "$PROJECT_ID"

# Enable required APIs
echo "Enabling APIs..."
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  drive.googleapis.com

# Create Artifact Registry repo (ignore if exists)
echo "Creating Artifact Registry repository..."
gcloud artifacts repositories create "$REPO_NAME" \
  --repository-format=docker \
  --location="$REGION" \
  --description="TotemTV container images" 2>/dev/null || true

# Check for service account key
KEY_FILE="../../service-account-key.json"
if [ ! -f "$KEY_FILE" ]; then
  echo ""
  echo "WARNING: service-account-key.json not found at $KEY_FILE"
  echo "Make sure to set GOOGLE_CREDENTIALS env var after deployment."
  echo ""
  CREDS_ENV=""
else
  echo "Found service account key."
  CREDS_CONTENT=$(cat "$KEY_FILE" | tr -d '\n')
  CREDS_ENV="--set-env-vars=GOOGLE_CREDENTIALS=${CREDS_CONTENT}"
fi

# Deploy to Cloud Run
echo ""
echo "Deploying to Cloud Run..."
gcloud run deploy "$SERVICE_NAME" \
  --source . \
  --region "$REGION" \
  --memory 2Gi \
  --cpu 2 \
  --timeout 600 \
  --min-instances 0 \
  --max-instances 3 \
  --allow-unauthenticated \
  $CREDS_ENV

echo ""
echo "=== Deployment Complete ==="
echo ""
echo "Service URL:"
gcloud run services describe "$SERVICE_NAME" --region "$REGION" --format='value(status.url)'
echo ""
echo "NEXT STEPS:"
echo "1. Copy the URL above"
echo "2. Update CLOUD_RUN_URL in Apps Script Code.gs"
echo "   Example: https://totemtv-processor-xxxxx.a.run.app/process"
echo ""
