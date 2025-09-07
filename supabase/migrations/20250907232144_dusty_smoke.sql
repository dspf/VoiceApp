/*
  # Create subscription tables

  1. New Tables
    - `subscription_plans`
      - `id` (uuid, primary key)
      - `name` (text) - Plan name like 'Basic', 'Pro', etc.
      - `amount` (numeric) - Monthly price
      - `description` (text) - Plan description
      - `monthly_minutes` (integer) - Translation minutes allowed
      - `monthly_api_calls` (integer) - API calls allowed
      - `features` (text[]) - Array of feature descriptions
      - `stripe_price_id` (text) - Stripe price ID for billing
      - `is_active` (boolean) - Whether plan is available
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `user_subscriptions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `stripe_subscription_id` (text) - Stripe subscription ID
      - `stripe_customer_id` (text) - Stripe customer ID
      - `plan_id` (uuid, foreign key to subscription_plans)
      - `status` (text) - Subscription status
      - `current_period_start` (timestamp)
      - `current_period_end` (timestamp)
      - `cancel_at_period_end` (boolean)
      - `canceled_at` (timestamp, nullable)
      - `trial_start` (timestamp, nullable)
      - `trial_end` (timestamp, nullable)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for public access to subscription_plans
    - Add policies for users to access their own subscriptions

  3. Sample Data
    - Insert default subscription plans
*/

-- Create subscription_plans table
CREATE TABLE IF NOT EXISTS subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  amount numeric(10,2) NOT NULL,
  description text,
  monthly_minutes integer NOT NULL DEFAULT 0,
  monthly_api_calls integer,
  features text[] DEFAULT '{}',
  stripe_price_id text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create user_subscriptions table
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_subscription_id text,
  stripe_customer_id text,
  plan_id uuid REFERENCES subscription_plans(id),
  status text NOT NULL DEFAULT 'active',
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean DEFAULT false,
  canceled_at timestamptz,
  trial_start timestamptz,
  trial_end timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT user_subscriptions_status_check CHECK (status IN ('active', 'canceled', 'trialing', 'past_due', 'unpaid', 'incomplete'))
);

-- Enable RLS
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Create policies for subscription_plans (public read access)
CREATE POLICY "Anyone can read subscription plans"
  ON subscription_plans
  FOR SELECT
  TO public
  USING (is_active = true);

-- Create policies for user_subscriptions (users can only see their own)
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_stripe_subscription_id ON user_subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_active ON subscription_plans(is_active);

-- Insert sample subscription plans
INSERT INTO subscription_plans (name, amount, description, monthly_minutes, monthly_api_calls, features, stripe_price_id, is_active) VALUES
  ('Free', 0.00, 'Perfect for trying out our service', 1000, 10000, ARRAY['1,000 translation minutes', '10,000 API calls', 'Basic support'], null, true),
  ('Basic', 19.99, 'Great for individuals and small teams', 5000, 50000, ARRAY['5,000 translation minutes', '50,000 API calls', 'Email support', 'Real-time translation'], 'price_basic_monthly', true),
  ('Professional', 49.99, 'Perfect for growing businesses', 15000, 150000, ARRAY['15,000 translation minutes', '150,000 API calls', 'Priority support', 'Advanced analytics', 'Custom integrations'], 'price_pro_monthly', true),
  ('Enterprise', 99.99, 'For large organizations with high volume needs', 50000, 500000, ARRAY['50,000 translation minutes', '500,000 API calls', '24/7 phone support', 'Custom features', 'Dedicated account manager', 'SLA guarantee'], 'price_enterprise_monthly', true)
ON CONFLICT DO NOTHING;

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_subscription_plans_updated_at') THEN
        CREATE TRIGGER update_subscription_plans_updated_at
            BEFORE UPDATE ON subscription_plans
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_user_subscriptions_updated_at') THEN
        CREATE TRIGGER update_user_subscriptions_updated_at
            BEFORE UPDATE ON user_subscriptions
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;