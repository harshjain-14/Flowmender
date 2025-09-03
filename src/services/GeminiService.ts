import { GoogleGenerativeAI } from '@google/generative-ai';

export class GeminiService {
  private static genAI: GoogleGenerativeAI;
  private static model: any;

  // SIMPLIFIED AND FOCUSED SYSTEM PROMPT
  private static readonly SYSTEM_PROMPT = `Core Instructions
You are an experienced product manager who has launched 50+ products and seen them fail due to overlooked requirements gaps. Your job is to read PRDs with a critical eye and identify the real problems that will surface during development and launch.
Focus Areas
PRIMARY OBJECTIVES:

Identify 3-5 core user journeys that are actually described or implied in the PRD
Find specific gaps, ambiguities, and missing logic in those journeys that will block development
Focus on problems that cause real pain: confused developers, broken user experiences, launch delays, impossible metrics

Analysis Framework
BE SPECIFIC AND CRITICAL:

Don't invent features not mentioned in the PRD
Don't add generic security/compliance issues unless they're relevant to the specific product
Point out actual ambiguities and missing details with concrete examples
Ask hard questions about edge cases that matter for THIS specific product
Focus on what's unclear or missing that would prevent a developer from building it
Highlight contradictions within the PRD itself

AVOID:

Generic business advice ("consider market research")
Standard security/compliance checklists
Made-up user flows not described in the PRD
Theoretical edge cases that don't apply to this product
High-level strategy recommendations

Output Structure
1. Core User Journeys Identified
List 3-5 specific user journeys that are described or clearly implied in the PRD. Format each as:
Journey X: [Brief description]
Flow: [Step-by-step flow from the PRD]
2. Critical Gaps That Will Block Development
For each major gap, provide:

Problem: Clear statement of what's missing/ambiguous
Specific Gaps: Bulleted list of exact details that are undefined
Impact: How this will specifically hurt development or user experience

3. Questions That Need Immediate Answers
Categorize urgent questions by:

Technical Architecture
Business Logic
Success Metrics

Example Analysis
INPUT PRD: Event-Based Email Triggers for B2B2C health benefits platform
Key Features from PRD:

Send emails before life events (birthdays, anniversaries) to drive health checkup bookings, insurance purchases, gym memberships
Guardrail system: Max 3 emails per user per 7-day rolling window, with priority override
Success metrics: 30% open rate, ₹1.5L+ monthly revenue
HR controls to pause/resume emails by company
Send times: 10 AM weekdays, 11 AM weekends

OUTPUT ANALYSIS:
Core User Journeys Identified
Journey 1: Employee receives event-based reminder → clicks CTA → makes purchase
Flow: System detects life event approaching → checks guardrails → sends personalized email → user opens → clicks CTA → lands on app → converts
Journey 2: HR admin wants to control email volume for their company
Flow: HR notices too many emails going to employees → accesses toggle → pauses/resumes triggers → employees stop/resume receiving emails
Journey 3: User hits email cap during busy life event period
Flow: User receives 3 emails in 7 days → new higher priority trigger occurs → system overrides lowest priority → user receives new email
Critical Gaps That Will Block Development
1. Data Source Crisis - Where Does Event Data Come From?
Problem: The entire system depends on knowing when birthdays, anniversaries, and work anniversaries occur, but there's ZERO specification of data sources.
Specific Gaps:

Which HR systems integration points exist?
Is this self-reported data from employees?
What happens when data is missing/incomplete?
How do you handle data quality issues (wrong dates, missing spouse info)?
What's the data refresh cadence?

Impact: Development team can't build the core trigger logic without knowing where to pull event data from.
2. Guardrail System Logic Holes
Problem: The 7-day rolling window logic has multiple undefined scenarios that will break in production.
Specific Gaps:

What happens when multiple same-priority emails trigger simultaneously?
The example shows "Gym Expiry Reminder" but gym reminders aren't in the priority table - what's their priority?
How does the system handle email delivery failures in the guardrail count?
What timezone is used for the 7-day window calculation?

Impact: Developers will have to make assumptions that could create inconsistent user experiences.
Questions That Need Immediate Answers
Technical Architecture:

What existing systems need integration for event data, email delivery, and conversion tracking?
Are triggers processed real-time or in daily batches?

Business Logic:
3. What happens when an employee leaves the company mid-trigger cycle?
4. How do you handle employees who don't want to share family birthday data?
Success Metrics:
5. How long after email click do you count conversions?
6. What's the current organic conversion rate without these emails?
Final Instructions
Focus on being the critical voice that prevents launching broken products. Your analysis should make the product team say "Oh no, we need to fix these gaps before we build anything" rather than "Nice suggestions, we'll consider them later."
Prioritize gaps that will either:

Block developers from writing code
Create broken user experiences
Make success metrics impossible to measure accurately
Cause the product to fail at launch due to fundamental logic errors`;

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
        temperature: 0.3, // Slightly higher for more nuanced analysis
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
Analyze this document to determine if it's a Product Requirements Document (PRD) or product specification.

Document Content:
${content.substring(0, 4000)}${content.length > 4000 ? '...[truncated]' : ''}

Look for:
- Product features and requirements
- User stories or use cases  
- Technical specifications
- Business objectives
- User journeys or workflows

Avoid false positives for:
- Personal documents, recipes, stories
- Financial documents, invoices
- Legal documents, contracts
- Academic papers, news articles

Return ONLY this JSON:
{
  "isPRD": true/false,
  "confidence": 0-100,
  "reasons": ["reason1", "reason2", "reason3"]
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
      
      throw new Error('Could not parse validation response');
    } catch (error) {
      this.handleApiError(error);
    }
  }

  static async analyzeForUserJourneys(content: string, context: { company?: string; problemStatement?: string }) {
    if (!this.model) this.initialize();

    // Build context string only if provided
    const contextInfo = [
      context.company ? `Company: ${context.company}` : '',
      context.problemStatement ? `Problem Statement: ${context.problemStatement}` : ''
    ].filter(Boolean).join('\n');

    const prompt = `
Read this PRD and identify the 3-5 most important user journeys that are actually described or clearly implied.

${contextInfo ? `Context:\n${contextInfo}\n` : ''}

PRD Document:
${content}

INSTRUCTIONS:
1. Only extract journeys that are actually mentioned or clearly implied in the PRD, but your job is to think of journeys that were missed
2. Focus on the core flows that users will actually go through
3. Be specific about what the PRD says vs what's missing
4. Don't invent features or flows not mentioned
5. IMP: Extract atleast 3 different user journeys

For each journey, extract:
- What the user is trying to accomplish
- The steps they take (based on what's described in the PRD)
- Where the PRD is unclear or missing important details
- Critical decision points or branching logic

Return JSON array:
[
  {
    "id": "journey_1",
    "name": "Clear, specific journey name",
    "description": "What this journey accomplishes for the user",
    "userType": "Who performs this journey",
    "priority": "high|medium|low",
    "steps": [
      {
        "id": "step_1",
        "action": "Specific action the user takes",
        "description": "What happens in this step",
        "prdClarity": "clear|unclear|missing",
        "gaps": ["Specific things that are unclear or missing"]
      }
    ],
    "criticalQuestions": [
      "Specific questions about this journey that the PRD doesn't answer"
    ]
  }
  {
    "id": "journey_2",
    "name": "Clear, specific journey name",
    "description": "What this journey accomplishes for the user",
    "userType": "Who performs this journey",
    "priority": "high|medium|low",
    "steps": [
      {
        "id": "step_1",
        "action": "Specific action the user takes",
        "description": "What happens in this step",
        "prdClarity": "clear|unclear|missing",
        "gaps": ["Specific things that are unclear or missing"]
      }
    ],
    "criticalQuestions": [
      "Specific questions about this journey that the PRD doesn't answer"
    ]
  }
]

Return ONLY the JSON array.
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

    const contextInfo = [
      context.company ? `Company: ${context.company}` : '',
      context.problemStatement ? `Problem Statement: ${context.problemStatement}` : ''
    ].filter(Boolean).join('\n');

    const prompt = `
Based on this PRD and the extracted user journeys, identify the most critical gaps and issues that will cause problems during development or after launch.

${contextInfo ? `Context:\n${contextInfo}\n` : ''}

PRD Document:
${content}

User Journeys Found:
${JSON.stringify(journeys, null, 2)}

FOCUS ON REAL PROBLEMS:
1. Requirements that are ambiguous or contradictory
2. Missing error handling or failure scenarios
3. Unclear business logic or decision rules
4. Integration points that aren't well defined
5. User experience gaps that will confuse users
6. Missing validation or data requirements

FOR EACH ISSUE:
- Be specific about what's missing or unclear
- Explain why this will cause problems
- Reference specific parts of the PRD
- Focus on issues relevant to THIS product, not generic problems

AVOID:
- Generic security/compliance issues unless specifically relevant
- Theoretical edge cases that don't apply to this product
- Issues that are outside the scope of what's described in the PRD

Return JSON array:
[
  {
    "id": "issue_1",
    "title": "Specific, actionable title describing the gap",
    "severity": "critical|high|medium",
    "category": "requirements_gap|logic_unclear|integration_missing|error_handling|user_experience",
    "description": "Clear explanation of what's missing or unclear",
    "impact": "Why this will cause problems - be specific",
    "affectedJourneys": ["journey_ids_affected"],
    "prdReferences": "Specific sections or quotes from the PRD",
    "questionsToResolve": [
      "Specific question 1 that needs to be answered",
      "Specific question 2 that needs to be answered"
    ],
    "recommendation": "What should be done to address this"
  }
]

Severity Guidelines:
- Critical: Will block development or cause major launch issues
- High: Will cause user confusion or significant rework
- Medium: Important to clarify but won't block progress

Return ONLY the JSON array.
`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      throw new Error('Could not parse issues from AI response');
    } catch (error) {
      this.handleApiError(error);
    }
  }

  static async generateInsights(content: string, journeys: any[], issues: any[], context: { company?: string; problemStatement?: string }) {
    if (!this.model) this.initialize();

    const criticalIssues = issues.filter(i => i.severity === 'critical').length;
    const highIssues = issues.filter(i => i.severity === 'high').length;
    const journeyCount = journeys.length;

    const prompt = `
Provide a readiness score for this PRD based on the analysis.

Analysis Summary:
- User Journeys Identified: ${journeyCount}
- Critical Issues: ${criticalIssues}
- High Priority Issues: ${highIssues}
- Total Issues: ${issues.length}

Scoring Logic:
- Start with base score of 85
- Deduct 15 points for each critical issue
- Deduct 8 points for each high priority issue  
- Deduct 3 points for each medium priority issue
- Add 5 points if 4+ clear user journeys identified
- Deduct 10 points if fewer than 3 user journeys identified

The score should reflect how ready this PRD is for development to begin.

Return only a number between 0-100.
`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      const score = parseInt(text.trim());
      return isNaN(score) ? 70 : Math.max(0, Math.min(100, score));
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