import chalk from "chalk";
import { table } from "table";
// import { getTableConfig, formatValue } from "../../utils/shared.js";

export class ChannelDisplayer {
  displayChannelInfo(channelData: any): void {
    const data = [
      ["Public Key", channelData.pubkey.toBase58()],
      ["Name", channelData.name],
      ["Description", channelData.description],
      ["Visibility", channelData.visibility],
      ["Creator", channelData.creator.toBase58()],
      [
        "Participants",
        `${channelData.currentParticipants}/${channelData.maxParticipants}`,
      ],
      ["Fee per Message", `${channelData.feePerMessage} lamports`],
      ["Escrow Balance", `${channelData.escrowBalance} lamports`],
      ["Created At", new Date(channelData.createdAt * 1000).toLocaleString()],
      ["Active", channelData.isActive ? "Yes" : "No"],
    ];

    console.log(
      "\n" +
        table(data, {
          header: {
            alignment: "center",
            content: chalk.blue.bold("Channel Information"),
          },
        }),
    );
  }

  displayChannelsList(channels: any[]): void {
    const data = [
      ["Public Key", "Name", "Visibility", "Participants", "Creator"],
      ...channels.map((channel) => [
        this.truncateString(channel.pubkey.toBase58(), 20),
        this.truncateString(channel.name, 15),
        this.truncateString(channel.visibility, 10),
        `${channel.currentParticipants}/${channel.maxParticipants}`,
        this.truncateString(channel.creator.toBase58(), 20),
      ]),
    ];

    console.log("\n" + table(data, this.getTableConfig("Channels")));
  }

  displayParticipantsList(participants: any[]): void {
    const data = [
      ["Public Key", "Joined At", "Status"],
      ...participants.map((participant) => [
        this.truncateString(participant.pubkey.toBase58(), 44),
        new Date(participant.joinedAt * 1000).toLocaleString(),
        participant.isActive ? "Active" : "Inactive",
      ]),
    ];

    console.log("\n" + table(data, this.getTableConfig("Participants")));
  }

  displayMessagesList(messages: any[]): void {
    const data = [
      ["ID", "Sender", "Type", "Content", "Timestamp"],
      ...messages.map((message) => [
        this.truncateString(message.id.toBase58(), 20),
        this.truncateString(message.sender.toBase58(), 20),
        this.truncateString(message.messageType, 8),
        this.truncateString(message.content, 30),
        new Date(message.timestamp * 1000).toLocaleString(),
      ]),
    ];

    console.log("\n" + table(data, this.getTableConfig("Messages")));
  }

  private truncateString(str: string, maxLength: number): string {
    if (str.length <= maxLength) {
      return str;
    }
    return str.substring(0, maxLength - 3) + "...";
  }

  private getTableConfig(title: string) {
    return {
      header: {
        alignment: "center" as const,
        content: chalk.blue.bold(title),
      },
    };
  }
}
