/*
  # Add Instamojo Environment Variables and Functions

  1. Environment Setup
    - Add environment variables for Instamojo credentials
    - Create RPC functions for credit management
  
  2. Functions
    - add_user_credits: Add credits after successful payment
    - deduct_user_credits: Deduct credits for analysis
*/

-- Function to add credits to user account
CREATE OR REPLACE FUNCTION add_user_credits(
  p_user_id uuid,
  p_credits_to_add integer,
  p_transaction_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update user credits
  UPDATE user_credits 
  SET 
    credits = credits + p_credits_to_add,
    total_purchased = total_purchased + p_credits_to_add,
    last_purchase_at = now(),
    updated_at = now()
  WHERE user_id = p_user_id;
  
  -- If no row was updated, create initial record
  IF NOT FOUND THEN
    INSERT INTO user_credits (user_id, credits, total_purchased, last_purchase_at)
    VALUES (p_user_id, p_credits_to_add, p_credits_to_add, now())
    ON CONFLICT (user_id) DO UPDATE SET
      credits = user_credits.credits + p_credits_to_add,
      total_purchased = user_credits.total_purchased + p_credits_to_add,
      last_purchase_at = now(),
      updated_at = now();
  END IF;
  
  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$;

-- Function to deduct credits for analysis
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
  remaining_credits integer;
BEGIN
  -- Get current credits
  SELECT credits INTO current_credits
  FROM user_credits
  WHERE user_id = p_user_id;
  
  -- Check if user has enough credits
  IF current_credits IS NULL OR current_credits < p_credits_to_deduct THEN
    RETURN false;
  END IF;
  
  -- Calculate remaining credits
  remaining_credits := current_credits - p_credits_to_deduct;
  
  -- Update user credits
  UPDATE user_credits 
  SET 
    credits = remaining_credits,
    updated_at = now()
  WHERE user_id = p_user_id;
  
  -- Log the credit usage
  INSERT INTO credit_usage_log (user_id, analysis_result_id, credits_used, remaining_credits)
  VALUES (p_user_id, p_analysis_result_id, p_credits_to_deduct, remaining_credits);
  
  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$;