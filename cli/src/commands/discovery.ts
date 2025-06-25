import { Command } from "commander";
import chalk from "chalk";
import inquirer from "inquirer";
import { table } from "table";
import { address as createAddress, type Address } from "@solana/web3.js";
import {
  PodComClient,
  ChannelVisibility,
  MessageStatus,
  MessageType,
  AGENT_CAPABILITIES,
  getCapabilityNames,
  lamportsToSol,
} from "@pod-protocol/sdk";
import {
  createCommandHandler,
  createSpinner,
  getTableConfig,
  formatValue,
  GlobalOptions,
} from "../utils/shared.js";
import {
  validatePublicKey,
  validatePositiveInteger,
} from "../utils/validation.js";

/**
 * Discovery and search commands for finding agents, channels, and messages
 */
export class DiscoveryCommands {
  register(program: Command) {
    const discovery = program
      .command("discover")
      .alias("search")
      .description("Search and discover agents, channels, and messages");

    // Search agents
    discovery
      .command("agents")
      .description("Search for agents with advanced filtering")
      .option(
        "--capabilities <caps>",
        "Filter by capabilities (comma-separated)",
      )
      .option("--min-reputation <num>", "Minimum reputation score")
      .option("--max-reputation <num>", "Maximum reputation score")
      .option("--metadata-contains <text>", "Filter by metadata content")
      .option("--active-since <date>", "Filter by last activity (YYYY-MM-DD)")
      .option("-l, --limit <number>", "Maximum results to return", "20")
      .option("-o, --offset <number>", "Results offset for pagination", "0")
      .option(
        "--sort <field>",
        "Sort by field (relevance, reputation, recent)",
        "relevance",
      )
      .option("--order <direction>", "Sort order (asc, desc)", "desc")
      .option("-i, --interactive", "Interactive search with filters")
      .option("--format <format>", "Output format (table, json)", "table")
      .action(
        createCommandHandler(
          "search agents",
          async (client, wallet, globalOpts, options) => {
            await this.handleSearchAgents(client, globalOpts, options);
          },
        ),
      );

    // Search messages
    discovery
      .command("messages")
      .description("Search for messages with advanced filtering")
      .option("--sender <address>", "Filter by sender address")
      .option("--recipient <address>", "Filter by recipient address")
      .option("--status <status>", "Filter by message status")
      .option("--type <type>", "Filter by message type")
      .option("--contains <text>", "Filter by payload content")
      .option("--after <date>", "Filter by creation date (YYYY-MM-DD)")
      .option("--before <date>", "Filter by creation date (YYYY-MM-DD)")
      .option("-l, --limit <number>", "Maximum results to return", "20")
      .option("-o, --offset <number>", "Results offset for pagination", "0")
      .option("--sort <field>", "Sort by field (relevance, recent)", "recent")
      .option("--order <direction>", "Sort order (asc, desc)", "desc")
      .option("-i, --interactive", "Interactive search with filters")
      .option("--format <format>", "Output format (table, json)", "table")
      .action(
        createCommandHandler(
          "search messages",
          async (client, wallet, globalOpts, options) => {
            await this.handleSearchMessages(client, globalOpts, options);
          },
        ),
      );

    // Search channels
    discovery
      .command("channels")
      .description("Search for channels with advanced filtering")
      .option("--creator <address>", "Filter by creator address")
      .option("--visibility <type>", "Filter by visibility (public, private)")
      .option("--name-contains <text>", "Filter by channel name")
      .option("--description-contains <text>", "Filter by description")
      .option("--min-participants <num>", "Minimum participant count")
      .option("--max-participants <num>", "Maximum participant count")
      .option("--max-fee <lamports>", "Maximum fee per message")
      .option("--has-escrow", "Only show channels with escrow funds")
      .option("--created-after <date>", "Filter by creation date (YYYY-MM-DD)")
      .option("--created-before <date>", "Filter by creation date (YYYY-MM-DD)")
      .option("-l, --limit <number>", "Maximum results to return", "20")
      .option("-o, --offset <number>", "Results offset for pagination", "0")
      .option(
        "--sort <field>",
        "Sort by field (relevance, popular, recent)",
        "popular",
      )
      .option("--order <direction>", "Sort order (asc, desc)", "desc")
      .option("-i, --interactive", "Interactive search with filters")
      .option("--format <format>", "Output format (table, json)", "table")
      .action(
        createCommandHandler(
          "search channels",
          async (client, wallet, globalOpts, options) => {
            await this.handleSearchChannels(client, globalOpts, options);
          },
        ),
      );

    // Recommendations
    discovery
      .command("recommend")
      .description("Get personalized recommendations")
      .option(
        "--type <type>",
        "Recommendation type (agents, channels)",
        "agents",
      )
      .option("--for-agent <address>", "Get recommendations for specific agent")
      .option("-l, --limit <number>", "Number of recommendations", "10")
      .option("--include-reason", "Include recommendation reasons")
      .option("--format <format>", "Output format (table, json)", "table")
      .action(
        createCommandHandler(
          "get recommendations",
          async (client, wallet, globalOpts, options) => {
            await this.handleRecommendations(client, globalOpts, options);
          },
        ),
      );

    // Similar agents
    discovery
      .command("similar")
      .description("Find agents similar to a target agent")
      .argument("<agent-address>", "Target agent address")
      .option("-l, --limit <number>", "Number of similar agents to find", "10")
      .option("--format <format>", "Output format (table, json)", "table")
      .action(
        createCommandHandler(
          "find similar agents",
          async (client, wallet, globalOpts, targetAddress, options) => {
            await this.handleSimilarAgents(
              client,
              globalOpts,
              targetAddress,
              options,
            );
          },
        ),
      );

    // Trending
    discovery
      .command("trending")
      .description("Show trending channels and agents")
      .option("-l, --limit <number>", "Number of trending items", "10")
      .option("--format <format>", "Output format (table, json)", "table")
      .action(
        createCommandHandler(
          "get trending data",
          async (client, wallet, globalOpts, options) => {
            await this.handleTrending(client, globalOpts, options);
          },
        ),
      );
  }

