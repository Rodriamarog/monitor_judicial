/**
 * Script to create Stripe test products for Monitor Judicial
 * Run with: node scripts/create-test-products.js
 */

// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' });

const Stripe = require('stripe');

// Use TEST secret key
const secretKey = process.env.STRIPE_TEST_SECRET_KEY;
if (!secretKey) {
  console.error('ERROR: STRIPE_TEST_SECRET_KEY not found in .env.local');
  process.exit(1);
}

const stripe = Stripe(secretKey);

const products = [
  {
    name: 'Esencial',
    description: 'Para abogados independientes - 100 casos monitoreados',
    monthlyPrice: 49900, // $499 MXN in cents
    yearlyPrice: 499000, // $4,990 MXN in cents
  },
  {
    name: 'Pro',
    description: 'Para bufetes pequeños - 250 casos monitoreados',
    monthlyPrice: 99900, // $999 MXN in cents
    yearlyPrice: 999000, // $9,990 MXN in cents
  },
  {
    name: 'Elite',
    description: 'Para despachos medianos - 500 casos monitoreados',
    monthlyPrice: 199900, // $1,999 MXN in cents
    yearlyPrice: 1999000, // $19,990 MXN in cents
  },
  {
    name: 'Max',
    description: 'Para despachos grandes - 1000 casos monitoreados',
    monthlyPrice: 299900, // $2,999 MXN in cents
    yearlyPrice: 2999000, // $29,990 MXN in cents
  },
];

const envKeys = ['ESENCIAL', 'PRO', 'ELITE', 'MAX'];

async function createProducts() {
  console.log('Creating TEST products in Stripe (sandbox)...\n');

  for (let i = 0; i < products.length; i++) {
    const productData = products[i];
    const envKey = envKeys[i];

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

      console.log(`✓ Monthly price: ${monthlyPrice.id} ($${productData.monthlyPrice / 100} MXN/month)`);

      // Create yearly price
      const yearlyPrice = await stripe.prices.create({
        product: product.id,
        unit_amount: productData.yearlyPrice,
        currency: 'mxn',
        recurring: {
          interval: 'year',
        },
      });

      console.log(`✓ Yearly price:  ${yearlyPrice.id} ($${productData.yearlyPrice / 100} MXN/year)`);
      console.log('');

    } catch (error) {
      console.error(`✗ Error creating ${productData.name}:`, error.message);
    }
  }

  console.log('\n✅ Done! Add the Price IDs above to your .env.local:');
  console.log('\nSTRIPE_TEST_PRICE_ESENCIAL=price_xxx');
  console.log('STRIPE_TEST_PRICE_PRO=price_xxx');
  console.log('STRIPE_TEST_PRICE_ELITE=price_xxx');
  console.log('STRIPE_TEST_PRICE_MAX=price_xxx');
  console.log('STRIPE_TEST_PRICE_ESENCIAL_YEARLY=price_xxx');
  console.log('STRIPE_TEST_PRICE_PRO_YEARLY=price_xxx');
  console.log('STRIPE_TEST_PRICE_ELITE_YEARLY=price_xxx');
  console.log('STRIPE_TEST_PRICE_MAX_YEARLY=price_xxx');
}

createProducts().catch(console.error);
