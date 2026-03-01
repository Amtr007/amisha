/*
  # Create Users Table for WhatsApp-style Messaging App

  1. New Tables
    - `users` - Public user profile data linked to auth.users
      - `id` (uuid, primary key, references auth.users)
      - `username` (text, unique, indexed) - Unique username for login
      - `email` (text, unique) - User's email address
      - `display_name` (text) - User's display name
      - `profile_photo_url` (text) - URL to profile photo
      - `status_message` (text) - User's status message
      - `last_seen` (timestamptz) - Last activity timestamp
      - `created_at` (timestamptz) - Account creation timestamp

  2. Security
    - Enable RLS on `users` table
    - Policies:
      - Authenticated users can read all user profiles (for search/contacts)
      - Users can only update their own profile
      - Users can only insert their own profile (during signup)
      - Users can only delete their own profile

  3. Indexes
    - Unique index on username for fast lookups
    - Unique index on email for fast lookups
    - Index on last_seen for online status queries

  4. Functions
    - Function to check username availability
    - Trigger to update last_seen on activity
*/

-- Create the users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  email text UNIQUE NOT NULL,
  display_name text,
  profile_photo_url text,
  status_message text DEFAULT 'Hey there! I am using WhatsApp',
  last_seen timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_last_seen ON users(last_seen);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can read all profiles (needed for contacts/search)
CREATE POLICY "Authenticated users can read all profiles"
  ON users
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Users can insert their own profile during signup
CREATE POLICY "Users can insert their own profile"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Policy: Users can update only their own profile
CREATE POLICY "Users can update their own profile"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Policy: Users can delete only their own profile
CREATE POLICY "Users can delete their own profile"
  ON users
  FOR DELETE
  TO authenticated
  USING (auth.uid() = id);

-- Function to check username availability (callable by anyone)
CREATE OR REPLACE FUNCTION check_username_available(username_to_check text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM users WHERE LOWER(username) = LOWER(username_to_check)
  );
END;
$$;

-- Function to get user by username (for login with username)
CREATE OR REPLACE FUNCTION get_user_email_by_username(username_input text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_email text;
BEGIN
  SELECT email INTO user_email 
  FROM users 
  WHERE LOWER(username) = LOWER(username_input);
  
  RETURN user_email;
END;
$$;

-- Function to update last_seen timestamp
CREATE OR REPLACE FUNCTION update_last_seen()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE users 
  SET last_seen = now() 
  WHERE id = auth.uid();
END;
$$;