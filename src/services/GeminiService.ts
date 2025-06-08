import { GoogleGenerativeAI } from '@google/generative-ai';

export class GeminiService {
  private static genAI: GoogleGenerativeAI;
  private static model: any;

  // FOCUSED SYSTEM PROMPT - THE MOAT IS THE ANALYSIS
  private static readonly SYSTEM_PROMPT = `You are a senior product manager and business analyst specializing in identifying critical business logic gaps that could derail product launches. Your expertise is in finding the operational blind spots that product teams consistently miss.

CORE MISSION: Identify 8-15 distinct business flows and find the critical gaps that could impact revenue, compliance, or operational continuity.

BUSINESS FLOW EXTRACTION FRAMEWORK:

1. **CORE BUSINESS FLOWS** (4-5 flows):
   - User onboarding and activation journey
   - Core value delivery and feature usage
   - Revenue generation and monetization flows
   - Account management and user lifecycle
   - Data creation, processing, and management

2. **OPERATIONAL FLOWS** (3-4 flows):
   - Admin and management workflows
   - Customer support and issue resolution
   - Content moderation and approval processes
   - System configuration and maintenance
   - Reporting and analytics generation

3. **INTEGRATION & DATA FLOWS** (2-3 flows):
   - Third-party service integrations
   - Data import/export and synchronization
   - API workflows and external communications
   - Notification and communication systems

4. **COMPLIANCE & RECOVERY FLOWS** (2-3 flows):
   - Error handling and recovery procedures
   - Security and compliance workflows
   - Audit trail and regulatory reporting
   - Backup and disaster recovery processes

CRITICAL BUSINESS LOGIC GAP ANALYSIS:

Focus on gaps that could cause:
- **Revenue Loss**: Payment failures, billing issues, subscription problems
- **Operational Breakdown**: Process bottlenecks, approval delays, data inconsistencies
- **Compliance Violations**: GDPR issues, audit failures, regulatory non-compliance
- **User Experience Failures**: Broken flows, missing error handling, poor edge case management
- **Business Continuity Risks**: System failures, data loss, integration breakdowns

For each gap, identify:
- **Specific Business Question**: What exactly is unclear or missing?
- **Revenue/Operational Impact**: Quantify the potential business damage
- **Frequency of Occurrence**: How often this scenario would happen
- **Detection Method**: How would the team discover this issue?
- **Affected Business Processes**: Which flows would break?

CRITICAL SUCCESS FACTORS:
1. Extract 8-15 comprehensive business flows (never fewer than 8)
2. Focus on business logic gaps, not technical implementation details
3. Identify scenarios that could actually impact product success
4. Frame issues as specific questions that need PRD clarification
5. Provide concrete, measurable business impact assessments
6. Consider the full operational lifecycle and business ecosystem

Remember: Your competitive advantage is finding the business logic gaps that other teams miss. Think comprehensively about what could go wrong operationally, not just technically.`;

