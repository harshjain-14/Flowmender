/*
  # Create database schema for PRD Edge Case Finder

  1. New Tables
    - `documents`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `name` (text)
      - `content` (text)
      - `type` (text)
      - `size` (integer)
      - `uploaded_at` (timestamptz)
      - `created_at` (timestamptz)
    
    - `analysis_results`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `document_id` (uuid, references documents)
      - `document_name` (text)
      - `analyzed_at` (timestamptz)
      - `context` (jsonb)
      - `journeys` (jsonb)
      - `edge_cases` (jsonb)
      - `summary` (jsonb)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to manage their own data
*/

-- Create documents table
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  content text NOT NULL,
  type text NOT NULL,
  size integer NOT NULL,
  uploaded_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create analysis_results table
CREATE TABLE IF NOT EXISTS analysis_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  document_id uuid REFERENCES documents(id) ON DELETE CASCADE NOT NULL,
  document_name text NOT NULL,
  analyzed_at timestamptz DEFAULT now(),
  context jsonb DEFAULT '{}',
  journeys jsonb DEFAULT '[]',
  edge_cases jsonb DEFAULT '[]',
  summary jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_results ENABLE ROW LEVEL SECURITY;

-- Create policies for documents table
CREATE POLICY "Users can read own documents"
  ON documents
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own documents"
  ON documents
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own documents"
  ON documents
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own documents"
  ON documents
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create policies for analysis_results table
CREATE POLICY "Users can read own analysis results"
  ON analysis_results
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own analysis results"
  ON analysis_results
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own analysis results"
  ON analysis_results
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own analysis results"
  ON analysis_results
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS documents_user_id_idx ON documents(user_id);
CREATE INDEX IF NOT EXISTS documents_created_at_idx ON documents(created_at DESC);
CREATE INDEX IF NOT EXISTS analysis_results_user_id_idx ON analysis_results(user_id);
CREATE INDEX IF NOT EXISTS analysis_results_document_id_idx ON analysis_results(document_id);
CREATE INDEX IF NOT EXISTS analysis_results_created_at_idx ON analysis_results(created_at DESC);