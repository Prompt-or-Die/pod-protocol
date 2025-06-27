import { Command } from "commander";
import { createCommandHandler } from "../../utils/shared.js";
import { AgentHandlers } from "./handlers.js";
import {
  CommandContext,
  AgentRegisterOptions,
  AgentUpdateOptions,
  AgentListOptions,
} from "./types.js";

export class AgentCommands {
  public register(program: Command): void {
    const agent = program
      .command("agent")
      .description("Manage AI agents on POD-COM");

    this.setupRegisterCommand(agent);
    this.setupInfoCommand(agent);
    this.setupUpdateCommand(agent);
    this.setupListCommand(agent);
  }

  private setupRegisterCommand(agent: Command): void {
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
            const context: CommandContext = { client, wallet, globalOpts };
            const handlers = new AgentHandlers(context);
            await handlers.handleRegister(options);
          },
        ),
      );
  }

  private setupInfoCommand(agent: Command): void {
    agent
      .command("info [address]")
      .description("Show agent information")
      .action(
        createCommandHandler(
          "fetch agent info",
          async (client, wallet, globalOpts, address?: string) => {
            const context: CommandContext = { client, wallet, globalOpts };
            const handlers = new AgentHandlers(context);
            await handlers.handleInfo(address);
          },
        ),
      );
  }

  private setupUpdateCommand(agent: Command): void {
    agent
      .command("update")
      .description("Update agent information")
      .option("-c, --capabilities <value>", "New capabilities")
      .option("-m, --metadata <uri>", "New metadata URI")
      .action(
        createCommandHandler(
          "update agent",
          async (client, wallet, globalOpts, options: AgentUpdateOptions) => {
            const context: CommandContext = { client, wallet, globalOpts };
            const handlers = new AgentHandlers(context);
            await handlers.handleUpdate(options);
          },
        ),
      );
  }

  private setupListCommand(agent: Command): void {
    agent
      .command("list")
      .description("List all registered agents")
      .option("-l, --limit <number>", "Maximum number of agents to show", "10")
      .action(
        createCommandHandler(
          "list agents",
          async (client, wallet, globalOpts, options: AgentListOptions) => {
            const context: CommandContext = { client, wallet, globalOpts };
            const handlers = new AgentHandlers(context);
            await handlers.handleList(options);
          },
        ),
      );
  }
}
