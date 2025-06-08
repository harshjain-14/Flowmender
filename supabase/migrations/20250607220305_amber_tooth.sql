/*
  # User Credits and Payment System

  1. New Tables
    - `user_credits`
      - `user_id` (uuid, references auth.users)
      - `credits` (integer, default 3 for free trial)
      - `total_purchased` (integer, tracks lifetime purchases)
      - `last_purchase_at` (timestamp)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `payment_transactions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `instamojo_payment_id` (text, unique)
      - `instamojo_payment_request_id` (text)
      - `amount` (decimal)
      - `currency` (text, default 'INR')
      - `credits_purchased` (integer)
      - `status` (text: pending, completed, failed, refunded)
      - `payment_url` (text)
      - `webhook_verified` (boolean, default false)
      - `created_at` (timestamp)
      - `completed_at` (timestamp)

    - `credit_usage_log`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `analysis_result_id` (uuid, references analysis_results)
      - `credits_used` (integer, default 1)
      - `remaining_credits` (integer)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
    - Add policies for webhook processing
*/

-- Create user_credits table
CREATE TABLE IF NOT EXISTS user_credits (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  credits integer NOT NULL DEFAULT 3,
  total_purchased integer NOT NULL DEFAULT 0,
  last_purchase_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create payment_transactions table
CREATE TABLE IF NOT EXISTS payment_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  instamojo_payment_id text UNIQUE,
  instamojo_payment_request_id text NOT NULL,
  amount decimal(10,2) NOT NULL,
  currency text NOT NULL DEFAULT 'INR',
  credits_purchased integer NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  payment_url text,
  webhook_verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- Create credit_usage_log table
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
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_usage_log ENABLE ROW LEVEL SECURITY;

-- User Credits Policies
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

CREATE POLICY "System can insert user credits"
  ON user_credits
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Payment Transactions Policies
CREATE POLICY "Users can read own transactions"
  ON payment_transactions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions"
  ON payment_transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can update transactions"
  ON payment_transactions
  FOR UPDATE
  TO authenticated
  USING (true); -- Webhooks need to update any transaction

-- Credit Usage Log Policies
CREATE POLICY "Users can read own usage log"
  ON credit_usage_log
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert usage log"
  ON credit_usage_log
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS user_credits_user_id_idx ON user_credits(user_id);
CREATE INDEX IF NOT EXISTS payment_transactions_user_id_idx ON payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS payment_transactions_status_idx ON payment_transactions(status);
CREATE INDEX IF NOT EXISTS payment_transactions_instamojo_payment_id_idx ON payment_transactions(instamojo_payment_id);
CREATE INDEX IF NOT EXISTS credit_usage_log_user_id_idx ON credit_usage_log(user_id);
CREATE INDEX IF NOT EXISTS credit_usage_log_created_at_idx ON credit_usage_log(created_at DESC);

-- Function to initialize user credits
CREATE OR REPLACE FUNCTION initialize_user_credits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO user_credits (user_id, credits, total_purchased)
  VALUES (NEW.id, 3, 0)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Trigger to initialize credits for new users
DROP TRIGGER IF EXISTS on_auth_user_created_credits ON auth.users;
CREATE TRIGGER on_auth_user_created_credits
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION initialize_user_credits();

-- Function to deduct credits and log usage
CREATE OR REPLACE FUNCTION deduct_user_credits(
  p_user_id uuid,
  p_analysis_result_id uuid DEFAULT NULL,
  p_credits_to_deduct integer DEFAULT 1
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_credits integer;
  new_credits integer;
BEGIN
  -- Get current credits with row lock
  SELECT credits INTO current_credits
  FROM user_credits
  WHERE user_id = p_user_id
  FOR UPDATE;
  
  -- Check if user has enough credits
  IF current_credits IS NULL OR current_credits < p_credits_to_deduct THEN
    RETURN false;
  END IF;
  
  -- Calculate new credits
  new_credits := current_credits - p_credits_to_deduct;
  
  -- Update user credits
  UPDATE user_credits
  SET credits = new_credits,
      updated_at = now()
  WHERE user_id = p_user_id;
  
  -- Log the usage
  INSERT INTO credit_usage_log (user_id, analysis_result_id, credits_used, remaining_credits)
  VALUES (p_user_id, p_analysis_result_id, p_credits_to_deduct, new_credits);
  
  RETURN true;
END;
$$;

-- Function to add credits after successful payment
CREATE OR REPLACE FUNCTION add_user_credits(
  p_user_id uuid,
  p_credits_to_add integer,
  p_transaction_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_credits integer;
  current_total_purchased integer;
BEGIN
  -- Get current credits and total purchased
  SELECT credits, total_purchased INTO current_credits, current_total_purchased
  FROM user_credits
  WHERE user_id = p_user_id
  FOR UPDATE;
  
  -- If user doesn't exist, create record
  IF current_credits IS NULL THEN
    INSERT INTO user_credits (user_id, credits, total_purchased, last_purchase_at)
    VALUES (p_user_id, p_credits_to_add, p_credits_to_add, now());
  ELSE
    -- Update existing record
    UPDATE user_credits
    SET credits = current_credits + p_credits_to_add,
        total_purchased = current_total_purchased + p_credits_to_add,
        last_purchase_at = now(),
        updated_at = now()
    WHERE user_id = p_user_id;
  END IF;
  
  -- Mark transaction as completed
  UPDATE payment_transactions
  SET status = 'completed',
      completed_at = now(),
      webhook_verified = true
  WHERE id = p_transaction_id;
  
  RETURN true;
END;
$$;