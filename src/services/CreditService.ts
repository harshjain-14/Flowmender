import { supabase } from '../lib/supabase';
import { UserCredits, CreditUsageLog } from '../types';

export class CreditService {
  // Get user credits
  static async getUserCredits(userId: string): Promise<UserCredits | null> {
    try {
      const { data, error } = await supabase
        .from('user_credits')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No credits record found, create one
          return await this.initializeUserCredits(userId);
        }
        throw error;
      }

      return {
        user_id: data.user_id,
        credits: data.credits,
        total_purchased: data.total_purchased,
        last_purchase_at: data.last_purchase_at ? new Date(data.last_purchase_at) : undefined,
        created_at: new Date(data.created_at),
        updated_at: new Date(data.updated_at),
      };
    } catch (error) {
      console.error('Error getting user credits:', error);
      throw new Error('Failed to get user credits');
    }
  }

  // Initialize user credits (3 free credits)
  static async initializeUserCredits(userId: string): Promise<UserCredits> {
    try {
      const { data, error } = await supabase
        .from('user_credits')
        .insert({
          user_id: userId,
          credits: 3,
          total_purchased: 0,
        })
        .select()
        .single();

      if (error) {
        // Handle duplicate key violation (race condition)
        if (error.code === '23505') {
          // Record already exists, fetch it instead
          const { data: existingData, error: fetchError } = await supabase
            .from('user_credits')
            .select('*')
            .eq('user_id', userId)
            .single();

          if (fetchError) {
            throw fetchError;
          }

          return {
            user_id: existingData.user_id,
            credits: existingData.credits,
            total_purchased: existingData.total_purchased,
            last_purchase_at: existingData.last_purchase_at ? new Date(existingData.last_purchase_at) : undefined,
            created_at: new Date(existingData.created_at),
            updated_at: new Date(existingData.updated_at),
          };
        }
        throw error;
      }

      return {
        user_id: data.user_id,
        credits: data.credits,
        total_purchased: data.total_purchased,
        last_purchase_at: data.last_purchase_at ? new Date(data.last_purchase_at) : undefined,
        created_at: new Date(data.created_at),
        updated_at: new Date(data.updated_at),
      };
    } catch (error) {
      console.error('Error initializing user credits:', error);
      throw new Error('Failed to initialize user credits');
    }
  }

  // Deduct credits for analysis - simplified version
  static async deductCredits(
    userId: string, 
    analysisResultId?: string, 
    creditsToDeduct: number = 1
  ): Promise<boolean> {
    try {
      // First, get current credits
      const { data: currentCredits, error: fetchError } = await supabase
        .from('user_credits')
        .select('credits')
        .eq('user_id', userId)
        .single();

      if (fetchError || !currentCredits) {
        console.error('Error fetching credits:', fetchError);
        return false;
      }

      // Check if user has enough credits
      if (currentCredits.credits < creditsToDeduct) {
        console.error('Insufficient credits:', currentCredits.credits, 'needed:', creditsToDeduct);
        return false;
      }

      // Calculate new credit balance
      const newCredits = currentCredits.credits - creditsToDeduct;

      // Update credits
      const { error: updateError } = await supabase
        .from('user_credits')
        .update({ 
          credits: newCredits,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (updateError) {
        console.error('Error updating credits:', updateError);
        return false;
      }

      // Log the usage
      const { error: logError } = await supabase
        .from('credit_usage_log')
        .insert({
          user_id: userId,
          analysis_result_id: analysisResultId,
          credits_used: creditsToDeduct,
          remaining_credits: newCredits
        });

      if (logError) {
        console.error('Error logging credit usage:', logError);
        // Don't fail the operation if logging fails
      }

      return true;
    } catch (error) {
      console.error('Error deducting credits:', error);
      return false;
    }
  }

  // Get credit usage log
  static async getCreditUsageLog(userId: string): Promise<CreditUsageLog[]> {
    try {
      const { data, error } = await supabase
        .from('credit_usage_log')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data.map(log => ({
        id: log.id,
        user_id: log.user_id,
        analysis_result_id: log.analysis_result_id,
        credits_used: log.credits_used,
        remaining_credits: log.remaining_credits,
        created_at: new Date(log.created_at),
      }));
    } catch (error) {
      console.error('Error getting credit usage log:', error);
      throw new Error('Failed to get credit usage log');
    }
  }
}