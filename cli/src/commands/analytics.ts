import { Command } from "commander";
import chalk from "chalk";
import { table } from "table";
import { PodComClient, lamportsToSol } from "@pod-protocol/sdk";
import {
  createCommandHandler,
  createSpinner,
  getTableConfig,
  formatValue,
  GlobalOptions,
} from "../utils/shared.js";

/**
 * Analytics and insights commands for the PoD Protocol ecosystem
 */
export class AnalyticsCommands {
  register(program: Command) {
    const analytics = program
      .command("analytics")
      .description(
        "Get analytics and insights about the PoD Protocol ecosystem",
      );

    // Dashboard command
    analytics
      .command("dashboard")
      .description("Show comprehensive ecosystem dashboard")
      .option("--format <format>", "Output format (table, json)", "table")
      .action(
        createCommandHandler(
          "fetch analytics dashboard",
          async (client, wallet, globalOpts, options) => {
            await this.handleDashboard(client, globalOpts, options);
          },
        ),
      );

    // Agent analytics
    analytics
      .command("agents")
      .description("Show agent ecosystem analytics")
      .option("-l, --limit <number>", "Limit number of agents analyzed", "100")
      .option("--format <format>", "Output format (table, json)", "table")
      .action(
        createCommandHandler(
          "fetch agent analytics",
          async (client, wallet, globalOpts, options) => {
            await this.handleAgentAnalytics(client, globalOpts, options);
          },
        ),
      );

    // Message analytics
    analytics
      .command("messages")
      .description("Show message analytics and patterns")
      .option(
        "-l, --limit <number>",
        "Limit number of messages analyzed",
        "1000",
      )
      .option("--format <format>", "Output format (table, json)", "table")
      .action(
        createCommandHandler(
          "fetch message analytics",
          async (client, wallet, globalOpts, options) => {
            await this.handleMessageAnalytics(client, globalOpts, options);
          },
        ),
      );

    // Channel analytics
    analytics
      .command("channels")
      .description("Show channel usage analytics")
      .option(
        "-l, --limit <number>",
        "Limit number of channels analyzed",
        "100",
      )
      .option("--format <format>", "Output format (table, json)", "table")
      .action(
        createCommandHandler(
          "fetch channel analytics",
          async (client, wallet, globalOpts, options) => {
            await this.handleChannelAnalytics(client, globalOpts, options);
          },
        ),
      );

    // Network analytics
    analytics
      .command("network")
      .description("Show network-wide analytics")
      .option("--format <format>", "Output format (table, json)", "table")
      .action(
        createCommandHandler(
          "fetch network analytics",
          async (client, wallet, globalOpts, options) => {
            await this.handleNetworkAnalytics(client, globalOpts, options);
          },
        ),
      );

    // Generate report
    analytics
      .command("report")
      .description("Generate comprehensive analytics report")
      .option("-o, --output <file>", "Output file (default: stdout)")
      .option("--format <format>", "Output format (markdown, json)", "markdown")
      .action(
        createCommandHandler(
          "generate analytics report",
          async (client, wallet, globalOpts, options) => {
            await this.handleReport(client, globalOpts, options);
          },
        ),
      );

    // Trending channels
    analytics
      .command("trending")
      .description("Show trending channels and agents")
      .option("-l, --limit <number>", "Number of items to show", "10")
      .action(
        createCommandHandler(
          "fetch trending data",
          async (client, wallet, globalOpts, options) => {
            await this.handleTrending(client, globalOpts, options);
          },
        ),
      );
  }

  private async handleDashboard(
    client: PodComClient,
    globalOpts: GlobalOptions,
    options: Record<string, any>,
  ) {
    const spinner = createSpinner("Fetching ecosystem dashboard...");

    try {
      const dashboard = await client.analytics.getDashboard();
      spinner.succeed("Dashboard data retrieved");

      if (options.format === "json") {
        console.log(JSON.stringify(dashboard, null, 2));
        return;
      }

      this.displayDashboard(dashboard);
    } catch (error: any) {
      spinner.fail(`Failed to fetch dashboard: ${error.message}`);
      throw error;
    }
  }

