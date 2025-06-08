import React, { useState } from 'react';
import { X, CreditCard, Check, Star, Loader2, ExternalLink } from 'lucide-react';
import { InstamojoService } from '../services/InstamojoService';
import { CreditService } from '../services/CreditService';
import { useAuth } from '../hooks/useAuth';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const { user } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState<string>('professional');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const plans = InstamojoService.getPaymentPlans();

  const handlePayment = async () => {
    if (!user || !selectedPlan) return;

    const plan = plans.find(p => p.id === selectedPlan);
    if (!plan) return;

    setLoading(true);
    setError(null);

    try {
      // Create redirect URL that will handle the payment response
      const redirectUrl = `${window.location.origin}/payment/success`;
      const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/instamojo-webhook`;

      // Create payment request with Instamojo
      const paymentRequest = await InstamojoService.createPaymentRequest(
        plan.amount,
        `FlowMender ${plan.name} - ${plan.credits} Analysis Credits`,
        user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
        user.email || '',
        redirectUrl,
        webhookUrl
      );

      // Save transaction to database
      await CreditService.createPaymentTransaction(
        user.id,
        paymentRequest.payment_request_id,
        plan.amount,
        plan.credits,
        paymentRequest.payment_url
      );

      // Use light checkout for better UX (append ?embed=form)
      const lightCheckoutUrl = `${paymentRequest.payment_url}?embed=form`;
      
      // Redirect to payment page
      window.open(lightCheckoutUrl, '_blank');
      
      // Close modal
      onClose();
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      console.error('Payment error:', err);
      setError(err instanceof Error ? err.message : 'Payment failed');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 w-full max-w-4xl mx-4 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-bold text-gray-900">Choose Your Plan</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-6 w-6 text-gray-500" />
          </button>
        </div>

        <div className="mb-8">
          <p className="text-gray-600 text-lg">
            Get more comprehensive PRD analyses with our flexible credit packages
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {plans.map((plan) => {
            const savings = InstamojoService.calculateSavings(plan.credits);
            
            return (
              <div
                key={plan.id}
                className={`relative border-2 rounded-2xl p-6 cursor-pointer transition-all ${
                  selectedPlan === plan.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                } ${plan.popular ? 'ring-2 ring-blue-500 ring-opacity-50' : ''}`}
                onClick={() => setSelectedPlan(plan.id)}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-1 rounded-full text-sm font-medium flex items-center">
                      <Star className="h-3 w-3 mr-1" />
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="text-center mb-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                  <div className="text-3xl font-bold text-gray-900 mb-1">
                    ₹{plan.amount}
                  </div>
                  <p className="text-gray-600 text-sm">{plan.description}</p>
                  {savings.percentage > 0 && (
                    <div className="mt-2 text-green-600 text-sm font-medium">
                      Save {savings.percentage}% (₹{Math.round(savings.savings)})
                    </div>
                  )}
                </div>

                <div className="space-y-3 mb-6">
                  {plan.features.map((feature, index) => (
                    <div key={index} className="flex items-start">
                      <Check className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-600">{feature}</span>
                    </div>
                  ))}
                </div>

                <div className="text-center">
                  <div className={`w-4 h-4 rounded-full border-2 mx-auto ${
                    selectedPlan === plan.id
                      ? 'bg-blue-500 border-blue-500'
                      : 'border-gray-300'
                  }`}>
                    {selectedPlan === plan.id && (
                      <Check className="h-3 w-3 text-white" />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="bg-gray-50 rounded-lg p-6 mb-6">
          <h4 className="font-semibold text-gray-900 mb-3">What you get with every analysis:</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-600">
            <div className="flex items-center">
              <Check className="h-4 w-4 text-green-500 mr-2" />
              Comprehensive business logic analysis
            </div>
            <div className="flex items-center">
              <Check className="h-4 w-4 text-green-500 mr-2" />
              8-15 detailed user journey mappings
            </div>
            <div className="flex items-center">
              <Check className="h-4 w-4 text-green-500 mr-2" />
              Critical edge case identification
            </div>
            <div className="flex items-center">
              <Check className="h-4 w-4 text-green-500 mr-2" />
              Operational readiness assessment
            </div>
            <div className="flex items-center">
              <Check className="h-4 w-4 text-green-500 mr-2" />
              Export to PDF, Markdown, JSON
            </div>
            <div className="flex items-center">
              <Check className="h-4 w-4 text-green-500 mr-2" />
              Permanent analysis history
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={handlePayment}
            disabled={loading || !selectedPlan}
            className="flex-1 flex items-center justify-center bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 px-6 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium text-lg"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CreditCard className="h-5 w-5 mr-2" />
                Pay with Instamojo
                <ExternalLink className="h-4 w-4 ml-2" />
              </>
            )}
          </button>
          <button
            onClick={onClose}
            className="px-6 py-4 text-gray-600 hover:text-gray-700 font-medium transition-colors"
          >
            Cancel
          </button>
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            Secure payment powered by Instamojo • All transactions are encrypted and secure
          </p>
          <p className="text-xs text-gray-500 mt-1">
            You will be redirected to Instamojo's secure payment page
          </p>
        </div>
      </div>
    </div>
  );
};