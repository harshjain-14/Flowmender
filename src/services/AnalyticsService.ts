// Analytics service for tracking user interactions
export class AnalyticsService {
  // Track custom events with Microsoft Clarity
  static trackEvent(eventName: string, properties?: Record<string, any>) {
    try {
      // Check if Clarity is loaded
      if (typeof window !== 'undefined' && (window as any).clarity) {
        (window as any).clarity('event', eventName, properties);
      }
    } catch (error) {
      console.warn('Analytics tracking failed:', error);
    }
  }

  // Track page views
  static trackPageView(pageName: string) {
    this.trackEvent('page_view', { page: pageName });
  }

  // Track user actions
  static trackUserAction(action: string, details?: Record<string, any>) {
    this.trackEvent('user_action', { action, ...details });
  }

  // Track analysis events
  static trackAnalysis(eventType: 'started' | 'completed' | 'failed', details?: Record<string, any>) {
    this.trackEvent('analysis', { type: eventType, ...details });
  }

  // Track authentication events
  static trackAuth(eventType: 'signup' | 'signin' | 'signout', details?: Record<string, any>) {
    this.trackEvent('auth', { type: eventType, ...details });
  }

  // Track file upload events
  static trackFileUpload(eventType: 'started' | 'completed' | 'failed', details?: Record<string, any>) {
    this.trackEvent('file_upload', { type: eventType, ...details });
  }

  // Track credit usage
  static trackCreditUsage(eventType: 'deducted' | 'insufficient', details?: Record<string, any>) {
    this.trackEvent('credit_usage', { type: eventType, ...details });
  }

  // Track export events
  static trackExport(format: string, details?: Record<string, any>) {
    this.trackEvent('export', { format, ...details });
  }

  // Set user properties
  static setUserProperties(properties: Record<string, any>) {
    try {
      if (typeof window !== 'undefined' && (window as any).clarity) {
        (window as any).clarity('set', properties);
      }
    } catch (error) {
      console.warn('Setting user properties failed:', error);
    }
  }

  // Identify user (for authenticated users)
  static identifyUser(userId: string, properties?: Record<string, any>) {
    try {
      if (typeof window !== 'undefined' && (window as any).clarity) {
        (window as any).clarity('identify', userId, properties);
      }
    } catch (error) {
      console.warn('User identification failed:', error);
    }
  }
}

// Extend window type for TypeScript
declare global {
  interface Window {
    clarity?: any;
  }
}