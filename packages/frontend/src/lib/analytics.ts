/**
 * Analytics and tracking utilities for beta testing
 */

interface AnalyticsEvent {
  name: string;
  properties?: Record<string, any>;
  timestamp: number;
  sessionId: string;
  userId?: string;
  userAgent: string;
  url: string;
}

interface UserBehavior {
  pageViews: string[];
  clicks: Array<{ element: string; timestamp: number }>;
  timeOnPage: Record<string, number>;
  errors: Array<{ message: string; stack?: string; timestamp: number }>;
  interactions: Array<{ type: string; target: string; timestamp: number }>;
}

interface PerformanceMetrics {
  loadTime: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  firstInputDelay: number;
  cumulativeLayoutShift: number;
  timeToInteractive: number;
}

class AnalyticsManager {
  private sessionId: string;
  private userId?: string;
  private events: AnalyticsEvent[] = [];
  private behavior: UserBehavior = {
    pageViews: [],
    clicks: [],
    timeOnPage: {},
    errors: [],
    interactions: [],
  };
  private startTime: number = Date.now();
  private currentPage: string = '';
  private pageStartTime: number = Date.now();

  constructor() {
    this.sessionId = this.generateSessionId();
    this.initializeTracking();
  }

  private generateSessionId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private initializeTracking(): void {
    if (typeof window === 'undefined') return;

    // Track page views
    this.trackPageView(window.location.pathname);

    // Track navigation changes
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = (...args) => {
      originalPushState.apply(history, args);
      this.handlePageChange();
    };

    history.replaceState = (...args) => {
      originalReplaceState.apply(history, args);
      this.handlePageChange();
    };

    window.addEventListener('popstate', () => {
      this.handlePageChange();
    });

    // Track user interactions
    this.trackClicks();
    this.trackErrors();
    this.trackPerformance();

    // Send data periodically
    setInterval(() => {
      this.sendBatch();
    }, 30000); // Every 30 seconds

    // Send data on page unload
    window.addEventListener('beforeunload', () => {
      this.flush();
    });

    // Track page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.recordTimeOnPage();
      }
    });
  }

  private handlePageChange(): void {
    this.recordTimeOnPage();
    const newPage = window.location.pathname;
    this.trackPageView(newPage);
  }

  private recordTimeOnPage(): void {
    if (this.currentPage) {
      const timeSpent = Date.now() - this.pageStartTime;
      this.behavior.timeOnPage[this.currentPage] = 
        (this.behavior.timeOnPage[this.currentPage] || 0) + timeSpent;
    }
  }

  private trackClicks(): void {
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      const element = this.getElementSelector(target);
      
      this.behavior.clicks.push({
        element,
        timestamp: Date.now(),
      });

      // Track specific interaction types
      this.trackInteraction('click', element);
    });
  }

  private trackErrors(): void {
    window.addEventListener('error', (event) => {
      this.behavior.errors.push({
        message: event.message,
        stack: event.error?.stack,
        timestamp: Date.now(),
      });

      this.track('error', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.behavior.errors.push({
        message: event.reason?.toString() || 'Unhandled Promise Rejection',
        timestamp: Date.now(),
      });

      this.track('unhandled_rejection', {
        reason: event.reason?.toString(),
      });
    });
  }

  private trackPerformance(): void {
    if (typeof window === 'undefined' || !window.performance) return;

    window.addEventListener('load', () => {
      // Wait a bit for all metrics to be available
      setTimeout(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        const paint = performance.getEntriesByType('paint');
        
        const metrics: Partial<PerformanceMetrics> = {
          loadTime: navigation.loadEventEnd - navigation.loadEventStart,
          timeToInteractive: navigation.domInteractive - navigation.navigationStart,
        };

        // First Contentful Paint
        const fcp = paint.find(entry => entry.name === 'first-contentful-paint');
        if (fcp) metrics.firstContentfulPaint = fcp.startTime;

        // Largest Contentful Paint
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          metrics.largestContentfulPaint = lastEntry.startTime;
        }).observe({ entryTypes: ['largest-contentful-paint'] });

        // First Input Delay
        new PerformanceObserver((list) => {
          list.getEntries().forEach((entry: any) => {
            metrics.firstInputDelay = entry.processingStart - entry.startTime;
          });
        }).observe({ entryTypes: ['first-input'] });

        // Cumulative Layout Shift
        let cumulativeScore = 0;
        new PerformanceObserver((list) => {
          list.getEntries().forEach((entry: any) => {
            if (!entry.hadRecentInput) {
              cumulativeScore += entry.value;
            }
          });
          metrics.cumulativeLayoutShift = cumulativeScore;
        }).observe({ entryTypes: ['layout-shift'] });

        this.track('performance_metrics', metrics);
      }, 1000);
    });
  }

  private getElementSelector(element: HTMLElement): string {
    if (element.id) return `#${element.id}`;
    if (element.className) return `.${element.className.split(' ')[0]}`;
    return element.tagName.toLowerCase();
  }

  setUserId(userId: string): void {
    this.userId = userId;
  }

  track(eventName: string, properties?: Record<string, any>): void {
    const event: AnalyticsEvent = {
      name: eventName,
      properties,
      timestamp: Date.now(),
      sessionId: this.sessionId,
      userId: this.userId,
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    this.events.push(event);

    // Send immediately for critical events
    const criticalEvents = ['error', 'unhandled_rejection', 'user_feedback'];
    if (criticalEvents.includes(eventName)) {
      this.sendBatch();
    }
  }

  trackPageView(path: string): void {
    this.recordTimeOnPage();
    this.currentPage = path;
    this.pageStartTime = Date.now();
    
    this.behavior.pageViews.push(path);
    this.track('page_view', { path });
  }

  trackInteraction(type: string, target: string): void {
    this.behavior.interactions.push({
      type,
      target,
      timestamp: Date.now(),
    });

    this.track('user_interaction', { type, target });
  }

  trackFeatureUsage(feature: string, action: string, metadata?: Record<string, any>): void {
    this.track('feature_usage', {
      feature,
      action,
      ...metadata,
    });
  }

  trackUserFeedback(feedback: any): void {
    this.track('user_feedback', feedback);
  }

  async sendBatch(): Promise<void> {
    if (this.events.length === 0) return;

    const payload = {
      sessionId: this.sessionId,
      userId: this.userId,
      events: [...this.events],
      behavior: { ...this.behavior },
      sessionDuration: Date.now() - this.startTime,
    };

    try {
      // Send to your analytics endpoint
      await fetch('/api/analytics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      // Clear sent events
      this.events = [];
      
      // Reset behavior tracking (keep cumulative data)
      this.behavior.clicks = [];
      this.behavior.interactions = [];
    } catch (error) {
      console.warn('Failed to send analytics:', error);
    }
  }

  flush(): void {
    // Send remaining data synchronously (for page unload)
    if (this.events.length === 0) return;

    const payload = {
      sessionId: this.sessionId,
      userId: this.userId,
      events: [...this.events],
      behavior: { ...this.behavior },
      sessionDuration: Date.now() - this.startTime,
    };

    // Use sendBeacon for reliable delivery during page unload
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/analytics', JSON.stringify(payload));
    }
  }

  // Get session data for debugging
  getSessionData() {
    return {
      sessionId: this.sessionId,
      userId: this.userId,
      events: this.events,
      behavior: this.behavior,
      sessionDuration: Date.now() - this.startTime,
    };
  }
}

// Singleton instance
let analytics: AnalyticsManager | null = null;

export const getAnalytics = (): AnalyticsManager => {
  if (!analytics && typeof window !== 'undefined') {
    analytics = new AnalyticsManager();
  }
  return analytics!;
};

// Convenience functions
export const track = (eventName: string, properties?: Record<string, any>) => {
  getAnalytics()?.track(eventName, properties);
};

export const trackPageView = (path: string) => {
  getAnalytics()?.trackPageView(path);
};

export const trackFeatureUsage = (feature: string, action: string, metadata?: Record<string, any>) => {
  getAnalytics()?.trackFeatureUsage(feature, action, metadata);
};

export const trackUserFeedback = (feedback: any) => {
  getAnalytics()?.trackUserFeedback(feedback);
};

export const setUserId = (userId: string) => {
  getAnalytics()?.setUserId(userId);
};

export default {
  getAnalytics,
  track,
  trackPageView,
  trackFeatureUsage,
  trackUserFeedback,
  setUserId,
};