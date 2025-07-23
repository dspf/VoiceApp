/*
  # Add Default Subscription Plans

  1. New Data
    - Insert default subscription plans with Stripe price IDs
    - Basic, Professional, and Enterprise tiers
    - Includes monthly minutes, API calls, and features

  2. Plan Details
    - Basic: $19/month - 1000 minutes
    - Professional: $49/month - 5000 minutes  
    - Enterprise: $99/month - 50000 minutes
*/

-- Insert default subscription plans
INSERT INTO subscription_plans (
  name,
  description,
  amount,
  currency,
  interval_type,
  monthly_minutes,
  monthly_api_calls,
  features,
  stripe_price_id,
  is_active
) VALUES 
(
  'Basic',
  'Perfect for individuals and small teams getting started with voice translation',
  19.00,
  'USD',
  'month',
  1000,
  10000,
  ARRAY['Real-time translation', 'Basic transcription', 'Email support', '5 languages'],
  'price_basic_monthly_test',
  true
),
(
  'Professional',
  'Ideal for growing businesses and teams with regular translation needs',
  49.00,
  'USD',
  'month',
  5000,
  50000,
  ARRAY['Real-time translation', 'Advanced transcription', 'Priority support', '25+ languages', 'Team collaboration', 'Export options'],
  'price_professional_monthly_test',
  true
),
(
  'Enterprise',
  'For large organizations with high-volume translation requirements',
  99.00,
  'USD',
  'month',
  50000,
  500000,
  ARRAY['Unlimited translation', 'Premium transcription', '24/7 support', '100+ languages', 'Advanced analytics', 'Custom integrations', 'API access', 'White-label options'],
  'price_enterprise_monthly_test',
  true
);