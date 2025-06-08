import jsPDF from 'jspdf'
import { AnalysisResult } from '../types'

export class ReportGenerator {
  static generateMarkdown(result: AnalysisResult): string {
    const { documentName, analyzedAt, context, journeys, edgeCases, summary } = result
    
    let markdown = `# PRD Edge Case Analysis Report\n\n`
    markdown += `**Document:** ${documentName}\n`
    markdown += `**Analyzed:** ${analyzedAt.toLocaleDateString()}\n`
    
    if (context.company) {
      markdown += `**Company:** ${context.company}\n`
    }
    
    if (context.problemStatement) {
      markdown += `**Problem Statement:** ${context.problemStatement}\n`
    }
    
    markdown += `\n## Executive Summary\n\n`
    markdown += `- **Total User Journeys:** ${summary.totalJourneys}\n`
    markdown += `- **Edge Cases Identified:** ${summary.totalEdgeCases}\n`
    markdown += `- **Critical Issues:** ${summary.criticalIssues}\n`
    markdown += `- **Coverage Score:** ${summary.coverageScore}%\n\n`
    
    markdown += `## User Journeys\n\n`
    journeys.forEach(journey => {
      markdown += `### ${journey.name}\n`
      markdown += `**User Type:** ${journey.userType}\n`
      markdown += `**Priority:** ${journey.priority}\n`
      markdown += `**Description:** ${journey.description}\n\n`
      
      markdown += `**Steps:**\n`
      journey.steps.forEach((step, index) => {
        markdown += `${index + 1}. **${step.action}:** ${step.description}\n`
        markdown += `   - Expected: ${step.expectedOutcome}\n`
      })
      markdown += `\n`
    })
    
    markdown += `## Edge Cases & Issues\n\n`
    
    const groupedCases = edgeCases.reduce((acc, edgeCase) => {
      if (!acc[edgeCase.category]) acc[edgeCase.category] = []
      acc[edgeCase.category].push(edgeCase)
      return acc
    }, {} as Record<string, typeof edgeCases>)
    
    Object.entries(groupedCases).forEach(([category, cases]) => {
      markdown += `### ${category.replace(/_/g, ' ').toUpperCase()}\n\n`
      
      cases.forEach(edgeCase => {
        markdown += `#### ${edgeCase.title} (${edgeCase.severity.toUpperCase()})\n`
        markdown += `**Description:** ${edgeCase.description}\n\n`
        markdown += `**Affected Journeys:** ${edgeCase.affectedJourneys.join(', ')}\n\n`
        markdown += `**Recommendation:** ${edgeCase.recommendation}\n\n`
        markdown += `**Impact:** ${edgeCase.impact}\n\n`
        markdown += `---\n\n`
      })
    })
    
    return markdown
  }

  static generateJSON(result: AnalysisResult): string {
    return JSON.stringify(result, null, 2)
  }

  static async generatePDF(result: AnalysisResult): Promise<Blob> {
    const pdf = new jsPDF()
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const margin = 20
    const lineHeight = 7
    let yPosition = margin

    // Helper function to add text with word wrapping
    const addText = (text: string, fontSize: number = 12, isBold: boolean = false) => {
      pdf.setFontSize(fontSize)
      pdf.setFont('helvetica', isBold ? 'bold' : 'normal')
      
      const lines = pdf.splitTextToSize(text, pageWidth - 2 * margin)
      
      // Check if we need a new page
      if (yPosition + (lines.length * lineHeight) > pageHeight - margin) {
        pdf.addPage()
        yPosition = margin
      }
      
      lines.forEach((line: string) => {
        pdf.text(line, margin, yPosition)
        yPosition += lineHeight
      })
      
      yPosition += 3 // Extra spacing after text blocks
    }

    // Title
    addText('PRD Edge Case Analysis Report', 20, true)
    yPosition += 10

    // Document info
    addText(`Document: ${result.documentName}`, 14, true)
    addText(`Analyzed: ${result.analyzedAt.toLocaleDateString()}`)
    
    if (result.context.company) {
      addText(`Company: ${result.context.company}`)
    }
    
    if (result.context.problemStatement) {
      addText(`Problem Statement: ${result.context.problemStatement}`)
    }
    
    yPosition += 10

    // Executive Summary
    addText('Executive Summary', 16, true)
    addText(`• Total User Journeys: ${result.summary.totalJourneys}`)
    addText(`• Edge Cases Identified: ${result.summary.totalEdgeCases}`)
    addText(`• Critical Issues: ${result.summary.criticalIssues}`)
    addText(`• Coverage Score: ${result.summary.coverageScore}%`)
    
    yPosition += 10

    // User Journeys
    addText('User Journeys', 16, true)
    result.journeys.forEach(journey => {
      addText(`${journey.name}`, 14, true)
      addText(`User Type: ${journey.userType}`)
      addText(`Priority: ${journey.priority}`)
      addText(`Description: ${journey.description}`)
      
      addText('Steps:', 12, true)
      journey.steps.forEach((step, index) => {
        addText(`${index + 1}. ${step.action}: ${step.description}`)
        addText(`   Expected: ${step.expectedOutcome}`)
      })
      
      yPosition += 5
    })

    // Edge Cases
    addText('Edge Cases & Issues', 16, true)
    
    const groupedCases = result.edgeCases.reduce((acc, edgeCase) => {
      if (!acc[edgeCase.category]) acc[edgeCase.category] = []
      acc[edgeCase.category].push(edgeCase)
      return acc
    }, {} as Record<string, typeof result.edgeCases>)
    
    Object.entries(groupedCases).forEach(([category, cases]) => {
      addText(category.replace(/_/g, ' ').toUpperCase(), 14, true)
      
      cases.forEach(edgeCase => {
        addText(`${edgeCase.title} (${edgeCase.severity.toUpperCase()})`, 12, true)
        addText(`Description: ${edgeCase.description}`)
        addText(`Affected Journeys: ${edgeCase.affectedJourneys.join(', ')}`)
        addText(`Recommendation: ${edgeCase.recommendation}`)
        addText(`Impact: ${edgeCase.impact}`)
        yPosition += 5
      })
    })

    return new Blob([pdf.output('blob')], { type: 'application/pdf' })
  }

  static downloadFile(content: string | Blob, filename: string, type: string) {
    const blob = content instanceof Blob ? content : new Blob([content], { type })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }
}