  private async handleAgentAnalytics(
    client: PodComClient,
    globalOpts: GlobalOptions,
    options: Record<string, any>,
  ) {
    const spinner = createSpinner("Analyzing agent ecosystem...");
    const limit = parseInt(options.limit, 10);

    try {
      const analytics = await client.analytics.getAgentAnalytics(limit);
      spinner.succeed(`Analyzed ${analytics.totalAgents} agents`);

      if (options.format === "json") {
        console.log(JSON.stringify(analytics, null, 2));
        return;
      }

      this.displayAgentAnalytics(analytics);
    } catch (error: any) {
      spinner.fail(`Failed to fetch agent analytics: ${error.message}`);
      throw error;
    }
  }

  private async handleMessageAnalytics(
    client: PodComClient,
    globalOpts: GlobalOptions,
    options: Record<string, any>,
  ) {
    const spinner = createSpinner("Analyzing message patterns...");
    const limit = parseInt(options.limit, 10);

    try {
      const analytics = await client.analytics.getMessageAnalytics(limit);
      spinner.succeed(`Analyzed ${analytics.totalMessages} messages`);

      if (options.format === "json") {
        console.log(JSON.stringify(analytics, null, 2));
        return;
      }

      this.displayMessageAnalytics(analytics);
    } catch (error: any) {
      spinner.fail(`Failed to fetch message analytics: ${error.message}`);
      throw error;
    }
  }

  private async handleChannelAnalytics(
    client: PodComClient,
    globalOpts: GlobalOptions,
    options: Record<string, any>,
  ) {
    const spinner = createSpinner("Analyzing channel usage...");
    const limit = parseInt(options.limit, 10);

    try {
      const analytics = await client.analytics.getChannelAnalytics(limit);
      spinner.succeed(`Analyzed ${analytics.totalChannels} channels`);

      if (options.format === "json") {
        console.log(JSON.stringify(analytics, null, 2));
        return;
      }

      this.displayChannelAnalytics(analytics);
    } catch (error: any) {
      spinner.fail(`Failed to fetch channel analytics: ${error.message}`);
      throw error;
    }
  }

  private async handleNetworkAnalytics(
    client: PodComClient,
    globalOpts: GlobalOptions,
    options: Record<string, any>,
  ) {
    const spinner = createSpinner("Analyzing network health...");

    try {
      const analytics = await client.analytics.getNetworkAnalytics();
      spinner.succeed("Network analytics retrieved");

      if (options.format === "json") {
        console.log(JSON.stringify(analytics, null, 2));
        return;
      }

      this.displayNetworkAnalytics(analytics);
    } catch (error: any) {
      spinner.fail(`Failed to fetch network analytics: ${error.message}`);
      throw error;
    }
  }

  private async handleReport(
    client: PodComClient,
    globalOpts: GlobalOptions,
    options: Record<string, any>,
  ) {
    const spinner = createSpinner("Generating analytics report...");

    try {
      if (options.format === "json") {
        const dashboard = await client.analytics.getDashboard();
        const report = JSON.stringify(dashboard, null, 2);

        if (options.output) {
          const fs = await import("fs");
          fs.writeFileSync(options.output, report);
          spinner.succeed(`Report saved to ${options.output}`);
        } else {
          spinner.succeed("Report generated");
          console.log(report);
        }
      } else {
        const report = await client.analytics.generateReport();

        if (options.output) {
          const fs = await import("fs");
          fs.writeFileSync(options.output, report);
          spinner.succeed(`Report saved to ${options.output}`);
        } else {
          spinner.succeed("Report generated");
          console.log(report);
        }
      }
    } catch (error: any) {
      spinner.fail(`Failed to generate report: ${error.message}`);
      throw error;
    }
  }

