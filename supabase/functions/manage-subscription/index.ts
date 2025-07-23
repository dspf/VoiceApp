import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Stripe from 'npm:stripe@14.21.0'
import { createClient } from 'npm:@supabase/supabase-js@2.50.5'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { action, subscription_id, new_price_id } = await req.json()

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    })

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get user from JWT token
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      throw new Error('Invalid user token')
    }

    let result

    switch (action) {
      case 'cancel':
        // Cancel subscription at period end
        result = await stripe.subscriptions.update(subscription_id, {
          cancel_at_period_end: true
        })
        break

      case 'reactivate':
        // Reactivate subscription
        result = await stripe.subscriptions.update(subscription_id, {
          cancel_at_period_end: false
        })
        break

      case 'change_plan':
        // Change subscription plan
        if (!new_price_id) {
          throw new Error('New price ID is required for plan change')
        }
        
        const subscription = await stripe.subscriptions.retrieve(subscription_id)
        result = await stripe.subscriptions.update(subscription_id, {
          items: [{
            id: subscription.items.data[0].id,
            price: new_price_id,
          }],
          proration_behavior: 'create_prorations',
        })
        break

      case 'create_portal_session':
        // Create customer portal session
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('stripe_customer_id')
          .eq('id', user.id)
          .single()

        if (!profile?.stripe_customer_id) {
          throw new Error('No Stripe customer found')
        }

        const portalSession = await stripe.billingPortal.sessions.create({
          customer: profile.stripe_customer_id,
          return_url: `${req.headers.get('origin')}/Dashboard.html?page=billing`,
        })

        return new Response(
          JSON.stringify({ portal_url: portalSession.url }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      default:
        throw new Error('Invalid action')
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        subscription: result
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error managing subscription:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})