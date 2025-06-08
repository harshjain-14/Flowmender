/*
  # Remove custom users table and use Supabase native auth

  1. Changes
    - Remove the custom users table since we'll use auth.users
    - Update foreign key references to point to auth.users directly
    - Clean up any references to the custom users table

  2. Security
    - All tables will reference auth.users(id) directly
    - RLS policies will use auth.uid() function
*/

-- Remove the custom users table since we're using Supabase native auth
DROP TABLE IF EXISTS public.users;