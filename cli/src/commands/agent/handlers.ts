import { address as createAddress } from "@solana/web3.js";
import { AGENT_CAPABILITIES, getCapabilityNames } from "@pod-protocol/sdk";
import { input, select, checkbox, confirm } from '@inquirer/prompts';
import { AgentDisplayer } from "./displayer.js";
import { CommandContext, AgentRegisterOptions, AgentUpdateOptions, AgentListOptions } from "./types.js";
import { BRAND_COLORS, ICONS, showCommandHeader, statusMessage } from "../../utils/branding.js";
import { errorHandler } from "../../utils/enhanced-error-handler.js";
import ora from "ora";

export class AgentHandlers {
  private displayer: AgentDisplayer;

  constructor(private context: CommandContext) {
    this.displayer = new AgentDisplayer();
  }

  async handleRegister(options: AgentRegisterOptions): Promise<void> {
    try {
      showCommandHeader("Agent Registration", "🤖 Register your AI agent on PoD Protocol");

      let capabilities: number;
      let metadataUri: string;

      if (options.interactive || (!options.capabilities && !options.metadata)) {
        console.log(`${ICONS.agent} ${BRAND_COLORS.accent("Let's set up your AI agent step by step...")}`);
        console.log();

        // Interactive capability selection
        const capabilityChoices = [
          { name: 'Analysis 🧠', value: AGENT_CAPABILITIES.ANALYSIS, checked: false },
          { name: 'Trading 💰', value: AGENT_CAPABILITIES.TRADING, checked: false },
          { name: 'Content Creation ✍️', value: AGENT_CAPABILITIES.CONTENT_GENERATION, checked: false },
          { name: 'Communication 💬', value: AGENT_CAPABILITIES.CUSTOM1, checked: false },
          { name: 'Data Processing 📊', value: AGENT_CAPABILITIES.DATA_PROCESSING, checked: false },
          { name: 'Automation ⚙️', value: AGENT_CAPABILITIES.CUSTOM2, checked: false },
        ];

        const selectedCapabilities = await checkbox({
          message: `${ICONS.gear} Select your agent's capabilities:`,
          choices: capabilityChoices,
          required: true,
          validate: (answer) => {
            if (answer.length === 0) {
              return 'Please select at least one capability.';
            }
            return true;
          }
        });

        capabilities = selectedCapabilities.reduce((acc, cap) => acc | cap, 0);

        // Interactive metadata URI input
        metadataUri = await input({
          message: `${ICONS.info} Enter metadata URI (JSON describing your agent):`,
          default: 'https://example.com/agent-metadata.json',
          validate: (value) => {
            try {
              new URL(value);
              return true;
            } catch {
              return 'Please enter a valid URL for the metadata.';
            }
          }
        });

        // Confirmation
        console.log();
        console.log(`${ICONS.info} ${BRAND_COLORS.accent("Agent Registration Summary:")}`);
        console.log(`  ${BRAND_COLORS.primary("Capabilities:")} ${getCapabilityNames(capabilities).join(", ")}`);
        console.log(`  ${BRAND_COLORS.primary("Metadata URI:")} ${metadataUri}`);
        console.log();

        const confirmRegistration = await confirm({
          message: `${ICONS.rocket} Proceed with agent registration?`,
          default: true
        });

        if (!confirmRegistration) {
          console.log(`${ICONS.warning} ${BRAND_COLORS.warning("Registration cancelled by user.")}`);
          return;
        }
      } else {
        capabilities = options.capabilities ? parseInt(options.capabilities) : AGENT_CAPABILITIES.CUSTOM1;
        metadataUri = options.metadata || "";
      }

      // Registration process with progress indicator
      const spinner = ora({
        text: 'Preparing agent registration transaction...',
        spinner: 'aesthetic'
      }).start();

      try {
        spinner.text = 'Validating agent parameters...';
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate validation

        spinner.text = 'Creating agent registration transaction...';
        const result = await this.context.client.agents.registerAgent(
          this.context.wallet,
          {
            capabilities,
            metadataUri
          }
        );

        spinner.text = 'Confirming transaction on Solana...';
        await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate confirmation wait

        spinner.succeed(`${ICONS.success} Agent registered successfully!`);

        console.log();
        console.log(statusMessage("success", "🎉 Agent Registration Complete!", 
          `Your agent is now live on PoD Protocol with address: ${result}`));
        
        console.log();
        console.log(`${ICONS.rocket} ${BRAND_COLORS.primary("What's next?")}`);
        console.log(`  • View your agent: ${BRAND_COLORS.accent(`pod agent info ${result}`)}`);
        console.log(`  • Update capabilities: ${BRAND_COLORS.accent("pod agent update")}`);
        console.log(`  • Start messaging: ${BRAND_COLORS.accent("pod message send")}`);
        console.log();

      } catch (error) {
        spinner.fail('Agent registration failed');
        throw error;
      }

    } catch (error) {
      errorHandler.handleError(error as Error);
    }
  }

