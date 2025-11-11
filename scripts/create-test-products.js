/**
 * Script to create Stripe test products for Monitor Judicial
 * Run with: node scripts/create-test-products.js
 */

// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' });

const Stripe = require('stripe');

// Use your TEST secret key (starts with sk_test_)
if (!process.env.TEST_STRIPE_SECRET_KEY) {
  console.error('ERROR: TEST_STRIPE_SECRET_KEY not found in .env.local');
  process.exit(1);
}

const stripe = Stripe(process.env.TEST_STRIPE_SECRET_KEY);

const products = [
  {
    name: '[TEST] Pro 50',
    description: '[TEST] Para abogados independientes - 50 casos monitoreados',
    monthlyPrice: 19900, // $199 in cents
    yearlyPrice: 199900, // $1,999 in cents
  },
  {
    name: '[TEST] Pro 100',
    description: '[TEST] Para profesionales independientes - 100 casos monitoreados',
    monthlyPrice: 39900, // $399 in cents
    yearlyPrice: 349900, // $3,499 in cents
  },
  {
    name: '[TEST] Pro 250',
    description: '[TEST] Para bufetes pequeños - 250 casos monitoreados',
    monthlyPrice: 64900, // $649 in cents
    yearlyPrice: 499900, // $4,999 in cents
  },
  {
    name: '[TEST] Pro 500',
    description: '[TEST] Para despachos medianos - 500 casos monitoreados',
    monthlyPrice: 99900, // $999 in cents
    yearlyPrice: 899900, // $8,999 in cents
  },
  {
    name: '[TEST] Pro 1000',
    description: '[TEST] Para despachos grandes - 1000 casos monitoreados',
    monthlyPrice: 179900, // $1,799 in cents
    yearlyPrice: 1249900, // $12,499 in cents
  },
];

async function createProducts() {
  console.log('Creating TEST products in Stripe...\n');

  for (const productData of products) {
    try {
      // Create the product
      console.log(`Creating product: ${productData.name}...`);
      const product = await stripe.products.create({
        name: productData.name,
        description: productData.description,
      });

      console.log(`✓ Product created: ${product.id}`);

      // Create monthly price
      const monthlyPrice = await stripe.prices.create({
        product: product.id,
        unit_amount: productData.monthlyPrice,
        currency: 'mxn',
        recurring: {
          interval: 'month',
        },
      });

      console.log(`✓ Monthly price created: ${monthlyPrice.id} ($${productData.monthlyPrice / 100} MXN/month)`);

      // Create yearly price
      const yearlyPrice = await stripe.prices.create({
        product: product.id,
        unit_amount: productData.yearlyPrice,
        currency: 'mxn',
        recurring: {
          interval: 'year',
        },
      });

      console.log(`✓ Yearly price created: ${yearlyPrice.id} ($${productData.yearlyPrice / 100} MXN/year)`);
      console.log(`\nProduct ID: ${product.id}`);
      console.log(`Monthly Price ID: ${monthlyPrice.id}`);
      console.log(`Yearly Price ID: ${yearlyPrice.id}`);
      console.log('---\n');

    } catch (error) {
      console.error(`✗ Error creating ${productData.name}:`, error.message);
    }
  }

  console.log('\n✅ Done! Copy the Product IDs above and add them to your .env.local file as:');
  console.log('\nFor TEST environment (.env.local):');
  console.log('STRIPE_PRICE_PRO50=prod_xxx');
  console.log('STRIPE_PRICE_PRO100=prod_xxx');
  console.log('STRIPE_PRICE_PRO250=prod_xxx');
  console.log('STRIPE_PRICE_PRO500=prod_xxx');
  console.log('STRIPE_PRICE_PRO1000=prod_xxx');
  console.log('\nSTRIPE_PRICE_PRO50_YEARLY=prod_xxx');
  console.log('STRIPE_PRICE_PRO100_YEARLY=prod_xxx');
  console.log('STRIPE_PRICE_PRO250_YEARLY=prod_xxx');
  console.log('STRIPE_PRICE_PRO500_YEARLY=prod_xxx');
  console.log('STRIPE_PRICE_PRO1000_YEARLY=prod_xxx');
}

createProducts().catch(console.error);
