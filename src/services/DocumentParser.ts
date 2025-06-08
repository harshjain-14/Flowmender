import { PRDDocument } from '../types';

export class DocumentParser {
  static async parseFile(file: File): Promise<PRDDocument> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          let content = e.target?.result as string;
          let parsedContent = content;

          // Remove null characters and other problematic Unicode sequences
          content = content.replace(/\u0000/g, '').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

          // Simulate different parsing logic based on file type
          if (file.type === 'application/pdf') {
            parsedContent = await this.parsePDF(content);
          } else if (file.type.includes('document')) {
            parsedContent = await this.parseDOCX(content);
          } else {
            parsedContent = content;
          }

          // Clean the final parsed content as well
          parsedContent = parsedContent.replace(/\u0000/g, '').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

          const document: PRDDocument = {
            id: Math.random().toString(36).substr(2, 9),
            name: file.name,
            content: parsedContent,
            type: this.getDocumentType(file),
            size: file.size,
            uploadedAt: new Date()
          };

          resolve(document);
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => reject(new Error('Failed to read file'));
      
      // For binary files, we should ideally use different parsing methods
      // but for now, we'll read as text and clean the content
      if (file.type === 'application/pdf' || file.type.includes('document')) {
        // For binary files, we'll still read as text but with better error handling
        reader.readAsText(file, 'UTF-8');
      } else {
        reader.readAsText(file);
      }
    });
  }

  private static async parsePDF(content: string): Promise<string> {
    // Simulate PDF parsing - in production, use a library like pdf-parse
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // For demo purposes, extract readable text from the content
    const readableText = content.replace(/[^\x20-\x7E\n\r\t]/g, ' ').replace(/\s+/g, ' ').trim();
    
    return `[PDF Content Parsed]\n\nExtracted Text:\n${readableText.substring(0, 1000)}${readableText.length > 1000 ? '...' : ''}`;
  }

  private static async parseDOCX(content: string): Promise<string> {
    // Simulate DOCX parsing - in production, use a library like mammoth
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // For demo purposes, extract readable text from the content
    const readableText = content.replace(/[^\x20-\x7E\n\r\t]/g, ' ').replace(/\s+/g, ' ').trim();
    
    return `[DOCX Content Parsed]\n\nExtracted Text:\n${readableText.substring(0, 1000)}${readableText.length > 1000 ? '...' : ''}`;
  }

  private static getDocumentType(file: File): 'pdf' | 'docx' | 'text' {
    if (file.type === 'application/pdf') return 'pdf';
    if (file.type.includes('document')) return 'docx';
    return 'text';
  }

  static extractMetadata(content: string) {
    // Clean content before processing
    const cleanContent = content.replace(/\u0000/g, '').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    const lines = cleanContent.split('\n');
    const metadata = {
      sections: [] as string[],
      features: [] as string[],
      userTypes: [] as string[]
    };

    lines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed.match(/^#{1,3}\s/)) {
        metadata.sections.push(trimmed.replace(/^#+\s/, ''));
      }
      if (trimmed.toLowerCase().includes('user') || trimmed.toLowerCase().includes('customer')) {
        const userType = trimmed.match(/\b\w+\s+user\b/gi)?.[0];
        if (userType && !metadata.userTypes.includes(userType)) {
          metadata.userTypes.push(userType);
        }
      }
    });

    return metadata;
  }
}