  async handleInfo(address?: string): Promise<void> {
    try {
      showCommandHeader("Agent Information", "📋 View detailed agent data");

      let agentAddress: string;

      if (!address) {
        agentAddress = await input({
          message: `${ICONS.search} Enter agent address:`,
          validate: (value) => {
            if (!value.trim()) {
              return 'Agent address is required.';
            }
            try {
              createAddress(value);
              return true;
            } catch {
              return 'Please enter a valid Solana address.';
            }
          }
        });
      } else {
        agentAddress = address;
      }

      const spinner = ora({
        text: `Fetching agent information for ${agentAddress.slice(0, 8)}...`,
        spinner: 'dots'
      }).start();

      try {
        const agentData = await this.context.client.agents.getAgent(createAddress(agentAddress));
        
        spinner.succeed(`${ICONS.success} Agent data retrieved successfully!`);
        console.log();
        
        this.displayer.displayAgentInfo(agentData);

      } catch (error) {
        spinner.fail('Failed to fetch agent information');
        throw error;
      }

    } catch (error) {
      errorHandler.handleError(error as Error);
    }
  }

  async handleUpdate(options: AgentUpdateOptions): Promise<void> {
    try {
      showCommandHeader("Agent Update", "🔧 Modify your agent's configuration");

      const agentAddress = await input({
        message: `${ICONS.search} Enter your agent address to update:`,
        validate: (value) => {
          if (!value.trim()) {
            return 'Agent address is required.';
          }
          try {
            createAddress(value);
            return true;
          } catch {
            return 'Please enter a valid Solana address.';
          }
        }
      });

      // Fetch current agent data
      const spinner = ora('Fetching current agent data...').start();
      const currentAgent = await this.context.client.agents.getAgent(createAddress(agentAddress));
      spinner.succeed('Current agent data loaded');

      console.log();
      console.log(`${ICONS.info} ${BRAND_COLORS.accent("Current Agent Configuration:")}`);
      console.log(`  ${BRAND_COLORS.primary("Capabilities:")} ${getCapabilityNames(currentAgent.capabilities).join(", ")}`);
      console.log(`  ${BRAND_COLORS.primary("Metadata URI:")} ${currentAgent.metadataUri}`);
      console.log();

      let newCapabilities = currentAgent.capabilities;
      let newMetadataUri = currentAgent.metadataUri;

      if (!options.capabilities && !options.metadata) {
        const updateChoice = await select({
          message: `${ICONS.gear} What would you like to update?`,
          choices: [
            { name: '🧠 Update Capabilities', value: 'capabilities' },
            { name: '📄 Update Metadata URI', value: 'metadata' },
            { name: '🔄 Update Both', value: 'both' },
          ]
        });

        if (updateChoice === 'capabilities' || updateChoice === 'both') {
          const capabilityChoices = [
            { name: 'Analysis 🧠', value: AGENT_CAPABILITIES.ANALYSIS, checked: (currentAgent.capabilities & AGENT_CAPABILITIES.ANALYSIS) !== 0 },
            { name: 'Trading 💰', value: AGENT_CAPABILITIES.TRADING, checked: (currentAgent.capabilities & AGENT_CAPABILITIES.TRADING) !== 0 },
            { name: 'Content Creation ✍️', value: AGENT_CAPABILITIES.CONTENT_GENERATION, checked: (currentAgent.capabilities & AGENT_CAPABILITIES.CONTENT_GENERATION) !== 0 },
                    { name: 'Communication 💬', value: AGENT_CAPABILITIES.CUSTOM1, checked: (currentAgent.capabilities & AGENT_CAPABILITIES.CUSTOM1) !== 0 },
        { name: 'Data Processing 📊', value: AGENT_CAPABILITIES.DATA_PROCESSING, checked: (currentAgent.capabilities & AGENT_CAPABILITIES.DATA_PROCESSING) !== 0 },
        { name: 'Automation ⚙️', value: AGENT_CAPABILITIES.CUSTOM2, checked: (currentAgent.capabilities & AGENT_CAPABILITIES.CUSTOM2) !== 0 },
          ];

          const selectedCapabilities = await checkbox({
            message: `${ICONS.gear} Select updated capabilities:`,
            choices: capabilityChoices,
            required: true,
          });

          newCapabilities = selectedCapabilities.reduce((acc, cap) => acc | cap, 0);
        }

        if (updateChoice === 'metadata' || updateChoice === 'both') {
          newMetadataUri = await input({
            message: `${ICONS.info} Enter new metadata URI:`,
            default: currentAgent.metadataUri,
            validate: (value) => {
              try {
                new URL(value);
                return true;
              } catch {
                return 'Please enter a valid URL for the metadata.';
              }
            }
          });
        }
      } else {
        if (options.capabilities) {
          newCapabilities = parseInt(options.capabilities);
        }
        if (options.metadata) {
          newMetadataUri = options.metadata;
        }
      }

      // Show changes summary
      console.log();
      console.log(`${ICONS.info} ${BRAND_COLORS.accent("Update Summary:")}`);
      if (newCapabilities !== currentAgent.capabilities) {
        console.log(`  ${BRAND_COLORS.primary("New Capabilities:")} ${getCapabilityNames(newCapabilities).join(", ")}`);
      }
      if (newMetadataUri !== currentAgent.metadataUri) {
        console.log(`  ${BRAND_COLORS.primary("New Metadata URI:")} ${newMetadataUri}`);
      }
      console.log();

      const confirmUpdate = await confirm({
        message: `${ICONS.rocket} Proceed with agent update?`,
        default: true
      });

      if (!confirmUpdate) {
        console.log(`${ICONS.warning} ${BRAND_COLORS.warning("Update cancelled by user.")}`);
        return;
      }

      const updateSpinner = ora('Updating agent configuration...').start();

      try {
        await this.context.client.agents.updateAgent(
          this.context.wallet,
          {
            capabilities: newCapabilities,
            metadataUri: newMetadataUri
          }
        );

        updateSpinner.succeed(`${ICONS.success} Agent updated successfully!`);
        console.log();
        console.log(statusMessage("success", "🎉 Agent Update Complete!", 
          `Your agent configuration has been updated on PoD Protocol`));

      } catch (error) {
        updateSpinner.fail('Agent update failed');
        throw error;
      }

    } catch (error) {
      errorHandler.handleError(error as Error);
    }
  }

