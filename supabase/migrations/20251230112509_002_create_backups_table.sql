/*
  # Create Backups Table

  1. New Tables
    - `backups`
      - `id` (uuid, primary key)
      - `backup_name` (text)
      - `file_path` (text: path or S3 URL)
      - `file_size` (bigint: size in bytes)
      - `backup_type` (text: 'manual', 'automated')
      - `status` (text: 'pending', 'completed', 'failed')
      - `created_at` (timestamp)
      - `created_by` (uuid, foreign key to auth.users)
  
  2. Security
    - Enable RLS on `backups` table
    - Add policy for authenticated users to view backups
    - Add policy for authenticated users to create backups
*/

CREATE TABLE IF NOT EXISTS backups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  backup_name text NOT NULL,
  file_path text,
  file_size bigint DEFAULT 0,
  backup_type text NOT NULL DEFAULT 'manual' CHECK (backup_type IN ('manual', 'automated')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  created_at timestamptz DEFAULT now(),
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

ALTER TABLE backups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view backups"
  ON backups FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create backups"
  ON backups FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Authenticated users can update backups"
  ON backups FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);
