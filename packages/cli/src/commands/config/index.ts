import { Command } from "commander";
import chalk from 'chalk';
import boxen from 'boxen';
import * as emoji from 'node-emoji';

export function createConfigCommands(): Command {
  const config = new Command('config')
    .alias('cfg')
    .description('Configuration management');

  config
    .command('set')
    .description('Set configuration value')
    .argument('<key>', 'configuration key')
    .argument('<value>', 'configuration value')
    .action(async (key, value) => {
      console.log(boxen(
        `${emoji.get('gear')} Configuration updated!\n\n` +
        `${emoji.get('key')} Key: ${chalk.cyan(key)}\n` +
        `${emoji.get('memo')} Value: ${chalk.green(value)}`,
        {
          padding: 1,
          borderStyle: 'round',
          borderColor: 'green',
          title: ' Config Set '
        }
      ));
    });

  config
    .command('get')
    .description('Get configuration value')
    .argument('<key>', 'configuration key')
    .action(async (key) => {
      console.log(boxen(
        `${emoji.get('mag')} Configuration value:\n\n` +
        `${emoji.get('key')} ${key}: ${chalk.cyan('example-value')}`,
        {
          padding: 1,
          borderStyle: 'round',
          borderColor: 'blue',
          title: ' Config Value '
        }
      ));
    });

  config
    .command('list')
    .description('List all configuration')
    .action(async () => {
      console.log(boxen(
        `${emoji.get('scroll')} Current Configuration:\n\n` +
        `${emoji.get('globe_with_meridians')} network: devnet\n` +
        `${emoji.get('key')} keypair: ~/.config/solana/id.json\n` +
        `${emoji.get('bell')} notifications: enabled`,
        {
          padding: 1,
          borderStyle: 'round',
          borderColor: 'cyan',
          title: ' Configuration '
        }
      ));
    });

  return config;
} 