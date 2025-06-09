import { GoogleGenerativeAI } from '@google/generative-ai';

export class GeminiService {
  private static genAI: GoogleGenerativeAI;
  private static model: any;

  // FOCUSED PRD ANALYSIS PROMPT - SPECIFIC TO PRODUCT REQUIREMENTS
  private static readonly SYSTEM_PROMPT = `You are a senior product manager who specializes in PRD quality assurance. Your job is to identify specific problems, gaps, and inconsistencies in Product Requirements Documents that would prevent successful product development.

FOCUS: Find concrete, actionable problems in the PRD itself - not generic business advice.

WHAT TO LOOK FOR:

1. **REQUIREMENT GAPS**: 
   - Missing user roles or personas
   - Undefined user actions or flows
   - Vague or unmeasurable requirements
   - Missing success criteria or KPIs

2. **LOGICAL INCONSISTENCIES**:
   - Contradictory requirements
   - Impossible user flows
   - Missing dependencies between features
   - Conflicting business rules

3. **IMPLEMENTATION AMBIGUITIES**:
   - Unclear feature behavior
   - Missing error states
   - Undefined edge cases in user flows
   - Vague acceptance criteria

4. **MISSING CRITICAL DETAILS**:
   - User permissions and access control
   - Data validation rules
   - Integration requirements
   - Performance expectations

WHAT TO AVOID:
- Generic security recommendations not tied to specific PRD content
- Broad compliance suggestions without PRD context
- Theoretical business scenarios not mentioned in the document
- Technical implementation details not relevant to requirements

OUTPUT STYLE:
- Reference specific PRD sections when identifying problems
- Frame issues as questions that need clarification
- Provide concrete examples from the document
- Focus on what would block development or cause user confusion

Remember: Analyze what's actually written (or missing) in the PRD, not what generally should be in any product.`;

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
Analyze this document to determine if it's a Product Requirements Document (PRD) or product specification.

Document Content:
${content.substring(0, 4000)}${content.length > 4000 ? '...[truncated]' : ''}

Look for these PRD indicators:
- Feature descriptions and requirements
- User stories or use cases  
- Acceptance criteria or success metrics
- Product objectives or goals
- User flows or workflows
- Technical requirements or constraints

Avoid false positives from:
- Personal documents (recipes, letters, stories)
- Financial documents (invoices, statements)
- Legal documents (contracts, terms)
- Generic business content without product focus

Return ONLY this JSON:
{
  "isPRD": true/false,
  "confidence": 0-100,
  "reasons": ["reason 1", "reason 2", "reason 3"]
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
          reasons: Array.isArray(parsed.reasons) ? parsed.reasons : ['Analysis completed']
        };
      }
      
      throw new Error('Could not parse validation response');
    } catch (error) {
      this.handleApiError(error);
    }
  }

  static async analyzeForUserJourneys(content: string, context: { company?: string; problemStatement?: string }) {
    if (!this.model) this.initialize();

    // Create context string only if provided
    const contextString = [
      context.company ? `Company: ${context.company}` : '',
      context.problemStatement ? `Problem: ${context.problemStatement}` : ''
    ].filter(Boolean).join('\n');

    const prompt = `
Extract the main user flows described in this PRD. Focus only on flows that are explicitly mentioned or clearly implied in the document.

${contextString ? `Context:\n${contextString}\n` : ''}

PRD Document:
${content}

INSTRUCTIONS:
- Extract 4-8 user flows that are actually described in the PRD
- Don't invent flows that aren't mentioned in the document
- Focus on the core user interactions and workflows
- Include different user types if mentioned (end users, admins, etc.)

For each flow, identify:
- What user type performs it
- The main steps they take
- What triggers the flow
- What the expected outcome is

Return JSON array:
[
  {
    "id": "flow_1",
    "name": "Clear, descriptive flow name",
    "description": "What this flow accomplishes",
    "userType": "Who performs this (from PRD)",
    "trigger": "What starts this flow",
    "priority": "high|medium|low (based on PRD emphasis)",
    "steps": [
      {
        "id": "step_1",
        "action": "Specific user action",
        "description": "What happens in this step",
        "expectedOutcome": "What should result"
      }
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
      
      throw new Error('Could not parse user flows from response');
    } catch (error) {
      this.handleApiError(error);
    }
  }

  static async analyzeForEdgeCases(content: string, journeys: any[], context: { company?: string; problemStatement?: string }) {
    if (!this.model) this.initialize();

    const contextString = [
      context.company ? `Company: ${context.company}` : '',
      context.problemStatement ? `Problem: ${context.problemStatement}` : ''
    ].filter(Boolean).join('\n');

    const prompt = `
Analyze this PRD for specific problems, gaps, and inconsistencies that would prevent successful product development.

${contextString ? `Context:\n${contextString}\n` : ''}

PRD Document:
${content}

Identified User Flows:
${JSON.stringify(journeys, null, 2)}

FIND THESE SPECIFIC PROBLEMS:

1. **MISSING REQUIREMENTS**: What's not defined that should be?
2. **VAGUE SPECIFICATIONS**: What requirements are too unclear to implement?
3. **LOGICAL CONFLICTS**: What requirements contradict each other?
4. **INCOMPLETE FLOWS**: What steps are missing from user journeys?
5. **UNDEFINED BEHAVIORS**: What happens in error cases or edge situations?

ANALYSIS RULES:
- Only identify problems you can specifically point to in the PRD
- Reference exact sections or requirements when possible
- Don't suggest generic features not mentioned in the document
- Focus on what would confuse developers or block implementation
- Frame as specific questions that need PRD clarification

For each issue, ask yourself:
- Is this problem actually present in the PRD text?
- Would a developer be confused by this specific requirement?
- Can I point to the exact section that's problematic?

Return JSON array:
[
  {
    "id": "issue_1",
    "type": "missing_requirement|vague_specification|logical_conflict|incomplete_flow|undefined_behavior",
    "severity": "high|medium|low",
    "title": "Specific problem title",
    "description": "What exactly is wrong or missing",
    "prdSection": "Which part of PRD this affects (if identifiable)",
    "affectedFlows": ["flow_ids that are impacted"],
    "specificQuestion": "What exact question needs to be answered?",
    "blockingImpact": "Why this would prevent development or cause user issues",
    "suggestedClarification": "What should be added or clarified in the PRD"
  }
]

Severity guidelines:
- **High**: Blocks core functionality or causes major user confusion
- **Medium**: Causes implementation delays or minor user issues  
- **Low**: Nice-to-have clarifications or minor edge cases

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
      
      throw new Error('Could not parse issues from response');
    } catch (error) {
      this.handleApiError(error);
    }
  }

  static async generateInsights(content: string, journeys: any[], edgeCases: any[], context: { company?: string; problemStatement?: string }) {
    if (!this.model) this.initialize();

    const prompt = `
Score this PRD's readiness for development based on the analysis.

Analysis Results:
- User Flows Identified: ${journeys.length}
- Issues Found: ${edgeCases.length}
- High Severity Issues: ${edgeCases.filter(e => e.severity === 'high').length}

Evaluate based on:

1. **Requirement Completeness** (40%):
   - Are core features clearly defined?
   - Are user flows comprehensive?
   - Are success criteria specified?

2. **Specification Clarity** (30%):
   - Are requirements specific enough to implement?
   - Are acceptance criteria measurable?
   - Are edge cases addressed?

3. **Internal Consistency** (20%):
   - Are requirements logically coherent?
   - Do user flows make sense?
   - Are there contradictions?

4. **Implementation Readiness** (10%):
   - Can developers start building from this?
   - Are dependencies clear?
   - Are constraints specified?

Scoring:
- 90-100: Ready for development
- 80-89: Minor clarifications needed
- 70-79: Some gaps need addressing
- 60-69: Significant revision required
- Below 60: Major rewrite needed

Deduct points for:
- Each high severity issue: -10 points
- Each medium severity issue: -5 points
- Fewer than 3 user flows: -15 points
- Missing core requirements: -20 points

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