import { GeminiService } from './GeminiService'

export class DocumentValidator {
  static async validatePRD(content: string): Promise<{ isPRD: boolean; confidence: number; reasons: string[] }> {
    try {
      // Use Gemini AI for intelligent PRD validation
      const validation = await GeminiService.validatePRDDocument(content)
      return validation
    } catch (error) {
      console.error('AI validation failed, falling back to keyword-based validation:', error)
      // Fallback to keyword-based validation if AI fails
      return this.fallbackValidation(content)
    }
  }

  private static fallbackValidation(content: string): { isPRD: boolean; confidence: number; reasons: string[] } {
    const cleanContent = content.toLowerCase().replace(/[^\w\s]/g, ' ')
    const words = cleanContent.split(/\s+/)
    
    // PRD-specific keywords and phrases
    const prdKeywords = [
      // Core PRD terms
      'product requirements', 'product requirement', 'prd', 'requirements document',
      'functional requirements', 'non-functional requirements', 'user stories',
      'acceptance criteria', 'success metrics', 'kpis', 'objectives',
      
      // User-focused terms
      'user journey', 'user flow', 'user experience', 'user interface',
      'persona', 'user persona', 'target audience', 'end user',
      'customer', 'stakeholder', 'use case', 'user story',
      
      // Product terms
      'feature', 'functionality', 'capability', 'specification',
      'wireframe', 'mockup', 'prototype', 'mvp', 'minimum viable product',
      'roadmap', 'milestone', 'release', 'sprint', 'iteration',
      
      // Business terms
      'business logic', 'business rules', 'business requirements',
      'revenue', 'monetization', 'pricing', 'market', 'competition',
      'value proposition', 'problem statement', 'solution',
      
      // Technical terms
      'api', 'integration', 'database', 'architecture', 'system',
      'platform', 'framework', 'security', 'performance', 'scalability',
      'authentication', 'authorization', 'workflow', 'process'
    ]
    
    // Document structure indicators
    const structureKeywords = [
      'overview', 'introduction', 'scope', 'assumptions', 'constraints',
      'dependencies', 'risks', 'timeline', 'deliverables', 'appendix',
      'glossary', 'references', 'version', 'changelog', 'revision'
    ]
    
    // Anti-patterns (things that suggest it's NOT a PRD)
    const antiPatterns = [
      'recipe', 'cooking', 'ingredients', 'temperature', 'oven',
      'novel', 'chapter', 'character', 'plot', 'story',
      'poem', 'verse', 'rhyme', 'stanza',
      'invoice', 'payment', 'billing', 'receipt',
      'medical', 'diagnosis', 'treatment', 'patient', 'doctor',
      'legal', 'contract', 'agreement', 'clause', 'whereas'
    ]
    
    let score = 0
    let maxScore = 0
    const reasons: string[] = []
    
    // Check for PRD keywords
    const prdMatches = prdKeywords.filter(keyword => 
      cleanContent.includes(keyword.toLowerCase())
    )
    score += prdMatches.length * 2
    maxScore += prdKeywords.length * 2
    
    if (prdMatches.length > 0) {
      reasons.push(`Found ${prdMatches.length} PRD-related terms: ${prdMatches.slice(0, 3).join(', ')}${prdMatches.length > 3 ? '...' : ''}`)
    }
    
    // Check for document structure
    const structureMatches = structureKeywords.filter(keyword => 
      cleanContent.includes(keyword.toLowerCase())
    )
    score += structureMatches.length
    maxScore += structureKeywords.length
    
    if (structureMatches.length > 0) {
      reasons.push(`Document structure indicators found: ${structureMatches.slice(0, 3).join(', ')}`)
    }
    
    // Check for anti-patterns
    const antiMatches = antiPatterns.filter(pattern => 
      cleanContent.includes(pattern.toLowerCase())
    )
    score -= antiMatches.length * 3
    
    if (antiMatches.length > 0) {
      reasons.push(`Non-PRD content detected: ${antiMatches.slice(0, 2).join(', ')}`)
    }
    
    // Length check
    if (words.length < 100) {
      score -= 10
      reasons.push('Document seems too short for a comprehensive PRD')
    } else if (words.length > 500) {
      score += 5
      reasons.push('Document length suggests comprehensive content')
    }
    
    // Calculate confidence
    const confidence = Math.max(0, Math.min(100, (score / Math.max(maxScore, 1)) * 100))
    const isPRD = confidence > 30 // Threshold for considering it a PRD
    
    // Add overall assessment
    if (confidence > 70) {
      reasons.unshift('High confidence: This appears to be a well-structured PRD')
    } else if (confidence > 30) {
      reasons.unshift('Moderate confidence: This may be a PRD or related product document')
    } else {
      reasons.unshift('Low confidence: This does not appear to be a typical PRD document')
    }
    
    return {
      isPRD,
      confidence: Math.round(confidence),
      reasons
    }
  }
}