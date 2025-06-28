import type { NextApiRequest, NextApiResponse } from 'next';
import { rateLimiter } from '../../lib/security';

interface AnalyticsData {
  sessionId: string;
  userId?: string;
  events: Array<{
    name: string;
    properties?: Record<string, any>;
    timestamp: number;
    sessionId: string;
    userId?: string;
    userAgent: string;
    url: string;
  }>;
  behavior: {
    pageViews: string[];
    clicks: Array<{ element: string; timestamp: number }>;
    timeOnPage: Record<string, number>;
    errors: Array<{ message: string; stack?: string; timestamp: number }>;
    interactions: Array<{ type: string; target: string; timestamp: number }>;
  };
  sessionDuration: number;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Rate limiting
    const clientIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';
    const identifier = `analytics_${clientIp}`;
    
    if (!rateLimiter.isAllowed(identifier, 100, 60000)) { // 100 requests per minute
      return res.status(429).json({ error: 'Rate limit exceeded' });
    }

    const data: AnalyticsData = req.body;

    // Basic validation
    if (!data.sessionId || !Array.isArray(data.events)) {
      return res.status(400).json({ error: 'Invalid data format' });
    }

    // Log analytics data
    console.log('Analytics data received:', {
      sessionId: data.sessionId,
      userId: data.userId,
      eventCount: data.events.length,
      sessionDuration: data.sessionDuration,
      pageViews: data.behavior.pageViews.length,
      errors: data.behavior.errors.length,
    });

    // Process high-priority events
    const criticalEvents = data.events.filter(event => 
      ['error', 'unhandled_rejection', 'user_feedback'].includes(event.name)
    );

    if (criticalEvents.length > 0) {
      console.log('Critical events detected:', criticalEvents);
      
      // Here you would typically:
      // 1. Send alerts for errors
      // 2. Store feedback in database
      // 3. Trigger incident response for critical issues
    }

    // Store analytics data
    // In a real implementation, you would:
    // 1. Store in a database (MongoDB, PostgreSQL, etc.)
    // 2. Send to analytics service (Mixpanel, Amplitude, etc.)
    // 3. Process for real-time dashboards
    
    // For now, we'll just log and store in memory/file
    await storeAnalyticsData(data);

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Analytics API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function storeAnalyticsData(data: AnalyticsData): Promise<void> {
  try {
    // In production, implement proper database storage
    // For now, we'll use a simple logging approach
    
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      sessionId: data.sessionId,
      userId: data.userId,
      summary: {
        events: data.events.length,
        errors: data.behavior.errors.length,
        pageViews: data.behavior.pageViews.length,
        sessionDuration: data.sessionDuration,
      },
      data,
    };

    // Log to console (in production, use proper logging service)
    console.log('Analytics stored:', logEntry);

    // Here you would typically:
    // 1. Insert into database
    // 2. Send to analytics platform
    // 3. Update real-time metrics
    // 4. Trigger alerts if needed

  } catch (error) {
    console.error('Failed to store analytics data:', error);
    throw error;
  }
}