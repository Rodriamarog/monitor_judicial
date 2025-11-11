import { NextResponse } from 'next/server';
import { STRIPE_PRODUCTS } from '@/lib/stripe';

/**
 * GET /api/stripe/products
 * Returns available Stripe product IDs for the current environment
 */
export async function GET() {
  return NextResponse.json({
    products: STRIPE_PRODUCTS,
  });
}
