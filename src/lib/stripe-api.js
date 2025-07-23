import { supabase } from './supabase.js'

// Stripe API helper functions
export const stripeAPI = {
  // Create Stripe customer
  async createCustomer() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        throw new Error('No active session')
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-stripe-customer`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      })

      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to create customer')
      }

      return { data: result, error: null }
    } catch (error) {
      return { data: null, error }
    }
  },

  // Create checkout session for subscription
  async createCheckoutSession(priceId, successUrl, cancelUrl) {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        throw new Error('No active session')
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          price_id: priceId,
          success_url: successUrl,
          cancel_url: cancelUrl
        })
      })

      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to create checkout session')
      }

      return { data: result, error: null }
    } catch (error) {
      return { data: null, error }
    }
  },

  // Manage subscription (cancel, reactivate, change plan)
  async manageSubscription(action, subscriptionId, newPriceId = null) {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        throw new Error('No active session')
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-subscription`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          subscription_id: subscriptionId,
          new_price_id: newPriceId
        })
      })

      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to manage subscription')
      }

      return { data: result, error: null }
    } catch (error) {
      return { data: null, error }
    }
  },

  // Create customer portal session
  async createPortalSession() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        throw new Error('No active session')
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-subscription`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'create_portal_session'
        })
      })

      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to create portal session')
      }

      return { data: result, error: null }
    } catch (error) {
      return { data: null, error }
    }
  },

  // Get subscription plans
  async getSubscriptionPlans() {
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('amount', { ascending: true })

      if (error) throw error

      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    }
  },

  // Get user subscription
  async getUserSubscription(userId) {
    try {
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select(`
          *,
          subscription_plans (*)
        `)
        .eq('user_id', userId)
        .eq('status', 'active')
        .single()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      return { data: data || null, error: null }
    } catch (error) {
      return { data: null, error }
    }
  },

  // Check if user has active subscription
  async hasActiveSubscription(userId) {
    try {
      const { data } = await this.getUserSubscription(userId)
      return data && ['active', 'trialing'].includes(data.status)
    } catch (error) {
      return false
    }
  },

  // Get usage limits for user
  async getUsageLimits(userId) {
    try {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('monthly_limit_minutes, plan_type')
        .eq('id', userId)
        .single()

      if (!profile) {
        return { monthlyMinutes: 1000, planType: 'free' }
      }

      return {
        monthlyMinutes: profile.monthly_limit_minutes || 1000,
        planType: profile.plan_type || 'free'
      }
    } catch (error) {
      return { monthlyMinutes: 1000, planType: 'free' }
    }
  }
}