  private async handleTrending(
    client: PodComClient,
    globalOpts: GlobalOptions,
    options: Record<string, any>,
  ) {
    const spinner = createSpinner("Fetching trending data...");
    const limit = parseInt(options.limit, 10);

    try {
      const [trendingChannels, recommendedAgents] = await Promise.all([
        client.discovery.getTrendingChannels(limit),
        client.discovery.getRecommendedAgents({ limit, includeReason: true }),
      ]);

      spinner.succeed("Trending data retrieved");

      console.log(chalk.blue.bold("\n🔥 Trending Channels"));
      if (trendingChannels.length === 0) {
        console.log(chalk.gray("No trending channels found"));
      } else {
        const channelData = trendingChannels.map((channel, index) => [
          `#${index + 1}`,
          formatValue(channel.name, "text"),
          formatValue(
            `${channel.participantCount}/${channel.maxParticipants}`,
            "number",
          ),
          formatValue(channel.visibility, "text"),
          formatValue(`${lamportsToSol(channel.feePerMessage)} SOL`, "number"),
        ]);

        console.log(
          "\n" +
            table(
              [
                ["Rank", "Channel", "Participants", "Visibility", "Fee"],
                ...channelData,
              ],
              getTableConfig("Trending Channels"),
            ),
        );
      }

      console.log(chalk.green.bold("\n⭐ Recommended Agents"));
      if (recommendedAgents.length === 0) {
        console.log(chalk.gray("No recommended agents found"));
      } else {
        const agentData = recommendedAgents.map((rec, index) => [
          `#${index + 1}`,
          formatValue(
            rec.item.pubkey.toString().slice(0, 8) + "...",
            "address",
          ),
          formatValue(rec.item.reputation.toString(), "number"),
          formatValue(rec.reason || "General recommendation", "text"),
        ]);

        console.log(
          "\n" +
            table(
              [["Rank", "Agent", "Reputation", "Reason"], ...agentData],
              getTableConfig("Recommended Agents"),
            ),
        );
      }
    } catch (error: any) {
      spinner.fail(`Failed to fetch trending data: ${error.message}`);
      throw error;
    }
  }

  // ============================================================================
  // Display Helper Methods
  // ============================================================================

  private displayDashboard(dashboard: any) {
    console.log(chalk.blue.bold("\n📊 PoD Protocol Ecosystem Dashboard"));
    console.log(
      chalk.gray(
        `Generated: ${new Date(dashboard.generatedAt).toLocaleString()}`,
      ),
    );

    // Overview metrics
    const overviewData = [
      [
        "Total Agents",
        formatValue(dashboard.agents.totalAgents.toString(), "number"),
      ],
      [
        "Total Messages",
        formatValue(dashboard.messages.totalMessages.toString(), "number"),
      ],
      [
        "Total Channels",
        formatValue(dashboard.channels.totalChannels.toString(), "number"),
      ],
      [
        "Network Health",
        formatValue(dashboard.network.networkHealth.toUpperCase(), "text"),
      ],
      [
        "Total Value Locked",
        formatValue(
          `${lamportsToSol(dashboard.network.totalValueLocked)} SOL`,
          "number",
        ),
      ],
    ];

    console.log(
      "\n" + table(overviewData, getTableConfig("Ecosystem Overview")),
    );

    // Top capabilities
    if (Object.keys(dashboard.agents.capabilityDistribution).length > 0) {
      console.log(chalk.cyan.bold("\n🛠️  Popular Agent Capabilities"));
      const capabilityData = Object.entries(
        dashboard.agents.capabilityDistribution,
      )
        .sort(([, a], [, b]) => (b as number) - (a as number))
        .slice(0, 5)
        .map(([capability, count]) => [
          formatValue(capability, "text"),
          formatValue((count as number).toString(), "number"),
        ]);

      console.log(
        "\n" +
          table(
            [["Capability", "Agents"], ...capabilityData],
            getTableConfig("Capability Distribution"),
          ),
      );
    }

    // Message status distribution
    const statusData = Object.entries(dashboard.messages.messagesByStatus).map(
      ([status, count]) => [
        formatValue(status, "text"),
        formatValue((count as number).toString(), "number"),
      ],
    );

    console.log(chalk.green.bold("\n📨 Message Status Distribution"));
    console.log(
      "\n" +
        table(
          [["Status", "Count"], ...statusData],
          getTableConfig("Message Status"),
        ),
    );
  }

