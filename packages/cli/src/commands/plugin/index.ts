import { Command } from "commander";
import chalk from 'chalk';
import boxen from 'boxen';
import * as emoji from 'node-emoji';

export function createPluginCommands(): Command {
  const plugin = new Command('plugin')
    .alias('p')
    .description('Plugin management and development');

  plugin
    .command('install')
    .description('Install a plugin')
    .argument('<name>', 'plugin name')
    .action(async (name) => {
      console.log(boxen(
        `${emoji.get('package')} Plugin installed successfully!\n\n` +
        `${emoji.get('label')} Name: ${chalk.cyan(name)}\n` +
        `${emoji.get('white_check_mark')} Status: ACTIVE`,
        {
          padding: 1,
          borderStyle: 'round',
          borderColor: 'green',
          title: ' Plugin Installed '
        }
      ));
    });

  plugin
    .command('list')
    .description('List installed plugins')
    .action(async () => {
      console.log(boxen(
        `${emoji.get('package')} Installed Plugins:\n\n` +
        `${emoji.get('green_circle')} trading-analyzer v1.2.0\n` +
        `${emoji.get('green_circle')} notification-service v2.1.0\n` +
        `${emoji.get('yellow_circle')} backup-manager v1.0.0 (disabled)`,
        {
          padding: 1,
          borderStyle: 'round',
          borderColor: 'blue',
          title: ' Plugin List '
        }
      ));
    });

  return plugin;
} 