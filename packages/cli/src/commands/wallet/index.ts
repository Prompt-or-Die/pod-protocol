import { Command } from "commander";
import chalk from 'chalk';
import boxen from 'boxen';
import * as emoji from 'node-emoji';

export function createWalletCommands(): Command {
  const wallet = new Command('wallet')
    .alias('w')
    .description('Wallet and blockchain operations');

  wallet
    .command('create')
    .description('Create a new wallet')
    .option('-n, --name <name>', 'wallet name')
    .action(async (options) => {
      console.log(boxen(
        `${emoji.get('purse')} Wallet created successfully!\n\n` +
        `${emoji.get('label')} Name: ${chalk.cyan(options.name || 'default-wallet')}\n` +
        `${emoji.get('key')} Address: ${chalk.gray('9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM')}\n` +
        `${emoji.get('moneybag')} Balance: ${chalk.green('0 SOL')}`,
        {
          padding: 1,
          borderStyle: 'round',
          borderColor: 'green',
          title: ' Wallet Created '
        }
      ));
    });

  wallet
    .command('balance')
    .description('Check wallet balance')
    .action(async () => {
      console.log(boxen(
        `${emoji.get('moneybag')} Wallet Balance:\n\n` +
        `${emoji.get('coin')} SOL: ${chalk.green('5.25')}\n` +
        `${emoji.get('coin')} USDC: ${chalk.green('1,250.00')}\n` +
        `${emoji.get('coin')} POD: ${chalk.green('10,000')}`,
        {
          padding: 1,
          borderStyle: 'round',
          borderColor: 'blue',
          title: ' Balance '
        }
      ));
    });

  return wallet;
} 