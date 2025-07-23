import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Stripe from 'npm:stripe@14.21.0'
import { createClient } from 'npm:@supabase/supabase-js@2.50.5'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    })

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const signature = req.headers.get('stripe-signature')
    const body = await req.text()
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')

    if (!signature || !webhookSecret) {
      throw new Error('Missing stripe signature or webhook secret')
    }

    // Verify webhook signature
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret)

    // Check if event already processed
    const { data: existingEvent } = await supabase
      .from('stripe_events')
      .select('id')
      .eq('stripe_event_id', event.id)
      .single()

    if (existingEvent) {
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Store event
    await supabase
      .from('stripe_events')
      .insert({
        stripe_event_id: event.id,
        event_type: event.type,
        data: event.data,
        processed: false
      })

    // Process webhook event
    switch (event.type) {
      case 'customer.created':
        await handleCustomerCreated(supabase, event.data.object as Stripe.Customer)
        break

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(supabase, event.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(supabase, event.data.object as Stripe.Subscription)
        break

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(supabase, event.data.object as Stripe.Invoice)
        break

      case 'invoice.payment_failed':
        await handlePaymentFailed(supabase, event.data.object as Stripe.Invoice)
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    // Mark event as processed
    await supabase
      .from('stripe_events')
      .update({ processed: true })
      .eq('stripe_event_id', event.id)

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Webhook error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})

async function handleCustomerCreated(supabase: any, customer: Stripe.Customer) {
  const email = customer.email
  if (!email) return

  // Find user by email and update with Stripe customer ID
  const { error } = await supabase
    .from('user_profiles')
    .update({ stripe_customer_id: customer.id })
    .eq('id', (await supabase.auth.admin.getUserByEmail(email)).data.user?.id)

  if (error) {
    console.error('Error updating customer:', error)
  }
}

async function handleSubscriptionUpdated(supabase: any, subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string
  
  // Get user by Stripe customer ID
  const { data: userProfile } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single()

  if (!userProfile) return

  // Get plan details
  const priceId = subscription.items.data[0]?.price.id
  const { data: plan } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('stripe_price_id', priceId)
    .single()

  // Update or create subscription
  const subscriptionData = {
    user_id: userProfile.id,
    stripe_subscription_id: subscription.id,
    stripe_customer_id: customerId,
    plan_id: plan?.id,
    status: subscription.status,
    current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
    current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    cancel_at_period_end: subscription.cancel_at_period_end,
    canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
    trial_start: subscription.trial_start ? new Date(subscription.trial_start * 1000).toISOString() : null,
    trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
    updated_at: new Date().toISOString()
  }

  await supabase
    .from('user_subscriptions')
    .upsert(subscriptionData, { onConflict: 'stripe_subscription_id' })

  // Update user profile
  await supabase
    .from('user_profiles')
    .update({
      plan_type: plan?.name?.toLowerCase() || 'basic',
      subscription_status: subscription.status,
      current_period_end: subscriptionData.current_period_end,
      monthly_limit_minutes: plan?.monthly_minutes || 1000
    })
    .eq('id', userProfile.id)
}

async function handleSubscriptionDeleted(supabase: any, subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string
  
  // Update user profile to inactive
  await supabase
    .from('user_profiles')
    .update({
      subscription_status: 'canceled',
      plan_type: 'free'
    })
    .eq('stripe_customer_id', customerId)

  // Update subscription record
  await supabase
    .from('user_subscriptions')
    .update({
      status: 'canceled',
      canceled_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('stripe_subscription_id', subscription.id)
}

async function handlePaymentSucceeded(supabase: any, invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string
  
  // Get user by Stripe customer ID
  const { data: userProfile } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single()

  if (!userProfile) return

  // Create billing history record
  await supabase
    .from('billing_history')
    .insert({
      user_id: userProfile.id,
      amount: (invoice.amount_paid || 0) / 100, // Convert from cents
      currency: invoice.currency?.toUpperCase() || 'USD',
      description: invoice.description || 'Subscription payment',
      status: 'paid',
      stripe_invoice_id: invoice.id,
      stripe_payment_intent_id: invoice.payment_intent as string,
      invoice_url: invoice.hosted_invoice_url,
      payment_date: new Date().toISOString()
    })
}

async function handlePaymentFailed(supabase: any, invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string
  
  // Get user by Stripe customer ID
  const { data: userProfile } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single()

  if (!userProfile) return

  // Create billing history record
  await supabase
    .from('billing_history')
    .insert({
      user_id: userProfile.id,
      amount: (invoice.amount_due || 0) / 100, // Convert from cents
      currency: invoice.currency?.toUpperCase() || 'USD',
      description: invoice.description || 'Failed subscription payment',
      status: 'failed',
      stripe_invoice_id: invoice.id,
      payment_date: new Date().toISOString()
    })
}