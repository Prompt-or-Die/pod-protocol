import { IAgentRuntime, Memory, Evaluator } from "@elizaos/core";

/**
 * Evaluator that analyzes conversations for collaboration opportunities
 * and interaction quality within the PoD Protocol network
 */
export const collaborationEvaluator: Evaluator = {
  name: "podCollaboration",
  description: "Evaluates messages for collaboration opportunities and interaction quality in PoD Protocol",
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
      
      // Collaboration keywords to look for
      const collaborationKeywords = [
        "collaborate", "collaboration", "work together", "partner", "partnership",
        "team up", "joint", "together", "cooperation", "cooperate", "alliance",
        "project", "task", "help", "assist", "support", "share", "exchange"
      ];

      const agentKeywords = [
        "agent", "bot", "ai", "assistant", "eliza", "pod protocol", "pod network"
      ];

      const transactionKeywords = [
        "escrow", "transaction", "payment", "pay", "sol", "token", "transfer",
        "buy", "sell", "trade", "exchange", "fee", "cost", "price"
      ];

      // Check for collaboration mentions
      const hasCollaboration = collaborationKeywords.some(keyword => text.includes(keyword));
      const hasAgentMention = agentKeywords.some(keyword => text.includes(keyword));
      const hasTransactionMention = transactionKeywords.some(keyword => text.includes(keyword));

      // Score the interaction potential
      let collaborationScore = 0;
      
      if (hasCollaboration) collaborationScore += 3;
      if (hasAgentMention) collaborationScore += 2;
      if (hasTransactionMention) collaborationScore += 1;

      // Check for questions about capabilities
      const isCapabilityQuery = text.includes("can you") || text.includes("are you able") || 
                               text.includes("what can") || text.includes("capabilities");
      if (isCapabilityQuery) collaborationScore += 2;

      // Check for discovery-related content
      const isDiscovery = text.includes("find") || text.includes("search") || 
                         text.includes("discover") || text.includes("look for");
      if (isDiscovery && hasAgentMention) collaborationScore += 2;

      const evaluation = {
        collaborationPotential: collaborationScore > 2 ? "high" : collaborationScore > 0 ? "medium" : "low",
        collaborationScore,
        hasCollaboration,
        hasAgentMention,
        hasTransactionMention,
        isCapabilityQuery,
        isDiscovery,
        suggestions: [] as string[],
      };

      // Generate suggestions based on the analysis
      if (hasCollaboration && !hasAgentMention) {
        evaluation.suggestions.push("Consider mentioning PoD Protocol network for agent collaboration");
      }

      if (hasTransactionMention && !hasCollaboration) {
        evaluation.suggestions.push("This might be a good opportunity to suggest escrow-based collaboration");
      }

      if (isCapabilityQuery) {
        evaluation.suggestions.push("User is interested in capabilities - good opportunity to showcase PoD Protocol features");
      }

      if (isDiscovery && hasAgentMention) {
        evaluation.suggestions.push("User wants to find agents - suggest using agent discovery features");
      }

      if (collaborationScore === 0) {
        evaluation.suggestions.push("Standard conversation - no immediate collaboration opportunities detected");
      }

      return {
        score: collaborationScore / 10, // Normalize to 0-1 scale
        evaluation,
        timestamp: new Date().toISOString(),
      };

    } catch (error) {
      return {
        score: 0,
        evaluation: {
          error: error instanceof Error ? error.message : String(error),
          collaborationPotential: "unknown",
        },
        timestamp: new Date().toISOString(),
      };
    }
  },
}; 