/*
  # Add Stripe Billing Schema

  1. New Tables
    - `stripe_customers` - Links users to Stripe customer IDs
    - `subscription_plans` - Available subscription plans
    - `user_subscriptions` - User subscription status
    - `stripe_events` - Webhook event tracking

  2. Enhanced Tables
    - `user_profiles` - Add Stripe customer ID and subscription fields
    - `billing_history` - Add Stripe invoice and payment IDs

  3. Security
    - Enable RLS on all new tables
    - Add policies for user data access
*/

-- Add Stripe fields to user_profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'stripe_customer_id'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN stripe_customer_id text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'subscription_status'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN subscription_status text DEFAULT 'inactive';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'current_period_end'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN current_period_end timestamptz;
  END IF;
END $$;

-- Create subscription_plans table
CREATE TABLE IF NOT EXISTS subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  stripe_price_id text UNIQUE NOT NULL,
  stripe_product_id text NOT NULL,
  amount numeric(10,2) NOT NULL,
  currency text DEFAULT 'USD',
  interval_type text DEFAULT 'month',
  monthly_minutes integer NOT NULL,
  features jsonb DEFAULT '[]',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Subscription plans are viewable by everyone"
  ON subscription_plans
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Create user_subscriptions table
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stripe_subscription_id text UNIQUE NOT NULL,
  stripe_customer_id text NOT NULL,
  plan_id uuid REFERENCES subscription_plans(id),
  status text NOT NULL,
  current_period_start timestamptz NOT NULL,
  current_period_end timestamptz NOT NULL,
  cancel_at_period_end boolean DEFAULT false,
  canceled_at timestamptz,
  trial_start timestamptz,
  trial_end timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscriptions"
  ON user_subscriptions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own subscriptions"
  ON user_subscriptions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create stripe_events table for webhook tracking
CREATE TABLE IF NOT EXISTS stripe_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id text UNIQUE NOT NULL,
  event_type text NOT NULL,
  processed boolean DEFAULT false,
  data jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE stripe_events ENABLE ROW LEVEL SECURITY;

-- Add Stripe fields to billing_history
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'billing_history' AND column_name = 'stripe_invoice_id'
  ) THEN
    ALTER TABLE billing_history ADD COLUMN stripe_invoice_id text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'billing_history' AND column_name = 'stripe_payment_intent_id'
  ) THEN
    ALTER TABLE billing_history ADD COLUMN stripe_payment_intent_id text;
  END IF;
END $$;

-- Insert default subscription plans
INSERT INTO subscription_plans (name, stripe_price_id, stripe_product_id, amount, monthly_minutes, features) VALUES
  ('Basic', 'price_basic_monthly', 'prod_basic', 19.00, 1000, '["Real-time Translation", "Basic Transcription", "Email Support"]'),
  ('Professional', 'price_pro_monthly', 'prod_professional', 49.00, 5000, '["Real-time Translation", "Advanced Transcription", "Priority Support", "API Access", "Export Options"]'),
  ('Enterprise', 'price_enterprise_monthly', 'prod_enterprise', 99.00, 50000, '["Unlimited Translation", "Premium Transcription", "24/7 Support", "Full API Access", "Custom Integrations", "Analytics Dashboard"]')
ON CONFLICT (stripe_price_id) DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_stripe_id ON user_subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_stripe_events_event_id ON stripe_events(stripe_event_id);
CREATE INDEX IF NOT EXISTS idx_stripe_events_processed ON stripe_events(processed);
CREATE INDEX IF NOT EXISTS idx_user_profiles_stripe_customer ON user_profiles(stripe_customer_id);