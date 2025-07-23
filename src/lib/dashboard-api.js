import { supabase } from './supabase.js'
import { stripeAPI } from './stripe-api.js'

// Dashboard API functions for all sidebar navigation features

export const dashboardAPI = {
  // Translation Sessions
  async getSessions(userId) {
    try {
      const { data, error } = await supabase
        .from('translation_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    }
  },

  async createSession(userId, sessionData) {
    try {
      const { data, error } = await supabase
        .from('translation_sessions')
        .insert({
          user_id: userId,
          session_name: sessionData.name || 'New Session',
          source_language: sessionData.sourceLanguage || 'en',
          target_language: sessionData.targetLanguage || 'es'
        })
        .select()
        .single()
      
      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    }
  },

  async updateSession(sessionId, updates) {
    try {
      const { data, error } = await supabase
        .from('translation_sessions')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId)
        .select()
        .single()
      
      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    }
  },

  // Transcripts
  async getTranscripts(userId) {
    try {
      const { data, error } = await supabase
        .from('transcripts')
        .select(`
          *,
          translation_sessions(session_name)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    }
  },

  async saveTranscript(userId, transcriptData) {
    try {
      const { data, error } = await supabase
        .from('transcripts')
        .insert({
          user_id: userId,
          session_id: transcriptData.sessionId,
          title: transcriptData.title,
          source_language: transcriptData.sourceLanguage,
          target_language: transcriptData.targetLanguage,
          source_text: transcriptData.sourceText,
          translated_text: transcriptData.translatedText,
          duration_minutes: transcriptData.duration || 0,
          word_count: transcriptData.sourceText?.split(' ').length || 0
        })
        .select()
        .single()
      
      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    }
  },

  // Analytics
  async getAnalytics(userId) {
    try {
      const { data, error } = await supabase
        .from('usage_analytics')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .limit(30)
      
      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    }
  },

  async updateUsage(userId, usageData) {
    try {
      const today = new Date().toISOString().split('T')[0]
      
      const { data, error } = await supabase
        .from('usage_analytics')
        .upsert({
          user_id: userId,
          date: today,
          minutes_used: usageData.minutes || 0,
          sessions_count: usageData.sessions || 0,
          api_calls_count: usageData.apiCalls || 0,
          languages_used: usageData.languages || [],
          updated_at: new Date().toISOString()
        })
        .select()
        .single()
      
      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    }
  },

  // Billing
  async getBillingHistory(userId) {
    try {
      const { data, error } = await supabase
        .from('billing_history')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    }
  },

  // Get subscription plans
  async getSubscriptionPlans() {
    return await stripeAPI.getSubscriptionPlans()
  },

  // Get user subscription
  async getUserSubscription(userId) {
    return await stripeAPI.getUserSubscription(userId)
  },

  // Create checkout session
  async createCheckoutSession(priceId) {
    return await stripeAPI.createCheckoutSession(priceId)
  },

  // Manage subscription
  async manageSubscription(action, subscriptionId, newPriceId = null) {
    return await stripeAPI.manageSubscription(action, subscriptionId, newPriceId)
  },

  // Create customer portal session
  async createPortalSession() {
    return await stripeAPI.createPortalSession()
  },

  async getCurrentUsage(userId) {
    try {
      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      startOfMonth.setHours(0, 0, 0, 0)
      
      const { data, error } = await supabase
        .from('usage_analytics')
        .select('minutes_used, api_calls_count')
        .eq('user_id', userId)
        .gte('date', startOfMonth.toISOString().split('T')[0])
      
      if (error) throw error
      
      const totalMinutes = data.reduce((sum, day) => sum + (day.minutes_used || 0), 0)
      const totalApiCalls = data.reduce((sum, day) => sum + (day.api_calls_count || 0), 0)
      
      // Get usage limits
      const limits = await stripeAPI.getUsageLimits(userId)
      
      return { 
        data: { 
          minutes_used: totalMinutes, 
          api_calls_count: totalApiCalls,
          monthly_limit: limits.monthlyMinutes,
          plan_type: limits.planType
        }, 
        error: null 
      }
    } catch (error) {
      return { data: null, error }
    }
  },

  // Support
  async getSupportTickets(userId) {
    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    }
  },

  async createSupportTicket(userId, ticketData) {
    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .insert({
          user_id: userId,
          subject: ticketData.subject,
          priority: ticketData.priority || 'medium',
          message: ticketData.message
        })
        .select()
        .single()
      
      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    }
  },

  // Settings
  async getUserSettings(userId) {
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', userId)
        .single()
      
      if (error && error.code === 'PGRST116') {
        // No settings found, create default
        return await this.createUserSettings(userId)
      }
      
      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    }
  },

  async createUserSettings(userId) {
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .insert({ user_id: userId })
        .select()
        .single()
      
      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    }
  },

  async updateUserSettings(userId, settings) {
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .update({
          ...settings,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .select()
        .single()
      
      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    }
  },

  async regenerateApiKey(userId) {
    try {
      const newApiKey = 'vt_sk_live_' + Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map(b => b.toString(16).padStart(2, '0')).join('')
      
      const { data, error } = await supabase
        .from('user_settings')
        .update({
          api_key: newApiKey,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .select('api_key')
        .single()
      
      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    }
  },

  // Dashboard Stats
  async getDashboardStats(userId) {
    try {
      // Get total sessions
      const { data: sessions, error: sessionsError } = await supabase
        .from('translation_sessions')
        .select('id, duration_minutes, created_at')
        .eq('user_id', userId)
      
      if (sessionsError) throw sessionsError
      
      // Get total transcripts
      const { data: transcripts, error: transcriptsError } = await supabase
        .from('transcripts')
        .select('id, duration_minutes')
        .eq('user_id', userId)
      
      if (transcriptsError) throw transcriptsError
      
      // Calculate stats
      const totalSessions = sessions.length
      const totalMinutes = sessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0)
      const avgSessionDuration = totalSessions > 0 ? Math.round(totalMinutes / totalSessions) : 0
      
      // Get recent sessions for trend
      const recentSessions = sessions.filter(s => {
        const sessionDate = new Date(s.created_at)
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        return sessionDate >= thirtyDaysAgo
      })
      
      return {
        data: {
          totalSessions,
          totalMinutes,
          avgSessionDuration,
          recentSessionsCount: recentSessions.length,
          totalTranscripts: transcripts.length
        },
        error: null
      }
    } catch (error) {
      return { data: null, error }
    }
  }
}