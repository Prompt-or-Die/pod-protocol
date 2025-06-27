import chalk from 'chalk';
import figlet from 'figlet';
import chalkAnimation from 'chalk-animation';
import cliProgress from 'cli-progress';

export async function createAnimatedPODBanner(): Promise<void> {
  return new Promise((resolve) => {
    // Clear terminal
    console.clear();
    
    // Create animated title
    const title = figlet.textSync('PoD Protocol', {
      font: 'ANSI Shadow',
      horizontalLayout: 'default',
      verticalLayout: 'default'
    });

    // Animate the banner
    const animation = chalkAnimation.rainbow(title);
    
    // Stop animation after 2 seconds
    setTimeout(() => {
      animation.stop();
      console.log(chalk.cyan.bold('\n🚀 The Ultimate AI Agent Communication Protocol 🤖\n'));
      console.log(chalk.gray('Decentralized • Secure • Lightning Fast\n'));
      resolve();
    }, 2000);
  });
}

export function createProgressBar(title: string, _total: number = 100) {
  return new cliProgress.SingleBar({
    format: chalk.cyan(title + ' |') + chalk.yellow('{bar}') + chalk.cyan('| {percentage}% | {value}/{total}'),
    barCompleteChar: '█',
    barIncompleteChar: '░',
    hideCursor: true,
    barsize: 30
  });
}

export function createBrandedBox(content: string, title?: string) {
  const boxen = require('boxen');
  return boxen(content, {
    padding: 1,
    borderStyle: 'round',
    borderColor: 'cyan',
    title: title ? ` ${title} ` : undefined,
    titleAlignment: 'center'
  });
}

export const brandColors = {
  primary: chalk.cyan,
  secondary: chalk.magenta,
  success: chalk.green,
  warning: chalk.yellow,
  error: chalk.red,
  info: chalk.blue,
  muted: chalk.gray
}; 