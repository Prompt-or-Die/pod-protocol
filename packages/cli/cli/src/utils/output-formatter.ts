import chalk from "chalk";
import ora, { Ora } from "ora";
import { table } from "table";
import {
  BRAND_COLORS,
  ICONS,
  keyValue,
  sectionHeader,
  DIVIDERS,
} from "./branding.js";
import { safeJSONParse } from "./safe-json.js";

/**
 * Enhanced Output Formatter for PoD CLI
 * Provides consistent, branded formatting for all CLI output
 */

export interface TableColumn {
  key: string;
  label: string;
  align?: "left" | "center" | "right";
  width?: number;
  formatter?: (value: any) => string;
}

export interface ProgressStep {
  message: string;
  status: "pending" | "running" | "completed" | "failed";
}

export class OutputFormatter {
  private verbose: boolean = false;
  private quiet: boolean = false;
  private spinners: Map<string, Ora> = new Map();

  constructor(options: { verbose?: boolean; quiet?: boolean } = {}) {
    this.verbose = options.verbose || false;
    this.quiet = options.quiet || false;
  }

  /**
   * Display a formatted table
   */
  public displayTable(data: any[], columns: TableColumn[]): void {
    if (this.quiet || data.length === 0) return;

    const headers = columns.map((col) => BRAND_COLORS.accent(col.label));
    const rows = data.map((item) =>
      columns.map((col) => {
        const value = item[col.key];
        return col.formatter ? col.formatter(value) : String(value || "");
      }),
    );

    const tableConfig = {
      header: {
        alignment: "center" as const,
        content: BRAND_COLORS.primary("Data Table"),
      },
      columns: columns.map((col) => ({
        alignment: col.align || ("left" as const),
        width: col.width,
      })),
      border: {
        topBody: BRAND_COLORS.muted("─"),
        topJoin: BRAND_COLORS.muted("┬"),
        topLeft: BRAND_COLORS.muted("┌"),
        topRight: BRAND_COLORS.muted("┐"),
        bottomBody: BRAND_COLORS.muted("─"),
        bottomJoin: BRAND_COLORS.muted("┴"),
        bottomLeft: BRAND_COLORS.muted("└"),
        bottomRight: BRAND_COLORS.muted("┘"),
        bodyLeft: BRAND_COLORS.muted("│"),
        bodyRight: BRAND_COLORS.muted("│"),
        bodyJoin: BRAND_COLORS.muted("│"),
        joinBody: BRAND_COLORS.muted("─"),
        joinLeft: BRAND_COLORS.muted("├"),
        joinRight: BRAND_COLORS.muted("┤"),
        joinJoin: BRAND_COLORS.muted("┼"),
      },
    };

    console.log(table([headers, ...rows], tableConfig));
  }

  /**
   * Display agent information in a formatted way
   */
  public displayAgentInfo(agent: any): void {
    if (this.quiet) return;

    console.log(sectionHeader("Agent Information", ICONS.agent));
    console.log();

    console.log(
      keyValue("Address", agent.pubkey?.toString() || "Unknown", ICONS.key),
    );
    console.log(
      keyValue(
        "Capabilities",
        this.formatCapabilities(agent.capabilities),
        ICONS.gear,
      ),
    );
    console.log(
      keyValue("Metadata URI", agent.metadataUri || "None", ICONS.info),
    );
    console.log(keyValue("Reputation", agent.reputation || 0, ICONS.star));
    console.log(
      keyValue(
        "Last Updated",
        this.formatTimestamp(agent.lastUpdated),
        ICONS.bell,
      ),
    );

    if (this.verbose) {
      console.log();
      console.log(BRAND_COLORS.muted("Additional Details:"));
      console.log(`  Bump: ${agent.bump || "N/A"}`);
    }

    console.log();
  }

  /**
   * Display message information
   */
  public displayMessageInfo(message: any): void {
    if (this.quiet) return;

    console.log(sectionHeader("Message Information", ICONS.message));
    console.log();

    console.log(keyValue("Message ID", message.id || "Unknown", ICONS.key));
    console.log(
      keyValue("From", message.sender?.toString() || "Unknown", ICONS.agent),
    );
    console.log(
      keyValue("To", message.recipient?.toString() || "Unknown", ICONS.agent),
    );
    console.log(
      keyValue("Type", this.formatMessageType(message.messageType), ICONS.info),
    );
    console.log(
      keyValue("Status", this.formatMessageStatus(message.status), ICONS.bell),
    );
    console.log(
      keyValue(
        "Timestamp",
        this.formatTimestamp(message.timestamp),
        ICONS.bell,
      ),
    );

    if (message.payload && message.payload.length > 0) {
      console.log();
      console.log(BRAND_COLORS.accent("Content:"));
      console.log(this.formatMessageContent(message.payload));
    }

    console.log();
  }

