import { getCapabilityNames } from "@pod-protocol/sdk";
import { outputFormatter } from "../../utils/output-formatter.js";
import { BRAND_COLORS, ICONS, sectionHeader } from "../../utils/branding.js";

export class AgentDisplayer {
  public displayAgentInfo(agentData: any): void {
    // Use the enhanced output formatter for agent display
    const agentInfo = {
      pubkey: agentData.pubkey.toBase58(),
      capabilities: agentData.capabilities,
      reputation: agentData.reputation,
      metadataUri: agentData.metadataUri,
      lastUpdated: agentData.lastUpdated,
    };

    outputFormatter.displayAgentInfo(agentInfo);

    // Add some helpful context
    console.log(
      `${ICONS.info} ${BRAND_COLORS.muted("Use")} ${BRAND_COLORS.primary("pod agent update")} ${BRAND_COLORS.muted("to modify this agent")}`,
    );
    console.log(
      `${ICONS.message} ${BRAND_COLORS.muted("Send messages with")} ${BRAND_COLORS.primary("pod message send " + agentData.pubkey.toBase58())}`,
    );
    console.log();
  }

  public displayAgentsList(agents: any[]): void {
    if (agents.length === 0) {
      console.log(`${ICONS.info} ${BRAND_COLORS.warning("No agents found")}`);
      console.log(
        `${ICONS.rocket} ${BRAND_COLORS.muted("Register your first agent with:")} ${BRAND_COLORS.primary("pod agent register")}`,
      );
      console.log();
      return;
    }

    console.log(sectionHeader(`Found ${agents.length} Agents`, ICONS.agent));
    console.log();

    const columns = [
      {
        key: "address",
        label: "Address",
        width: 20,
        formatter: (addr: string) =>
          BRAND_COLORS.primary(addr.slice(0, 8) + "..."),
      },
      {
        key: "capabilities",
        label: "Capabilities",
        width: 30,
        formatter: (caps: number) => getCapabilityNames(caps).join(", "),
      },
      {
        key: "reputation",
        label: "Reputation",
        width: 12,
        align: "center" as const,
        formatter: (rep: number) => BRAND_COLORS.secondary(rep.toString()),
      },
      {
        key: "lastUpdated",
        label: "Last Updated",
        width: 15,
        formatter: (ts: number) => new Date(ts * 1000).toLocaleDateString(),
      },
    ];

    const tableData = agents.map((agent) => ({
      address: agent.pubkey.toBase58(),
      capabilities: agent.capabilities,
      reputation: agent.reputation,
      lastUpdated: agent.lastUpdated,
    }));

    outputFormatter.displayTable(tableData, columns);

    console.log(
      `${ICONS.info} ${BRAND_COLORS.muted("Use")} ${BRAND_COLORS.primary("pod agent info <address>")} ${BRAND_COLORS.muted("for detailed information")}`,
    );
    console.log();
  }
}
