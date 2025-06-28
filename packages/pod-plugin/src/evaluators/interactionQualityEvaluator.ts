import { IAgentRuntime, Memory, Evaluator } from "@elizaos/core";

/**
 * Evaluator that analyzes the quality of agent interactions,
 * communication patterns, and engagement levels
 */
export const interactionQualityEvaluator: Evaluator = {
  name: "podInteractionQuality",
  description: "Evaluates the quality and effectiveness of agent interactions",
  alwaysRun: false,
  examples: [],
  validate: async (
    runtime: IAgentRuntime,
    message: Memory
  ): Promise<boolean> => {
    // Only evaluate text messages
    if (!message.content?.text) {
      return false;
    }

    // Only evaluate if PoD Protocol service is available
    const podService = runtime.getService("pod_protocol");
    if (!podService) {
      return false;
    }

    return true;
  },
  handler: async (
    runtime: IAgentRuntime,
    message: Memory
  ): Promise<any> => {
    try {
      const text = message.content?.text || "";
      const textLower = text.toLowerCase();
      
      // Quality indicators
      const qualityMetrics = {
        // Length and detail assessment
        messageLength: text.length,
        wordCount: text.trim().split(/\s+/).length,
        hasDetail: text.length > 100, // Detailed messages tend to be higher quality
        
        // Communication clarity
        hasQuestions: /\?/.test(text),
        hasActionableItems: /\b(need|should|can|will|please|let's|would you)\b/i.test(text),
        hasSpecifics: /\b(when|where|how|what|why|which)\b/i.test(text),
        
        // Professional communication
        isProfessional: /\b(please|thank you|regards|sincerely|appreciate)\b/i.test(text),
        hasGreeting: /\b(hello|hi|good|greetings)\b/i.test(text),
        hasClosing: /\b(thanks|regards|best|sincerely)\b/i.test(text),
        
        // Technical communication quality
        hasTechnicalTerms: /\b(blockchain|solana|agent|protocol|api|sdk|smart contract|transaction|escrow)\b/i.test(text),
        hasStructure: /\n/.test(text) || text.includes('•') || text.includes('-') || text.includes('1.') || text.includes('*'),
        
        // Engagement indicators
        isEngaging: /\b(interesting|exciting|amazing|great|excellent|wonderful)\b/i.test(text),
        isResponsive: /\b(yes|no|sure|absolutely|definitely|of course|I understand|got it)\b/i.test(text),
        showsInterest: /\b(tell me|show me|explain|how does|what about|interested in)\b/i.test(text),
      };

      // Communication patterns analysis
      const communicationPatterns = {
        isCommand: /^(register|discover|send|create|find|search|help|status)/i.test(text.trim()),
        isQuestion: text.includes('?'),
        isRequest: /\b(can you|could you|please|would you|help me)\b/i.test(textLower),
        isInformational: /\b(here is|this is|FYI|information|update|status)\b/i.test(textLower),
        isCollaborative: /\b(let's|we should|together|collaborate|work with)\b/i.test(textLower),
        isFeedback: /\b(good|bad|excellent|poor|satisfied|disappointed|works|doesn't work)\b/i.test(textLower),
      };

      // Context awareness indicators
      const contextIndicators = {
        mentionsPodProtocol: /\b(pod protocol|pod network|blockchain agent|agent network)\b/i.test(text),
        mentionsCapabilities: /\b(can you|able to|capable of|features|functions|capabilities)\b/i.test(textLower),
        mentionsCollaboration: /\b(collaborate|work together|partnership|team up|join forces)\b/i.test(textLower),
        mentionsTransaction: /\b(pay|payment|transaction|escrow|money|sol|token)\b/i.test(textLower),
        showsUnderstanding: /\b(I see|understand|makes sense|got it|clear|I know)\b/i.test(textLower),
      };

      // Calculate quality scores
      let clarityScore = 0;
      let engagementScore = 0;
      let professionalismScore = 0;
      let contextScore = 0;

      // Clarity scoring
      if (qualityMetrics.hasDetail) clarityScore += 2;
      if (qualityMetrics.hasQuestions) clarityScore += 1;
      if (qualityMetrics.hasActionableItems) clarityScore += 2;
      if (qualityMetrics.hasSpecifics) clarityScore += 1;
      if (qualityMetrics.hasStructure) clarityScore += 1;
      if (qualityMetrics.wordCount >= 20) clarityScore += 1;

      // Engagement scoring
      if (qualityMetrics.isEngaging) engagementScore += 2;
      if (qualityMetrics.isResponsive) engagementScore += 1;
      if (qualityMetrics.showsInterest) engagementScore += 2;
      if (communicationPatterns.isQuestion) engagementScore += 1;
      if (communicationPatterns.isCollaborative) engagementScore += 2;

      // Professionalism scoring
      if (qualityMetrics.isProfessional) professionalismScore += 2;
      if (qualityMetrics.hasGreeting) professionalismScore += 1;
      if (qualityMetrics.hasClosing) professionalismScore += 1;
      if (qualityMetrics.hasTechnicalTerms) professionalismScore += 1;
      if (!(/\b(damn|hell|shit|fuck|stupid|idiot)\b/i.test(text))) professionalismScore += 1;

      // Context awareness scoring
      if (contextIndicators.mentionsPodProtocol) contextScore += 2;
      if (contextIndicators.mentionsCapabilities) contextScore += 1;
      if (contextIndicators.mentionsCollaboration) contextScore += 2;
      if (contextIndicators.mentionsTransaction) contextScore += 1;
      if (contextIndicators.showsUnderstanding) contextScore += 1;

      // Normalize scores (0-1 scale)
      const maxClarityScore = 8;
      const maxEngagementScore = 8;
      const maxProfessionalismScore = 6;
      const maxContextScore = 7;

      const normalizedScores = {
        clarity: Math.min(clarityScore / maxClarityScore, 1),
        engagement: Math.min(engagementScore / maxEngagementScore, 1),
        professionalism: Math.min(professionalismScore / maxProfessionalismScore, 1),
        contextAwareness: Math.min(contextScore / maxContextScore, 1),
      };

      // Calculate overall quality score
      const overallQuality = (
        normalizedScores.clarity * 0.3 +
        normalizedScores.engagement * 0.3 +
        normalizedScores.professionalism * 0.2 +
        normalizedScores.contextAwareness * 0.2
      );

      // Determine quality level
      let qualityLevel = "low";
      if (overallQuality >= 0.8) {
        qualityLevel = "excellent";
      } else if (overallQuality >= 0.6) {
        qualityLevel = "good";
      } else if (overallQuality >= 0.4) {
        qualityLevel = "fair";
      } else if (overallQuality >= 0.2) {
        qualityLevel = "poor";
      }

      const evaluation = {
        overallQuality,
        qualityLevel,
        scores: normalizedScores,
        rawScores: {
          clarity: clarityScore,
          engagement: engagementScore,
          professionalism: professionalismScore,
          contextAwareness: contextScore,
        },
        metrics: qualityMetrics,
        patterns: communicationPatterns,
        contextIndicators,
        recommendations: [] as string[],
        strengths: [] as string[],
        improvements: [] as string[],
      };

      // Generate recommendations and feedback
      if (normalizedScores.clarity >= 0.8) {
        evaluation.strengths.push("Clear and detailed communication");
      } else if (normalizedScores.clarity < 0.4) {
        evaluation.improvements.push("Add more detail and specific information");
      }

      if (normalizedScores.engagement >= 0.8) {
        evaluation.strengths.push("High engagement and interaction quality");
      } else if (normalizedScores.engagement < 0.4) {
        evaluation.improvements.push("Increase engagement with questions and collaborative language");
      }

      if (normalizedScores.professionalism >= 0.8) {
        evaluation.strengths.push("Professional and courteous communication");
      } else if (normalizedScores.professionalism < 0.4) {
        evaluation.improvements.push("Use more professional language and proper greetings/closings");
      }

      if (normalizedScores.contextAwareness >= 0.8) {
        evaluation.strengths.push("Strong awareness of PoD Protocol context");
      } else if (normalizedScores.contextAwareness < 0.4) {
        evaluation.improvements.push("Show more understanding of PoD Protocol capabilities and context");
      }

      // Overall recommendations
      if (overallQuality >= 0.8) {
        evaluation.recommendations.push("Excellent interaction quality - maintain this standard");
      } else if (overallQuality >= 0.6) {
        evaluation.recommendations.push("Good interaction quality - minor improvements possible");
      } else if (overallQuality >= 0.4) {
        evaluation.recommendations.push("Fair interaction quality - focus on clarity and engagement");
      } else {
        evaluation.recommendations.push("Low interaction quality - significant improvements needed");
      }

      return {
        score: overallQuality,
        evaluation,
        timestamp: new Date().toISOString(),
      };

    } catch (error) {
      return {
        score: 0,
        evaluation: {
          error: error instanceof Error ? error.message : String(error),
          qualityLevel: "unknown",
          overallQuality: 0,
        },
        timestamp: new Date().toISOString(),
      };
    }
  },
}; 