  /**
   * Display channel information
   */
  public displayChannelInfo(channel: any): void {
    if (this.quiet) return;

    console.log(sectionHeader("Channel Information", ICONS.channel));
    console.log();

    console.log(keyValue("Name", channel.name || "Unknown", ICONS.channel));
    console.log(
      keyValue("Description", channel.description || "None", ICONS.info),
    );
    console.log(
      keyValue(
        "Creator",
        channel.creator?.toString() || "Unknown",
        ICONS.agent,
      ),
    );
    console.log(
      keyValue(
        "Visibility",
        this.formatVisibility(channel.visibility),
        ICONS.shield,
      ),
    );
    console.log(
      keyValue(
        "Participants",
        `${channel.participantCount || 0}/${channel.maxParticipants || "Unlimited"}`,
        ICONS.agent,
      ),
    );
    console.log(
      keyValue(
        "Fee per Message",
        this.formatSol(channel.feePerMessage),
        ICONS.escrow,
      ),
    );

    console.log();
  }

  /**
   * Display escrow information
   */
  public displayEscrowInfo(escrow: any): void {
    if (this.quiet) return;

    console.log(sectionHeader("Escrow Information", ICONS.escrow));
    console.log();

    console.log(
      keyValue(
        "Channel",
        escrow.channel?.toString() || "Unknown",
        ICONS.channel,
      ),
    );
    console.log(
      keyValue(
        "Depositor",
        escrow.depositor?.toString() || "Unknown",
        ICONS.agent,
      ),
    );
    console.log(
      keyValue("Balance", this.formatSol(escrow.balance), ICONS.escrow),
    );
    console.log(
      keyValue(
        "Last Deposit",
        this.formatTimestamp(escrow.lastDeposit),
        ICONS.bell,
      ),
    );

    console.log();
  }

  /**
   * Display a progress indicator for multi-step operations
   */
  public displayProgress(steps: ProgressStep[]): void {
    if (this.quiet) return;

    console.log(sectionHeader("Progress", ICONS.loading));
    console.log();

    steps.forEach((step, index) => {
      const stepNumber = `[${index + 1}/${steps.length}]`;
      let statusIcon = "";
      let statusColor = BRAND_COLORS.muted;

      switch (step.status) {
        case "completed":
          statusIcon = ICONS.success;
          statusColor = BRAND_COLORS.success;
          break;
        case "running":
          statusIcon = ICONS.loading;
          statusColor = BRAND_COLORS.info;
          break;
        case "failed":
          statusIcon = ICONS.error;
          statusColor = BRAND_COLORS.error;
          break;
        default:
          statusIcon = "⭕";
          statusColor = BRAND_COLORS.muted;
      }

      console.log(`  ${statusColor(stepNumber)} ${statusIcon} ${step.message}`);
    });

    console.log();
  }

  /**
   * Start a spinner with a message
   */
  public startSpinner(id: string, message: string): void {
    if (this.quiet) return;

    const spinner = ora({
      text: message,
      color: "magenta",
      spinner: "dots",
    });

    spinner.start();
    this.spinners.set(id, spinner);
  }

  /**
   * Update spinner message
   */
  public updateSpinner(id: string, message: string): void {
    const spinner = this.spinners.get(id);
    if (spinner) {
      spinner.text = message;
    }
  }

  /**
   * Stop spinner with success
   */
  public succeedSpinner(id: string, message?: string): void {
    const spinner = this.spinners.get(id);
    if (spinner) {
      spinner.succeed(message);
      this.spinners.delete(id);
    }
  }

  /**
   * Stop spinner with failure
   */
  public failSpinner(id: string, message?: string): void {
    const spinner = this.spinners.get(id);
    if (spinner) {
      spinner.fail(message);
      this.spinners.delete(id);
    }
  }

  /**
   * Display a summary box
   */
  public displaySummary(
    title: string,
    items: { label: string; value: string; icon?: string }[],
  ): void {
    if (this.quiet) return;

    console.log(sectionHeader(title, ICONS.info));
    console.log();

    const maxLabelLength = Math.max(...items.map((item) => item.label.length));

    items.forEach((item) => {
      const padding = " ".repeat(maxLabelLength - item.label.length + 2);
      const icon = item.icon ? `${item.icon} ` : "";
      console.log(
        `  ${icon}${BRAND_COLORS.accent(item.label)}:${padding}${BRAND_COLORS.secondary(item.value)}`,
      );
    });

    console.log();
  }