  private async handleSearchAgents(
    client: PodComClient,
    globalOpts: GlobalOptions,
    options: Record<string, any>,
  ) {
    let filters = this.buildAgentFilters(options);

    if (options.interactive) {
      filters = await this.promptAgentFilters(filters);
    }

    const spinner = createSpinner("Searching agents...");

    try {
      const results = await client.discovery.searchAgents(filters);

      spinner.succeed(
        `Found ${results.total} agents (showing ${results.items.length})`,
      );

      if (options.format === "json") {
        console.log(JSON.stringify(results, null, 2));
        return;
      }

      this.displayAgentResults(results);
    } catch (error: any) {
      spinner.fail(`Search failed: ${error.message}`);
      throw error;
    }
  }

  private async handleSearchMessages(
    client: PodComClient,
    globalOpts: GlobalOptions,
    options: Record<string, any>,
  ) {
    let filters = this.buildMessageFilters(options);

    if (options.interactive) {
      filters = await this.promptMessageFilters(filters);
    }

    const spinner = createSpinner("Searching messages...");

    try {
      const results = await client.discovery.searchMessages(filters);

      spinner.succeed(
        `Found ${results.total} messages (showing ${results.items.length})`,
      );

      if (options.format === "json") {
        console.log(JSON.stringify(results, null, 2));
        return;
      }

      this.displayMessageResults(results);
    } catch (error: any) {
      spinner.fail(`Search failed: ${error.message}`);
      throw error;
    }
  }

  private async handleSearchChannels(
    client: PodComClient,
    globalOpts: GlobalOptions,
    options: Record<string, any>,
  ) {
    let filters = this.buildChannelFilters(options);

    if (options.interactive) {
      filters = await this.promptChannelFilters(filters);
    }

    const spinner = createSpinner("Searching channels...");

    try {
      const results = await client.discovery.searchChannels(filters);

      spinner.succeed(
        `Found ${results.total} channels (showing ${results.items.length})`,
      );

      if (options.format === "json") {
        console.log(JSON.stringify(results, null, 2));
        return;
      }

      this.displayChannelResults(results);
    } catch (error: any) {
      spinner.fail(`Search failed: ${error.message}`);
      throw error;
    }
  }

