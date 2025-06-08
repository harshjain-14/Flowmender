import { supabase } from '../lib/supabase';
import { UserCredits, PaymentTransaction, CreditUsageLog } from '../types';

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

  // Deduct credits for analysis
  static async deductCredits(
    userId: string, 
    analysisResultId?: string, 
    creditsToDeduct: number = 1
  ): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('deduct_user_credits', {
        p_user_id: userId,
        p_analysis_result_id: analysisResultId,
        p_credits_to_deduct: creditsToDeduct,
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error deducting credits:', error);
      throw new Error('Failed to deduct credits');
    }
  }

  // Add credits after successful payment
  static async addCredits(
    userId: string, 
    creditsToAdd: number, 
    transactionId: string
  ): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('add_user_credits', {
        p_user_id: userId,
        p_credits_to_add: creditsToAdd,
        p_transaction_id: transactionId,
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error adding credits:', error);
      throw new Error('Failed to add credits');
    }
  }

  // Create payment transaction
  static async createPaymentTransaction(
    userId: string,
    paymentRequestId: string,
    amount: number,
    creditsToAdd: number,
    paymentUrl: string
  ): Promise<PaymentTransaction> {
    try {
      const { data, error } = await supabase
        .from('payment_transactions')
        .insert({
          user_id: userId,
          instamojo_payment_request_id: paymentRequestId,
          amount,
          currency: 'INR',
          credits_purchased: creditsToAdd,
          status: 'pending',
          payment_url: paymentUrl,
        })
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        user_id: data.user_id,
        instamojo_payment_id: data.instamojo_payment_id,
        instamojo_payment_request_id: data.instamojo_payment_request_id,
        amount: data.amount,
        currency: data.currency,
        credits_purchased: data.credits_purchased,
        status: data.status,
        payment_url: data.payment_url,
        webhook_verified: data.webhook_verified,
        created_at: new Date(data.created_at),
        completed_at: data.completed_at ? new Date(data.completed_at) : undefined,
      };
    } catch (error) {
      console.error('Error creating payment transaction:', error);
      throw new Error('Failed to create payment transaction');
    }
  }

  // Update payment transaction status
  static async updatePaymentTransaction(
    transactionId: string,
    updates: Partial<PaymentTransaction>
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('payment_transactions')
        .update(updates)
        .eq('id', transactionId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating payment transaction:', error);
      throw new Error('Failed to update payment transaction');
    }
  }

  // Get user payment transactions
  static async getUserTransactions(userId: string): Promise<PaymentTransaction[]> {
    try {
      const { data, error } = await supabase
        .from('payment_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data.map(transaction => ({
        id: transaction.id,
        user_id: transaction.user_id,
        instamojo_payment_id: transaction.instamojo_payment_id,
        instamojo_payment_request_id: transaction.instamojo_payment_request_id,
        amount: transaction.amount,
        currency: transaction.currency,
        credits_purchased: transaction.credits_purchased,
        status: transaction.status,
        payment_url: transaction.payment_url,
        webhook_verified: transaction.webhook_verified,
        created_at: new Date(transaction.created_at),
        completed_at: transaction.completed_at ? new Date(transaction.completed_at) : undefined,
      }));
    } catch (error) {
      console.error('Error getting user transactions:', error);
      throw new Error('Failed to get user transactions');
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

  // Get transaction by payment request ID
  static async getTransactionByPaymentRequestId(paymentRequestId: string): Promise<PaymentTransaction | null> {
    try {
      const { data, error } = await supabase
        .from('payment_transactions')
        .select('*')
        .eq('instamojo_payment_request_id', paymentRequestId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // No transaction found
        }
        throw error;
      }

      return {
        id: data.id,
        user_id: data.user_id,
        instamojo_payment_id: data.instamojo_payment_id,
        instamojo_payment_request_id: data.instamojo_payment_request_id,
        amount: data.amount,
        currency: data.currency,
        credits_purchased: data.credits_purchased,
        status: data.status,
        payment_url: data.payment_url,
        webhook_verified: data.webhook_verified,
        created_at: new Date(data.created_at),
        completed_at: data.completed_at ? new Date(data.completed_at) : undefined,
      };
    } catch (error) {
      console.error('Error getting transaction by payment request ID:', error);
      throw new Error('Failed to get transaction');
    }
  }
}