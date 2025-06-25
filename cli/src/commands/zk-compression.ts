/**
 * ZK Compression commands for PoD Protocol CLI
 * Handles compressed messages, participants, and batch operations
 */

import { Command } from 'commander';
import { address as createAddress, type Address } from '@solana/web3.js';
import { createClient, getWallet } from '../utils/client.js';
import { displayError } from '../utils/error-handler.js';
import { outputFormatter } from '../utils/output-formatter.js';
import { validatePublicKey } from '../utils/validation.js';
import { findAgentPDA } from '@pod-protocol/sdk';
import { safeParseConfig } from '../utils/safe-json.js';
import chalk from 'chalk';

export function createZKCompressionCommand(): Command {
  const zk = new Command('zk')
    .description('ZK compression operations for messages and participants')
    .alias('compression')
    .option('-k, --keypair <path>', 'Solana keypair file for signing transactions');

  // Message compression commands
  const messageCmd = zk
    .command('message')
    .description('Compressed message operations')
    .alias('msg');

  messageCmd
    .command('broadcast')
    .description('Broadcast a compressed message to a channel')
    .argument('<channel-id>', 'Channel public key')
    .argument('<content>', 'Message content')
    .option('-t, --type <type>', 'Message type', 'Text')
    .option('-r, --reply-to <pubkey>', 'Reply to message public key')
    .option('-a, --attachments <files...>', 'File attachments (IPFS)')
    .option('-m, --metadata <json>', 'Additional metadata as JSON')
    .option('--ipfs-url <url>', 'Custom IPFS node URL')
    .action(async (channelId, content, options) => {
      try {
        const wallet = await getWallet(options.keypair);
        const client = createClient();
        
        if (!validatePublicKey(channelId)) {
          throw new Error('Invalid channel ID');
        }

        const channel = createAddress(channelId);
        const replyTo = options.replyTo ? createAddress(options.replyTo) : undefined;
        const attachments = options.attachments || [];
        const metadata = options.metadata ? safeParseConfig(options.metadata) : {};
    
    if (options.metadata && !metadata) {
      console.error(chalk.red("Error: Invalid metadata format"));
      return;
    }

        console.log('📤 Broadcasting compressed message...');
        
        const result = await client.zkCompression.broadcastCompressedMessage(
          channel,
          content,
          wallet,
          options.type,
          attachments,
          metadata,
          replyTo
        );

        const output = {
          success: true,
          signature: result.signature,
          ipfs: {
            hash: result.ipfsResult.hash,
            url: result.ipfsResult.url,
            size: result.ipfsResult.size
          },
          compression: {
            account_hash: result.compressedAccount.hash,
            savings: '~99% storage cost reduction'
          }
        };

        outputFormatter.success('Compressed message broadcast successfully', output);
      } catch (error) {
        displayError('Failed to broadcast compressed message', error);
        process.exit(1);
      }
    });

  messageCmd
    .command('query')
    .description('Query compressed messages for a channel')
    .argument('<channel-id>', 'Channel public key')
    .option('-l, --limit <number>', 'Maximum number of messages', '50')
    .option('-o, --offset <number>', 'Offset for pagination', '0')
    .option('-s, --sender <pubkey>', 'Filter by sender')
    .option('--after <date>', 'Messages after date (ISO format)')
    .option('--before <date>', 'Messages before date (ISO format)')
    .option('--verify-content', 'Verify IPFS content against hashes')
    .action(async (channelId, options) => {
      try {
        const wallet = await getWallet(options.keypair);
        const client = createClient();
        
        if (!validatePublicKey(channelId)) {
          throw new Error('Invalid channel ID');
        }

        const channel = createAddress(channelId);
        const queryOptions: any = {
          limit: parseInt(options.limit),
          offset: parseInt(options.offset)
        };

        if (options.sender) {
          if (!validatePublicKey(options.sender)) {
            throw new Error('Invalid sender public key');
          }
          queryOptions.sender = createAddress(options.sender);
        }

        if (options.after) {
          queryOptions.after = new Date(options.after);
        }

        if (options.before) {
          queryOptions.before = new Date(options.before);
        }

        console.log('🔍 Querying compressed messages...');
        
        const messages = await client.zkCompression.queryCompressedMessages(
          channel,
          queryOptions
        );

        if (options.verifyContent) {
          console.log('🔐 Verifying content integrity...');
          for (const message of messages) {
            try {
              const { content, verified } = await client.zkCompression.getMessageContent(message);
              (message as any).verified = verified;
              (message as any).contentPreview = content.content.substring(0, 100) + '...';
            } catch (error) {
              (message as any).verified = false;
              (message as any).error = 'Failed to verify content';
            }
          }
        }

        const output = {
          channel: channelId,
          total_messages: messages.length,
          query_options: queryOptions,
          messages: messages.map(msg => ({
            sender: msg.sender.toString(),
            content_hash: msg.contentHash,
            ipfs_hash: msg.ipfsHash,
            message_type: msg.messageType,
            created_at: new Date(msg.createdAt).toISOString(),
            verified: (msg as any).verified,
            content_preview: (msg as any).contentPreview
          }))
        };

        outputFormatter.success(`Found ${messages.length} compressed messages`, output);
      } catch (error) {
        displayError('Failed to query compressed messages', error);
        process.exit(1);
      }
    });

  messageCmd
    .command('content')
    .description('Retrieve and verify message content from IPFS')
    .argument('<ipfs-hash>', 'IPFS hash of the message content')
    .option('--verify-hash <hash>', 'Verify against on-chain content hash')
    .action(async (ipfsHash, options) => {
      try {
        const wallet = await getWallet(options.keypair);
        const client = createClient();
        
        console.log('📥 Retrieving content from IPFS...');
        
        const content = await client.ipfs.retrieveMessageContent(ipfsHash);
        
        let verified = false;
        if (options.verifyHash) {
          // Use proper static method access
          const { IPFSService } = await import('@pod-protocol/sdk');
          const computedHash = IPFSService.createContentHash(content.content);
          verified = computedHash === options.verifyHash;
        }

        const output = {
          ipfs_hash: ipfsHash,
          verified: verified,
          content: content,
          metadata: {
            size: JSON.stringify(content).length,
            timestamp: new Date(content.timestamp).toISOString(),
            version: content.version
          }
        };

        outputFormatter.success('Content retrieved successfully', output);
      } catch (error) {
        displayError('Failed to retrieve message content', error);
        process.exit(1);
      }
    });

  // Participant compression commands
  const participantCmd = zk
    .command('participant')
    .description('Compressed participant operations')
    .alias('part');

  participantCmd
    .command('join')
    .description(
      'Join a channel with compressed participant data using your agent PDA',
    )
    .argument('<channel-id>', 'Channel public key')
    .option('-n, --name <name>', 'Display name')
    .option('-a, --avatar <url>', 'Avatar URL')
    .option('-p, --permissions <perms...>', 'Permissions list')
    .option(
      '--participant <pubkey>',
      'Participant public key (defaults to agent PDA)',
    )
    .action(async (channelId, options) => {
      try {
        const wallet = await getWallet(options.keypair);
        const client = createClient();
        
        if (!validatePublicKey(channelId)) {
          throw new Error('Invalid channel ID');
        }

        const channel = createAddress(channelId);

        const participant = options.participant
          ? validatePublicKey(options.participant, 'participant')
          : findAgentPDA(wallet.address)[0];
        
        console.log('🤝 Joining channel with compression...');
        
        // Ensure SDK's joinChannelCompressed function accepts wallet parameter
        const result = await client.zkCompression.joinChannelCompressed(
          channel,
          participant,
          wallet,
          options.name,
          options.avatar,
          options.permissions || [],
        );

        const output = {
          success: true,
          signature: result.signature,
          channel: channelId,
          participant: participant.toString(),
          metadata: result.ipfsResult ? {
            hash: result.ipfsResult.hash,
            url: result.ipfsResult.url
          } : null,
          compression: {
            account_hash: result.compressedAccount.hash,
            savings: '~160x cheaper than regular accounts'
          }
        };

        outputFormatter.success('Joined channel with compression', output);
      } catch (error) {
        displayError('Failed to join channel with compression', error);
        process.exit(1);
      }
    });

  // Batch operations
  const batchCmd = zk
    .command('batch')
    .description('Batch compression operations')
    .alias('sync');

  batchCmd
    .command('sync')
    .description('Batch sync compressed messages to chain')
    .argument('<channel-id>', 'Channel public key')
    .argument('<message-hashes...>', 'List of message hashes to sync')
    .option('-t, --timestamp <timestamp>', 'Custom sync timestamp')
    .action(async (channelId, messageHashes, options) => {
      try {
        const wallet = await getWallet(options.keypair);
        const client = createClient();
        
        if (!validatePublicKey(channelId)) {
          throw new Error('Invalid channel ID format. Expected base58 encoded public key.');
        }

        if (messageHashes.length === 0) {
          throw new Error('At least one message hash is required');
        }

        if (messageHashes.length > 100) {
          throw new Error('Maximum 100 message hashes per batch');
        }

        // Validate message hash formats
        for (const hash of messageHashes) {
          if (!/^[0-9a-fA-F]{64}$/.test(hash)) {
            throw new Error(`Invalid message hash format: ${hash}. Expected 64-character hex string.`);
          }
        }

        // Validate timestamp if provided
        if (options.timestamp) {
          const timestamp = parseInt(options.timestamp);
          if (isNaN(timestamp)) {
            throw new Error('Invalid timestamp format. Expected Unix timestamp in milliseconds.');
          }
          const currentTime = Date.now();
          const timeDiff = Math.abs(currentTime - timestamp);
          if (timeDiff > 3600000) {
            throw new Error('Timestamp must be within 1 hour of current time.');
          }
        }

        const channel = createAddress(channelId);
        const timestamp = options.timestamp ? parseInt(options.timestamp) : Date.now();
        
        console.log('🔄 Batch syncing compressed messages...');
        
        const result = await client.zkCompression.batchSyncMessages(
          channel,
          messageHashes,
          wallet,
          timestamp
        );

        const output = {
          success: true,
          signature: result.signature,
          channel: channelId,
          synced_messages: messageHashes.length,
          merkle_root: result.merkleRoot,
          timestamp: new Date(timestamp).toISOString(),
          cost_savings: `~${messageHashes.length * 5000}x vs individual transactions`
        };

        outputFormatter.success('Batch sync completed', output);
      } catch (error) {
        displayError('Failed to batch sync messages', error);
        process.exit(1);
      }
    });

  // Stats and monitoring
  const statsCmd = zk
    .command('stats')
    .description('ZK compression statistics and monitoring')
    .alias('status');

  statsCmd
    .command('channel')
    .description('Get channel compression statistics')
    .argument('<channel-id>', 'Channel public key')
    .action(async (channelId, options) => {
      try {
        const wallet = await getWallet(options.keypair);
        const client = createClient();
        
        if (!validatePublicKey(channelId)) {
          throw new Error('Invalid channel ID');
        }

        const channel = createAddress(channelId);
        
        console.log('📊 Fetching channel statistics...');
        
        const stats = await client.zkCompression.getChannelStats(channel);

        const output = {
          channel: channelId,
          statistics: {
            total_messages: stats.totalMessages,
            total_participants: stats.totalParticipants,
            storage_size_bytes: stats.storageSize,
            compression_ratio: `${stats.compressionRatio}:1`,
            estimated_savings: `${((1 - 1/stats.compressionRatio) * 100).toFixed(2)}%`
          },
          indexer_status: 'Connected to Photon indexer'
        };

        outputFormatter.success('Channel statistics', output);
      } catch (error) {
        displayError('Failed to get channel statistics', error);
        process.exit(1);
      }
    });

  statsCmd
    .command('batch-status')
    .description('Get current batch queue status')
    .action(async (_options?) => {
      try {
        const wallet = getWallet(_options?.keypair);
        const client = createClient();
        
        const status = client.zkCompression.getBatchStatus();

        const output = {
          batch_queue: {
            current_size: status.queueSize,
            max_batch_size: status.maxBatchSize,
            utilization: `${((status.queueSize / status.maxBatchSize) * 100).toFixed(1)}%`
          },
          batching: {
            enabled: status.enableBatching,
            auto_process: status.enableBatching ? 'Automatic' : 'Manual'
          },
          recommendations: status.queueSize > status.maxBatchSize * 0.8 
            ? ['Consider flushing batch soon', 'High queue utilization']
            : ['Queue utilization normal']
        };

        outputFormatter.success('Batch status', output);
      } catch (error) {
        displayError('Failed to get batch status', error);
        process.exit(1);
      }
    });

  statsCmd
    .command('flush-batch')
    .description('Force process the current batch queue')
    .action(async (_options?) => {
      try {
        const wallet = getWallet(_options?.keypair);
        const client = createClient();
        
        console.log('🔄 Flushing batch queue...');
        
        const result = await client.zkCompression.flushBatch();

        if (result) {
          const output = {
            success: true,
            batch_processed: true,
            signature: result.signature,
            batch_size: result.batchSize,
            message: 'Batch queue flushed successfully'
          };
          outputFormatter.success('Batch flushed', output);
        } else {
          outputFormatter.info('No messages in batch queue');
        }
      } catch (error) {
        displayError('Failed to flush batch', error);
        process.exit(1);
      }
    });

  // Configuration and setup
  const configCmd = zk
    .command('config')
    .description('ZK compression configuration')
    .alias('setup');

  configCmd
    .command('indexer')
    .description('Configure Photon indexer connection')
    .option(
      '--url <url>',
      'Indexer API URL',
      process.env.PHOTON_INDEXER_URL || 'https://mainnet.helius-rpc.com'
    )
    .option('--test', 'Test indexer connection')
    .action(async (options) => {
      try {
        if (options.test) {
          console.log('🔍 Testing indexer connection...');
          
          const response = await fetch(`${options.url}/health`);
          if (response.ok) {
            const health = await response.json();
            outputFormatter.success('Indexer connection successful', {
              url: options.url,
              status: health,
              version: health.version || 'unknown'
            });
          } else {
            throw new Error(`Indexer returned ${response.status}: ${response.statusText}`);
          }
        } else {
          outputFormatter.info('Indexer configuration', {
            current_url: options.url,
            commands: {
              test: 'pod zk config indexer --test',
              setup: './scripts/setup-photon-indexer.sh',
              start: './scripts/dev-with-zk.sh'
            }
          });
        }
      } catch (error) {
        displayError('Indexer configuration failed', error);
        process.exit(1);
      }
    });

  configCmd
    .command('ipfs')
    .description('Configure IPFS connection')
    .option('--url <url>', 'IPFS API URL', 'https://ipfs.infura.io:5001')
    .option('--test', 'Test IPFS connection')
    .action(async (options) => {
      try {
        const wallet = await getWallet(options.keypair);
        const client = createClient();
        
        if (options.test) {
          console.log('🔍 Testing IPFS connection...');
          
          const info = await client.ipfs.getNodeInfo();
          outputFormatter.success('IPFS connection successful', {
            url: options.url,
            node_id: info.id,
            version: info.agentVersion
          });
        } else {
          outputFormatter.info('IPFS configuration', {
            current_url: options.url,
            test_command: 'pod zk config ipfs --test'
          });
        }
      } catch (error) {
        displayError('IPFS configuration failed', error);
        process.exit(1);
      }
    });

  return zk;
}