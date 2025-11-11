/**
 * Create Stripe Checkout Session
 * Initiates subscription payment flow
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createCheckoutSession } from '@/lib/stripe';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get request body
    const body = await request.json();
    const { productId, tier, billing } = body;

    if (!productId) {
      return NextResponse.json({ error: 'Missing productId' }, { status: 400 });
    }

    // Get user profile for email
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('email')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    // Create Checkout Session
    const session = await createCheckoutSession({
      productId,
      userId: user.id,
      userEmail: profile.email,
      successUrl: `${request.nextUrl.origin}/dashboard?upgrade=success&tier=${tier}&billing=${billing}`,
      cancelUrl: `${request.nextUrl.origin}/dashboard?upgrade=cancelled`,
      billing: billing as 'monthly' | 'yearly',
    });

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Checkout session error:', error);
    return NextResponse.json(
      {
        error: 'Failed to create checkout session',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
