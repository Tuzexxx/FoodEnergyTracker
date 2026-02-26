-- Create profiles table
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  height NUMERIC,
  weight NUMERIC,
  age INTEGER,
  gender TEXT,
  goal TEXT,
  target_kcal NUMERIC,
  target_protein NUMERIC,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create food entries table
CREATE TABLE public.food_entries (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  kcal NUMERIC NOT NULL,
  protein NUMERIC NOT NULL,
  carbs NUMERIC NOT NULL,
  fat NUMERIC NOT NULL,
  timestamp BIGINT NOT NULL,
  requires_review BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Set up Row Level Security (RLS) to ensure users can only see their own data
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_entries ENABLE ROW LEVEL SECURITY;

-- Policies for profiles
CREATE POLICY "Users can view own profile." ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile." ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile." ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Policies for food entries
CREATE POLICY "Users can view own entries." ON food_entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own entries." ON food_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own entries." ON food_entries FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own entries." ON food_entries FOR DELETE USING (auth.uid() = user_id);