  private displayAgentAnalytics(analytics: any) {
    console.log(chalk.blue.bold("\n🤖 Agent Ecosystem Analytics"));

    const summaryData = [
      ["Total Agents", formatValue(analytics.totalAgents.toString(), "number")],
      [
        "Average Reputation",
        formatValue(analytics.averageReputation.toFixed(2), "number"),
      ],
      [
        "Recently Active (24h)",
        formatValue(analytics.recentlyActive.length.toString(), "number"),
      ],
    ];

    console.log("\n" + table(summaryData, getTableConfig("Agent Summary")));

    // Capability distribution
    if (Object.keys(analytics.capabilityDistribution).length > 0) {
      console.log(chalk.cyan.bold("\n🛠️  Capability Distribution"));
      const capabilityData = Object.entries(analytics.capabilityDistribution)
        .sort(([, a], [, b]) => (b as number) - (a as number))
        .map(([capability, count]) => [
          formatValue(capability, "text"),
          formatValue((count as number).toString(), "number"),
          formatValue(
            `${(((count as number) / analytics.totalAgents) * 100).toFixed(1)}%`,
            "number",
          ),
        ]);

      console.log(
        "\n" +
          table(
            [["Capability", "Count", "Percentage"], ...capabilityData],
            getTableConfig("Capabilities"),
          ),
      );
    }

    // Top agents by reputation
    if (analytics.topAgentsByReputation.length > 0) {
      console.log(chalk.yellow.bold("\n🏆 Top Agents by Reputation"));
      const topAgentsData = analytics.topAgentsByReputation
        .slice(0, 10)
        .map((agent: any, index: number) => [
          `#${index + 1}`,
          formatValue(String(agent.pubkey).slice(0, 8) + "...", "address"),
          formatValue(agent.reputation.toString(), "number"),
          formatValue(
            new Date(agent.lastUpdated * 1000).toLocaleDateString(),
            "text",
          ),
        ]);

      console.log(
        "\n" +
          table(
            [["Rank", "Agent", "Reputation", "Last Active"], ...topAgentsData],
            getTableConfig("Top Agents"),
          ),
      );
    }
  }

  private displayMessageAnalytics(analytics: any) {
    console.log(chalk.green.bold("\n📨 Message Analytics"));

    const summaryData = [
      [
        "Total Messages",
        formatValue(analytics.totalMessages.toString(), "number"),
      ],
      [
        "Average Size",
        formatValue(
          `${analytics.averageMessageSize.toFixed(0)} bytes`,
          "number",
        ),
      ],
      [
        "Messages/Day",
        formatValue(analytics.messagesPerDay.toFixed(1), "number"),
      ],
    ];

    console.log("\n" + table(summaryData, getTableConfig("Message Summary")));

    // Status distribution
    const statusData = Object.entries(analytics.messagesByStatus).map(
      ([status, count]) => [
        formatValue(status, "text"),
        formatValue((count as number).toString(), "number"),
        formatValue(
          `${(((count as number) / analytics.totalMessages) * 100).toFixed(1)}%`,
          "number",
        ),
      ],
    );

    console.log(chalk.cyan.bold("\n📊 Status Distribution"));
    console.log(
      "\n" +
        table(
          [["Status", "Count", "Percentage"], ...statusData],
          getTableConfig("Message Status"),
        ),
    );

    // Type distribution
    if (Object.keys(analytics.messagesByType).length > 0) {
      console.log(chalk.magenta.bold("\n📝 Type Distribution"));
      const typeData = Object.entries(analytics.messagesByType)
        .sort(([, a], [, b]) => (b as number) - (a as number))
        .map(([type, count]) => [
          formatValue(type, "text"),
          formatValue((count as number).toString(), "number"),
          formatValue(
            `${(((count as number) / analytics.totalMessages) * 100).toFixed(1)}%`,
            "number",
          ),
        ]);

      console.log(
        "\n" +
          table(
            [["Type", "Count", "Percentage"], ...typeData],
            getTableConfig("Message Types"),
          ),
      );
    }
  }

