import { Command } from "commander";
import chalk from "chalk";
import inquirer from "inquirer";
import { table } from "table";
import { address, type Address } from "@solana/web3.js";
import { AGENT_CAPABILITIES, getCapabilityNames } from "@pod-protocol/sdk";
import {
  createCommandHandler,
  handleDryRun,
  createSpinner,
  showSuccess,
} from "../utils/shared.js";
import { createClient, getWallet, getKeypair } from "../utils/client.js";
import ora from "ora";

// Interfaces for type safety
interface AgentRegisterOptions {
  capabilities?: string;
  metadata?: string;
  interactive?: boolean;
}

interface AgentListOptions {
  limit?: string;
}

interface AgentUpdateOptions {
  capabilities?: string;
  metadata?: string;
  agent?: string;
  interactive?: boolean;
}

export class AgentCommands {
  register(program: Command) {
    const agent = program
      .command("agent")
      .description("Manage AI agents on POD-COM");

    this.setupRegisterCommand(agent);
    this.setupInfoCommand(agent);
    this.setupUpdateCommand(agent);
    this.setupListCommand(agent);
  }

  private setupRegisterCommand(agent: Command) {
    agent
      .command("register")
      .description("Register a new AI agent")
      .option("-c, --capabilities <value>", "Agent capabilities as number")
      .option("-m, --metadata <uri>", "Metadata URI")
      .option("-i, --interactive", "Interactive registration")
      .action(
        createCommandHandler(
          "register agent",
          async (client, wallet, globalOpts, options: AgentRegisterOptions) => {
            const { capabilities, metadataUri } =
              await this.prepareRegistrationData(options);

            const spinner = createSpinner("Registering agent...");

            if (
              handleDryRun(globalOpts, spinner, "Agent registration", {
                Capabilities: getCapabilityNames(capabilities).join(", "),
                "Metadata URI": metadataUri,
              })
            ) {
              return;
            }

            const signature = await client.agents.registerAgent(wallet, {
              capabilities,
              metadataUri,
            });

            showSuccess(spinner, "Agent registered successfully!", {
              Transaction: signature,
              Capabilities: getCapabilityNames(capabilities).join(", "),
              "Metadata URI": metadataUri,
            });
          },
        ),
      );
  }

  private setupInfoCommand(agent: Command) {
    agent
      .command("info [address]")
      .description("Show agent information")
      .action(async (address, cmd) => {
        const globalOpts = cmd.parent?.opts() || {};

        try {
          const spinner = ora("Fetching agent information...").start();
          const client = await createClient(globalOpts.network);
          const walletAddress = await this.resolveWalletAddress(address, globalOpts);
          const agentData = await client.agents.getAgent(walletAddress);

          if (!agentData) {
            spinner.fail("Agent not found");
            return;
          }

          spinner.succeed("Agent information retrieved");
          this.displayAgentInfo(agentData);
        } catch (error: any) {
          console.error(
            chalk.red("Failed to fetch agent info:"),
            error.message,
          );
          process.exit(1);
        }
      });
  }

  private setupUpdateCommand(agent: Command) {
    agent
      .command("update")
      .description("Update agent information")
      .option("-c, --capabilities <value>", "New capabilities")
      .option("-m, --metadata <uri>", "New metadata URI")
      .action(async (options, cmd) => {
        const globalOpts = cmd.parent?.opts() || {};

        try {
          const spinner = ora("Updating agent...").start();
          const wallet = await getWallet(globalOpts.keypair);
          const keypair = await getKeypair(globalOpts.keypair);
          const client = createClient({ network: globalOpts.network });
          const updateOptions = this.prepareUpdateOptions(options);

          if (Object.keys(updateOptions).length === 0) {
            spinner.fail("No updates specified");
            return;
          }

          if (globalOpts.dryRun) {
            spinner.succeed("Dry run: Agent update prepared");
            console.log(
              chalk.cyan("Updates:"),
              JSON.stringify(updateOptions, null, 2),
            );
            return;
          }

          const signature = await client.agents.updateAgent(
            keypair,
            updateOptions,
          );

          spinner.succeed("Agent updated successfully!");
          console.log(chalk.green("Transaction:"), signature);
        } catch (error: any) {
          console.error(chalk.red("Failed to update agent:"), error.message);
          process.exit(1);
        }
      });
  }