  /**
   * Display success message with optional data
   */
  public success(message: string, data?: any): void {
    if (this.quiet) return;
    
    console.log(`${ICONS.success} ${BRAND_COLORS.success(message)}`);
    
    if (data && this.verbose) {
      console.log(BRAND_COLORS.dim(JSON.stringify(data, null, 2)));
    }
    
    console.log();
  }

  /**
   * Display info message with optional data
   */
  public info(message: string, data?: any): void {
    if (this.quiet) return;
    
    console.log(`${ICONS.info} ${BRAND_COLORS.info(message)}`);
    
    if (data && this.verbose) {
      console.log(BRAND_COLORS.dim(JSON.stringify(data, null, 2)));
    }
    
    console.log();
  }

  /**
   * Display command help with examples
   */
  public displayCommandHelp(
    command: string,
    description: string,
    examples: { command: string; description: string }[],
  ): void {
    console.log(sectionHeader(`${command} Command Help`, ICONS.info));
    console.log();
    console.log(description);
    console.log();

    if (examples.length > 0) {
      console.log(BRAND_COLORS.accent("Examples:"));
      console.log();

      examples.forEach((example) => {
        console.log(
          `  ${BRAND_COLORS.muted("$")} ${BRAND_COLORS.accent(example.command)}`,
        );
        console.log(`    ${BRAND_COLORS.dim(example.description)}`);
        console.log();
      });
    }
  }

  // Private helper methods

  private formatCapabilities(capabilities: number): string {
    if (!capabilities) return "None";

    const capabilityNames = [];
    if (capabilities & 1) capabilityNames.push("Trading");
    if (capabilities & 2) capabilityNames.push("Analysis");
    if (capabilities & 4) capabilityNames.push("Data Processing");
    if (capabilities & 8) capabilityNames.push("Content Generation");
    if (capabilities & 16) capabilityNames.push("Communication");
    if (capabilities & 32) capabilityNames.push("Learning");

    return capabilityNames.length > 0 ? capabilityNames.join(", ") : "Custom";
  }

  private formatMessageType(type: any): string {
    const typeMap: Record<string, string> = {
      text: "Text Message",
      data: "Data Transfer",
      command: "Command",
      response: "Response",
    };

    return typeMap[type] || String(type);
  }

  private formatMessageStatus(status: any): string {
    const statusMap: Record<string, { text: string; color: any }> = {
      pending: { text: "Pending", color: BRAND_COLORS.warning },
      sent: { text: "Sent", color: BRAND_COLORS.success },
      delivered: { text: "Delivered", color: BRAND_COLORS.success },
      failed: { text: "Failed", color: BRAND_COLORS.error },
    };

    const mapped = statusMap[status] || {
      text: String(status),
      color: BRAND_COLORS.muted,
    };
    return mapped.color(mapped.text);
  }

  private formatVisibility(visibility: any): string {
    const visibilityMap: Record<string, string> = {
      public: "🌐 Public",
      private: "🔒 Private",
      invite: "📨 Invite Only",
    };

    return visibilityMap[visibility] || String(visibility);
  }

  private formatSol(lamports: number | string): string {
    if (!lamports) return "0 SOL";
    const sol = Number(lamports) / 1e9;
    return `${sol.toFixed(4)} SOL`;
  }

  private formatTimestamp(timestamp: any): string {
    if (!timestamp) return "Unknown";

    try {
      const date = new Date(Number(timestamp) * 1000);
      return date.toLocaleString();
    } catch {
      return "Invalid date";
    }
  }

  private formatMessageContent(payload: string): string {
    if (!payload) return BRAND_COLORS.muted("(empty)");

    // Try to parse as JSON for pretty formatting
    const parsed = safeJSONParse(payload);
    if (parsed) {
      return BRAND_COLORS.dim(JSON.stringify(parsed, null, 2));
    } else {
      // Display as plain text, truncated if too long
      const maxLength = this.verbose ? 500 : 100;
      if (payload.length > maxLength) {
        return `${payload.substring(0, maxLength)}${BRAND_COLORS.muted("...")}`;
      }
      return payload;
    }
  }
}

/**
 * Global output formatter instance
 */
export const outputFormatter = new OutputFormatter();
