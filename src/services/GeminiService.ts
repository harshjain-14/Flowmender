import { GoogleGenerativeAI } from '@google/generative-ai';

export class GeminiService {
  private static genAI: GoogleGenerativeAI;
  private static model: any;

  // FOCUSED SYSTEM PROMPT - PRD-SPECIFIC ANALYSIS
  private static readonly SYSTEM_PROMPT = `You are a senior product manager reviewing PRDs for launch readiness. Your job is to identify specific gaps and inconsistencies that would prevent successful product implementation.

FOCUS AREAS (in priority order):

1. **USER FLOW GAPS**: Missing steps, unclear transitions, undefined states
2. **BUSINESS LOGIC INCONSISTENCIES**: Conflicting rules, undefined behaviors, missing conditions
3. **INTEGRATION BLIND SPOTS**: Undefined handoffs, missing API details, unclear data flows
4. **EDGE CASE SCENARIOS**: Specific situations the PRD doesn't address that users will encounter

ANALYSIS FRAMEWORK:

**CORE USER JOURNEYS** (Focus on 3-5 main flows):
- Primary user onboarding and activation
- Core feature usage workflows  
- Account/subscription management
- Support and error recovery

**BUSINESS LOGIC REVIEW**:
- What happens when X occurs?
- How are conflicts resolved?
- What are the decision criteria?
- Where are approval workflows needed?

**INTEGRATION POINTS**:
- How does data flow between systems?
- What happens when external services fail?
- How are dependencies managed?

CRITICAL: Focus on SPECIFIC, ACTIONABLE gaps that need PRD clarification. Avoid generic security/compliance issues unless directly relevant to the product functionality described.

For each issue identified:
- Point to specific PRD sections (or note what's missing)
- Explain why this matters for implementation
- Suggest specific questions that need answers`;

  static initialize() {
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
        temperature: 0.2, // Slightly higher for more nuanced analysis
        topP: 0.9,
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
Extract the PRIMARY user journeys from this PRD. Focus on 3-5 core flows that represent the main product functionality.

${context.company ? `Company Context: ${context.company}` : ''}
${context.problemStatement ? `Problem Statement: ${context.problemStatement}` : ''}

PRD Document:
${content}

EXTRACT ONLY CORE JOURNEYS:

1. **Primary User Flow**: Main user onboarding and first value realization
2. **Core Feature Usage**: How users interact with the main product features
3. **Account Management**: User profile, settings, subscription management
4. **Support/Recovery**: How users get help or recover from errors
5. **Admin Flows** (if applicable): Admin/management workflows mentioned in PRD

For each journey, focus on:
- What the user is trying to accomplish
- The specific steps mentioned or implied in the PRD
- Where the PRD is unclear about transitions or logic
- What success looks like for this flow

IMPORTANT: 
- Only extract journeys that are clearly described or implied in the PRD
- Don't invent flows that aren't mentioned
- Focus on user-facing journeys, not internal operations
- Keep descriptions specific to what's in the PRD

Return JSON array:
[
  {
    "id": "journey_id",
    "name": "Clear Journey Name",
    "description": "What this journey accomplishes and why it matters",
    "userType": "End User|Admin|Support|etc.",
    "triggerEvent": "What starts this journey",
    "expectedOutcome": "What success looks like",
    "steps": [
      {
        "id": "step_id",
        "action": "Specific user action or system behavior",
        "description": "What happens at this step",
        "prdReference": "Quote or reference from PRD, or note if missing",
        "clarity": "clear|unclear|missing",
        "dependencies": ["What needs to happen first"]
      }
    ],
    "gapsIdentified": [
      "Specific things unclear or missing from PRD for this journey"
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
Analyze this PRD for specific gaps and inconsistencies that would block implementation. Focus ONLY on issues directly related to the product functionality described.

${context.company ? `Company Context: ${context.company}` : ''}
${context.problemStatement ? `Problem Statement: ${context.problemStatement}` : ''}

PRD Document:
${content}

Extracted User Journeys:
${JSON.stringify(journeys, null, 2)}

ANALYSIS FOCUS AREAS:

**1. USER FLOW GAPS** (What's missing or unclear):
- Undefined states: What happens when a user is in state X?
- Missing transitions: How does user go from A to B?
- Error scenarios: What if step 3 fails?
- Edge cases: What if user does X instead of Y?

**2. BUSINESS LOGIC INCONSISTENCIES** (Rules and decisions):
- Conflicting statements in the PRD
- Undefined decision criteria
- Missing approval workflows
- Unclear data validation rules

**3. INTEGRATION QUESTIONS** (System interactions):
- Missing API specifications
- Unclear data handoffs
- Third-party service dependencies
- Data synchronization needs

**4. IMPLEMENTATION BLOCKERS** (What devs need to know):
- Unclear acceptance criteria
- Missing success metrics
- Undefined error messages
- Performance requirements

For each gap, provide:
- **Specific PRD Reference**: Quote the relevant section or note what's missing
- **Why This Matters**: How this gap would impact implementation
- **Concrete Example**: A specific scenario that illustrates the problem

AVOID:
- Generic security recommendations
- General compliance requirements
- Infrastructure concerns not mentioned in PRD
- Features not described in the document

Return JSON array:
[
  {
    "id": "gap_id",
    "category": "user_flow_gap|business_logic_inconsistency|integration_question|implementation_blocker",
    "severity": "critical|moderate|minor",
    "title": "Specific, actionable title",
    "description": "Clear explanation of what's missing or unclear",
    "prdReference": "Quote from PRD or 'Section X missing' or 'Not addressed'",
    "affectedJourneys": ["journey_ids_that_are_impacted"],
    "specificExample": "Concrete scenario: 'When user does X, what should happen?'",
    "implementationImpact": "How this blocks or complicates development",
    "questionsToResolve": [
      "Specific question 1 for product team",
      "Specific question 2 for product team"
    ]
  }
]

Severity Guidelines:
- **Critical**: Blocks core user journeys, prevents feature from working
- **Moderate**: Creates user confusion, complicates implementation
- **Minor**: Edge cases, optimization opportunities

Focus on gaps that are specific to THIS PRD and product. Return ONLY the JSON array.
`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      throw new Error('Could not parse analysis from AI response');
    } catch (error) {
      this.handleApiError(error);
    }
  }

  static async generateInsights(content: string, journeys: any[], issues: any[], context: { company?: string; problemStatement?: string }) {
    if (!this.model) this.initialize();

    const prompt = `
Generate a PRD readiness score based on this analysis.

Analysis Summary:
- User Journeys Identified: ${journeys.length}
- Implementation Issues Found: ${issues.length}
- Critical Issues: ${issues.filter(e => e.severity === 'critical').length}

Scoring Criteria:

**User Journey Clarity** (40 points):
- Are core user flows well-defined?
- Are step-by-step processes clear?
- Are success criteria defined?

**Business Logic Completeness** (30 points):
- Are decision rules clear?
- Are edge cases addressed?
- Are error scenarios defined?

**Implementation Readiness** (20 points):
- Can developers build from this PRD?
- Are acceptance criteria clear?
- Are integration points defined?

**Overall Consistency** (10 points):
- Is the document internally consistent?
- Are there conflicting requirements?

Deduct points:
- 15 points per critical issue
- 8 points per moderate issue  
- 3 points per minor issue

Bonus points:
- +5 if all core journeys are well-documented
- +5 if edge cases are proactively addressed

Return a single number between 0-100 representing readiness score.
`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      const score = parseInt(text.trim());
      return isNaN(score) ? 65 : Math.max(0, Math.min(100, score));
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