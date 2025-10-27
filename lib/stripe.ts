/**
 * Stripe Integration
 * Handles subscription payments and billing
 */

import Stripe from 'stripe';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey && process.env.NODE_ENV === 'production') {
  console.warn('⚠️ STRIPE_SECRET_KEY is not set. Stripe functionality will be disabled.');
}

// Initialize Stripe client (use placeholder key during build if not set)
export const stripe = new Stripe(stripeSecretKey || 'sk_test_placeholder', {
  apiVersion: '2025-09-30.clover',
  typescript: true,
});

// Price IDs from Stripe Dashboard
export const STRIPE_PRICES = {
  basico: process.env.STRIPE_PRICE_BASICO || '',
  profesional: process.env.STRIPE_PRICE_PROFESIONAL || '',
} as const;

// Subscription tier mapping
export const TIER_TO_PRICE: Record<string, string> = {
  basico: STRIPE_PRICES.basico,
  profesional: STRIPE_PRICES.profesional,
};

export const PRICE_TO_TIER: Record<string, string> = {
  [STRIPE_PRICES.basico]: 'basico',
  [STRIPE_PRICES.profesional]: 'profesional',
};

/**
 * Create a Checkout Session for subscription
 */
export async function createCheckoutSession(params: {
  priceId: string;
  userId: string;
  userEmail: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<Stripe.Checkout.Session> {
  const { priceId, userId, userEmail, successUrl, cancelUrl } = params;

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    customer_email: userEmail,
    client_reference_id: userId, // Used to link customer to our user
    metadata: {
      user_id: userId,
    },
    subscription_data: {
      metadata: {
        user_id: userId,
      },
    },
  });

  return session;
}

/**
 * Create a Customer Portal session for managing subscription
 */
export async function createPortalSession(params: {
  customerId: string;
  returnUrl: string;
}): Promise<Stripe.BillingPortal.Session> {
  const { customerId, returnUrl } = params;

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });

  return session;
}

/**
 * Get subscription tier from price ID
 */
export function getTierFromPrice(priceId: string): string | null {
  return PRICE_TO_TIER[priceId] || null;
}

/**
 * Get price ID from tier
 */
export function getPriceFromTier(tier: string): string | null {
  return TIER_TO_PRICE[tier] || null;
}