  private async handleRecommendations(
    client: PodComClient,
    globalOpts: GlobalOptions,
    options: Record<string, any>,
  ) {
    const spinner = createSpinner("Getting recommendations...");
    const limit = parseInt(options.limit, 10);

    try {
      const recommendationOptions = {
        limit,
        includeReason: options.includeReason,
        forAgent: options.forAgent
          ? createAddress(options.forAgent)
          : undefined,
      };

      let recommendations;
      if (options.type === "channels") {
        recommendations = await client.discovery.getRecommendedChannels(
          recommendationOptions,
        );
      } else {
        recommendations = await client.discovery.getRecommendedAgents(
          recommendationOptions,
        );
      }

      spinner.succeed(`Found ${recommendations.length} recommendations`);

      if (options.format === "json") {
        console.log(JSON.stringify(recommendations, null, 2));
        return;
      }

      this.displayRecommendations(recommendations, options.type);
    } catch (error: any) {
      spinner.fail(`Failed to get recommendations: ${error.message}`);
      throw error;
    }
  }

  private async handleSimilarAgents(
    client: PodComClient,
    globalOpts: GlobalOptions,
    targetAddress: string,
    options: Record<string, any>,
  ) {
    const spinner = createSpinner("Finding similar agents...");
    const limit = parseInt(options.limit, 10);

    try {
      const targetAgent = await client.agents.getAgent(
        createAddress(targetAddress),
      );
      if (!targetAgent) {
        spinner.fail("Target agent not found");
        return;
      }

      const similarAgents = await client.discovery.findSimilarAgents(
        targetAgent,
        limit,
      );

      spinner.succeed(`Found ${similarAgents.length} similar agents`);

      if (options.format === "json") {
        console.log(JSON.stringify(similarAgents, null, 2));
        return;
      }

      this.displaySimilarAgents(targetAgent, similarAgents);
    } catch (error: any) {
      spinner.fail(`Failed to find similar agents: ${error.message}`);
      throw error;
    }
  }

  private async handleTrending(
    client: PodComClient,
    globalOpts: GlobalOptions,
    options: Record<string, any>,
  ) {
    const spinner = createSpinner("Getting trending data...");
    const limit = parseInt(options.limit, 10);

    try {
      const trendingChannels =
        await client.discovery.getTrendingChannels(limit);

      spinner.succeed("Trending data retrieved");

      if (options.format === "json") {
        console.log(JSON.stringify({ trendingChannels }, null, 2));
        return;
      }

      this.displayTrendingChannels(trendingChannels);
    } catch (error: any) {
      spinner.fail(`Failed to get trending data: ${error.message}`);
      throw error;
    }
  }

  // ============================================================================
  // Filter Building Methods
  // ============================================================================

  private buildAgentFilters(options: Record<string, any>) {
    const filters: any = {
      limit: parseInt(options.limit, 10),
      offset: parseInt(options.offset, 10),
      sortBy: options.sort,
      sortOrder: options.order,
    };

    if (options.capabilities) {
      const capNames = options.capabilities
        .split(",")
        .map((c: string) => c.trim().toUpperCase());
      filters.capabilities = capNames.map((name: string) => {
        return AGENT_CAPABILITIES[name as keyof typeof AGENT_CAPABILITIES] || 0;
      });
    }

    if (options.minReputation) {
      filters.minReputation = parseInt(options.minReputation, 10);
    }

    if (options.maxReputation) {
      filters.maxReputation = parseInt(options.maxReputation, 10);
    }

    if (options.metadataContains) {
      filters.metadataContains = options.metadataContains;
    }

    if (options.activeSince) {
      filters.lastActiveAfter = new Date(options.activeSince).getTime();
    }

    return filters;
  }

  private buildMessageFilters(options: Record<string, any>) {
    const filters: any = {
      limit: parseInt(options.limit, 10),
      offset: parseInt(options.offset, 10),
      sortBy: options.sort,
      sortOrder: options.order,
    };

    if (options.sender) {
      filters.sender = createAddress(options.sender);
    }

    if (options.recipient) {
      filters.recipient = createAddress(options.recipient);
    }

    if (options.status) {
      filters.status = [
        MessageStatus[options.status as keyof typeof MessageStatus],
      ];
    }

    if (options.type) {
      filters.messageType = [
        MessageType[options.type as keyof typeof MessageType],
      ];
    }

    if (options.contains) {
      filters.payloadContains = options.contains;
    }

    if (options.after) {
      filters.createdAfter = new Date(options.after).getTime();
    }

    if (options.before) {
      filters.createdBefore = new Date(options.before).getTime();
    }

    return filters;
  }

