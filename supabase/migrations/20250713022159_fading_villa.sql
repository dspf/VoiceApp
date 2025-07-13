/*
  # Complete Dashboard Schema

  1. New Tables
    - `translation_sessions` - Store translation session data
    - `transcripts` - Store transcript records
    - `usage_analytics` - Track user usage analytics
    - `billing_history` - Store billing and payment records
    - `support_tickets` - Store support ticket information
    - `user_settings` - Store user preferences and settings

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to access their own data

  3. Functions
    - Update user profile function
    - Calculate usage statistics
    - Generate session access keys
*/

-- Translation Sessions Table
CREATE TABLE IF NOT EXISTS translation_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  session_name text NOT NULL DEFAULT 'Untitled Session',
  source_language text NOT NULL DEFAULT 'en',
  target_language text NOT NULL DEFAULT 'es',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused')),
  access_key text UNIQUE NOT NULL DEFAULT upper(substring(gen_random_uuid()::text, 1, 8)),
  participants_count integer DEFAULT 1,
  duration_minutes integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE translation_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own sessions"
  ON translation_sessions
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Transcripts Table
CREATE TABLE IF NOT EXISTS transcripts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  session_id uuid REFERENCES translation_sessions(id) ON DELETE CASCADE,
  title text NOT NULL,
  source_language text NOT NULL,
  target_language text NOT NULL,
  source_text text NOT NULL,
  translated_text text NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 0,
  word_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE transcripts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own transcripts"
  ON transcripts
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Usage Analytics Table
CREATE TABLE IF NOT EXISTS usage_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  minutes_used integer DEFAULT 0,
  sessions_count integer DEFAULT 0,
  api_calls_count integer DEFAULT 0,
  languages_used text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, date)
);

ALTER TABLE usage_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own analytics"
  ON usage_analytics
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Billing History Table
CREATE TABLE IF NOT EXISTS billing_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount decimal(10,2) NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  description text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'refunded')),
  invoice_url text,
  payment_date timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE billing_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own billing history"
  ON billing_history
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Support Tickets Table
CREATE TABLE IF NOT EXISTS support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  ticket_number text UNIQUE NOT NULL DEFAULT '#' || LPAD((EXTRACT(EPOCH FROM now())::bigint % 100000)::text, 5, '0'),
  subject text NOT NULL,
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  message text NOT NULL,
  response text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  resolved_at timestamptz
);

ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own support tickets"
  ON support_tickets
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- User Settings Table
CREATE TABLE IF NOT EXISTS user_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  default_source_language text DEFAULT 'en',
  default_target_language text DEFAULT 'es',
  audio_quality text DEFAULT 'high' CHECK (audio_quality IN ('low', 'medium', 'high')),
  enable_realtime_translation boolean DEFAULT true,
  auto_save_transcripts boolean DEFAULT true,
  email_notifications boolean DEFAULT true,
  sms_notifications boolean DEFAULT false,
  session_completion_alerts boolean DEFAULT true,
  usage_limit_warnings boolean DEFAULT true,
  api_key text UNIQUE DEFAULT 'vt_sk_live_' || encode(gen_random_bytes(32), 'hex'),
  webhook_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own settings"
  ON user_settings
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Update user_profiles table with additional fields
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'plan_type'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN plan_type text DEFAULT 'professional';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'billing_status'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN billing_status text DEFAULT 'active';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'available_credits'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN available_credits integer DEFAULT 2450;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'monthly_limit_minutes'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN monthly_limit_minutes integer DEFAULT 5000;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'profile_picture_url'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN profile_picture_url text;
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_translation_sessions_user_id ON translation_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_translation_sessions_status ON translation_sessions(status);
CREATE INDEX IF NOT EXISTS idx_transcripts_user_id ON transcripts(user_id);
CREATE INDEX IF NOT EXISTS idx_transcripts_session_id ON transcripts(session_id);
CREATE INDEX IF NOT EXISTS idx_usage_analytics_user_date ON usage_analytics(user_id, date);
CREATE INDEX IF NOT EXISTS idx_billing_history_user_id ON billing_history(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);

-- Insert sample data for demonstration
INSERT INTO translation_sessions (user_id, session_name, source_language, target_language, status, participants_count, duration_minutes, created_at)
SELECT 
  id,
  'Team Meeting #1247',
  'en',
  'es',
  'completed',
  5,
  45,
  now() - interval '2 hours'
FROM auth.users
WHERE email LIKE '%@%'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO transcripts (user_id, title, source_language, target_language, source_text, translated_text, duration_minutes, word_count)
SELECT 
  id,
  'Q4 Planning Meeting',
  'en',
  'es',
  'Hello everyone, let''s discuss our Q4 planning and objectives for the upcoming quarter.',
  'Hola a todos, discutamos nuestra planificación del Q4 y los objetivos para el próximo trimestre.',
  45,
  156
FROM auth.users
WHERE email LIKE '%@%'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO usage_analytics (user_id, date, minutes_used, sessions_count, api_calls_count, languages_used)
SELECT 
  id,
  CURRENT_DATE,
  2847,
  48,
  12450,
  ARRAY['en', 'es', 'fr', 'de']
FROM auth.users
WHERE email LIKE '%@%'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO billing_history (user_id, amount, currency, description, status, payment_date)
SELECT 
  id,
  1000.00,
  'ZAR',
  'Professional Plan - Monthly',
  'paid',
  date_trunc('month', CURRENT_DATE)
FROM auth.users
WHERE email LIKE '%@%'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO user_settings (user_id)
SELECT id
FROM auth.users
WHERE email LIKE '%@%'
AND NOT EXISTS (
  SELECT 1 FROM user_settings WHERE user_id = auth.users.id
)
LIMIT 1;