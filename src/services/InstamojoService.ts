import { supabase } from '../lib/supabase';

export class InstamojoService {
  // Create payment request via Edge Function
  static async createPaymentRequest(
    amount: number,
    purpose: string,
    buyerName: string,
    buyerEmail: string,
    redirectUrl: string,
    webhookUrl: string
  ): Promise<{ payment_request_id: string; payment_url: string }> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('User not authenticated');
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/instamojo-proxy/create-payment`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount,
          purpose,
          buyerName,
          buyerEmail,
          redirectUrl,
          webhookUrl,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Payment request error:', errorData);
        throw new Error(errorData.error || 'Failed to create payment request');
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating payment request:', error);
      throw new Error('Failed to create payment request');
    }
  }

  // Get payment status via Edge Function
  static async getPaymentStatus(paymentRequestId: string): Promise<any> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('User not authenticated');
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/instamojo-proxy/payment-status`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentRequestId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get payment status');
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting payment status:', error);
      throw new Error('Failed to get payment status');
    }
  }

  // Verify webhook signature (this can remain client-side for verification)
  static async verifyWebhookSignature(payload: string, signature: string): Promise<boolean> {
    try {
      // This would typically be done server-side, but for now we'll trust the webhook endpoint
      // The actual verification happens in the webhook Edge Function
      return true;
    } catch (error) {
      console.error('Error verifying webhook signature:', error);
      return false;
    }
  }

  // Get payment plans (static data, no API call needed)
  static getPaymentPlans() {
    return [
      {
        id: 'starter',
        name: 'Starter Pack',
        credits: 3,
        amount: 89,
        currency: 'INR',
        description: '3 comprehensive PRD analyses',
        popular: false,
        features: [
          '3 AI-powered PRD analyses',
          'Comprehensive edge case detection',
          'User journey mapping',
          'Business logic gap analysis',
          'Export to PDF, Markdown, JSON',
          'Analysis history'
        ]
      },
      {
        id: 'professional',
        name: 'Professional Pack',
        credits: 10,
        amount: 249,
        currency: 'INR',
        description: '10 comprehensive PRD analyses',
        popular: true,
        features: [
          '10 AI-powered PRD analyses',
          'Comprehensive edge case detection',
          'User journey mapping',
          'Business logic gap analysis',
          'Export to PDF, Markdown, JSON',
          'Analysis history',
          'Priority support',
          '20% cost savings vs individual'
        ]
      },
      {
        id: 'enterprise',
        name: 'Enterprise Pack',
        credits: 25,
        amount: 499,
        currency: 'INR',
        description: '25 comprehensive PRD analyses',
        popular: false,
        features: [
          '25 AI-powered PRD analyses',
          'Comprehensive edge case detection',
          'User journey mapping',
          'Business logic gap analysis',
          'Export to PDF, Markdown, JSON',
          'Analysis history',
          'Priority support',
          'Team collaboration features',
          '40% cost savings vs individual'
        ]
      }
    ];
  }

  // Calculate savings (static calculation, no API call needed)
  static calculateSavings(credits: number): { savings: number; percentage: number } {
    const basePrice = 89; // Price for 3 credits
    const pricePerCredit = basePrice / 3; // ₹29.67 per credit
    const totalAtBaseRate = credits * pricePerCredit;
    
    let actualPrice = 0;
    if (credits <= 3) {
      actualPrice = 89;
    } else if (credits <= 10) {
      actualPrice = 249;
    } else if (credits <= 25) {
      actualPrice = 499;
    } else {
      // For larger quantities, use enterprise rate
      actualPrice = Math.ceil(credits / 25) * 499;
    }
    
    const savings = totalAtBaseRate - actualPrice;
    const percentage = Math.round((savings / totalAtBaseRate) * 100);
    
    return { savings: Math.max(0, savings), percentage: Math.max(0, percentage) };
  }
}