  private buildChannelFilters(options: Record<string, any>) {
    const filters: any = {
      limit: parseInt(options.limit, 10),
      offset: parseInt(options.offset, 10),
      sortBy: options.sort,
      sortOrder: options.order,
    };

    if (options.creator) {
      filters.creator = createAddress(options.creator);
    }

    if (options.visibility) {
      filters.visibility = [
        ChannelVisibility[options.visibility as keyof typeof ChannelVisibility],
      ];
    }

    if (options.nameContains) {
      filters.nameContains = options.nameContains;
    }

    if (options.descriptionContains) {
      filters.descriptionContains = options.descriptionContains;
    }

    if (options.minParticipants) {
      filters.minParticipants = parseInt(options.minParticipants, 10);
    }

    if (options.maxParticipants) {
      filters.maxParticipants = parseInt(options.maxParticipants, 10);
    }

    if (options.maxFee) {
      filters.maxFeePerMessage = parseInt(options.maxFee, 10);
    }

    if (options.hasEscrow) {
      filters.hasEscrow = true;
    }

    if (options.createdAfter) {
      filters.createdAfter = new Date(options.createdAfter).getTime();
    }

    if (options.createdBefore) {
      filters.createdBefore = new Date(options.createdBefore).getTime();
    }

    return filters;
  }

  // ============================================================================
  // Interactive Prompt Methods
  // ============================================================================

  private async promptAgentFilters(initialFilters: any) {
    const answers = await inquirer.prompt([
      {
        type: "checkbox",
        name: "capabilities",
        message: "Filter by capabilities:",
        choices: [
          { name: "Trading", value: AGENT_CAPABILITIES.TRADING },
          { name: "Analysis", value: AGENT_CAPABILITIES.ANALYSIS },
          {
            name: "Data Processing",
            value: AGENT_CAPABILITIES.DATA_PROCESSING,
          },
          {
            name: "Content Generation",
            value: AGENT_CAPABILITIES.CONTENT_GENERATION,
          },
        ],
        default: initialFilters.capabilities || [],
      },
      {
        type: "number",
        name: "minReputation",
        message: "Minimum reputation (optional):",
        default: initialFilters.minReputation,
      },
      {
        type: "input",
        name: "metadataContains",
        message: "Metadata contains (optional):",
        default: initialFilters.metadataContains,
      },
      {
        type: "list",
        name: "sortBy",
        message: "Sort by:",
        choices: ["relevance", "reputation", "recent"],
        default: initialFilters.sortBy || "relevance",
      },
      {
        type: "number",
        name: "limit",
        message: "Maximum results:",
        default: initialFilters.limit || 20,
        validate: (input: number) => input > 0 && input <= 100,
      },
    ]);

    return { ...initialFilters, ...answers };
  }

  private async promptMessageFilters(initialFilters: any) {
    const answers = await inquirer.prompt([
      {
        type: "input",
        name: "sender",
        message: "Sender address (optional):",
        default: initialFilters.sender ? String(initialFilters.sender) : undefined,
        validate: (input: string) => !input || this.isValidAddress(input),
      },
      {
        type: "input",
        name: "recipient",
        message: "Recipient address (optional):",
        default: initialFilters.recipient ? String(initialFilters.recipient) : undefined,
        validate: (input: string) => !input || this.isValidAddress(input),
      },
      {
        type: "list",
        name: "status",
        message: "Message status:",
        choices: ["Any", "Pending", "Delivered", "Read", "Failed"],
        default: "Any",
      },
      {
        type: "input",
        name: "contains",
        message: "Payload contains (optional):",
        default: initialFilters.payloadContains,
      },
      {
        type: "number",
        name: "limit",
        message: "Maximum results:",
        default: initialFilters.limit || 20,
        validate: (input: number) => input > 0 && input <= 100,
      },
    ]);

    // Convert answers
    if (answers.sender) {
      answers.sender = createAddress(answers.sender);
    }
    if (answers.recipient) {
      answers.recipient = createAddress(answers.recipient);
    }
    if (answers.status && answers.status !== "Any") {
      answers.status = [
        MessageStatus[answers.status as keyof typeof MessageStatus],
      ];
    }

    return { ...initialFilters, ...answers };
  }

