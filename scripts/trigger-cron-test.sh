#!/bin/bash

# Trigger the cron endpoint manually to test WhatsApp sending
# This will process today's date

echo "🔄 Triggering cron job for today's date..."
echo ""

CRON_SECRET="${CRON_SECRET}"
if [ -z "$CRON_SECRET" ]; then
  echo "❌ Error: CRON_SECRET not set"
  echo "Please set it with: export CRON_SECRET=your_secret"
  exit 1
fi

# Get production URL from Vercel
PROD_URL=$(vercel inspect --prod 2>/dev/null | grep "URL:" | awk '{print $2}' | head -1)
if [ -z "$PROD_URL" ]; then
  PROD_URL="https://monitor-judicial.vercel.app"
fi

echo "Production URL: $PROD_URL"
echo "Triggering scrape for today..."
echo ""

curl -X GET "${PROD_URL}/api/cron/scrape" \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  -v

echo ""
echo ""
echo "✅ Done! Check the response above for any errors."
echo "If successful, check Twilio logs for new WhatsApp messages."
