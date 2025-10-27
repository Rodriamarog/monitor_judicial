#!/bin/bash

# Verification script for GitHub Actions setup

set -e

REPO_OWNER="Rodriamarog"
REPO_NAME="monitor_judicial"

echo "🔍 Verifying GitHub Actions setup for ${REPO_OWNER}/${REPO_NAME}"
echo ""

# Check if workflow file exists
if [ -f ".github/workflows/scraper.yml" ]; then
    echo "✅ Workflow file exists: .github/workflows/scraper.yml"
else
    echo "❌ Workflow file missing: .github/workflows/scraper.yml"
    exit 1
fi

# Check if GitHub CLI is available
if command -v gh &> /dev/null; then
    echo "✅ GitHub CLI available"

    # Check workflow status
    echo ""
    echo "📊 Checking workflow status..."
    gh workflow list -R "${REPO_OWNER}/${REPO_NAME}" || true

    echo ""
    echo "📋 Recent workflow runs:"
    gh run list -R "${REPO_OWNER}/${REPO_NAME}" --limit 5 || true

else
    echo "⚠️  GitHub CLI not available (install with: sudo apt install gh)"
    echo ""
    echo "Manual verification steps:"
    echo "1. Check workflow: https://github.com/${REPO_OWNER}/${REPO_NAME}/actions"
    echo "2. Verify secrets: https://github.com/${REPO_OWNER}/${REPO_NAME}/settings/secrets/actions"
fi

echo ""
echo "🔗 Useful links:"
echo "  • Actions: https://github.com/${REPO_OWNER}/${REPO_NAME}/actions"
echo "  • Secrets: https://github.com/${REPO_OWNER}/${REPO_NAME}/settings/secrets/actions"
echo "  • Workflow: https://github.com/${REPO_OWNER}/${REPO_NAME}/blob/main/.github/workflows/scraper.yml"