  private setupListCommand(agent: Command) {
    agent
      .command("list")
      .description("List all registered agents")
      .option("-l, --limit <number>", "Maximum number of agents to show", "10")
      .action(async (options, cmd) => {
        const globalOpts = cmd.parent?.opts() || {};

        try {
          const spinner = ora("Fetching agents...").start();
          const client = await createClient(globalOpts.network);
          const agents = await client.agents.getAllAgents(
            parseInt(options.limit, 10),
          );

          if (agents.length === 0) {
            spinner.succeed("No agents found");
            return;
          }

          spinner.succeed(`Found ${agents.length} agents`);
          this.displayAgentsList(agents);
        } catch (error: any) {
          console.error(chalk.red("Failed to list agents:"), error.message);
          process.exit(1);
        }
      });
  }

  private async prepareRegistrationData(options: AgentRegisterOptions) {
    let capabilities = options.capabilities
      ? parseInt(options.capabilities, 10)
      : 0;
    let metadataUri = options.metadata || "";

    if (options.interactive) {
      const answers = await this.promptForRegistrationData();
      capabilities = answers.capabilities.reduce(
        (acc: number, cap: number) => acc | cap,
        0,
      );
      metadataUri = answers.metadataUri;
    }

    if (!metadataUri) {
      metadataUri = `https://pod-com.org/agents/${Date.now()}`;
    }

    return { capabilities, metadataUri };
  }

  private async promptForRegistrationData() {
    return await inquirer.prompt([
      {
        type: "checkbox",
        name: "capabilities",
        message: "Select agent capabilities:",
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
      },
      {
        type: "input",
        name: "metadataUri",
        message: "Metadata URI (optional):",
        default: "",
      },
    ]);
  }

  private async resolveWalletAddress(
    addressString: string | undefined,
    globalOpts: Record<string, any>,
  ): Promise<Address> {
    if (addressString) {
      return address(addressString);
    } else {
      const wallet = await getWallet(globalOpts.keypair);
      return wallet.address;
    }
  }

  private displayAgentInfo(agentData: Record<string, any>) {
    const data = [
      ["Public Key", agentData.pubkey.toBase58()],
      ["Capabilities", getCapabilityNames(agentData.capabilities).join(", ")],
      ["Reputation", agentData.reputation.toString()],
      ["Metadata URI", agentData.metadataUri],
      ["Last Updated", new Date(agentData.lastUpdated * 1000).toLocaleString()],
    ];

    console.log(
      "\n" +
        table(data, {
          header: {
            alignment: "center",
            content: chalk.blue.bold("Agent Information"),
          },
        }),
    );
  }

  private prepareUpdateOptions(options: Record<string, any>) {
    const updateOptions: Record<string, any> = {};

    if (options.capabilities) {
      updateOptions.capabilities = parseInt(options.capabilities, 10);
    }

    if (options.metadata) {
      updateOptions.metadataUri = options.metadata;
    }

    return updateOptions;
  }

  private displayAgentsList(agents: Record<string, any>[]) {
    const data = agents.map((agent: Record<string, any>) => [
      agent.pubkey.toBase58().slice(0, 8) + "...",
      getCapabilityNames(agent.capabilities).join(", "),
      agent.reputation.toString(),
      new Date(agent.lastUpdated * 1000).toLocaleDateString(),
    ]);

    console.log(
      "\n" +
        table(
          [["Address", "Capabilities", "Reputation", "Last Updated"], ...data],
          {
            header: {
              alignment: "center",
              content: chalk.blue.bold("Registered Agents"),
            },
          },
        ),
    );
  }
}
