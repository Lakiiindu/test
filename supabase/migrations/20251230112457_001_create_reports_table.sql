/*
  # Create Reports Table

  1. New Tables
    - `reports`
      - `id` (uuid, primary key)
      - `title` (text)
      - `type` (text: 'daily', 'monthly', 'summary')
      - `data` (jsonb: report data)
      - `created_at` (timestamp)
      - `created_by` (uuid, foreign key to auth.users)
  
  2. Security
    - Enable RLS on `reports` table
    - Add policy for authenticated users to view reports
    - Add policy for authenticated users to create reports
*/

CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  type text NOT NULL CHECK (type IN ('daily', 'monthly', 'summary')),
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view reports"
  ON reports FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create reports"
  ON reports FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);