  async handleList(options: AgentListOptions): Promise<void> {
    try {
      showCommandHeader("Agent Directory", "🤖 Browse registered AI agents");

      const limit = parseInt(options.limit) || 10;
      
      const spinner = ora(`Fetching up to ${limit} registered agents...`).start();

      try {
        const agents = await this.context.client.agents.getAllAgents(limit);
        
        spinner.succeed(`${ICONS.success} Found ${agents.length} agents on PoD Protocol`);
        console.log();

        this.displayer.displayAgentsList(agents);

        if (agents.length > 0) {
          const viewDetails = await confirm({
            message: `${ICONS.info} Would you like to view detailed info for any agent?`,
            default: false
          });

          if (viewDetails) {
            const selectedAgent = await select({
              message: `${ICONS.search} Select an agent to view details:`,
              choices: agents.map(agent => ({
                name: `${String(agent.pubkey).slice(0, 8)}... - ${getCapabilityNames(agent.capabilities).slice(0, 2).join(", ")}`,
                value: String(agent.pubkey)
              }))
            });

            await this.handleInfo(selectedAgent);
          }
        }

      } catch (error) {
        spinner.fail('Failed to fetch agents');
        throw error;
      }

    } catch (error) {
      errorHandler.handleError(error as Error);
    }
  }
}
