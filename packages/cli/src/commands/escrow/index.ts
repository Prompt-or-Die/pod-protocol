import { Command } from "commander";
import chalk from 'chalk';
import boxen from 'boxen';
import * as emoji from 'node-emoji';

export function createEscrowCommands(): Command {
  const escrow = new Command('escrow')
    .alias('e')
    .description('Escrow and smart contract operations');

  escrow
    .command('create')
    .description('Create a new escrow')
    .option('--amount <amount>', 'escrow amount')
    .action(async (options) => {
      console.log(boxen(
        `${emoji.get('lock')} Escrow created successfully!\n\n` +
        `${emoji.get('moneybag')} Amount: ${chalk.cyan(options.amount || '100 SOL')}\n` +
        `${emoji.get('key')} Contract: ${chalk.gray('Es3hRCY1kCZh...')}\n` +
        `${emoji.get('clock1')} Status: ${chalk.yellow('Pending')}`,
        {
          padding: 1,
          borderStyle: 'round',
          borderColor: 'green',
          title: ' Escrow Created '
        }
      ));
    });

  escrow
    .command('list')
    .description('List all escrows')
    .action(async () => {
      console.log(boxen(
        `${emoji.get('lock')} Active Escrows:\n\n` +
        `${emoji.get('yellow_circle')} ESC001: 100 SOL (Pending)\n` +
        `${emoji.get('green_circle')} ESC002: 50 SOL (Active)\n` +
        `${emoji.get('red_circle')} ESC003: 25 SOL (Completed)`,
        {
          padding: 1,
          borderStyle: 'round',
          borderColor: 'blue',
          title: ' Escrow List '
        }
      ));
    });

  return escrow;
} 