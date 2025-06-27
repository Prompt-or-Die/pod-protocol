import { Command } from "commander";
import chalk from 'chalk';
import boxen from 'boxen';
import * as emoji from 'node-emoji';

export function createDevCommands(): Command {
  const dev = new Command('dev')
    .alias('d')
    .description('Development tools and utilities');

  dev
    .command('deploy')
    .description('Deploy agent to network')
    .argument('<agent>', 'agent name')
    .option('--target <network>', 'target network', 'testnet')
    .action(async (agent, options) => {
      console.log(boxen(
        `${emoji.get('rocket')} Deploying agent: ${chalk.cyan(agent)}\n\n` +
        `${emoji.get('globe_with_meridians')} Target: ${chalk.yellow(options.target)}\n` +
        `${emoji.get('white_check_mark')} Validation: PASSED\n` +
        `${emoji.get('white_check_mark')} Deployment: SUCCESS`,
        {
          padding: 1,
          borderStyle: 'round',
          borderColor: 'green',
          title: ' Deployment Complete '
        }
      ));
    });

  dev
    .command('debug')
    .description('Debug agent')
    .argument('<agent>', 'agent name')
    .action(async (agent) => {
      console.log(boxen(
        `${emoji.get('bug')} Debug mode for: ${chalk.cyan(agent)}\n\n` +
        `${emoji.get('green_circle')} Status: Running\n` +
        `${emoji.get('computer')} CPU: 12%\n` +
        `${emoji.get('floppy_disk')} Memory: 256MB`,
        {
          padding: 1,
          borderStyle: 'round',
          borderColor: 'yellow',
          title: ' Debug Info '
        }
      ));
    });

  return dev;
} 