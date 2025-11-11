/**
 * Stripe Webhook Handler
 * Processes subscription lifecycle events
 */

import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { stripe, getTierFromProduct } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

// Use TEST webhook secret in development, production webhook secret in production
const isTestMode = process.env.NODE_ENV !== 'production';
const webhookSecret = isTestMode
  ? process.env.TEST_STRIPE_WEBHOOK_SECRET!
  : process.env.STRIPE_WEBHOOK_SECRET!;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const headersList = await headers();
    const signature = headersList.get('stripe-signature');

    if (!signature) {
      return NextResponse.json({ error: 'No signature' }, { status: 400 });
    }

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    console.log(`Webhook received: ${event.type}`);

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutComplete(event.data.object as Stripe.Checkout.Session);
        break;

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdate(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

/**
 * Handle successful checkout
 */
async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.user_id || session.client_reference_id;
  const productId = session.metadata?.product_id;

  if (!userId) {
    console.error('No user_id in checkout session');
    return;
  }

  // Get subscription details
  const subscriptionId = session.subscription as string;
  const customerId = session.customer as string;

  const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
    expand: ['items.data.price.product'],
  });

  // Get product ID from subscription
  const actualProductId = productId || (subscription.items.data[0].price.product as Stripe.Product).id;
  const tierInfo = getTierFromProduct(actualProductId);

  if (!tierInfo) {
    console.error(`Unknown product ID: ${actualProductId}`);
    return;
  }

  // Update user profile
  const supabase = createClient(supabaseUrl, supabaseKey);
  const { error } = await supabase
    .from('user_profiles')
    .update({
      subscription_tier: tierInfo.tier,
      subscription_status: 'active',
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (error) {
    console.error('Failed to update user subscription:', error);
  } else {
    console.log(`✓ User ${userId} upgraded to ${tierInfo.tier} (${tierInfo.billing})`);
  }
}

/**
 * Handle subscription update (plan change, renewal, etc.)
 */
async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const userId = subscription.metadata.user_id;

  if (!userId) {
    console.error('No user_id in subscription');
    return;
  }

  // Always get the actual product from the subscription items (not metadata)
  // because metadata doesn't update when users switch plans
  const expandedSub = await stripe.subscriptions.retrieve(subscription.id, {
    expand: ['items.data.price.product'],
  });

  const actualProductId = (expandedSub.items.data[0].price.product as Stripe.Product).id;
  const tierInfo = getTierFromProduct(actualProductId);
  const status = subscription.status;

  if (!tierInfo) {
    console.error(`Unknown product ID: ${actualProductId}`);
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Get current user profile and case count
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('subscription_tier')
    .eq('id', userId)
    .single();

  const { count: caseCount } = await supabase
    .from('cases')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  const currentCaseCount = caseCount || 0;

  // Check if this is a downgrade that would exceed the new limit
  const { getMaxCases } = await import('@/lib/subscription-tiers');
  const newMaxCases = getMaxCases(tierInfo.tier);

  if (currentCaseCount > newMaxCases) {
    console.warn(`⚠️ User ${userId} attempted to downgrade to ${tierInfo.tier} but has ${currentCaseCount} cases (limit: ${newMaxCases})`);

    // Cancel the subscription change by reverting to previous tier
    // We can't actually revert the Stripe subscription here, but we won't update the database
    // and we'll set a flag so the dashboard can show a warning

    const { error: flagError } = await supabase
      .from('user_profiles')
      .update({
        downgrade_blocked: true,
        downgrade_blocked_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (flagError) {
      console.error('Failed to set downgrade block flag:', flagError);
    }

    // TODO: Send email notification to user explaining why downgrade was blocked
    console.log(`✗ Downgrade blocked for user ${userId}: ${currentCaseCount} cases > ${newMaxCases} limit`);
    return;
  }

  // Clear any previous downgrade block flags
  const { error } = await supabase
    .from('user_profiles')
    .update({
      subscription_tier: tierInfo.tier,
      subscription_status: status,
      downgrade_blocked: false,
      downgrade_blocked_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (error) {
    console.error('Failed to update subscription:', error);
  } else {
    console.log(`✓ Subscription updated for user ${userId}: ${tierInfo.tier} (${status})`);
  }
}

/**
 * Handle subscription cancellation/deletion
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const userId = subscription.metadata.user_id;

  if (!userId) {
    console.error('No user_id in subscription');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const { error } = await supabase
    .from('user_profiles')
    .update({
      subscription_tier: 'gratis',
      subscription_status: 'cancelled',
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (error) {
    console.error('Failed to downgrade user:', error);
  } else {
    console.log(`✓ User ${userId} downgraded to gratis (subscription cancelled)`);
  }
}

/**
 * Handle successful payment
 */
async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  // Note: subscription is an expandable field on Invoice
  // TypeScript types don't include it by default, so we use type assertion
  const subscriptionRef = (invoice as any).subscription as string | Stripe.Subscription | null;
  if (!subscriptionRef) return;

  const subscriptionId = typeof subscriptionRef === 'string'
    ? subscriptionRef
    : subscriptionRef.id;

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const userId = subscription.metadata.user_id;

  if (!userId) return;

  console.log(`✓ Payment succeeded for user ${userId}`);

  // Update subscription status to active (in case it was past_due)
  const supabase = createClient(supabaseUrl, supabaseKey);
  await supabase
    .from('user_profiles')
    .update({
      subscription_status: 'active',
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);
}

/**
 * Handle failed payment
 */
async function handlePaymentFailed(invoice: Stripe.Invoice) {
  // Note: subscription is an expandable field on Invoice
  // TypeScript types don't include it by default, so we use type assertion
  const subscriptionRef = (invoice as any).subscription as string | Stripe.Subscription | null;
  if (!subscriptionRef) return;

  const subscriptionId = typeof subscriptionRef === 'string'
    ? subscriptionRef
    : subscriptionRef.id;

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const userId = subscription.metadata.user_id;

  if (!userId) return;

  console.error(`✗ Payment failed for user ${userId}`);

  // Update subscription status to past_due
  const supabase = createClient(supabaseUrl, supabaseKey);
  await supabase
    .from('user_profiles')
    .update({
      subscription_status: 'past_due',
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);
}