  static initialize() {
    // Use build-time replacement instead of import.meta.env to prevent exposure
    const apiKey = typeof __GEMINI_API_KEY__ !== 'undefined' ? __GEMINI_API_KEY__ : import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      console.error('Gemini API key not found. Please check your environment variables.');
      throw new Error('Gemini API key not found. Please check your environment variables.');
    }
    
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash",
      systemInstruction: this.SYSTEM_PROMPT,
      generationConfig: {
        temperature: 0.3, // Lower temperature for more focused analysis
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 8192,
      }
    });
  }

  private static handleApiError(error: any): never {
    console.error('Gemini API Error:', error);
    
    if (error.message && error.message.includes('429')) {
      throw new Error('quota_exceeded');
    } else if (error.message && error.message.includes('API key')) {
      throw new Error('invalid_api_key');
    } else if (error.message && error.message.includes('quota')) {
      throw new Error('quota_exceeded');
    } else {
      throw new Error('api_unavailable');
    }
  }

  static async validatePRDDocument(content: string): Promise<{ isPRD: boolean; confidence: number; reasons: string[] }> {
    if (!this.model) this.initialize();

    const prompt = `
Analyze this document to determine if it's a Product Requirements Document (PRD) or related product specification.

Document Content:
${content.substring(0, 4000)}${content.length > 4000 ? '...[truncated]' : ''}

**STRONG PRD INDICATORS** (High confidence 70-95%):
- Product requirements, specifications, or feature definitions
- User stories, acceptance criteria, or functional requirements  
- User journeys, workflows, or product features described
- Business objectives, success metrics, or KPIs mentioned
- Technical specifications or system requirements
- Product management terminology and professional structure

**WEAK PRD INDICATORS** (Medium confidence 40-69%):
- Business documents with some product-related content
- Technical documentation that could relate to products
- Project plans or specifications that mention user needs

**STRONG ANTI-PATTERNS** (Very low confidence 0-30%):
- Personal documents: recipes, cooking instructions, personal stories
- Financial documents: bank statements, invoices, receipts
- Legal documents: contracts, agreements, terms of service
- Academic papers, news articles, entertainment content

Return ONLY this JSON format:
{
  "isPRD": true/false,
  "confidence": 0-100,
  "reasons": [
    "Specific evidence-based reason 1",
    "Specific evidence-based reason 2", 
    "Specific evidence-based reason 3"
  ]
}
`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          isPRD: parsed.isPRD || false,
          confidence: Math.max(0, Math.min(100, parsed.confidence || 0)),
          reasons: Array.isArray(parsed.reasons) ? parsed.reasons : ['AI analysis completed']
        };
      }
      
      throw new Error('Could not parse validation response from AI');
    } catch (error) {
      this.handleApiError(error);
    }
  }

  static async analyzeForUserJourneys(content: string, context: { company?: string; problemStatement?: string }) {
    if (!this.model) this.initialize();

    const prompt = `
Extract ALL business flows from this PRD. Your goal is to identify 8-15 distinct flows covering the complete business ecosystem.

${context.company ? `Company Context: ${context.company}` : ''}
${context.problemStatement ? `Problem Statement: ${context.problemStatement}` : ''}

PRD Document:
${content}

EXTRACT FLOWS ACROSS THESE CATEGORIES:

**1. CORE BUSINESS FLOWS** (4-5 flows):
- New user onboarding and first value realization
- Core feature usage and value delivery workflows
- Revenue generation and monetization processes
- Account/profile management and lifecycle
- Data creation, editing, and management workflows

**2. OPERATIONAL FLOWS** (3-4 flows):
- Admin dashboard and user management
- Customer support and issue resolution
- Content moderation and approval workflows
- System configuration and bulk operations
- Reporting, analytics, and business intelligence

**3. INTEGRATION & DATA FLOWS** (2-3 flows):
- Third-party integrations and API workflows
- Data import/export and synchronization
- Email notifications and communication flows
- External system integrations and webhooks

**4. COMPLIANCE & RECOVERY FLOWS** (2-3 flows):
- Error handling and recovery procedures
- Security monitoring and incident response
- Audit trail and compliance reporting
- Backup, archival, and data retention

ENHANCED FLOW REQUIREMENTS:

For each flow, provide:
- **Business Impact**: Revenue, compliance, or operational effect
- **Frequency**: How often this process occurs
- **Dependencies**: What triggers this flow
- **Failure Scenarios**: What can go wrong
- **Monitoring**: How success/failure is measured

CRITICAL: Extract 8-15 flows minimum. Include operational flows that product teams typically miss.

Return JSON array:
[
  {
    "id": "unique_id",
    "name": "Descriptive Business Flow Name",
    "description": "Comprehensive description including business context and operational impact",
    "userType": "Specific user role (End User, Admin, Support Agent, System, etc.)",
    "priority": "high|medium|low",
    "businessImpact": "Specific revenue, compliance, or operational impact",
    "frequency": "Real-time|Daily|Weekly|Monthly|On-demand|Triggered",
    "upstreamDependencies": ["What triggers this flow"],
    "parallelProcesses": ["What happens simultaneously"],
    "steps": [
      {
        "id": "step_id",
        "action": "Specific business action or decision point",
        "description": "Detailed description including business logic",
        "expectedOutcome": "Business outcome and success criteria",
        "dependencies": ["array_of_step_ids"],
        "timingConstraints": "SLA requirements or timing dependencies",
        "dataRequirements": "What data is needed and from where",
        "failureScenarios": ["What can go wrong at this step"],
        "monitoringPoints": ["How to measure success/failure"]
      }
    ]
  }
]

Return ONLY the JSON array, no additional text.
`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      throw new Error('Could not parse journeys from AI response');
    } catch (error) {
      this.handleApiError(error);
    }
  }

  static async analyzeForEdgeCases(content: string, journeys: any[], context: { company?: string; problemStatement?: string }) {
    if (!this.model) this.initialize();

    const prompt = `
Conduct a comprehensive business logic gap analysis of this PRD and extracted flows. Focus on critical gaps that could impact revenue, compliance, or operational continuity.

${context.company ? `Company Context: ${context.company}` : ''}
${context.problemStatement ? `Problem Statement: ${context.problemStatement}` : ''}

PRD Document:
${content}

Extracted Business Flows:
${JSON.stringify(journeys, null, 2)}

BUSINESS LOGIC GAP ANALYSIS FRAMEWORK:

**1. REVENUE IMPACT GAPS** (Critical Priority):
- Payment processing failures and retry mechanisms
- Billing discrepancies and dispute resolution
- Subscription lifecycle and renewal issues
- Pricing changes and grandfathering policies
- Revenue recognition and accounting workflows

**2. OPERATIONAL CONTINUITY GAPS** (High Priority):
- Cross-flow dependencies and failure cascades
- Data consistency across distributed systems
- Performance bottlenecks and scaling constraints
- Approval workflow deadlocks and escalations
- Integration failure points and fallback procedures

**3. COMPLIANCE AND AUDIT GAPS** (High Priority):
- GDPR and privacy compliance workflows
- Audit trail completeness and retention
- Regulatory reporting and deadline management
- Data deletion and right-to-be-forgotten
- Security incident response procedures

**4. USER EXPERIENCE GAPS** (Medium Priority):
- Error message consistency and user guidance
- Loading states and progress indicators
- Offline functionality and sync conflicts
- Multi-device and concurrent session handling
- Accessibility and internationalization support

**5. BUSINESS PROCESS GAPS** (Medium Priority):
- Staff turnover and knowledge transfer
- Business rule changes and system updates
- Seasonal variations and capacity planning
- Third-party service dependencies and alternatives
- Monitoring and alerting effectiveness

CRITICAL REQUIREMENTS:

For each gap, provide:
- **Specific Business Question**: Frame as a question needing PRD clarification
- **Concrete Example**: When this would surface in real usage
- **Measurable Business Impact**: Specific revenue, operational, or compliance effect
- **Operational Frequency**: How often this scenario occurs
- **Detection Method**: How this issue would be discovered
- **Affected Flows**: Which business processes are impacted

BUSINESS IMPACT EXAMPLES (Use similar specificity):
- "Could cause 25% user churn during payment failures, resulting in $50K monthly revenue loss"
- "GDPR compliance violation risk with potential €20M fine for data retention issues"
- "Manual workarounds increase operational overhead by 15 hours/week ($30K annual cost)"
- "System downtime during peak hours could cost $5K per hour in lost transactions"

Return JSON array:
[
  {
    "id": "unique_id",
    "category": "business_logic_gap|flow_inconsistency|operational_gap",
    "severity": "critical|moderate|minor",
    "title": "Question-focused title (What happens when...? How does...? Where is...?)",
    "description": "Specific business scenario explaining why this matters operationally",
    "affectedJourneys": ["array_of_journey_ids_affected"],
    "businessImpact": "SPECIFIC measurable impact with numbers/percentages when possible",
    "exampleScenario": "Concrete, realistic example of when this would surface",
    "operationalFrequency": "Daily|Weekly|Monthly|Rare",
    "detectionMethod": "How this issue would be discovered",
    "recommendation": "High-level approach to address the gap",
    "questionsToResolve": [
      "Specific question 1 that needs PRD clarification",
      "Specific question 2 that needs PRD clarification"
    ]
  }
]

Severity Guidelines:
- **Critical**: Revenue impact >$10K, compliance violations, operational failures
- **Moderate**: User experience degradation, operational inefficiencies, scalability concerns
- **Minor**: Edge case scenarios, optimization opportunities, low-frequency issues

Focus on business-critical scenarios that could actually impact product success. Return ONLY the JSON array.
`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      throw new Error('Could not parse edge cases from AI response');
    } catch (error) {
      this.handleApiError(error);
    }
  }

  static async generateInsights(content: string, journeys: any[], edgeCases: any[], context: { company?: string; problemStatement?: string }) {
    if (!this.model) this.initialize();

    const prompt = `
Provide a comprehensive business readiness score for this PRD analysis.

Analysis Summary:
- Total Business Flows Identified: ${journeys.length}
- Total Business Logic Issues Found: ${edgeCases.length}
- Critical Business Issues: ${edgeCases.filter(e => e.severity === 'critical').length}

Evaluate business readiness based on:

1. **Business Logic Completeness** (40%): 
   - Are core business flows well-defined and comprehensive?
   - Are revenue and operational impacts clearly specified?
   - Is the full operational ecosystem covered?

2. **Operational Readiness** (30%):
   - Are monitoring and alerting requirements specified?
   - Are scaling and performance considerations addressed?
   - Are error handling and recovery procedures defined?

3. **Cross-Functional Dependencies** (20%):
   - Are integration points and external dependencies mapped?
   - Are data flow and state management requirements defined?
   - Are timing and frequency constraints specified?

4. **Risk Mitigation** (10%):
   - Are potential business disruptions identified?
   - Are rollback and contingency plans considered?
   - Are edge cases and failure scenarios addressed?

Scoring criteria:
- 90-100: Production-ready with comprehensive business logic (8+ flows identified)
- 80-89: Strong foundation with minor gaps (6-8 flows identified)
- 70-79: Good foundation but needs clarification (4-6 flows identified)
- 60-69: Adequate but significant gaps (2-4 flows identified)
- Below 60: Requires major revision (0-2 flows identified)

Deduct 10-15 points if fewer than 6 distinct flows identified.
Deduct 5-10 points for each critical business logic gap.

Return only a number between 0-100.
`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      const score = parseInt(text.trim());
      return isNaN(score) ? 75 : Math.max(0, Math.min(100, score));
    } catch (error) {
      this.handleApiError(error);
    }
  }
}

// Declare global variables for build-time replacements
declare global {
  const __SUPABASE_URL__: string;
  const __SUPABASE_ANON_KEY__: string;
  const __GEMINI_API_KEY__: string;
}