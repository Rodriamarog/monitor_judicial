#!/bin/bash

# GitHub Actions Secrets Setup Script
# This script sets up the required secrets for GitHub Actions

set -e

REPO_OWNER="Rodriamarog"
REPO_NAME="monitor_judicial"
VERCEL_URL="https://monitor-judicial.vercel.app"
CRON_SECRET="dev-test-secret-12345"

echo "🚀 Setting up GitHub Actions secrets for ${REPO_OWNER}/${REPO_NAME}"
echo ""

# Check if GitHub CLI is available
if command -v gh &> /dev/null; then
    echo "✓ Using GitHub CLI"
    echo ""

    # Set secrets using gh CLI
    echo "Setting VERCEL_DEPLOYMENT_URL..."
    echo "$VERCEL_URL" | gh secret set VERCEL_DEPLOYMENT_URL -R "${REPO_OWNER}/${REPO_NAME}"

    echo "Setting CRON_SECRET..."
    echo "$CRON_SECRET" | gh secret set CRON_SECRET -R "${REPO_OWNER}/${REPO_NAME}"

    echo ""
    echo "✅ Secrets configured successfully!"
    echo ""
    echo "You can verify the secrets at:"
    echo "https://github.com/${REPO_OWNER}/${REPO_NAME}/settings/secrets/actions"

else
    echo "❌ GitHub CLI (gh) not found."
    echo ""
    echo "Please install GitHub CLI first:"
    echo "  sudo apt install gh"
    echo ""
    echo "Then authenticate:"
    echo "  gh auth login"
    echo ""
    echo "Alternatively, you can set secrets manually:"
    echo ""
    echo "1. Go to: https://github.com/${REPO_OWNER}/${REPO_NAME}/settings/secrets/actions"
    echo "2. Click 'New repository secret'"
    echo ""
    echo "Secret 1:"
    echo "  Name: VERCEL_DEPLOYMENT_URL"
    echo "  Value: ${VERCEL_URL}"
    echo ""
    echo "Secret 2:"
    echo "  Name: CRON_SECRET"
    echo "  Value: ${CRON_SECRET}"
    echo ""
fi
