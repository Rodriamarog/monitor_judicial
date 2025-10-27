# Stripe Payment Setup Guide

This guide walks you through setting up Stripe for subscription payments.

## Overview

Users can upgrade from Free (10 cases) to paid tiers:
- **Básico:** $X/month - 100 cases
- **Profesional:** $Y/month - 500 cases

## Step 1: Create Stripe Account

1. Go to [https://stripe.com](https://stripe.com)
2. Click "Start now" or "Sign up"
3. Enter your business information
4. Verify your email

## Step 2: Get API Keys

### Test Mode (Development):

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Make sure you're in **Test mode** (toggle in top right)
3. Go to **Developers** → **API keys**
4. Copy these keys:
   - **Publishable key** (starts with `pk_test_`)
   - **Secret key** (starts with `sk_test_`) - click "Reveal" first

### Live Mode (Production):

1. Complete Stripe account verification (bank account, business info)
2. Switch to **Live mode** toggle
3. Get your live keys:
   - **Publishable key** (starts with `pk_live_`)
   - **Secret key** (starts with `sk_live_`)

## Step 3: Create Products & Prices

### Option A: Using Stripe Dashboard (Recommended)

1. Go to **Products** in Stripe Dashboard
2. Click **+ Add product**

**Product 1: Plan Básico**
- Name: `Plan Básico`
- Description: `100 casos monitoreados con alertas por email y WhatsApp`
- Pricing:
  - Model: `Recurring`
  - Price: `$299 MXN` (or your price)
  - Billing period: `Monthly`
  - Currency: `MXN`
- Click "Save product"
- **Copy the Price ID** (starts with `price_`)

**Product 2: Plan Profesional**
- Name: `Plan Profesional`
- Description: `500 casos monitoreados con alertas por email y WhatsApp`
- Pricing:
  - Model: `Recurring`
  - Price: `$999 MXN` (or your price)
  - Billing period: `Monthly`
  - Currency: `MXN`
- Click "Save product"
- **Copy the Price ID**

### Option B: Using Stripe CLI (Advanced)

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Create products
stripe products create \
  --name="Plan Básico" \
  --description="100 casos monitoreados"

stripe prices create \
  --product=prod_xxx \
  --unit-amount=29900 \
  --currency=mxn \
  --recurring[interval]=month
```

## Step 4: Set Up Webhook

Webhooks notify your app when subscription events occur (payment success, cancellation, etc.)

1. Go to **Developers** → **Webhooks**
2. Click **+ Add endpoint**
3. Endpoint URL: `https://your-domain.vercel.app/api/stripe/webhook`
4. Listen to events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Click **Add endpoint**
6. **Copy the Signing secret** (starts with `whsec_`)

## Step 5: Add Environment Variables

Add to `.env.local` and Vercel:

```env
# Stripe Keys
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# Price IDs
STRIPE_PRICE_BASICO=price_xxxxx
STRIPE_PRICE_PROFESIONAL=price_xxxxx
```

**In Vercel:**
1. Project Settings → Environment Variables
2. Add each variable
3. Set for: Production, Preview, Development

## Step 6: Test the Integration

### Test Cards (Test Mode Only):

- **Success:** `4242 4242 4242 4242`
- **Decline:** `4000 0000 0000 0002`
- **3D Secure:** `4000 0025 0000 3155`

Use any:
- Future expiry date (e.g., 12/34)
- Any 3-digit CVC
- Any postal code

### Test Flow:

1. Go to your app (logged in)
2. Click "Upgrade to Básico"
3. Should redirect to Stripe Checkout
4. Enter test card: `4242 4242 4242 4242`
5. Complete payment
6. Should redirect back to dashboard
7. Check database: `subscription_tier` should be `basico`

### Test Webhook Locally:

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Forward webhooks to localhost
stripe listen --forward-to localhost:3000/api/stripe/webhook

# Trigger test events
stripe trigger checkout.session.completed
```

## Step 7: Go Live

### Before Going Live:

1. ✅ Test all payment flows thoroughly
2. ✅ Verify webhook handling works
3. ✅ Test subscription cancellation
4. ✅ Complete Stripe account verification
5. ✅ Add business/tax information
6. ✅ Set up bank account for payouts

### Switch to Live Mode:

1. Toggle to "Live mode" in Stripe Dashboard
2. Update environment variables with live keys:
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx`
   - `STRIPE_SECRET_KEY=sk_live_xxx`
3. Create webhook for production domain
4. Update `STRIPE_WEBHOOK_SECRET` with new signing secret
5. Deploy to Vercel

## Pricing Recommendations

**Market Research (Baja California):**
- Legal software subscriptions: $500-2000 MXN/month
- SaaS tools for professionals: $300-1500 MXN/month

**Suggested Pricing:**

```
Free:
- 10 casos
- Email alertas solamente
- $0/mes

Básico:
- 100 casos
- Email + WhatsApp
- 30 días de historial
- $299 MXN/mes (~$15 USD)

Profesional:
- 500 casos
- Email + WhatsApp
- Historial ilimitado
- Soporte prioritario
- $999 MXN/mes (~$50 USD)
```

## Stripe Fees

**Mexico:**
- 3.6% + $3 MXN per successful transaction
- No monthly fees
- No setup fees

**Example:**
- User pays: $299 MXN
- Stripe fee: ~$13.76 MXN
- You receive: ~$285.24 MXN

## Troubleshooting

### "No API key provided"
- Check environment variables are set in Vercel
- Verify variable names match exactly
- Redeploy after adding variables

### "Invalid API Key"
- Using test key in production or vice versa
- Check you copied the full key correctly

### Webhook not firing
- Verify webhook URL is correct
- Check Events tab in Stripe Dashboard
- Look for failed webhook deliveries
- Test with Stripe CLI first

### Payment succeeds but tier doesn't update
- Check webhook secret is correct
- Look at Vercel logs for webhook errors
- Verify database permissions

## Security Best Practices

1. **Never expose secret key:** Only use in server-side code
2. **Always verify webhooks:** Use signing secret to verify requests
3. **Use HTTPS:** Stripe requires HTTPS for webhooks
4. **Test thoroughly:** Use test mode extensively before going live
5. **Handle failures:** Gracefully handle failed payments

## Resources

- [Stripe Documentation](https://stripe.com/docs)
- [Stripe Dashboard](https://dashboard.stripe.com)
- [Stripe Testing](https://stripe.com/docs/testing)
- [Webhook Guide](https://stripe.com/docs/webhooks)

## Next Steps

After setup:
1. Create upgrade page UI
2. Implement Checkout Session creation
3. Handle webhook events
4. Add subscription management (cancel, change plan)
5. Show current plan limits in dashboard
