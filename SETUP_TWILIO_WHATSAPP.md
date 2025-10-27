# Twilio WhatsApp Setup Guide

This guide walks you through setting up WhatsApp notifications using Twilio.

## Overview

Twilio allows you to send WhatsApp messages programmatically. You'll need:
- Twilio Account (free to start)
- WhatsApp-enabled phone number from Twilio
- API credentials

## Step 1: Create Twilio Account

1. Go to [https://www.twilio.com/try-twilio](https://www.twilio.com/try-twilio)
2. Sign up with your email
3. Verify your email and phone number
4. Complete the getting started wizard

## Step 2: Get Twilio Credentials

After signing up:

1. Go to [Twilio Console](https://console.twilio.com/)
2. Find your **Account SID** and **Auth Token** on the dashboard
3. Copy these - you'll need them for environment variables

## Step 3: Set Up WhatsApp Sandbox (Testing)

For testing, Twilio provides a free WhatsApp Sandbox:

1. In Twilio Console, go to **Messaging** → **Try it out** → **Send a WhatsApp message**
2. Follow the instructions to join the sandbox:
   - Send a WhatsApp message with the code (e.g., "join <your-code>")
   - To: The sandbox number they provide
   - From: Your personal WhatsApp number
3. You'll receive a confirmation message
4. Copy the **sandbox WhatsApp number** (format: `whatsapp:+14155238886`)

**Note:** Sandbox is for testing only. Each user must "join" by sending the code.

## Step 4: Apply for Production WhatsApp Number (Optional)

For production with real users:

1. Go to **Messaging** → **WhatsApp** → **Senders**
2. Click **Request to enable your Twilio numbers for WhatsApp**
3. Fill out the application:
   - Business name
   - Business website
   - Use case description
   - Expected message volume
4. Submit for review (takes 1-2 weeks)

**Cost:** ~$0.005-0.01 per message (very cheap!)

## Step 5: Add Environment Variables

Add these to your `.env.local` and Vercel:

```env
# Twilio WhatsApp
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886

# For production, use your approved number:
# TWILIO_WHATSAPP_FROM=whatsapp:+15551234567
```

**In Vercel:**
1. Go to your project → Settings → Environment Variables
2. Add each variable
3. Set for: Production, Preview, Development
4. Click Save

## Step 6: Test WhatsApp Sending

After deploying, test the integration:

```bash
# Test WhatsApp notification (sandbox mode)
curl -X POST "https://your-domain.vercel.app/api/test-whatsapp" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "whatsapp:+5216641234567",
    "message": "Test from Monitor Judicial"
  }'
```

**Note:** The recipient's number must have joined the sandbox (sent "join <code>")

## Step 7: User Setup (Production)

For production with approved number:

1. Users add their WhatsApp number in settings
2. System sends opt-in message: "Reply YES to receive case alerts"
3. User replies "YES"
4. System enables WhatsApp notifications for that user

## Message Format

Users will receive alerts like:

```
🔔 Monitor Judicial - Nueva Alerta

📋 Caso: 00123/2024
⚖️ Juzgado: JUZGADO CUARTO CIVIL DE TIJUANA

Su caso fue encontrado en el boletín del 27/10/2025.

Ver detalles: https://monitor-judicial.vercel.app/dashboard/alerts
```

## Costs (Production)

**Twilio WhatsApp Pricing:**
- Outbound message: ~$0.005 USD
- Inbound message (opt-in): Free

**Example Monthly Cost:**
- 100 users
- 10 alerts/month average
- 100 × 10 × $0.005 = **$5 USD/month**

Very affordable!

## Troubleshooting

### "Unverified number" error?
- In sandbox mode, recipient must join first (send "join <code>")
- In production, any number works after WhatsApp approval

### "Authentication failed"?
- Check your Account SID and Auth Token are correct
- Make sure they're properly set in Vercel environment variables

### Messages not delivering?
- Check Twilio Console → Messaging → Logs
- See delivery status and error messages
- Verify recipient's number format: `whatsapp:+5216641234567`

## Next Steps

1. ✅ Create Twilio account
2. ✅ Get credentials (SID, Auth Token)
3. ✅ Join WhatsApp sandbox
4. ✅ Add environment variables to Vercel
5. ✅ Test sending a message
6. 📝 Apply for production number (optional, for real users)
7. 📝 Deploy and test integration

Once WhatsApp is working, all new alerts will be sent via WhatsApp AND email!
