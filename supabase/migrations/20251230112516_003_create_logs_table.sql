/*
  # Create Logs Table

  1. New Tables
    - `logs`
      - `id` (uuid, primary key)
      - `level` (text: 'info', 'warning', 'error')
      - `message` (text)
      - `context` (jsonb: additional context data)
      - `user_id` (uuid, nullable, foreign key to auth.users)
      - `created_at` (timestamp with timezone, indexed for sorting)
  
  2. Security
    - Enable RLS on `logs` table
    - Add policy for authenticated users to view logs
    - Add policy for system to create logs
  
  3. Indexes
    - Index on `created_at` for efficient log retrieval
    - Index on `level` for filtering
*/

CREATE TABLE IF NOT EXISTS logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  level text NOT NULL DEFAULT 'info' CHECK (level IN ('info', 'warning', 'error')),
  message text NOT NULL,
  context jsonb DEFAULT '{}'::jsonb,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_logs_created_at ON logs(created_at DESC);
CREATE INDEX idx_logs_level ON logs(level);

ALTER TABLE logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view logs"
  ON logs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System can insert logs"
  ON logs FOR INSERT
  WITH CHECK (true);
