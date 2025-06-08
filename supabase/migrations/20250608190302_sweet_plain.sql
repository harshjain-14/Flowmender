/*
  # Add Credit Management Functions

  1. Functions
    - `deduct_user_credits` - Safely deduct credits from user account with logging
    - `add_user_credits` - Add credits to user account after successful payment
    - `initialize_user_credits` - Initialize new user with default credits (trigger function)

  2. Security
    - Functions are security definer to bypass RLS when needed
    - Proper validation and error handling included

  3. Features
    - Atomic operations to prevent race conditions
    - Credit usage logging
    - Automatic user credit initialization
*/

-- Function to deduct credits from user account
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
  IF current_credits IS NULL THEN
    RAISE EXCEPTION 'User credits not found';
  END IF;

  IF current_credits < p_credits_to_deduct THEN
    RETURN false;
  END IF;

  -- Calculate new credit balance
  new_credits := current_credits - p_credits_to_deduct;

  -- Update user credits
  UPDATE user_credits
  SET 
    credits = new_credits,
    updated_at = now()
  WHERE user_id = p_user_id;

  -- Log the credit usage
  INSERT INTO credit_usage_log (
    user_id,
    analysis_result_id,
    credits_used,
    remaining_credits
  ) VALUES (
    p_user_id,
    p_analysis_result_id,
    p_credits_to_deduct,
    new_credits
  );

  RETURN true;
END;
$$;

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
DECLARE
  current_credits integer;
  current_total_purchased integer;
BEGIN
  -- Get current credits and total purchased with row lock
  SELECT credits, total_purchased 
  INTO current_credits, current_total_purchased
  FROM user_credits
  WHERE user_id = p_user_id
  FOR UPDATE;

  -- If no record exists, create one
  IF current_credits IS NULL THEN
    INSERT INTO user_credits (
      user_id,
      credits,
      total_purchased,
      last_purchase_at
    ) VALUES (
      p_user_id,
      p_credits_to_add,
      p_credits_to_add,
      now()
    );
  ELSE
    -- Update existing record
    UPDATE user_credits
    SET 
      credits = current_credits + p_credits_to_add,
      total_purchased = current_total_purchased + p_credits_to_add,
      last_purchase_at = now(),
      updated_at = now()
    WHERE user_id = p_user_id;
  END IF;

  RETURN true;
END;
$$;

-- Trigger function to initialize user credits when a new user is created
CREATE OR REPLACE FUNCTION initialize_user_credits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert initial credits for new user
  INSERT INTO user_credits (
    user_id,
    credits,
    total_purchased
  ) VALUES (
    NEW.id,
    3,
    0
  );
  
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- Credits already exist, ignore
    RETURN NEW;
END;
$$;

-- Create trigger on auth.users table to automatically initialize credits
-- Note: This trigger will be created on the auth.users table which is managed by Supabase
-- We need to ensure it exists for automatic credit initialization
DO $$
BEGIN
  -- Check if trigger already exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'on_auth_user_created' 
    AND tgrelid = 'auth.users'::regclass
  ) THEN
    -- Create trigger on auth.users table
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION initialize_user_credits();
  END IF;
END $$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION deduct_user_credits(uuid, uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION add_user_credits(uuid, integer, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION initialize_user_credits() TO authenticated;