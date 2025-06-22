import { GeminiService } from './GeminiService'

export class DocumentValidator {
  static async validatePRD(content: string): Promise<{ isPRD: boolean; confidence: number; reasons: string[] }> {
    // Simplified validation - just check basic content requirements
    return this.simpleValidation(content)
  }

  private static simpleValidation(content: string): { isPRD: boolean; confidence: number; reasons: string[] } {
    const cleanContent = content.toLowerCase().replace(/[^\w\s]/g, ' ')
    const words = cleanContent.split(/\s+/)
    
    // Basic PRD keywords
    const prdKeywords = [
      'product', 'requirements', 'feature', 'user', 'functionality',
      'specification', 'workflow', 'process', 'system', 'application',
      'interface', 'design', 'development', 'implementation', 'business',
      'objective', 'goal', 'scope', 'overview', 'description'
    ]
    
    let score = 0
    const reasons: string[] = []
    
    // Check for PRD keywords
    const prdMatches = prdKeywords.filter(keyword => 
      cleanContent.includes(keyword.toLowerCase())
    )
    score += prdMatches.length * 2
    
    if (prdMatches.length > 0) {
      reasons.push(`Found ${prdMatches.length} product-related terms`)
    }
    
    // Length check
    if (words.length < 50) {
      score -= 10
      reasons.push('Document seems too short')
    } else if (words.length > 100) {
      score += 10
      reasons.push('Document has substantial content')
    }
    
    // Calculate confidence
    const confidence = Math.max(0, Math.min(100, score * 2))
    const isPRD = confidence > 20 // Very low threshold
    
    // Add overall assessment
    if (confidence > 60) {
      reasons.unshift('High confidence: This appears to be a product document')
    } else if (confidence > 20) {
      reasons.unshift('Moderate confidence: This may be a product-related document')
    } else {
      reasons.unshift('Low confidence: This may not be a typical product document')
    }
    
    return {
      isPRD,
      confidence: Math.round(confidence),
      reasons
    }
  }
}