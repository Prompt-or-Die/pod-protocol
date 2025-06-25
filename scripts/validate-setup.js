#!/usr/bin/env node

import { existsSync, readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

console.log(chalk.cyan('\n🔍 PoD Protocol Setup Validation\n'));

let passed = 0;
let total = 0;

function test(name, condition) {
  total++;
  if (condition) {
    console.log(chalk.green(`✅ ${name}`));
    passed++;
  } else {
    console.log(chalk.red(`❌ ${name}`));
  }
}

test('Unified setup script', existsSync(join(projectRoot, 'scripts', 'unified-setup.js')));
test('Enhanced dev script', existsSync(join(projectRoot, 'scripts', 'dev-experience-enhancer.js')));

const sdkPkg = join(projectRoot, 'sdk', 'package.json');
if (existsSync(sdkPkg)) {
  const pkg = JSON.parse(readFileSync(sdkPkg, 'utf8'));
  test('SDK Web3.js v2', pkg.dependencies?.['@solana/web3.js']?.includes('2.0'));
}

const rootPkg = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf8'));
test('Consolidated scripts', rootPkg.scripts?.start?.includes('unified-setup.js'));

const successRate = Math.round((passed / total) * 100);
console.log(chalk.cyan(`\n📊 Results: ${passed}/${total} (${successRate}%)`));

if (successRate >= 80) {
  console.log(chalk.green('\n�� Ready for Web3.js v2 development!'));
} else {
  console.log(chalk.yellow('\n⚠️  Setup needs attention.'));
}
