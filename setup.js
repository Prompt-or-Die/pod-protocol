#!/usr/bin/env node

import { spawn } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

// Get the directory where this script is located
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const scriptDir = __dirname;
const installScript = join(scriptDir, 'install.sh');

// Execute the install.sh script
const child = spawn('bash', [installScript], {
  stdio: 'inherit',
  cwd: scriptDir
});

child.on('error', (error) => {
  console.error('Error running setup:', error.message);
  process.exit(1);
});

child.on('exit', (code) => {
  process.exit(code || 0);
});