import { Command } from "commander";
import chalk from 'chalk';
import boxen from 'boxen';
import * as emoji from 'node-emoji';
import { intro, outro, text, select, confirm } from '@clack/prompts';

export function createChannelCommands(): Command {
  const channel = new Command('channel')
    .alias('ch')
    .description('Channel management and communication');

  channel
    .command('create')
    .description('Create a new channel')
    .option('-n, --name <name>', 'channel name')
    .option('--private', 'create private channel')
    .action(async (options) => {
      console.log(boxen(
        `${emoji.get('speech_balloon')} Channel created successfully!\n\n` +
        `${emoji.get('label')} Name: ${chalk.cyan(options.name || 'new-channel')}\n` +
        `${emoji.get('lock')} Privacy: ${options.private ? chalk.yellow('Private') : chalk.green('Public')}`,
        {
          padding: 1,
          borderStyle: 'round',
          borderColor: 'green',
          title: ' Channel Created '
        }
      ));
    });

  channel
    .command('list')
    .description('List all channels')
    .action(async () => {
      console.log(boxen(
        `${emoji.get('speech_balloon')} Active Channels:\n\n` +
        `${emoji.get('green_circle')} #general (12 members)\n` +
        `${emoji.get('green_circle')} #trading (8 members)\n` +
        `${emoji.get('yellow_circle')} #alerts (5 members)`,
        {
          padding: 1,
          borderStyle: 'round',
          borderColor: 'blue',
          title: ' Channel List '
        }
      ));
    });

  return channel;
} 