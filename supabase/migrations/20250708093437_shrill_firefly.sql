/*
  # GameHub Database Schema

  1. New Tables
    - `profiles`
      - `id` (uuid, primary key, references auth.users)
      - `email` (text, unique, not null)
      - `username` (text, unique, not null)
      - `is_admin` (boolean, default false)
      - `avatar_url` (text, nullable)
      - `created_at` (timestamp, default now())
      
    - `games`
      - `id` (uuid, primary key, default gen_random_uuid())
      - `title` (text, not null)
      - `description` (text, not null)
      - `category` (text, not null)
      - `file_url` (text, not null)
      - `image_url` (text, nullable)
      - `screenshots` (text array, nullable)
      - `download_count` (integer, default 0)
      - `rating` (numeric, default 0)
      - `created_by` (uuid, references profiles.id)
      - `created_at` (timestamp, default now())
      
    - `comments`
      - `id` (uuid, primary key, default gen_random_uuid())
      - `game_id` (uuid, references games.id)
      - `user_id` (uuid, references profiles.id)
      - `content` (text, not null)
      - `rating` (integer, not null, check between 1-5)
      - `created_at` (timestamp, default now())

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
    - Public read access for games
    - User-specific access for profiles and comments
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  username text UNIQUE NOT NULL,
  is_admin boolean DEFAULT false,
  avatar_url text,
  created_at timestamptz DEFAULT now()
);

-- Create games table
CREATE TABLE IF NOT EXISTS games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  category text NOT NULL,
  file_url text NOT NULL,
  image_url text,
  screenshots text[],
  download_count integer DEFAULT 0,
  rating numeric DEFAULT 0,
  created_by uuid REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- Create comments table
CREATE TABLE IF NOT EXISTS comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid REFERENCES games(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can read all profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Games policies
CREATE POLICY "Anyone can read games"
  ON games
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert games"
  ON games
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own games"
  ON games
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Users can delete own games"
  ON games
  FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

-- Comments policies
CREATE POLICY "Anyone can read comments"
  ON comments
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert comments"
  ON comments
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own comments"
  ON comments
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments"
  ON comments
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('games', 'games', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('images', 'images', true);

-- Storage policies
CREATE POLICY "Anyone can read game files"
  ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'games');

CREATE POLICY "Authenticated users can upload game files"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'games');

CREATE POLICY "Anyone can read image files"
  ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'images');

CREATE POLICY "Authenticated users can upload image files"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'images');

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_games_category ON games(category);
CREATE INDEX IF NOT EXISTS idx_games_created_at ON games(created_at);
CREATE INDEX IF NOT EXISTS idx_games_rating ON games(rating);
CREATE INDEX IF NOT EXISTS idx_games_download_count ON games(download_count);
CREATE INDEX IF NOT EXISTS idx_comments_game_id ON comments(game_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);