-- Fix user profile auto-creation to use 'gratis' instead of 'basico'
-- This was causing silent failures due to CHECK constraint mismatch

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, subscription_tier)
  VALUES (
    new.id,
    new.email,
    'gratis'  -- Changed from 'basico' to match CHECK constraint
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in handle_new_user: %', SQLERRM;
    RETURN new;
END;
$$;

-- Backfill: Create profiles for users who don't have one (including the broken signup)
INSERT INTO public.user_profiles (id, email, subscription_tier)
SELECT
  au.id,
  au.email,
  'gratis'
FROM auth.users au
LEFT JOIN user_profiles up ON au.id = up.id
WHERE up.id IS NULL
  AND au.email_confirmed_at IS NOT NULL  -- Only confirmed users
ON CONFLICT (id) DO NOTHING;
