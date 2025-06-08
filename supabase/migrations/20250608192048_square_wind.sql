/*
  # Fix user signup trigger function

  1. Database Functions
    - Create or replace the `initialize_user_credits` function
    - This function creates a user_credits record when a new user signs up
  
  2. Triggers
    - Create trigger on auth.users table to call the function on INSERT
  
  3. Security
    - Function runs with security definer privileges to bypass RLS
*/

-- Create or replace the function to initialize user credits
CREATE OR REPLACE FUNCTION public.initialize_user_credits()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_credits (user_id, credits, total_purchased, created_at, updated_at)
  VALUES (NEW.id, 3, 0, now(), now())
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop the trigger if it exists and recreate it
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create the trigger on auth.users table
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.initialize_user_credits();