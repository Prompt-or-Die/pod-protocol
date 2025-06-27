/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 * Optimized to reduce duplicate code.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/pod_com.json`.
 */
// Constants to eliminate duplicate values
const AGENT_SEED = [97, 103, 101, 110, 116];
const ESCROW_SEED = [101, 115, 99, 114, 111, 119];
const CHANNEL_SEED = [99, 104, 97, 110, 110, 101, 108];
const SYSTEM_PROGRAM_ID = "11111111111111111111111111111111";
export const IDL = {
    address: "HEpGLgYsE1kP8aoYKyLFc3JVVrofS7T4zEA6fWBJsZps",
    metadata: {
        name: "podCom",
        version: "0.1.0",
        spec: "0.1.0",
        description: "PoD Protocol (Prompt or Die): AI Agent Communication Protocol",
    },
    instructions: [
        {
            name: "createChannel",
            discriminator: [37, 105, 253, 99, 87, 46, 223, 20],
            accounts: [
                {
                    name: "channelAccount",
                    writable: true,
                    pda: {
                        seeds: [
                            {
                                kind: "const",
                                value: CHANNEL_SEED,
                            },
                            {
                                kind: "account",
                                path: "creator",
                            },
                            {
                                kind: "arg",
                                path: "name",
                            },
                        ],
                    },
                },
                {
                    name: "creator",
                    writable: true,
                    signer: true,
                },
                {
                    name: "systemProgram",
                    address: SYSTEM_PROGRAM_ID,
                },
            ],
            args: [
                {
                    name: "name",
                    type: "string",
                },
                {
                    name: "description",
                    type: "string",
                },
                {
                    name: "visibility",
                    type: {
                        defined: {
                            name: "channelVisibility",
                        },
                    },
                },
                {
                    name: "maxParticipants",
                    type: "u32",
                },
                {
                    name: "feePerMessage",
                    type: "u64",
                },
            ],
        },
        {
            name: "depositEscrow",
            discriminator: [226, 112, 158, 176, 178, 118, 153, 128],
            accounts: [
                {
                    name: "escrowAccount",
                    writable: true,
                    pda: {
                        seeds: [
                            {
                                kind: "const",
                                value: ESCROW_SEED,
                            },
                            {
                                kind: "account",
                                path: "channelAccount",
                            },
                            {
                                kind: "account",
                                path: "depositor",
                            },
                        ],
                    },
                },
                {
                    name: "channelAccount",
                    writable: true,
                },
                {
                    name: "depositor",
                    writable: true,
                    signer: true,
                },
                {
                    name: "systemProgram",
                    address: SYSTEM_PROGRAM_ID,
                },
            ],
            args: [
                {
                    name: "amount",
                    type: "u64",
                },
            ],
        },
        {
            name: "registerAgent",
            discriminator: [135, 157, 66, 195, 2, 113, 175, 30],
            accounts: [
                {
                    name: "agentAccount",
                    writable: true,
                    pda: {
                        seeds: [
                            {
                                kind: "const",
                                value: AGENT_SEED,
                            },
                            {
                                kind: "account",
                                path: "signer",
                            },
                        ],
                    },
                },
                {
                    name: "signer",
                    writable: true,
                    signer: true,
                },
                {
                    name: "systemProgram",
                    address: SYSTEM_PROGRAM_ID,
                },
            ],
            args: [
                {
                    name: "capabilities",
                    type: "u64",
                },
                {
                    name: "metadataUri",
                    type: "string",
                },
            ],
        },
        {
            name: "sendMessage",
            discriminator: [57, 40, 34, 178, 189, 10, 65, 26],
            accounts: [
                {
                    name: "messageAccount",
                    writable: true,
                },
                {
                    name: "senderAgent",
                    pda: {
                        seeds: [
                            {
                                kind: "const",
                                value: AGENT_SEED,
                            },
                            {
                                kind: "account",
                                path: "signer",
                            },
                        ],
                    },
                },
                {
                    name: "signer",
                    writable: true,
                    signer: true,
                },
                {
                    name: "systemProgram",
                    address: SYSTEM_PROGRAM_ID,
                },
            ],
            args: [
                {
                    name: "recipient",
                    type: "pubkey",
                },
                {
                    name: "payloadHash",
                    type: {
                        array: ["u8", 32],
                    },
                },
                {
                    name: "messageType",
                    type: {
                        defined: {
                            name: "messageType",
                        },
                    },
                },
            ],
        },
        {
            name: "updateAgent",
            discriminator: [85, 2, 178, 9, 119, 139, 102, 164],
            accounts: [
                {
                    name: "agentAccount",
                    writable: true,
                    pda: {
                        seeds: [
                            {
                                kind: "const",
                                value: AGENT_SEED,
                            },
                            {
                                kind: "account",
                                path: "agent_account.pubkey",
                                account: "agentAccount",
                            },
                        ],
                    },
                },
                {
                    name: "signer",
                    signer: true,
                },
            ],
            args: [
                {
                    name: "capabilities",
                    type: {
                        option: "u64",
                    },
                },
                {
                    name: "metadataUri",
                    type: {
                        option: "string",
                    },
                },
            ],
        },
        {
            name: "updateMessageStatus",
            discriminator: [82, 100, 156, 74, 97, 190, 248, 132],
            accounts: [
                {
                    name: "messageAccount",
                    writable: true,
                },
                {
                    name: "recipientAgent",
                    pda: {
                        seeds: [
                            {
                                kind: "const",
                                value: AGENT_SEED,
                            },
                            {
                                kind: "account",
                                path: "signer",
                            },
                        ],
                    },
                },
                {
                    name: "signer",
                    signer: true,
                },
            ],
            args: [
                {
                    name: "newStatus",
                    type: {
                        defined: {
                            name: "messageStatus",
                        },
                    },
                },
            ],
        },
        {
            name: "withdrawEscrow",
            discriminator: [81, 84, 226, 128, 245, 47, 96, 104],
            accounts: [
                {
                    name: "escrowAccount",
                    writable: true,
                    pda: {
                        seeds: [
                            {
                                kind: "const",
                                value: ESCROW_SEED,
                            },
                            {
                                kind: "account",
                                path: "channelAccount",
                            },
                            {
                                kind: "account",
                                path: "depositor",
                            },
                        ],
                    },
                },
                {
                    name: "channelAccount",
                    writable: true,
                },
                {
                    name: "depositor",
                    writable: true,
                    signer: true,
                },
                {
                    name: "systemProgram",
                    address: SYSTEM_PROGRAM_ID,
                },
            ],
            args: [
                {
                    name: "amount",
                    type: "u64",
                },
            ],
        },
    ],
    accounts: [
        {
            name: "agentAccount",
            discriminator: [241, 119, 69, 140, 233, 9, 112, 50],
        },
        {
            name: "channelAccount",
            discriminator: [140, 232, 26, 78, 89, 26, 17, 244],
        },
        {
            name: "escrowAccount",
            discriminator: [36, 69, 48, 18, 128, 225, 125, 135],
        },
        {
            name: "messageAccount",
            discriminator: [97, 144, 24, 58, 225, 40, 89, 223],
        },
    ],
    errors: [
        {
            code: 6000,
            name: "invalidMetadataUriLength",
            msg: "Invalid metadata URI length",
        },
        {
            code: 6001,
            name: "unauthorized",
            msg: "unauthorized",
        },
        {
            code: 6002,
            name: "messageExpired",
            msg: "Message expired",
        },
        {
            code: 6003,
            name: "invalidMessageStatusTransition",
            msg: "Invalid message status transition",
        },
    ],
    types: [
        {
            name: "agentAccount",
            type: {
                kind: "struct",
                fields: [
                    {
                        name: "pubkey",
                        type: "pubkey",
                    },
                    {
                        name: "capabilities",
                        type: "u64",
                    },
                    {
                        name: "metadataUri",
                        type: "string",
                    },
                    {
                        name: "reputation",
                        type: "u64",
                    },
                    {
                        name: "lastUpdated",
                        type: "i64",
                    },
                    {
                        name: "bump",
                        type: "u8",
                    },
                    {
                        name: "reserved",
                        type: {
                            array: ["u8", 7],
                        },
                    },
                ],
            },
        },
        {
            name: "channelAccount",
            type: {
                kind: "struct",
                fields: [
                    {
                        name: "creator",
                        type: "pubkey",
                    },
                    {
                        name: "name",
                        type: "string",
                    },
                    {
                        name: "description",
                        type: "string",
                    },
                    {
                        name: "visibility",
                        type: {
                            defined: {
                                name: "channelVisibility",
                            },
                        },
                    },
                    {
                        name: "maxParticipants",
                        type: "u32",
                    },
                    {
                        name: "currentParticipants",
                        type: "u32",
                    },
                    {
                        name: "feePerMessage",
                        type: "u64",
                    },
                    {
                        name: "escrowBalance",
                        type: "u64",
                    },
                    {
                        name: "createdAt",
                        type: "i64",
                    },
                    {
                        name: "bump",
                        type: "u8",
                    },
                    {
                        name: "reserved",
                        type: {
                            array: ["u8", 7],
                        },
                    },
                ],
            },
        },
        {
            name: "channelVisibility",
            type: {
                kind: "enum",
                variants: [
                    {
                        name: "public",
                    },
                    {
                        name: "private",
                    },
                ],
            },
        },
        {
            name: "escrowAccount",
            type: {
                kind: "struct",
                fields: [
                    {
                        name: "channel",
                        type: "pubkey",
                    },
                    {
                        name: "depositor",
                        type: "pubkey",
                    },
                    {
                        name: "amount",
                        type: "u64",
                    },
                    {
                        name: "createdAt",
                        type: "i64",
                    },
                    {
                        name: "bump",
                        type: "u8",
                    },
                    {
                        name: "reserved",
                        type: {
                            array: ["u8", 7],
                        },
                    },
                ],
            },
        },
        {
            name: "messageAccount",
            type: {
                kind: "struct",
                fields: [
                    {
                        name: "sender",
                        type: "pubkey",
                    },
                    {
                        name: "recipient",
                        type: "pubkey",
                    },
                    {
                        name: "payloadHash",
                        type: {
                            array: ["u8", 32],
                        },
                    },
                    {
                        name: "messageType",
                        type: {
                            defined: {
                                name: "messageType",
                            },
                        },
                    },
                    {
                        name: "createdAt",
                        type: "i64",
                    },
                    {
                        name: "expiresAt",
                        type: "i64",
                    },
                    {
                        name: "status",
                        type: {
                            defined: {
                                name: "messageStatus",
                            },
                        },
                    },
                    {
                        name: "bump",
                        type: "u8",
                    },
                    {
                        name: "reserved",
                        type: {
                            array: ["u8", 7],
                        },
                    },
                ],
            },
        },
        {
            name: "messageStatus",
            type: {
                kind: "enum",
                variants: [
                    {
                        name: "pending",
                    },
                    {
                        name: "delivered",
                    },
                    {
                        name: "read",
                    },
                    {
                        name: "failed",
                    },
                ],
            },
        },
        {
            name: "messageType",
            type: {
                kind: "enum",
                variants: [
                    {
                        name: "text",
                    },
                    {
                        name: "data",
                    },
                    {
                        name: "command",
                    },
                    {
                        name: "response",
                    },
                    {
                        name: "custom",
                        fields: ["u8"],
                    },
                ],
            },
        },
    ],
};
//# sourceMappingURL=pod_com.js.map