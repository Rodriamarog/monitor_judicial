#!/bin/bash

# Test WhatsApp sending in production Vercel environment
# This helps diagnose if there are environment-specific issues

set -e

CRON_SECRET="${CRON_SECRET}"
if [ -z "$CRON_SECRET" ]; then
  echo "❌ Error: CRON_SECRET not set"
  echo "Please set it with: export CRON_SECRET=your_secret"
  exit 1
fi

PHONE="${1:-+526641887153}"
PROD_URL="https://monitor-judicial.vercel.app"

echo "🧪 Testing WhatsApp in Production Environment"
echo "=============================================="
echo ""
echo "Production URL: $PROD_URL"
echo "Phone number: $PHONE"
echo ""
echo "Sending request..."
echo ""

RESPONSE=$(curl -s -X POST "${PROD_URL}/api/test-whatsapp-production" \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  -H "Content-Type: application/json" \
  -d "{\"phone\": \"${PHONE}\"}")

echo "Response:"
echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
echo ""

# Check if successful
if echo "$RESPONSE" | jq -e '.success == true' > /dev/null 2>&1; then
  echo "✅ WhatsApp sent successfully from production!"
  echo ""
  MESSAGE_ID=$(echo "$RESPONSE" | jq -r '.messageId')
  echo "Message ID: $MESSAGE_ID"
  echo ""
  echo "📱 Check WhatsApp at $PHONE"
  echo ""
  echo "Environment variables in production:"
  echo "$RESPONSE" | jq '.environment'
else
  echo "❌ WhatsApp send failed in production"
  echo ""
  ERROR=$(echo "$RESPONSE" | jq -r '.error // "Unknown error"')
  echo "Error: $ERROR"
  echo ""
  echo "Environment variables in production:"
  echo "$RESPONSE" | jq '.environment' 2>/dev/null || echo "Could not parse environment"
  echo ""
  echo "This might indicate:"
  echo "  - Missing environment variables in Vercel"
  echo "  - Different Twilio config in production"
  echo "  - Network/timeout issues in Vercel"
  exit 1
fi