  private async promptChannelFilters(initialFilters: any) {
    const answers = await inquirer.prompt([
      {
        type: "input",
        name: "nameContains",
        message: "Channel name contains (optional):",
        default: initialFilters.nameContains,
      },
      {
        type: "list",
        name: "visibility",
        message: "Channel visibility:",
        choices: ["Any", "Public", "Private"],
        default: "Any",
      },
      {
        type: "number",
        name: "minParticipants",
        message: "Minimum participants (optional):",
        default: initialFilters.minParticipants,
      },
      {
        type: "confirm",
        name: "hasEscrow",
        message: "Only channels with escrow funds?",
        default: false,
      },
      {
        type: "list",
        name: "sortBy",
        message: "Sort by:",
        choices: ["popular", "recent", "relevance"],
        default: initialFilters.sortBy || "popular",
      },
      {
        type: "number",
        name: "limit",
        message: "Maximum results:",
        default: initialFilters.limit || 20,
        validate: (input: number) => input > 0 && input <= 100,
      },
    ]);

    // Convert answers
    if (answers.visibility && answers.visibility !== "Any") {
      answers.visibility = [
        ChannelVisibility[answers.visibility as keyof typeof ChannelVisibility],
      ];
    }

    return { ...initialFilters, ...answers };
  }

  // ============================================================================
  // Display Methods
  // ============================================================================

  private displayAgentResults(results: any) {
    if (results.items.length === 0) {
      console.log(chalk.yellow("No agents found matching your criteria"));
      return;
    }

    console.log(chalk.blue.bold("\n🤖 Agent Search Results"));
    console.log(
      chalk.gray(
        `Showing ${results.items.length} of ${results.total} results (${results.executionTime}ms)`,
      ),
    );

    const data = results.items.map((agent: any) => [
      formatValue(String(agent.pubkey).slice(0, 8) + "...", "address"),
      formatValue(getCapabilityNames(agent.capabilities).join(", "), "text"),
      formatValue(agent.reputation.toString(), "number"),
      formatValue(
        new Date(agent.lastUpdated * 1000).toLocaleDateString(),
        "text",
      ),
    ]);

    console.log(
      "\n" +
        table(
          [["Agent", "Capabilities", "Reputation", "Last Active"], ...data],
          getTableConfig("Agent Search Results"),
        ),
    );

    if (results.hasMore) {
      console.log(
        chalk.cyan(
          `\n💡 Use --offset ${results.items.length + results.searchParams.offset} to see more results`,
        ),
      );
    }
  }

  private displayMessageResults(results: any) {
    if (results.items.length === 0) {
      console.log(chalk.yellow("No messages found matching your criteria"));
      return;
    }

    console.log(chalk.green.bold("\n📨 Message Search Results"));
    console.log(
      chalk.gray(
        `Showing ${results.items.length} of ${results.total} results (${results.executionTime}ms)`,
      ),
    );

    const data = results.items.map((message: any) => [
      formatValue(String(message.sender).slice(0, 8) + "...", "address"),
      formatValue(String(message.recipient).slice(0, 8) + "...", "address"),
      formatValue(message.messageType.toString(), "text"),
      formatValue(message.status, "text"),
      formatValue(
        message.payload.slice(0, 30) +
          (message.payload.length > 30 ? "..." : ""),
        "text",
      ),
      formatValue(
        new Date(message.timestamp * 1000).toLocaleDateString(),
        "text",
      ),
    ]);

    console.log(
      "\n" +
        table(
          [
            ["Sender", "Recipient", "Type", "Status", "Payload", "Date"],
            ...data,
          ],
          getTableConfig("Message Search Results"),
        ),
    );

    if (results.hasMore) {
      console.log(
        chalk.cyan(
          `\n💡 Use --offset ${results.items.length + results.searchParams.offset} to see more results`,
        ),
      );
    }
  }

  private displayChannelResults(results: any) {
    if (results.items.length === 0) {
      console.log(chalk.yellow("No channels found matching your criteria"));
      return;
    }

    console.log(chalk.magenta.bold("\n🏛️  Channel Search Results"));
    console.log(
      chalk.gray(
        `Showing ${results.items.length} of ${results.total} results (${results.executionTime}ms)`,
      ),
    );

    const data = results.items.map((channel: any) => [
      formatValue(channel.name, "text"),
      formatValue(
        `${channel.participantCount}/${channel.maxParticipants}`,
        "number",
      ),
      formatValue(channel.visibility, "text"),
      formatValue(`${lamportsToSol(channel.feePerMessage)} SOL`, "number"),
      formatValue(channel.escrowBalance > 0 ? "Yes" : "No", "text"),
      formatValue(
        new Date(channel.createdAt * 1000).toLocaleDateString(),
        "text",
      ),
    ]);

    console.log(
      "\n" +
        table(
          [
            [
              "Channel",
              "Participants",
              "Visibility",
              "Fee",
              "Escrow",
              "Created",
            ],
            ...data,
          ],
          getTableConfig("Channel Search Results"),
        ),
    );

    if (results.hasMore) {
      console.log(
        chalk.cyan(
          `\n💡 Use --offset ${results.items.length + results.searchParams.offset} to see more results`,
        ),
      );
    }
  }

