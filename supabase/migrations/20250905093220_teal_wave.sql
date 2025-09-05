/*
  # Create subscription tables

  1. New Tables
    - `subscription_plans`
      - `id` (uuid, primary key)
      - `name` (text, plan name like "Basic", "Pro", "Enterprise")
      - `description` (text, plan description)
      - `stripe_price_id` (text, Stripe price ID)
      - `amount` (numeric, price in dollars)
      - `currency` (text, currency code)
      - `interval` (text, billing interval like "month", "year")
      - `monthly_minutes` (integer, minutes allowed per month)
      - `features` (jsonb, plan features)
      - `is_active` (boolean, whether plan is available)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `user_subscriptions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users)
      - `plan_id` (uuid, foreign key to subscription_plans)
      - `stripe_subscription_id` (text, Stripe subscription ID)
      - `stripe_customer_id` (text, Stripe customer ID)
      - `status` (text, subscription status)
      - `current_period_start` (timestamp)
      - `current_period_end` (timestamp)
      - `cancel_at_period_end` (boolean)
      - `canceled_at` (timestamp)
      - `trial_start` (timestamp)
      - `trial_end` (timestamp)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - `stripe_events`
      - `id` (uuid, primary key)
      - `stripe_event_id` (text, unique Stripe event ID)
      - `event_type` (text, type of Stripe event)
      - `data` (jsonb, event data)
      - `processed` (boolean, whether event was processed)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to read subscription plans
    - Add policies for users to manage their own subscriptions
    - Add policies for service role to manage stripe events

  3. Sample Data
    - Insert basic subscription plans (Free, Basic, Pro)
*/

-- Create subscription_plans table
CREATE TABLE IF NOT EXISTS subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  stripe_price_id text UNIQUE,
  amount numeric(10,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  interval text NOT NULL DEFAULT 'month',
  monthly_minutes integer NOT NULL DEFAULT 1000,
  features jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create user_subscriptions table
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id uuid REFERENCES subscription_plans(id),
  stripe_subscription_id text UNIQUE,
  stripe_customer_id text,
  status text NOT NULL DEFAULT 'inactive',
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean DEFAULT false,
  canceled_at timestamptz,
  trial_start timestamptz,
  trial_end timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create stripe_events table for webhook processing
CREATE TABLE IF NOT EXISTS stripe_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id text UNIQUE NOT NULL,
  event_type text NOT NULL,
  data jsonb NOT NULL,
  processed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Add missing stripe_customer_id column to user_profiles if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'stripe_customer_id'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN stripe_customer_id text UNIQUE;
  END IF;
END $$;

-- Add missing subscription_status column to user_profiles if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'subscription_status'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN subscription_status text DEFAULT 'inactive';
  END IF;
END $$;

-- Add missing current_period_end column to user_profiles if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'current_period_end'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN current_period_end timestamptz;
  END IF;
END $$;

-- Enable RLS
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for subscription_plans
CREATE POLICY "Anyone can read active subscription plans"
  ON subscription_plans
  FOR SELECT
  TO authenticated, anon
  USING (is_active = true);

-- RLS Policies for user_subscriptions
CREATE POLICY "Users can read own subscriptions"
  ON user_subscriptions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscriptions"
  ON user_subscriptions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscriptions"
  ON user_subscriptions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Service role policies for stripe_events (webhooks)
CREATE POLICY "Service role can manage stripe events"
  ON stripe_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Add constraints
ALTER TABLE user_subscriptions 
ADD CONSTRAINT user_subscriptions_status_check 
CHECK (status IN ('active', 'inactive', 'canceled', 'trialing', 'past_due', 'unpaid'));

ALTER TABLE subscription_plans 
ADD CONSTRAINT subscription_plans_interval_check 
CHECK (interval IN ('month', 'year', 'week', 'day'));

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_stripe_subscription_id ON user_subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_active ON subscription_plans(is_active);
CREATE INDEX IF NOT EXISTS idx_stripe_events_processed ON stripe_events(processed);
CREATE INDEX IF NOT EXISTS idx_stripe_events_event_id ON stripe_events(stripe_event_id);

-- Insert sample subscription plans
INSERT INTO subscription_plans (name, description, amount, monthly_minutes, features, is_active) VALUES
  ('Free', 'Basic plan with limited features', 0, 1000, '["1000 minutes/month", "Basic support", "Standard quality"]'::jsonb, true),
  ('Basic', 'Perfect for individuals', 9.99, 5000, '["5000 minutes/month", "Email support", "High quality", "Export transcripts"]'::jsonb, true),
  ('Pro', 'Best for professionals', 29.99, 15000, '["15000 minutes/month", "Priority support", "Premium quality", "API access", "Custom integrations"]'::jsonb, true),
  ('Enterprise', 'For large organizations', 99.99, 50000, '["50000 minutes/month", "24/7 support", "Premium quality", "API access", "Custom integrations", "Dedicated account manager"]'::jsonb, true)
ON CONFLICT DO NOTHING;