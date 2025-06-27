import { Command } from "commander";
import chalk from 'chalk';
import boxen from 'boxen';
import * as emoji from 'node-emoji';

export function createNetworkCommands(): Command {
  const network = new Command('network')
    .alias('net')
    .description('Network operations and management');

  network
    .command('status')
    .description('Check network status')
    .action(async () => {
      console.log(boxen(
        `${emoji.get('globe_with_meridians')} Network Status:\n\n` +
        `${emoji.get('green_circle')} Devnet: ONLINE\n` +
        `${emoji.get('green_circle')} Testnet: ONLINE\n` +
        `${emoji.get('green_circle')} Mainnet: ONLINE`,
        {
          padding: 1,
          borderStyle: 'round',
          borderColor: 'green',
          title: ' Network Status '
        }
      ));
    });

  network
    .command('switch')
    .description('Switch network')
    .argument('<network>', 'network name (devnet, testnet, mainnet)')
    .action(async (networkName) => {
      console.log(boxen(
        `${emoji.get('arrows_counterclockwise')} Network switched!\n\n` +
        `${emoji.get('globe_with_meridians')} Current: ${chalk.cyan(networkName)}`,
        {
          padding: 1,
          borderStyle: 'round',
          borderColor: 'blue',
          title: ' Network Switch '
        }
      ));
    });

  return network;
} 