  private displayRecommendations(recommendations: any[], type: string) {
    if (recommendations.length === 0) {
      console.log(chalk.yellow(`No ${type} recommendations found`));
      return;
    }

    console.log(
      chalk.yellow.bold(
        `\n⭐ Recommended ${type.charAt(0).toUpperCase() + type.slice(1)}`,
      ),
    );

    if (type === "agents") {
      const data = recommendations.map((rec, index) => [
        `#${index + 1}`,
        formatValue(String(rec.item.pubkey).slice(0, 8) + "...", "address"),
        formatValue(rec.item.reputation.toString(), "number"),
        formatValue(
          getCapabilityNames(rec.item.capabilities).join(", "),
          "text",
        ),
        formatValue(rec.reason || "General recommendation", "text"),
      ]);

      console.log(
        "\n" +
          table(
            [
              ["Rank", "Agent", "Reputation", "Capabilities", "Reason"],
              ...data,
            ],
            getTableConfig("Agent Recommendations"),
          ),
      );
    } else {
      const data = recommendations.map((rec, index) => [
        `#${index + 1}`,
        formatValue(rec.item.name, "text"),
        formatValue(
          `${rec.item.participantCount}/${rec.item.maxParticipants}`,
          "number",
        ),
        formatValue(rec.item.visibility, "text"),
        formatValue(rec.reason || "General recommendation", "text"),
      ]);

      console.log(
        "\n" +
          table(
            [
              ["Rank", "Channel", "Participants", "Visibility", "Reason"],
              ...data,
            ],
            getTableConfig("Channel Recommendations"),
          ),
      );
    }
  }

  private displaySimilarAgents(targetAgent: any, similarAgents: any[]) {
    if (similarAgents.length === 0) {
      console.log(chalk.yellow("No similar agents found"));
      return;
    }

    console.log(chalk.cyan.bold("\n🔍 Similar Agents"));
    console.log(
      chalk.gray(
        `Target: ${String(targetAgent.pubkey).slice(0, 8)}... (${getCapabilityNames(targetAgent.capabilities).join(", ")})`,
      ),
    );

    const data = similarAgents.map((agent, index) => [
      `#${index + 1}`,
      formatValue(String(agent.pubkey).slice(0, 8) + "...", "address"),
      formatValue(getCapabilityNames(agent.capabilities).join(", "), "text"),
      formatValue(agent.reputation.toString(), "number"),
      formatValue(
        new Date(agent.lastUpdated * 1000).toLocaleDateString(),
        "text",
      ),
    ]);

    console.log(
      "\n" +
        table(
          [
            ["Rank", "Agent", "Capabilities", "Reputation", "Last Active"],
            ...data,
          ],
          getTableConfig("Similar Agents"),
        ),
    );
  }

  private displayTrendingChannels(channels: any[]) {
    if (channels.length === 0) {
      console.log(chalk.yellow("No trending channels found"));
      return;
    }

    console.log(chalk.red.bold("\n🔥 Trending Channels"));

    const data = channels.map((channel, index) => [
      `#${index + 1}`,
      formatValue(channel.name, "text"),
      formatValue(
        `${channel.participantCount}/${channel.maxParticipants}`,
        "number",
      ),
      formatValue(channel.visibility, "text"),
      formatValue(`${lamportsToSol(channel.feePerMessage)} SOL`, "number"),
      formatValue(
        new Date(channel.createdAt * 1000).toLocaleDateString(),
        "text",
      ),
    ]);

    console.log(
      "\n" +
        table(
          [
            ["Rank", "Channel", "Participants", "Visibility", "Fee", "Created"],
            ...data,
          ],
          getTableConfig("Trending Channels"),
        ),
    );
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private isValidAddress(addressString: string): boolean {
    try {
      createAddress(addressString);
      return true;
    } catch {
      return false;
    }
  }
}
