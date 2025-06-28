import { IAgentRuntime, Memory, Evaluator } from "@elizaos/core";

/**
 * Evaluator that analyzes interactions to determine reputation score changes
 * and trust indicators for the PoD Protocol network
 */
export const reputationEvaluator: Evaluator = {
  name: "podReputation",
  description: "Evaluates interactions to determine reputation changes and trust indicators",
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
      const text = message.content?.text?.toLowerCase() || "";
      
      // Positive reputation indicators
      const positiveKeywords = [
        "thank you", "thanks", "excellent", "great job", "well done",
        "perfect", "amazing", "helpful", "professional", "reliable",
        "trustworthy", "satisfied", "completed", "delivered", "success",
        "good work", "appreciate", "impressed", "recommend"
      ];

      // Negative reputation indicators
      const negativeKeywords = [
        "disappointed", "failed", "error", "problem", "issue", "bug",
        "unreliable", "late", "delayed", "incomplete", "unsatisfied",
        "poor", "bad", "terrible", "waste", "scam", "fraud", "cheat",
        "untrustworthy", "dishonest", "complaint"
      ];

      // Neutral/professional indicators
      const neutralKeywords = [
        "question", "inquiry", "information", "help", "assistance",
        "clarification", "explanation", "status", "update", "progress"
      ];

      // Collaboration completion indicators
      const completionKeywords = [
        "finished", "done", "completed", "delivered", "ready",
        "successful", "achieved", "accomplished", "resolved"
      ];

      // Check for different types of interactions
      const hasPositive = positiveKeywords.some(keyword => text.includes(keyword));
      const hasNegative = negativeKeywords.some(keyword => text.includes(keyword));
      const hasNeutral = neutralKeywords.some(keyword => text.includes(keyword));
      const hasCompletion = completionKeywords.some(keyword => text.includes(keyword));

      // Check for transaction/escrow related mentions
      const hasTransaction = text.includes("escrow") || text.includes("payment") || 
                           text.includes("transaction") || text.includes("paid");
      
      // Check for collaboration mentions
      const hasCollaboration = text.includes("collaborate") || text.includes("work together") ||
                              text.includes("partnership") || text.includes("team");

      // Calculate reputation impact score
      let reputationDelta = 0;
      let confidence = 0.1; // Low default confidence

      if (hasPositive) {
        reputationDelta += 2;
        confidence += 0.3;
      }

      if (hasNegative) {
        reputationDelta -= 3;
        confidence += 0.4; // Higher confidence for negative feedback
      }

      if (hasCompletion && hasPositive) {
        reputationDelta += 3; // Bonus for completed work with positive feedback
        confidence += 0.2;
      }

      if (hasTransaction && hasCompletion) {
        reputationDelta += 1; // Bonus for completed transactions
        confidence += 0.2;
      }

      if (hasCollaboration && hasPositive) {
        reputationDelta += 1; // Bonus for successful collaboration
        confidence += 0.1;
      }

      // Determine interaction type
      let interactionType = "neutral";
      if (hasPositive && !hasNegative) {
        interactionType = "positive";
      } else if (hasNegative && !hasPositive) {
        interactionType = "negative";
      } else if (hasPositive && hasNegative) {
        interactionType = "mixed";
      }

      // Trust indicators
      const trustIndicators = {
        professionalLanguage: /\b(please|thank\s+you|regards|sincerely|best)\b/i.test(text),
        specificDetails: text.length > 50, // Longer messages tend to be more detailed
        timelyResponse: true, // Could be enhanced with actual timing data
        followsProtocol: hasTransaction || hasCollaboration,
        completionMentioned: hasCompletion,
      };

      const trustScore = Object.values(trustIndicators).filter(Boolean).length / Object.keys(trustIndicators).length;

      const evaluation = {
        reputationDelta,
        confidence: Math.min(confidence, 1.0), // Cap at 1.0
        interactionType,
        trustScore,
        trustIndicators,
        hasPositive,
        hasNegative,
        hasCompletion,
        hasTransaction,
        hasCollaboration,
        recommendations: [] as string[],
      };

      // Generate recommendations
      if (reputationDelta > 0) {
        evaluation.recommendations.push("Positive interaction detected - reputation should increase");
      } else if (reputationDelta < 0) {
        evaluation.recommendations.push("Negative feedback detected - investigate and address issues");
      }

      if (hasTransaction && hasCompletion) {
        evaluation.recommendations.push("Successful transaction completion - builds trust");
      }

      if (trustScore > 0.7) {
        evaluation.recommendations.push("High trust indicators - reliable interaction partner");
      } else if (trustScore < 0.3) {
        evaluation.recommendations.push("Low trust indicators - proceed with caution");
      }

      if (hasCollaboration && hasPositive) {
        evaluation.recommendations.push("Successful collaboration - good candidate for future partnerships");
      }

      return {
        score: Math.max(0, Math.min(1, (reputationDelta + 5) / 10)), // Normalize to 0-1 scale
        evaluation,
        timestamp: new Date().toISOString(),
      };

    } catch (error) {
      return {
        score: 0,
        evaluation: {
          error: error instanceof Error ? error.message : String(error),
          reputationDelta: 0,
          interactionType: "unknown",
        },
        timestamp: new Date().toISOString(),
      };
    }
  },
}; 