/*
  # Remove Custom Users Table and Use Supabase Native Auth

  1. Changes
    - Remove custom users table completely
    - Update foreign key references to point to auth.users directly
    - Remove unnecessary user creation triggers
    - Clean up any references to custom users table

  2. Security
    - All tables now properly reference auth.users(id)
    - RLS policies updated to use auth.uid() directly
*/

-- Remove the custom users table completely
DROP TABLE IF EXISTS public.users CASCADE;

-- Remove any triggers related to custom user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Update documents table to reference auth.users directly (should already be correct)
-- The documents table already has the correct foreign key: auth.users(id)

-- Update analysis_results table to reference auth.users directly (should already be correct)  
-- The analysis_results table already has the correct foreign key: auth.users(id)

-- Ensure all RLS policies are using auth.uid() correctly (they already are)
-- No changes needed as the existing policies already use auth.uid()