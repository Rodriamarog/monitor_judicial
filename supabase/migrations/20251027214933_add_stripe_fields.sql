-- Add Stripe customer and subscription tracking fields
ALTER TABLE user_profiles
ADD COLUMN stripe_customer_id TEXT,
ADD COLUMN stripe_subscription_id TEXT;

-- Add index for faster lookups
CREATE INDEX idx_user_profiles_stripe_customer ON user_profiles(stripe_customer_id);
CREATE INDEX idx_user_profiles_stripe_subscription ON user_profiles(stripe_subscription_id);
