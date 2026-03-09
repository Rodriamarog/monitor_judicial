/**
 * Stripe Integration
 * Handles subscription payments and billing
 */

import Stripe from 'stripe';

// Toggle between sandbox and live mode via STRIPE_TEST_MODE env var
// Set STRIPE_TEST_MODE=true  → uses sandbox account (NeuroCrow sandbox)
// Set STRIPE_TEST_MODE=false → uses live account   (NeuroCrow)
const isTestMode = process.env.STRIPE_TEST_MODE === 'true';

const stripeSecretKey = isTestMode
  ? process.env.STRIPE_TEST_SECRET_KEY
  : process.env.STRIPE_LIVE_SECRET_KEY;

if (!stripeSecretKey) {
  console.warn(`⚠️ Stripe ${isTestMode ? 'STRIPE_TEST_SECRET_KEY' : 'STRIPE_LIVE_SECRET_KEY'} is not set. Stripe functionality will be disabled.`);
}

// Initialize Stripe client (use placeholder key during build if not set)
export const stripe = new Stripe(stripeSecretKey || 'sk_test_placeholder', {
  apiVersion: '2025-10-29.clover',
  typescript: true,
});

// Product IDs from Stripe Dashboard
// Note: These are PRODUCT IDs, not PRICE IDs. Prices will be retrieved from products.
// In development, use TEST products. In production, use live products.
const prefix = isTestMode ? 'STRIPE_TEST' : 'STRIPE_LIVE';
const env = process.env;

export const STRIPE_PRODUCTS = {
  // Monthly prices
  esencial: env[`${prefix}_PRICE_ESENCIAL`] || '',
  pro:      env[`${prefix}_PRICE_PRO`]      || '',
  elite:    env[`${prefix}_PRICE_ELITE`]    || '',
  max:      env[`${prefix}_PRICE_MAX`]      || '',
  // Yearly prices
  esencial_yearly: env[`${prefix}_PRICE_ESENCIAL_YEARLY`] || '',
  pro_yearly:      env[`${prefix}_PRICE_PRO_YEARLY`]      || '',
  elite_yearly:    env[`${prefix}_PRICE_ELITE_YEARLY`]    || '',
  max_yearly:      env[`${prefix}_PRICE_MAX_YEARLY`]      || '',
} as const;

// Subscription tier mapping (tier + billing period -> Stripe Price ID)
export const TIER_TO_PRODUCT: Record<string, string> = {
  'esencial_monthly': STRIPE_PRODUCTS.esencial,
  'pro_monthly':      STRIPE_PRODUCTS.pro,
  'elite_monthly':    STRIPE_PRODUCTS.elite,
  'max_monthly':      STRIPE_PRODUCTS.max,
  'esencial_yearly':  STRIPE_PRODUCTS.esencial_yearly,
  'pro_yearly':       STRIPE_PRODUCTS.pro_yearly,
  'elite_yearly':     STRIPE_PRODUCTS.elite_yearly,
  'max_yearly':       STRIPE_PRODUCTS.max_yearly,
};

// Reverse mapping (Stripe Price ID -> tier)
export const PRODUCT_TO_TIER: Record<string, { tier: string; billing: 'monthly' | 'yearly' }> = {
  [STRIPE_PRODUCTS.esencial]:        { tier: 'esencial', billing: 'monthly' },
  [STRIPE_PRODUCTS.pro]:             { tier: 'pro',      billing: 'monthly' },
  [STRIPE_PRODUCTS.elite]:           { tier: 'elite',    billing: 'monthly' },
  [STRIPE_PRODUCTS.max]:             { tier: 'max',      billing: 'monthly' },
  [STRIPE_PRODUCTS.esencial_yearly]: { tier: 'esencial', billing: 'yearly'  },
  [STRIPE_PRODUCTS.pro_yearly]:      { tier: 'pro',      billing: 'yearly'  },
  [STRIPE_PRODUCTS.elite_yearly]:    { tier: 'elite',    billing: 'yearly'  },
  [STRIPE_PRODUCTS.max_yearly]:      { tier: 'max',      billing: 'yearly'  },
};

/**
 * Get default price ID for a product
 * Products should have one default price configured
 */
export async function getPriceIdFromProduct(
  productId: string,
  interval: 'month' | 'year' = 'month'
): Promise<string | null> {
  try {
    const prices = await stripe.prices.list({
      product: productId,
      active: true,
    });

    if (prices.data.length === 0) {
      console.error(`No active price found for product ${productId}`);
      return null;
    }

    // Filter by recurring interval
    const matchingPrice = prices.data.find(
      (price) => price.recurring?.interval === interval
    );

    if (!matchingPrice) {
      console.error(`No ${interval}ly price found for product ${productId}`);
      return null;
    }

    return matchingPrice.id;
  } catch (error) {
    console.error(`Error fetching price for product ${productId}:`, error);
    return null;
  }
}

/**
 * Create a Checkout Session for subscription
 */
export async function createCheckoutSession(params: {
  productId: string;
  userId: string;
  userEmail: string;
  successUrl: string;
  cancelUrl: string;
  billing?: 'monthly' | 'yearly';
}): Promise<Stripe.Checkout.Session> {
  const { productId, userId, userEmail, successUrl, cancelUrl } = params;

  // productId here is actually a Stripe Price ID (from STRIPE_PRODUCTS)
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: productId,
        quantity: 1,
      },
    ],
    allow_promotion_codes: true,
    success_url: successUrl,
    cancel_url: cancelUrl,
    customer_email: userEmail,
    client_reference_id: userId,
    metadata: {
      user_id: userId,
      product_id: productId,
    },
    subscription_data: {
      metadata: {
        user_id: userId,
        product_id: productId,
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
 * Get subscription tier from product ID
 */
export function getTierFromProduct(productId: string): { tier: string; billing: 'monthly' | 'yearly' } | null {
  return PRODUCT_TO_TIER[productId] || null;
}

/**
 * Get product ID from tier and billing period
 */
export function getProductFromTier(tier: string, billing: 'monthly' | 'yearly'): string | null {
  const key = `${tier}_${billing}`;
  return TIER_TO_PRODUCT[key] || null;
}
