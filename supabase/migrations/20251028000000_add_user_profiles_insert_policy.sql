-- Add INSERT policy for user_profiles to allow users to create their own profile during signup
CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);
