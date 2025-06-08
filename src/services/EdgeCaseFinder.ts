import { UserJourney, EdgeCase, AnalysisResult, PRDDocument, ProcessingStatus } from '../types';
import { GeminiService } from './GeminiService';

export class EdgeCaseFinder {
  private static updateProgress?: (status: ProcessingStatus) => void;

  static setProgressCallback(callback: (status: ProcessingStatus) => void) {
    this.updateProgress = callback;
  }

  static async analyzeDocument(
    document: PRDDocument,
    context: { company?: string; problemStatement?: string }
  ): Promise<AnalysisResult> {
    try {
      // Stage 1: Parsing
      this.updateProgress?.({
        stage: 'parsing',
        progress: 10,
        message: 'Initializing AI analysis...'
      });
      await this.delay(500);

      // Stage 2: Extracting journeys with AI
      this.updateProgress?.({
        stage: 'extracting',
        progress: 30,
        message: 'AI is extracting user journeys and workflows...'
      });
      
      const journeys = await GeminiService.analyzeForUserJourneys(document.content, context);
      await this.delay(800);

      // Stage 3: Analyzing for edge cases with AI
      this.updateProgress?.({
        stage: 'analyzing',
        progress: 60,
        message: 'AI is identifying edge cases and inconsistencies...'
      });
      
      const edgeCases = await GeminiService.analyzeForEdgeCases(document.content, journeys, context);
      await this.delay(1000);

      // Stage 4: Generating insights
      this.updateProgress?.({
        stage: 'generating',
        progress: 90,
        message: 'Generating comprehensive analysis report...'
      });
      
      const coverageScore = await GeminiService.generateInsights(document.content, journeys, edgeCases, context);
      await this.delay(600);

      const result: AnalysisResult = {
        id: Math.random().toString(36).substr(2, 9),
        documentName: document.name,
        analyzedAt: new Date(),
        context,
        journeys: this.validateJourneys(journeys),
        edgeCases: this.validateEdgeCases(edgeCases),
        summary: {
          totalJourneys: journeys.length,
          totalEdgeCases: edgeCases.length,
          criticalIssues: edgeCases.filter((e: EdgeCase) => e.severity === 'critical').length,
          coverageScore
        }
      };

      this.updateProgress?.({
        stage: 'complete',
        progress: 100,
        message: 'AI analysis complete!'
      });

      return result;
    } catch (error: any) {
      console.error('Analysis failed:', error);
      
      // Handle specific error types
      if (error.message === 'quota_exceeded') {
        this.updateProgress?.({
          stage: 'generating',
          progress: 95,
          message: 'API quota exceeded, showing demo analysis...'
        });
        return this.getFallbackAnalysis(document, context);
      } else if (error.message === 'invalid_api_key') {
        this.updateProgress?.({
          stage: 'generating',
          progress: 95,
          message: 'API key issue, showing demo analysis...'
        });
        return this.getFallbackAnalysis(document, context);
      } else {
        // Fallback to demo data for any other AI service issues
        this.updateProgress?.({
          stage: 'generating',
          progress: 95,
          message: 'AI service unavailable, showing demo analysis...'
        });
        
        return this.getFallbackAnalysis(document, context);
      }
    }
  }

  private static validateJourneys(journeys: any[]): UserJourney[] {
    if (!Array.isArray(journeys)) return [];
    
    return journeys.map((journey, index) => ({
      id: journey.id || `journey-${index}`,
      name: journey.name || `Journey ${index + 1}`,
      description: journey.description || 'No description provided',
      userType: journey.userType || 'User',
      priority: ['high', 'medium', 'low'].includes(journey.priority) ? journey.priority : 'medium',
      steps: Array.isArray(journey.steps) ? journey.steps.map((step: any, stepIndex: number) => ({
        id: step.id || `step-${index}-${stepIndex}`,
        action: step.action || `Action ${stepIndex + 1}`,
        description: step.description || 'No description provided',
        expectedOutcome: step.expectedOutcome || 'Expected outcome not specified',
        dependencies: Array.isArray(step.dependencies) ? step.dependencies : []
      })) : []
    }));
  }

  private static validateEdgeCases(edgeCases: any[]): EdgeCase[] {
    if (!Array.isArray(edgeCases)) return [];
    
    return edgeCases.map((edgeCase, index) => ({
      id: edgeCase.id || `edge-${index}`,
      category: ['missing_flow', 'inconsistency', 'ux_gap', 'logical_contradiction'].includes(edgeCase.category) 
        ? edgeCase.category : 'ux_gap',
      severity: ['critical', 'moderate', 'minor'].includes(edgeCase.severity) 
        ? edgeCase.severity : 'moderate',
      title: edgeCase.title || `Issue ${index + 1}`,
      description: edgeCase.description || 'No description provided',
      affectedJourneys: Array.isArray(edgeCase.affectedJourneys) ? edgeCase.affectedJourneys : [],
      recommendation: edgeCase.recommendation || 'No recommendation provided',
      impact: edgeCase.impact || 'Impact not specified'
    }));
  }

  private static async getFallbackAnalysis(document: PRDDocument, context: any): Promise<AnalysisResult> {
    // Fallback demo data when AI is unavailable
    const mockJourneys: UserJourney[] = [
      {
        id: '1',
        name: 'User Registration Flow',
        description: 'New user creates an account and completes onboarding',
        userType: 'New User',
        priority: 'high',
        steps: [
          {
            id: '1-1',
            action: 'Visit registration page',
            description: 'User navigates to sign-up form',
            expectedOutcome: 'Registration form loads successfully',
            dependencies: []
          },
          {
            id: '1-2',
            action: 'Fill registration form',
            description: 'User enters email, password, and basic info',
            expectedOutcome: 'Form validates input in real-time',
            dependencies: ['1-1']
          }
        ]
      }
    ];

    const mockEdgeCases: EdgeCase[] = [
      {
        id: '1',
        category: 'missing_flow',
        severity: 'critical',
        title: 'AI Analysis Unavailable',
        description: 'The AI service is currently unavailable. This is demo data to show the interface.',
        affectedJourneys: ['1'],
        recommendation: 'Check your API key and internet connection, then try again.',
        impact: 'Cannot perform real analysis of your PRD document.'
      }
    ];

    return {
      id: Math.random().toString(36).substr(2, 9),
      documentName: document.name,
      analyzedAt: new Date(),
      context,
      journeys: mockJourneys,
      edgeCases: mockEdgeCases,
      summary: {
        totalJourneys: mockJourneys.length,
        totalEdgeCases: mockEdgeCases.length,
        criticalIssues: 1,
        coverageScore: 0
      }
    };
  }

  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}