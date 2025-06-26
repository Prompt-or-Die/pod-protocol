#!/usr/bin/env node
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

function checkPackage(pkg) {
  try {
    require.resolve(pkg);
    return true;
  } catch {
    return false;
  }
}

const missing = [];
if (!checkPackage('@coral-xyz/anchor')) {
  missing.push('@coral-xyz/anchor');
}

if (missing.length > 0) {
  console.error(`❌ Missing dependencies: ${missing.join(', ')}`);
  console.error('Install them with `bun add -D @coral-xyz/anchor` or `yarn add -D @coral-xyz/anchor`.');
  process.exit(1);
} else {
  console.log('✅ All required packages are installed.');
}
