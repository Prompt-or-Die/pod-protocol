import { Command } from "commander";
import chalk from 'chalk';
import boxen from 'boxen';
import * as emoji from 'node-emoji';

export function createAutomationCommands(): Command {
  const automation = new Command('automation')
    .alias('auto')
    .description('Automation and workflow management');

  automation
    .command('create')
    .description('Create a new automation')
    .option('-n, --name <name>', 'automation name')
    .option('--trigger <trigger>', 'trigger type (time, event, condition)')
    .action(async (options) => {
      console.log(boxen(
        `${emoji.get('robot_face')} Automation created successfully!\n\n` +
        `${emoji.get('label')} Name: ${chalk.cyan(options.name || 'new-automation')}\n` +
        `${emoji.get('zap')} Trigger: ${chalk.yellow(options.trigger || 'event')}\n` +
        `${emoji.get('white_check_mark')} Status: ACTIVE`,
        {
          padding: 1,
          borderStyle: 'round',
          borderColor: 'green',
          title: ' Automation Created '
        }
      ));
    });

  automation
    .command('list')
    .description('List all automations')
    .action(async () => {
      console.log(boxen(
        `${emoji.get('robot_face')} Active Automations:\n\n` +
        `${emoji.get('green_circle')} daily-backup (time trigger)\n` +
        `${emoji.get('green_circle')} price-alert (condition trigger)\n` +
        `${emoji.get('yellow_circle')} weekly-report (disabled)`,
        {
          padding: 1,
          borderStyle: 'round',
          borderColor: 'blue',
          title: ' Automation List '
        }
      ));
    });

  automation
    .command('run')
    .description('Execute an automation')
    .argument('<name>', 'automation name')
    .action(async (name) => {
      console.log(boxen(
        `${emoji.get('play_or_pause_button')} Running automation: ${chalk.cyan(name)}\n\n` +
        `${emoji.get('white_check_mark')} Execution: SUCCESS\n` +
        `${emoji.get('clock1')} Duration: 2.3s`,
        {
          padding: 1,
          borderStyle: 'round',
          borderColor: 'green',
          title: ' Automation Complete '
        }
      ));
    });

  return automation;
} 