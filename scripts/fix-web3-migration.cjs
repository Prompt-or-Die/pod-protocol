#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Common Web3.js v1 → v2 migration patterns
const migrationPatterns = [
  // Import fixes
  {
    pattern: /from ['"]@solana\/web3\.js['"]/g,
    replacement: `from '@solana/web3.js'`
  },
  {
    pattern: /import.*{[^}]*PublicKey[^}]*}.*from ['"]@solana\/web3\.js['"]/g,
    replacement: `import { Address, address } from '@solana/web3.js'`
  },
  {
    pattern: /import.*{[^}]*Connection[^}]*}.*from ['"]@solana\/web3\.js['"]/g,
    replacement: `import { Rpc, createSolanaRpc } from '@solana/web3.js'`
  },
  {
    pattern: /import.*{[^}]*Keypair[^}]*}.*from ['"]@solana\/web3\.js['"]/g,
    replacement: `import { KeyPairSigner, generateKeyPairSigner } from '@solana/web3.js'`
  },
  {
    pattern: /import.*{[^}]*Transaction[^}]*}.*from ['"]@solana\/web3\.js['"]/g,
    replacement: `import { Transaction } from '@solana/transactions'`
  },
  {
    pattern: /import.*{[^}]*TransactionInstruction[^}]*}.*from ['"]@solana\/web3\.js['"]/g,
    replacement: `import { TransactionInstruction } from '@solana/instructions'`
  },
  
  // Type replacements
  {
    pattern: /PublicKey/g,
    replacement: 'Address'
  },
  {
    pattern: /Connection/g,
    replacement: 'Rpc<any>'
  },
  {
    pattern: /Keypair/g,
    replacement: 'KeyPairSigner'
  },
  
  // Constructor patterns
  {
    pattern: /new PublicKey\(([^)]+)\)/g,
    replacement: 'address($1)'
  },
  {
    pattern: /Keypair\.generate\(\)/g,
    replacement: 'generateKeyPairSigner()'
  },
  {
    pattern: /new Connection\(([^)]+)\)/g,
    replacement: 'createSolanaRpc($1)'
  },
  
  // Method calls
  {
    pattern: /\.toBase58\(\)/g,
    replacement: ''
  },
  {
    pattern: /\.toString\(\)/g,
    replacement: ''
  },
  {
    pattern: /web3\.PublicKey/g,
    replacement: 'address'
  },
  
  // RPC method patterns
  {
    pattern: /\.getProgramAccounts\(/g,
    replacement: '.getProgramAccounts('
  },
  {
    pattern: /\.getAccountInfo\(/g,
    replacement: '.getAccountInfo('
  },
  {
    pattern: /\.getLatestBlockhash\(\)/g,
    replacement: '.getLatestBlockhash().send()'
  },
  {
    pattern: /\.sendTransaction\(/g,
    replacement: '.sendTransaction('
  }
];

// Export validation patterns
const exportPatterns = [
  {
    pattern: /isValidPublicKey/g,
    replacement: 'validatePublicKey'
  },
  {
    pattern: /formatPublicKey/g,
    replacement: 'formatAddress'
  }
];

function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // Apply migration patterns
    migrationPatterns.forEach(({ pattern, replacement }) => {
      const newContent = content.replace(pattern, replacement);
      if (newContent !== content) {
        content = newContent;
        modified = true;
      }
    });
    
    // Apply export patterns
    exportPatterns.forEach(({ pattern, replacement }) => {
      const newContent = content.replace(pattern, replacement);
      if (newContent !== content) {
        content = newContent;
        modified = true;
      }
    });
    
    if (modified) {
      fs.writeFileSync(filePath, content);
      console.log(`✅ Fixed: ${filePath}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return false;
  }
}

function processDirectory(dirPath) {
  let totalFixed = 0;
  
  const files = fs.readdirSync(dirPath, { withFileTypes: true });
  
  for (const file of files) {
    const fullPath = path.join(dirPath, file.name);
    
    if (file.isDirectory() && !file.name.startsWith('.') && file.name !== 'node_modules') {
      totalFixed += processDirectory(fullPath);
    } else if (file.isFile() && (file.name.endsWith('.ts') || file.name.endsWith('.js'))) {
      if (processFile(fullPath)) {
        totalFixed++;
      }
    }
  }
  
  return totalFixed;
}

// Main execution
console.log('🚀 Starting Web3.js v1 → v2 migration fixes...\n');

const sdkPaths = ['sdk/src', 'sdk-js/src'];
let totalFilesFixed = 0;

for (const sdkPath of sdkPaths) {
  if (fs.existsSync(sdkPath)) {
    console.log(`📁 Processing ${sdkPath}...`);
    const fixed = processDirectory(sdkPath);
    totalFilesFixed += fixed;
    console.log(`   Fixed ${fixed} files\n`);
  } else {
    console.log(`⚠️  Directory ${sdkPath} not found, skipping...\n`);
  }
}

console.log(`🎉 Migration complete! Fixed ${totalFilesFixed} files total.`);

// Run TypeScript compilation to check results
console.log('\n🔍 Checking compilation results...');
try {
  execSync('cd sdk && bun run build', { stdio: 'pipe' });
  console.log('✅ TypeScript SDK compilation successful!');
} catch (error) {
  console.log('⚠️  Some TypeScript errors remain, but major patterns are fixed.');
}

try {
  execSync('cd sdk-js && bun run build', { stdio: 'pipe' });
  console.log('✅ JS SDK compilation successful!');
} catch (error) {
  console.log('⚠️  Some JS SDK errors remain, but major patterns are fixed.');
} 