import { GoogleGenerativeAI } from '@google/generative-ai';

export class GeminiService {
  private static genAI: GoogleGenerativeAI;
  private static model: any;

  // Enhanced system prompt with comprehensive flow visualization framework
  private static readonly SYSTEM_PROMPT = `You are a senior product manager specializing in business logic analysis and comprehensive user flow mapping. Your expertise lies in identifying ALL possible user journeys, including those that product teams typically overlook.

CORE MISSION: Extract 8-15 distinct user journeys from every PRD, covering the full spectrum of user interactions, operational flows, and business processes.

COMPREHENSIVE FLOW ANALYSIS FRAMEWORK:

1. PRIMARY USER FLOWS (Core Product Journeys):
   - New user onboarding and activation
   - Core feature usage and value realization
   - Account management and profile updates
   - Payment and subscription flows
   - Content creation, editing, and publishing flows

2. OPERATIONAL & ADMIN FLOWS (Often Overlooked):
   - Admin dashboard and user management
   - Content moderation and approval workflows
   - System configuration and settings management
   - Bulk operations and data import/export
   - User support and customer service flows

3. INTEGRATION & EXTERNAL FLOWS:
   - Third-party service integrations (APIs, webhooks)
   - Data synchronization with external systems
   - Email notifications and communication flows
   - Analytics and reporting data collection
   - Backup, archival, and data retention processes

4. ERROR & EDGE CASE FLOWS:
   - Account recovery and password reset
   - Payment failure and retry mechanisms
   - System downtime and maintenance modes
   - Data validation errors and correction flows
   - Security incidents and breach response

5. COMPLIANCE & AUDIT FLOWS:
   - GDPR/privacy compliance workflows
   - Audit trail generation and reporting
   - Data deletion and right-to-be-forgotten
   - Regulatory reporting and compliance checks
   - Security monitoring and threat detection

6. TEMPORAL & FREQUENCY-BASED FLOWS:
   - Daily/weekly/monthly automated processes
   - Scheduled reports and notifications
   - Recurring billing and subscription renewals
   - Data cleanup and maintenance routines
   - Performance monitoring and alerting

7. MULTI-USER & COLLABORATION FLOWS:
   - Team collaboration and shared workspaces
   - Permission management and access control
   - Approval workflows and review processes
   - Real-time collaboration and conflict resolution
   - Notification and communication between users

8. BUSINESS CONTINUITY FLOWS:
   - Disaster recovery and backup restoration
   - System migration and data transfer
   - Version control and rollback procedures
   - Load balancing and scaling operations
   - Monitoring and health check processes

ENHANCED VISUALIZATION REQUIREMENTS:

For each flow, identify:
- **Upstream Dependencies**: What triggers this journey?
- **Parallel Processes**: What else happens simultaneously?
- **Timing Constraints**: When must this complete?
- **Data Dependencies**: What information is required?
- **Failure Scenarios**: What can go wrong?
- **Business Impact**: Revenue, compliance, or operational effect
- **Cross-Journey Touchpoints**: Where flows intersect
- **Monitoring Points**: How success/failure is measured

CRITICAL SUCCESS FACTORS:
1. ALWAYS extract 8-15 distinct journeys (never just 1-3)
2. Include operational and admin flows that teams forget
3. Consider all user types: end users, admins, support staff, external partners
4. Think about the full product lifecycle, not just happy paths
5. Include both human and automated system processes
6. Consider compliance, security, and business continuity requirements

BUSINESS LOGIC FOCUS:
- Question every assumption in the PRD
- Identify gaps between what's written and what's needed operationally
- Focus on scenarios that could impact revenue or compliance
- Consider real-world constraints and edge cases
- Think about what happens when business conditions change`;

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
      systemInstruction: this.SYSTEM_PROMPT
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
As an expert product strategist, analyze this document to determine if it's a Product Requirements Document (PRD) or related product specification document.

Document Content:
${content.substring(0, 4000)}${content.length > 4000 ? '...[truncated]' : ''}

Evaluate the document based on these criteria:

**STRONG PRD INDICATORS** (High confidence):
- Product requirements, specifications, or feature definitions
- User stories, acceptance criteria, or functional requirements  
- User journeys, workflows, or product features described
- Business objectives, success metrics, or KPIs mentioned
- Technical specifications or system requirements
- Product management terminology and professional structure
- Stakeholder definitions, user personas, or target audiences
- Development timelines, milestones, or product roadmaps

**WEAK PRD INDICATORS** (Medium confidence):
- Business documents with some product-related content
- Technical documentation that could relate to products
- Project plans or specifications that mention user needs
- Documents with structured requirements but unclear product focus

**STRONG ANTI-PATTERNS** (Very low confidence):
- Personal documents: recipes, cooking instructions, personal stories
- Financial documents: bank statements, invoices, receipts, financial reports
- Legal documents: contracts, agreements, terms of service
- Academic papers: research, essays, scientific studies
- Marketing materials: advertisements, brochures, sales content
- News articles, blog posts, or journalistic content
- Medical documents: prescriptions, medical records, health information
- Random text, gibberish, or clearly non-business content
- Entertainment content: novels, poems, song lyrics, scripts

**CRITICAL ASSESSMENT RULES**:
1. If document contains financial transactions, account numbers, or banking information → confidence should be 0-10%
2. If document contains recipes, cooking instructions, or food preparation → confidence should be 0-15%
3. If document contains personal stories, entertainment content → confidence should be 0-20%
4. If document has clear product requirements and user-focused language → confidence should be 70-95%
5. If document mentions specific product features, user journeys, or business logic → confidence should be 60-90%

Provide your assessment in this exact JSON format:
{
  "isPRD": true/false,
  "confidence": 0-100,
  "reasons": [
    "Specific evidence-based reason 1",
    "Specific evidence-based reason 2", 
    "Specific evidence-based reason 3"
  ]
}

Be extremely critical and evidence-based. A bank statement should NEVER score above 20% confidence. Focus on actual content, not just keywords.

Return ONLY the JSON object, no additional text.
`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // Clean up the response to extract just the JSON
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
As a senior product manager with expertise in comprehensive flow mapping, extract ALL user journeys from this PRD. Your goal is to identify 8-15 distinct journeys that cover the complete product ecosystem.

${context.company ? `Company Context: ${context.company}` : ''}
${context.problemStatement ? `Problem Statement: ${context.problemStatement}` : ''}

PRD Document:
${content}

COMPREHENSIVE FLOW EXTRACTION REQUIREMENTS:

You MUST identify journeys across ALL these categories:

1. **PRIMARY USER FLOWS** (3-4 journeys):
   - New user onboarding and first-time experience
   - Core feature usage and value realization
   - Account/profile management and settings
   - Payment, billing, and subscription management

2. **OPERATIONAL & ADMIN FLOWS** (2-3 journeys):
   - Admin dashboard and user management
   - Content moderation and approval workflows
   - System configuration and bulk operations
   - Customer support and help desk processes

3. **INTEGRATION & DATA FLOWS** (2-3 journeys):
   - Third-party integrations and API workflows
   - Data import/export and synchronization
   - Email notifications and communication flows
   - Analytics, reporting, and data collection

4. **ERROR & RECOVERY FLOWS** (2-3 journeys):
   - Account recovery and password reset
   - Payment failure and retry mechanisms
   - Error handling and system recovery
   - Data validation and correction processes

5. **COMPLIANCE & AUDIT FLOWS** (1-2 journeys):
   - Privacy compliance and data management
   - Audit trail and regulatory reporting
   - Security monitoring and incident response

6. **AUTOMATED & SCHEDULED FLOWS** (1-2 journeys):
   - Automated notifications and reminders
   - Scheduled reports and maintenance
   - Recurring processes and cleanup routines

ENHANCED FLOW ANALYSIS:

For each journey, provide comprehensive details including:
- **Upstream Dependencies**: What triggers this journey?
- **Timing Constraints**: SLAs, deadlines, frequency requirements
- **Data Requirements**: What data is needed and from where?
- **Parallel Processes**: What else happens simultaneously?
- **Failure Scenarios**: What can go wrong and how to recover?
- **Business Impact**: Revenue, compliance, operational effects
- **Cross-Journey Touchpoints**: Where this intersects with other flows
- **Monitoring Requirements**: How success/failure is measured

CRITICAL REQUIREMENTS:
- Extract 8-15 journeys minimum (never fewer than 8)
- Include operational flows that product teams typically miss
- Consider all user types: end users, admins, support, external partners
- Think beyond happy paths to include edge cases and error scenarios
- Include both human-driven and automated system processes
- Consider the full product lifecycle and business operations

Return a JSON array with this exact structure:
[
  {
    "id": "unique_id",
    "name": "Descriptive Journey Name",
    "description": "Comprehensive description including business context and operational impact",
    "userType": "Specific user role (End User, Admin, Support Agent, System, External Partner, etc.)",
    "priority": "high|medium|low",
    "businessImpact": "Specific revenue, compliance, or operational impact",
    "frequency": "Real-time|Daily|Weekly|Monthly|On-demand|Triggered",
    "upstreamDependencies": ["What triggers this journey"],
    "parallelProcesses": ["What happens simultaneously"],
    "steps": [
      {
        "id": "step_id",
        "action": "Specific business action or decision point",
        "description": "Detailed description including business logic and constraints",
        "expectedOutcome": "Business outcome and success criteria",
        "dependencies": ["array_of_step_ids_this_depends_on"],
        "timingConstraints": "SLA requirements, deadlines, or timing dependencies",
        "dataRequirements": "What data is needed, from where, and in what format",
        "failureScenarios": ["What can go wrong at this step"],
        "monitoringPoints": ["How to measure success/failure of this step"]
      }
    ]
  }
]

EXAMPLES OF JOURNEYS TO ALWAYS CONSIDER:
- User Registration & Email Verification
- Core Feature Onboarding & First Success
- Payment Processing & Subscription Management
- Admin User Management & Permissions
- Content Creation & Publishing Workflow
- Data Import/Export & Synchronization
- Error Recovery & Account Restoration
- Customer Support Ticket Management
- Automated Notifications & Reminders
- Compliance Reporting & Audit Trails
- System Monitoring & Health Checks
- Third-Party Integration Management

Remember: Your competitive advantage is finding the flows that other product teams miss. Think comprehensively about the entire product ecosystem.

Return ONLY the JSON array, no additional text.
`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // Clean up the response to extract just the JSON
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
As a senior product manager specializing in business logic analysis and operational edge cases, conduct a comprehensive analysis of this PRD and the extracted user journeys. Focus on business-critical gaps that could impact real-world performance, revenue, or operational continuity.

${context.company ? `Company Context: ${context.company}` : ''}
${context.problemStatement ? `Problem Statement: ${context.problemStatement}` : ''}

PRD Document:
${content}

Extracted User Journeys:
${JSON.stringify(journeys, null, 2)}

COMPREHENSIVE EDGE CASE ANALYSIS FRAMEWORK:

**1. BUSINESS LOGIC GAPS** (Critical Priority):

*Data Timing Conflicts:*
- What happens when reporting periods don't align with operational cycles?
- How are metrics calculated when data arrives late or out of sequence?
- What occurs when real-time and batch processes conflict?

*State Management Issues:*
- How are conflicting data states resolved across systems?
- What happens when users perform actions while data is being updated?
- How are race conditions handled in multi-user scenarios?

*Performance Measurement Gaps:*
- How will success/failure be measured and monitored in real-time?
- What happens when KPIs show conflicting signals?
- How are performance degradations detected and addressed?

*Operational Continuity Risks:*
- What business events could disrupt normal flows (policy changes, staff departures)?
- How does the system handle unexpected volume spikes or drops?
- What happens during system maintenance or planned downtime?

*Revenue Impact Scenarios:*
- What could prevent monetization or cause revenue loss?
- How are billing discrepancies and disputes handled?
- What happens when payment methods fail or expire?

**2. PRODUCT FLOW INCONSISTENCIES** (High Priority):

*Cross-Journey Dependencies:*
- How do different user journeys interact or conflict with each other?
- What happens when one journey fails while others are in progress?
- How are shared resources managed across multiple flows?

*Frequency and Timing Issues:*
- How do different operational frequencies (real-time vs batch) create conflicts?
- What happens when scheduled processes overlap with user actions?
- How are time zone differences handled in global operations?

*Workflow Bottlenecks:*
- Where could processes get stuck or create delays?
- What happens when approval workflows have missing approvers?
- How are deadlocks and circular dependencies resolved?

*Data Consistency Problems:*
- How is data integrity maintained across distributed systems?
- What happens when external data sources become unavailable?
- How are data validation errors handled without blocking operations?

*Integration Failure Points:*
- What happens when external APIs are down or rate-limited?
- How are webhook failures and retry mechanisms handled?
- What occurs when data formats change in external systems?

**3. OPERATIONAL READINESS GAPS** (Medium Priority):

*Monitoring and Alerting:*
- How will the team know if the system is working correctly?
- What metrics indicate business health vs technical health?
- How are false positives and alert fatigue prevented?

*Rate Limiting and Scaling:*
- How will volume spikes or operational constraints be handled?
- What happens when system capacity is exceeded?
- How are resources allocated during peak usage?

*Rollback and Recovery:*
- What happens when deployments need to be rolled back?
- How are data migrations reversed if they fail?
- What's the recovery process for corrupted data?

*Compliance and Audit:*
- How are regulatory requirements maintained during system changes?
- What happens when audit requirements conflict with performance needs?
- How are data retention policies enforced automatically?

*Support and Troubleshooting:*
- How will operational issues be diagnosed and resolved?
- What tools do support teams need for effective troubleshooting?
- How are escalation procedures handled during incidents?

ENHANCED EDGE CASE REQUIREMENTS:

For each issue identified, provide:
- **Specific Business Question**: Frame as a question that needs PRD clarification
- **Concrete Example Scenario**: When this would surface in real usage
- **Business Impact Assessment**: Revenue, compliance, or operational effect (MUST BE SPECIFIC)
- **Affected Journey Analysis**: Which flows are impacted and how
- **Operational Frequency**: How often this scenario might occur
- **Detection Method**: How this issue would be discovered
- **Resolution Complexity**: How difficult this would be to fix

CRITICAL BUSINESS IMPACT REQUIREMENTS:
- NEVER use "Impact not specified" or generic phrases
- ALWAYS provide specific, measurable business impact
- Include revenue estimates when possible (e.g., "Could cause $10K monthly revenue loss")
- Specify operational impact (e.g., "Increases support tickets by 30%")
- Mention compliance risks (e.g., "GDPR violation risk with €20M potential fine")
- Include user experience impact (e.g., "40% user drop-off rate")

Focus on scenarios that:
- Could actually happen in production environments
- Have measurable business impact
- Require clarification in the PRD
- Represent gaps in current thinking
- Could prevent successful product launch or operation

Return a JSON array with this exact structure:
[
  {
    "id": "unique_id",
    "category": "business_logic_gap|flow_inconsistency|operational_gap",
    "severity": "critical|moderate|minor",
    "title": "Question-focused title (What happens when...? How does...? Where is...?)",
    "description": "Specific business scenario explaining why this matters operationally",
    "affectedJourneys": ["array_of_journey_ids_affected"],
    "businessImpact": "SPECIFIC measurable impact on revenue, operations, compliance, or user experience with numbers/percentages when possible",
    "exampleScenario": "Concrete, realistic example of when this would surface in real usage",
    "operationalFrequency": "How often this scenario might occur (Daily, Weekly, Monthly, Rare)",
    "detectionMethod": "How this issue would be discovered (Monitoring, User reports, Audit, etc.)",
    "recommendation": "High-level approach to address the gap",
    "questionsToResolve": [
      "Specific question 1 that needs PRD clarification",
      "Specific question 2 that needs PRD clarification"
    ]
  }
]

BUSINESS IMPACT EXAMPLES (Use similar specificity):
- "Could cause 25% user churn during payment failures, resulting in $50K monthly revenue loss"
- "Increases customer support tickets by 40%, requiring 2 additional support staff ($120K annual cost)"
- "GDPR compliance violation risk with potential €20M fine for data retention issues"
- "System downtime during peak hours could cost $5K per hour in lost transactions"
- "Manual workarounds increase operational overhead by 15 hours/week ($30K annual cost)"
- "Poor user experience could reduce conversion rate from 12% to 8%, losing $25K monthly"

Severity Guidelines:
- **Critical**: Revenue impact >$10K, compliance violations, operational failures, data integrity issues, security vulnerabilities
- **Moderate**: User experience degradation, operational inefficiencies, scalability concerns, moderate revenue impact
- **Minor**: Edge case scenarios, optimization opportunities, nice-to-have clarifications, low-frequency issues

CRITICAL SUCCESS FACTORS:
1. Focus on business-critical scenarios that could actually impact product success
2. Frame each issue as specific questions that need PRD clarification
3. Provide concrete, realistic examples that stakeholders can understand
4. Consider the full operational lifecycle, not just development scenarios
5. Think about what happens when business conditions change unexpectedly
6. ALWAYS provide specific, measurable business impact - never use generic phrases

Return ONLY the JSON array, no additional text.
`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // Clean up the response to extract just the JSON
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
As a senior product manager, provide a comprehensive business readiness score for this PRD analysis.

${context.company ? `Company Context: ${context.company}` : ''}
${context.problemStatement ? `Problem Statement: ${context.problemStatement}` : ''}

Analysis Summary:
- Document Length: ${content.length} characters
- Total Business Journeys Identified: ${journeys.length}
- Total Business Logic Issues Found: ${edgeCases.length}
- Critical Business Issues: ${edgeCases.filter(e => e.severity === 'critical').length}
- Moderate Operational Issues: ${edgeCases.filter(e => e.severity === 'moderate').length}
- Minor Edge Cases: ${edgeCases.filter(e => e.severity === 'minor').length}

Evaluate the PRD's business readiness based on:

1. **Business Logic Completeness** (40%): 
   - Are core business flows well-defined and comprehensive?
   - Are revenue and operational impacts clearly specified?
   - Are success metrics and KPIs properly defined?
   - Are business rules and constraints thoroughly documented?
   - Is the full operational ecosystem covered (not just happy paths)?

2. **Operational Readiness** (30%):
   - Are monitoring and alerting requirements clearly specified?
   - Are scaling and performance considerations adequately addressed?
   - Are error handling and recovery procedures well-defined?
   - Are compliance and audit requirements properly specified?
   - Is the support and troubleshooting framework adequate?

3. **Cross-Functional Dependencies** (20%):
   - Are integration points and external dependencies clearly mapped?
   - Are data flow and state management requirements well-defined?
   - Are timing and frequency constraints properly specified?
   - Are stakeholder responsibilities and handoffs clear?
   - Is the impact on existing systems properly considered?

4. **Risk Mitigation** (10%):
   - Are potential business disruptions identified and planned for?
   - Are rollback and contingency plans adequately considered?
   - Are edge cases and failure scenarios properly addressed?
   - Is the change management strategy sufficient?

Scoring criteria based on comprehensive flow analysis:
- 90-100: Production-ready PRD with comprehensive business logic, operational considerations, and full ecosystem coverage (8+ journeys identified)
- 80-89: Strong PRD with minor gaps in operational details or edge case handling (6-8 journeys identified)
- 70-79: Good PRD foundation but needs clarification on business logic or operational requirements (4-6 journeys identified)
- 60-69: Adequate PRD but significant gaps in business readiness and operational planning (2-4 journeys identified)
- Below 60: PRD requires major revision for business logic completeness and operational readiness (0-2 journeys identified)

Additional scoring factors:
- Deduct 10-15 points if fewer than 6 distinct journeys were identified (indicates incomplete analysis)
- Deduct 5-10 points for each critical business logic gap
- Add 5-10 points if comprehensive operational flows are well-documented
- Consider the complexity and business impact of identified edge cases

Return only a number between 0-100 representing the business readiness score.
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