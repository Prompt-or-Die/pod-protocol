import { table } from "table";
import { getTableConfig, formatValue } from "../../utils/shared.js";

export interface MessageData {
  pubkey: { toBase58(): string };
  sender: { toBase58(): string };
  recipient: { toBase58(): string };
  messageType: string;
  status: string;
  payload: string;
  timestamp: number;
  expiresAt?: number;
}

export class MessageDisplayer {
  public displayMessageInfo(messageData: MessageData): void {
    const data = [
      ["Message ID", formatValue(messageData.pubkey.toBase58(), "address")],
      ["Sender", formatValue(messageData.sender.toBase58(), "address")],
      ["Recipient", formatValue(messageData.recipient.toBase58(), "address")],
      ["Type", formatValue(messageData.messageType, "text")],
      ["Status", formatValue(messageData.status, "text")],
      [
        "Payload",
        formatValue(
          messageData.payload.slice(0, 100) +
            (messageData.payload.length > 100 ? "..." : ""),
          "text",
        ),
      ],
      [
        "Timestamp",
        formatValue(
          new Date(messageData.timestamp * 1000).toLocaleString(),
          "text",
        ),
      ],
      [
        "Expires At",
        formatValue(
          messageData.expiresAt
            ? new Date(messageData.expiresAt * 1000).toLocaleString()
            : "Never",
          "text",
        ),
      ],
    ];

    console.log("\n" + table(data, getTableConfig("Message Information")));
  }

  public displayMessagesList(messages: MessageData[]): void {
    const data = messages.map((msg) => [
      formatValue(this.truncateString(msg.pubkey.toBase58(), 20), "address"),
      formatValue(this.truncateString(msg.sender.toBase58(), 20), "address"),
      formatValue(this.truncateString(msg.recipient.toBase58(), 20), "address"),
      msg.messageType,
      msg.status,
      new Date(msg.timestamp * 1000).toLocaleDateString(),
    ]);

    const header = ["ID", "Sender", "Recipient", "Type", "Status", "Date"];
    console.log("\n" + table([header, ...data], getTableConfig("Messages")));
  }

  private truncateString(str: string, maxLength: number): string {
    if (str.length <= maxLength) {
      return str;
    }
    return str.substring(0, maxLength - 3) + "...";
  }
}
