export interface PRDDocument {
  id: string;
  name: string;
  content: string;
  type: 'pdf' | 'docx' | 'text';
  size: number;
  uploadedAt: Date;
}

export interface UserJourney {
  id: string;
  name: string;
  description: string;
  steps: JourneyStep[];
  userType: string;
  priority: 'high' | 'medium' | 'low';
  businessImpact?: string;
  frequency?: string;
  upstreamDependencies?: string[];
  parallelProcesses?: string[];
}

export interface JourneyStep {
  id: string;
  action: string;
  description: string;
  expectedOutcome: string;
  dependencies: string[];
  timingConstraints?: string;
  dataRequirements?: string;
  failureScenarios?: string[];
  monitoringPoints?: string[];
}

export interface EdgeCase {
  id: string;
  category: 'business_logic_gap' | 'flow_inconsistency' | 'operational_gap';
  severity: 'critical' | 'moderate' | 'minor';
  title: string;
  description: string;
  affectedJourneys: string[];
  businessImpact?: string;
  exampleScenario?: string;
  operationalFrequency?: string;
  detectionMethod?: string;
  recommendation: string;
  questionsToResolve?: string[];
  impact: string; // Keep for backward compatibility
}

export interface AnalysisResult {
  id: string;
  documentName: string;
  analyzedAt: Date;
  context: {
    company?: string;
    problemStatement?: string;
  };
  journeys: UserJourney[];
  edgeCases: EdgeCase[];
  summary: {
    totalJourneys: number;
    totalEdgeCases: number;
    criticalIssues: number;
    coverageScore: number;
  };
}

export interface ProcessingStatus {
  stage: 'parsing' | 'extracting' | 'analyzing' | 'generating' | 'complete';
  progress: number;
  message: string;
}

// Payment and Credits Types
export interface UserCredits {
  user_id: string;
  credits: number;
  total_purchased: number;
  last_purchase_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface PaymentTransaction {
  id: string;
  user_id: string;
  instamojo_payment_id?: string;
  instamojo_payment_request_id: string;
  amount: number;
  currency: string;
  credits_purchased: number;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  payment_url?: string;
  webhook_verified: boolean;
  created_at: Date;
  completed_at?: Date;
}

export interface CreditUsageLog {
  id: string;
  user_id: string;
  analysis_result_id?: string;
  credits_used: number;
  remaining_credits: number;
  created_at: Date;
}

export interface InstamojoPaymentRequest {
  payment_request_id: string;
  payment_url: string;
  status: string;
}

export interface InstamojoWebhookPayload {
  payment_id: string;
  payment_request_id: string;
  status: string;
  amount: string;
  currency: string;
  buyer_email: string;
  buyer_name: string;
  created_at: string;
}