import type { NextApiRequest, NextApiResponse } from 'next';
import { rateLimiter, sanitizeInput } from '../../lib/security';

interface FeedbackData {
  type: 'bug' | 'feature' | 'general' | 'rating';
  rating?: number;
  message: string;
  userAgent: string;
  url: string;
  timestamp: number;
  userId?: string;
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
    const identifier = `feedback_${clientIp}`;
    
    if (!rateLimiter.isAllowed(identifier, 10, 60000)) { // 10 feedback submissions per minute
      return res.status(429).json({ error: 'Rate limit exceeded' });
    }

    const data: FeedbackData = req.body;

    // Validate required fields
    if (!data.type || !data.timestamp) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate feedback type
    const validTypes = ['bug', 'feature', 'general', 'rating'];
    if (!validTypes.includes(data.type)) {
      return res.status(400).json({ error: 'Invalid feedback type' });
    }

    // Validate rating for rating type
    if (data.type === 'rating' && (!data.rating || data.rating < 1 || data.rating > 5)) {
      return res.status(400).json({ error: 'Invalid rating value' });
    }

    // Sanitize input
    const sanitizedFeedback = {
      ...data,
      message: sanitizeInput.message(data.message || ''),
      userAgent: sanitizeInput.html(data.userAgent),
      url: sanitizeInput.url(data.url),
    };

    // Store feedback
    await storeFeedback(sanitizedFeedback);

    // Process high-priority feedback
    await processFeedback(sanitizedFeedback);

    res.status(200).json({ 
      success: true, 
      message: 'Feedback received successfully' 
    });

  } catch (error) {
    console.error('Feedback API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function storeFeedback(feedback: FeedbackData): Promise<void> {
  try {
    // In production, store in database
    // For now, log to console with structured format
    
    const timestamp = new Date().toISOString();
    const feedbackEntry = {
      id: generateFeedbackId(),
      timestamp,
      type: feedback.type,
      rating: feedback.rating,
      message: feedback.message,
      url: feedback.url,
      userAgent: feedback.userAgent,
      userId: feedback.userId,
      priority: getFeedbackPriority(feedback),
      status: 'new',
    };

    console.log('Feedback stored:', feedbackEntry);

    // In production, you would:
    // 1. Insert into database (PostgreSQL, MongoDB, etc.)
    // 2. Send to project management tools (Jira, Linear, etc.)
    // 3. Notify team via Slack/Discord
    // 4. Create tickets for bugs automatically

  } catch (error) {
    console.error('Failed to store feedback:', error);
    throw error;
  }
}

async function processFeedback(feedback: FeedbackData): Promise<void> {
  const priority = getFeedbackPriority(feedback);
  
  // High priority feedback gets immediate attention
  if (priority === 'high') {
    console.log('HIGH PRIORITY FEEDBACK:', {
      type: feedback.type,
      message: feedback.message,
      url: feedback.url,
      timestamp: new Date(feedback.timestamp).toISOString(),
    });

    // In production:
    // 1. Send immediate notifications to team
    // 2. Create high-priority tickets
    // 3. Alert on-call engineers for critical bugs
  }

  // Process by feedback type
  switch (feedback.type) {
    case 'bug':
      await processBugReport(feedback);
      break;
    case 'feature':
      await processFeatureRequest(feedback);
      break;
    case 'rating':
      await processRating(feedback);
      break;
    case 'general':
      await processGeneralFeedback(feedback);
      break;
  }
}

async function processBugReport(feedback: FeedbackData): Promise<void> {
  console.log('Processing bug report:', {
    message: feedback.message,
    url: feedback.url,
    userAgent: feedback.userAgent,
  });

  // In production:
  // 1. Parse stack traces and error messages
  // 2. Check for similar existing bugs
  // 3. Auto-assign to relevant team
  // 4. Set priority based on severity keywords
}

async function processFeatureRequest(feedback: FeedbackData): Promise<void> {
  console.log('Processing feature request:', {
    message: feedback.message,
    url: feedback.url,
  });

  // In production:
  // 1. Add to product backlog
  // 2. Tag with relevant labels
  // 3. Notify product team
  // 4. Check against existing roadmap
}

async function processRating(feedback: FeedbackData): Promise<void> {
  console.log('Processing rating:', {
    rating: feedback.rating,
    message: feedback.message,
    url: feedback.url,
  });

  // In production:
  // 1. Update user satisfaction metrics
  // 2. Trigger follow-up for low ratings
  // 3. Aggregate rating trends
  // 4. Send to analytics dashboard
}

async function processGeneralFeedback(feedback: FeedbackData): Promise<void> {
  console.log('Processing general feedback:', {
    message: feedback.message,
    url: feedback.url,
  });

  // In production:
  // 1. Categorize using NLP
  // 2. Route to appropriate team
  // 3. Add to user insights collection
}

function getFeedbackPriority(feedback: FeedbackData): 'low' | 'medium' | 'high' | 'critical' {
  // Bug reports are higher priority
  if (feedback.type === 'bug') {
    const message = feedback.message.toLowerCase();
    
    // Critical keywords
    const criticalKeywords = ['crash', 'broken', 'error', 'fails', 'cannot', 'unable'];
    if (criticalKeywords.some(keyword => message.includes(keyword))) {
      return 'critical';
    }
    
    return 'high';
  }

  // Low ratings get high priority
  if (feedback.type === 'rating' && feedback.rating && feedback.rating <= 2) {
    return 'high';
  }

  // Feature requests are medium priority
  if (feedback.type === 'feature') {
    return 'medium';
  }

  return 'low';
}

function generateFeedbackId(): string {
  return 'fb_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}