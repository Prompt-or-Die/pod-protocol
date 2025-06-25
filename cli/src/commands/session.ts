/**
 * Session Keys Management Commands
 * Provides ephemeral key management for seamless AI agent interactions
 */

import { Command } from 'commander';
import { PodComClient } from '@pod-protocol/sdk';
import { PublicKey } from '@solana/web3.js';
import { createClient, getWallet } from '../utils/client.js';
import { getCliConfig } from '../utils/config.js';
import { createSpinner, showSuccess, formatValue } from '../utils/shared.js';
import chalk from 'chalk';

export function createSessionCommand(): Command {
  const sessionCmd = new Command('session')
    .description('Manage session keys for seamless AI agent interactions');

  // Create session key
  sessionCmd
    .command('create')
    .description('Create a new session key')
    .option('-d, --duration <hours>', 'Session duration in hours', '24')
    .option('-u, --max-uses <number>', 'Maximum number of uses', '1000')
    .option('-p, --programs <programs>', 'Comma-separated list of allowed program IDs')
    .action(async (options, cmd) => {
      try {
        const globalOpts = cmd.parent?.opts() || {};
        const client = await createClient(globalOpts.network);
        const wallet = getWallet(globalOpts.keypair);
        await client.initialize(wallet);

        const duration = parseInt(options.duration);
        const maxUses = parseInt(options.maxUses);
        
        // Parse program IDs
        const targetPrograms = options.programs 
          ? options.programs.split(',').map((p: string) => new PublicKey(p.trim()))
          : [client.getProgramId()];

        const sessionConfig = {
          targetPrograms,
          expiryTime: Date.now() + (duration * 60 * 60 * 1000),
          maxUses,
          allowedInstructions: [
            'send_message',
            'broadcast_message', 
            'join_channel',
            'leave_channel'
          ]
        };

        const spinner = createSpinner('Creating session key...');
        const session = await client.sessionKeys.createSessionKey(sessionConfig);
        
        showSuccess(spinner, 'Session key created successfully!', {
          'Session ID': session.sessionKeypair.publicKey.toBase58(),
          'Expires': new Date(session.config.expiryTime).toLocaleString(),
          'Max Uses': session.usesRemaining || 'unlimited',
          'Session Token Account': session.sessionTokenAccount.toBase58()
        });
        
        console.log(chalk.blue('Session key saved to local config for CLI usage'));
        
      } catch (err: any) {
        console.error(chalk.red(`Failed to create session key: ${err.message}`));
        process.exit(1);
      }
    });

  // List active sessions
  sessionCmd
    .command('list')
    .description('List all active session keys')
    .action(async (cmd) => {
      try {
        const globalOpts = cmd.parent?.opts() || {};
        const client = await createClient(globalOpts.network);
        const wallet = getWallet(globalOpts.keypair);
        await client.initialize(wallet);

        const sessions = client.sessionKeys.getActiveSessions();
        
        if (sessions.length === 0) {
          console.log(chalk.blue('No active session keys found'));
          return;
        }

        console.log(chalk.green(`Found ${sessions.length} active session(s):`));
        
        sessions.forEach((session, index) => {
          console.log(`\n${index + 1}. Session ID: ${formatValue(session.sessionKeypair.publicKey.toBase58(), 'address')}`);
          console.log(`   Expires: ${new Date(session.config.expiryTime).toLocaleString()}`);
          console.log(`   Uses Remaining: ${session.usesRemaining || 'unlimited'}`);
          console.log(`   Token Account: ${formatValue(session.sessionTokenAccount.toBase58(), 'address')}`);
        });
        
      } catch (err: any) {
        console.error(chalk.red(`Failed to list sessions: ${err.message}`));
        process.exit(1);
      }
    });

  // Use session key for transaction
  sessionCmd
    .command('use')
    .description('Execute a transaction using a session key')
    .requiredOption('-s, --session-id <sessionId>', 'Session key ID')
    .requiredOption('-a, --action <action>', 'Action to perform (send-message, join-channel, etc.)')
    .option('-t, --target <target>', 'Target (recipient, channel, etc.)')
    .option('-m, --message <message>', 'Message content')
    .action(async (options) => {
      try {
        const config = await getCliConfig();
        const client = new PodComClient(config);
        
        // For session operations, we don't need to initialize with wallet
        // as the session key will handle signing
        
        const sessionId = options.sessionId;
        const action = options.action;
        
        console.log(chalk.blue(`Using session key: ${sessionId}`));
        console.log(chalk.blue(`Performing action: ${action}`));
        
        // Create appropriate instruction based on action
        let instructions = [];
        
        switch (action) {
          case 'send-message':
            if (!options.target || !options.message) {
              console.error(chalk.red('send-message requires --target and --message options'));
              return;
            }
            // This would create send message instruction
            // For now, just show the concept
            console.log(chalk.blue(`Would send message "${options.message}" to ${options.target}`));
            break;
            
          case 'join-channel':
            if (!options.target) {
              console.error(chalk.red('join-channel requires --target option'));
              return;
            }
            console.log(chalk.blue(`Would join channel: ${options.target}`));
            break;
            
          default:
            console.error(chalk.red(`Unknown action: ${action}`));
            return;
        }
        
        // const signature = await client.sessionKeys.useSessionKey(sessionId, instructions);
        // console.log(chalk.green(`Transaction completed: ${signature}`));
        
        console.log(chalk.blue('Session key usage simulation completed'));
        
      } catch (err: any) {
        console.error(chalk.red(`Failed to use session key: ${err.message}`));
        process.exit(1);
      }
    });

  // Revoke session key
  sessionCmd
    .command('revoke')
    .description('Revoke a session key')
    .requiredOption('-s, --session-id <sessionId>', 'Session key ID to revoke')
    .action(async (options, cmd) => {
      try {
        const globalOpts = cmd.parent?.opts() || {};
        const client = await createClient(globalOpts.network);
        const wallet = getWallet(globalOpts.keypair);
        await client.initialize(wallet);

        const sessionId = options.sessionId;
        
        const spinner = createSpinner(`Revoking session key: ${sessionId}`);
        const signature = await client.sessionKeys.revokeSessionKey(sessionId);
        
        showSuccess(spinner, 'Session key revoked successfully!', {
          'Transaction': signature
        });
        
      } catch (err: any) {
        console.error(chalk.red(`Failed to revoke session key: ${err.message}`));
        process.exit(1);
      }
    });

  // Create messaging session (convenience command)
  sessionCmd
    .command('create-messaging')
    .description('Create a session key optimized for AI messaging')
    .option('-d, --duration <hours>', 'Session duration in hours', '24')
    .action(async (options, cmd) => {
      try {
        const globalOpts = cmd.parent?.opts() || {};
        const client = await createClient(globalOpts.network);
        const wallet = getWallet(globalOpts.keypair);
        await client.initialize(wallet);

        const duration = parseInt(options.duration);
        
        const spinner = createSpinner('Creating messaging session key...');
        const session = await client.sessionKeys.createMessagingSession(duration);
        
        showSuccess(spinner, 'Messaging session key created successfully!', {
          'Session ID': session.sessionKeypair.publicKey.toBase58(),
          'Expires': new Date(session.config.expiryTime).toLocaleString(),
          'Max Uses': `${session.usesRemaining} messages`
        });
        
        console.log(chalk.blue('This session is optimized for AI agent messaging operations'));
        
      } catch (err: any) {
        console.error(chalk.red(`Failed to create messaging session: ${err.message}`));
        process.exit(1);
      }
    });

  return sessionCmd;
}