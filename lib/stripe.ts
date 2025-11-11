/**
 * Stripe Integration
 * Handles subscription payments and billing
 */

import Stripe from 'stripe';

// Determine if we're in development/test mode
const isTestMode = process.env.NODE_ENV !== 'production';

// Select the appropriate Stripe secret key
const stripeSecretKey = isTestMode
  ? process.env.TEST_STRIPE_SECRET_KEY
  : process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey && process.env.NODE_ENV === 'production') {
  console.warn('⚠️ STRIPE_SECRET_KEY is not set. Stripe functionality will be disabled.');
}

// Initialize Stripe client (use placeholder key during build if not set)
export const stripe = new Stripe(stripeSecretKey || 'sk_test_placeholder', {
  apiVersion: '2025-09-30.clover',
  typescript: true,
});

// Product IDs from Stripe Dashboard
// Note: These are PRODUCT IDs, not PRICE IDs. Prices will be retrieved from products.
// In development, use TEST products. In production, use live products.
export const STRIPE_PRODUCTS = {
  // Monthly products
  pro50: isTestMode
    ? process.env.TEST_STRIPE_PRICE_PRO50 || ''
    : process.env.STRIPE_PRICE_PRO50 || '',
  pro100: isTestMode
    ? process.env.TEST_STRIPE_PRICE_PRO100 || ''
    : process.env.STRIPE_PRICE_PRO100 || '',
  pro250: isTestMode
    ? process.env.TEST_STRIPE_PRICE_PRO250 || ''
    : process.env.STRIPE_PRICE_PRO250 || '',
  pro500: isTestMode
    ? process.env.TEST_STRIPE_PRICE_PRO500 || ''
    : process.env.STRIPE_PRICE_PRO500 || '',
  pro1000: isTestMode
    ? process.env.TEST_STRIPE_PRICE_PRO1000 || ''
    : process.env.STRIPE_PRICE_PRO1000 || '',
  // Yearly products
  pro50_yearly: isTestMode
    ? process.env.TEST_STRIPE_PRICE_PRO50_YEARLY || ''
    : process.env.STRIPE_PRICE_PRO50_YEARLY || '',
  pro100_yearly: isTestMode
    ? process.env.TEST_STRIPE_PRICE_PRO100_YEARLY || ''
    : process.env.STRIPE_PRICE_PRO100_YEARLY || '',
  pro250_yearly: isTestMode
    ? process.env.TEST_STRIPE_PRICE_PRO250_YEARLY || ''
    : process.env.STRIPE_PRICE_PRO250_YEARLY || '',
  pro500_yearly: isTestMode
    ? process.env.TEST_STRIPE_PRICE_PRO500_YEARLY || ''
    : process.env.STRIPE_PRICE_PRO500_YEARLY || '',
  pro1000_yearly: isTestMode
    ? process.env.TEST_STRIPE_PRICE_PRO1000_YEARLY || ''
    : process.env.STRIPE_PRICE_PRO1000_YEARLY || '',
} as const;

// Subscription tier mapping (tier + billing period -> Stripe Product ID)
export const TIER_TO_PRODUCT: Record<string, string> = {
  'pro50_monthly': STRIPE_PRODUCTS.pro50,
  'pro100_monthly': STRIPE_PRODUCTS.pro100,
  'pro250_monthly': STRIPE_PRODUCTS.pro250,
  'pro500_monthly': STRIPE_PRODUCTS.pro500,
  'pro1000_monthly': STRIPE_PRODUCTS.pro1000,
  'pro50_yearly': STRIPE_PRODUCTS.pro50_yearly,
  'pro100_yearly': STRIPE_PRODUCTS.pro100_yearly,
  'pro250_yearly': STRIPE_PRODUCTS.pro250_yearly,
  'pro500_yearly': STRIPE_PRODUCTS.pro500_yearly,
  'pro1000_yearly': STRIPE_PRODUCTS.pro1000_yearly,
};

// Reverse mapping (Stripe Product ID -> tier)
export const PRODUCT_TO_TIER: Record<string, { tier: string; billing: 'monthly' | 'yearly' }> = {
  [STRIPE_PRODUCTS.pro50]: { tier: 'pro50', billing: 'monthly' },
  [STRIPE_PRODUCTS.pro100]: { tier: 'pro100', billing: 'monthly' },
  [STRIPE_PRODUCTS.pro250]: { tier: 'pro250', billing: 'monthly' },
  [STRIPE_PRODUCTS.pro500]: { tier: 'pro500', billing: 'monthly' },
  [STRIPE_PRODUCTS.pro1000]: { tier: 'pro1000', billing: 'monthly' },
  [STRIPE_PRODUCTS.pro50_yearly]: { tier: 'pro50', billing: 'yearly' },
  [STRIPE_PRODUCTS.pro100_yearly]: { tier: 'pro100', billing: 'yearly' },
  [STRIPE_PRODUCTS.pro250_yearly]: { tier: 'pro250', billing: 'yearly' },
  [STRIPE_PRODUCTS.pro500_yearly]: { tier: 'pro500', billing: 'yearly' },
  [STRIPE_PRODUCTS.pro1000_yearly]: { tier: 'pro1000', billing: 'yearly' },
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
  const { productId, userId, userEmail, successUrl, cancelUrl, billing = 'monthly' } = params;

  // Get the price ID from the product with the correct interval
  const interval = billing === 'yearly' ? 'year' : 'month';
  const priceId = await getPriceIdFromProduct(productId, interval);
  if (!priceId) {
    throw new Error(`No active ${billing} price found for product ${productId}`);
  }

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