  private displayChannelAnalytics(analytics: any) {
    console.log(chalk.magenta.bold("\n🏛️  Channel Analytics"));

    const summaryData = [
      [
        "Total Channels",
        formatValue(analytics.totalChannels.toString(), "number"),
      ],
      [
        "Average Participants",
        formatValue(analytics.averageParticipants.toFixed(1), "number"),
      ],
      [
        "Total Escrow Value",
        formatValue(
          `${lamportsToSol(analytics.totalEscrowValue)} SOL`,
          "number",
        ),
      ],
      [
        "Average Fee",
        formatValue(
          `${lamportsToSol(analytics.averageChannelFee)} SOL`,
          "number",
        ),
      ],
    ];

    console.log("\n" + table(summaryData, getTableConfig("Channel Summary")));

    // Visibility distribution
    const visibilityData = Object.entries(analytics.channelsByVisibility).map(
      ([visibility, count]) => [
        formatValue(visibility, "text"),
        formatValue((count as number).toString(), "number"),
        formatValue(
          `${(((count as number) / analytics.totalChannels) * 100).toFixed(1)}%`,
          "number",
        ),
      ],
    );

    console.log(chalk.cyan.bold("\n👁️  Visibility Distribution"));
    console.log(
      "\n" +
        table(
          [["Visibility", "Count", "Percentage"], ...visibilityData],
          getTableConfig("Channel Visibility"),
        ),
    );

    // Most popular channels
    if (analytics.mostPopularChannels.length > 0) {
      console.log(chalk.yellow.bold("\n🔥 Most Popular Channels"));
      const popularData = analytics.mostPopularChannels
        .slice(0, 10)
        .map((channel: any, index: number) => [
          `#${index + 1}`,
          formatValue(channel.name, "text"),
          formatValue(
            `${channel.participantCount}/${channel.maxParticipants}`,
            "number",
          ),
          formatValue(channel.visibility, "text"),
          formatValue(`${lamportsToSol(channel.feePerMessage)} SOL`, "number"),
        ]);

      console.log(
        "\n" +
          table(
            [
              ["Rank", "Channel", "Participants", "Visibility", "Fee"],
              ...popularData,
            ],
            getTableConfig("Popular Channels"),
          ),
      );
    }
  }

  private displayNetworkAnalytics(analytics: any) {
    console.log(chalk.red.bold("\n🌐 Network Analytics"));

    const networkData = [
      [
        "Network Health",
        formatValue(analytics.networkHealth.toUpperCase(), "text"),
      ],
      [
        "Total Transactions",
        formatValue(analytics.totalTransactions.toString(), "number"),
      ],
      [
        "Total Value Locked",
        formatValue(
          `${lamportsToSol(analytics.totalValueLocked)} SOL`,
          "number",
        ),
      ],
      [
        "Active Agents (24h)",
        formatValue(analytics.activeAgents24h.toString(), "number"),
      ],
      [
        "Message Volume (24h)",
        formatValue(analytics.messageVolume24h.toString(), "number"),
      ],
    ];

    console.log("\n" + table(networkData, getTableConfig("Network Health")));

    if (analytics.peakUsageHours && analytics.peakUsageHours.length > 0) {
      console.log(chalk.yellow.bold("\n⏰ Peak Usage Hours (UTC)"));
      console.log(
        chalk.gray(
          `Hours: ${analytics.peakUsageHours.map((h: number) => `${h}:00`).join(", ")}`,
        ),
      );
    }
  }
}
