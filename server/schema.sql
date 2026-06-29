CREATE TABLE IF NOT EXISTS users (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, xp INTEGER DEFAULT 0, coins INTEGER DEFAULT 0, created_at TIMESTAMPTZ DEFAULT now());
CREATE TABLE IF NOT EXISTS daily_entries (id BIGSERIAL PRIMARY KEY, user_id UUID REFERENCES users(id) ON DELETE CASCADE, entry_date DATE NOT NULL, weight NUMERIC, calories INTEGER, protein INTEGER, water NUMERIC, sleep NUMERIC, steps INTEGER, mood INTEGER, energy INTEGER, stress INTEGER, workout_minutes INTEGER, notes TEXT, habits JSONB DEFAULT '{}', finance JSONB DEFAULT '{}', UNIQUE(user_id,entry_date));
CREATE TABLE IF NOT EXISTS notifications (id BIGSERIAL PRIMARY KEY, user_id UUID REFERENCES users(id) ON DELETE CASCADE, title TEXT NOT NULL, message TEXT NOT NULL, type TEXT DEFAULT 'info', is_read BOOLEAN DEFAULT false, created_at TIMESTAMPTZ DEFAULT now());
CREATE TABLE IF NOT EXISTS push_subscriptions (id BIGSERIAL PRIMARY KEY, user_id UUID REFERENCES users(id) ON DELETE CASCADE, subscription JSONB NOT NULL, created_at TIMESTAMPTZ DEFAULT now());
CREATE TABLE IF NOT EXISTS custom_goals (id BIGSERIAL PRIMARY KEY, user_id UUID REFERENCES users(id) ON DELETE CASCADE, title TEXT NOT NULL, difficulty TEXT DEFAULT 'medium', progress INTEGER DEFAULT 0, target INTEGER DEFAULT 1, xp_reward INTEGER DEFAULT 20, due_date DATE, completed BOOLEAN DEFAULT false);
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  profile JSONB NOT NULL DEFAULT '{}',
  targets JSONB NOT NULL DEFAULT '{"calories":2200,"protein":140,"water":2.5,"steps":10000}',
  settings JSONB NOT NULL DEFAULT '{"notifications":true,"weekly":true,"penalties":false,"dark":true}',
  custom_goals JSONB NOT NULL DEFAULT '[]',
  onboarding_complete BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS food_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  food_name TEXT NOT NULL,
  calories INTEGER NOT NULL CHECK (calories >= 0),
  protein NUMERIC NOT NULL CHECK (protein >= 0),
  created_at TIMESTAMPTZ DEFAULT now()
);
