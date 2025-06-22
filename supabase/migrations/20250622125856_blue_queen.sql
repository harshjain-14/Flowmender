/*
  # Fix Credits System

  1. Ensure user_credits table exists with proper structure
  2. Create simplified credit management functions
  3. Fix RLS policies
  4. Add proper indexes
*/

-- Ensure user_credits table exists
CREATE TABLE IF NOT EXISTS user_credits (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  credits integer NOT NULL DEFAULT 3,
  total_purchased integer NOT NULL DEFAULT 0,
  last_purchase_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Ensure credit_usage_log table exists
CREATE TABLE IF NOT EXISTS credit_usage_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  analysis_result_id uuid REFERENCES analysis_results(id) ON DELETE SET NULL,
  credits_used integer NOT NULL DEFAULT 1,
  remaining_credits integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_usage_log ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can read own credits" ON user_credits;
DROP POLICY IF EXISTS "Users can update own credits" ON user_credits;
DROP POLICY IF EXISTS "System can insert user credits" ON user_credits;
DROP POLICY IF EXISTS "Users can read own usage log" ON credit_usage_log;
DROP POLICY IF EXISTS "System can insert usage log" ON credit_usage_log;

-- Create policies for user_credits
CREATE POLICY "Users can read own credits"
  ON user_credits
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own credits"
  ON user_credits
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert own credits"
  ON user_credits
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create policies for credit_usage_log
CREATE POLICY "Users can read own usage log"
  ON credit_usage_log
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own usage log"
  ON credit_usage_log
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS user_credits_user_id_idx ON user_credits(user_id);
CREATE INDEX IF NOT EXISTS credit_usage_log_user_id_idx ON credit_usage_log(user_id);
CREATE INDEX IF NOT EXISTS credit_usage_log_created_at_idx ON credit_usage_log(created_at DESC);

-- Create or replace trigger function to initialize credits for new users
CREATE OR REPLACE FUNCTION public.initialize_user_credits()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_credits (user_id, credits, total_purchased, created_at, updated_at)
  VALUES (NEW.id, 3, 0, now(), now())
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.initialize_user_credits();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.user_credits TO authenticated;
GRANT ALL ON public.credit_usage_log TO authenticated;