#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Rust-specific fix patterns
const rustPatterns = [
  // Fix private config field access
  {
    pattern: /self\.base\.config\./g,
    replacement: 'self.base.config().'
  },
  {
    pattern: /&self\.base\.config/g,
    replacement: '&self.base.config()'
  },
  
  // Fix contains method calls with type annotations
  {
    pattern: /\.contains\(user\)/g,
    replacement: '.contains(&user)'
  },
  {
    pattern: /\.contains\(&"([^"]+)"\.to_string\(\)\)/g,
    replacement: '.iter().any(|s| s == "$1")'
  },
  
  // Fix string pattern matching in discovery
  {
    pattern: /if let Some\(ref name_pattern\) = query\.name_pattern/g,
    replacement: 'if let Some(name_pattern) = &query.name_pattern'
  },
  
  // Add missing configuration fields
  {
    pattern: /max_message_size/g,
    replacement: 'message_size_limit'
  },
  {
    pattern: /max_participants/g,
    replacement: 'participant_limit'
  },
  {
    pattern: /max_search_results/g,
    replacement: 'search_result_limit'
  },
  {
    pattern: /min_escrow_amount/g,
    replacement: 'minimum_escrow'
  },
  {
    pattern: /metrics_collection_interval_secs/g,
    replacement: 'collection_interval'
  },
  {
    pattern: /max_proof_size/g,
    replacement: 'proof_size_limit'
  },
  {
    pattern: /authorized_arbitrators/g,
    replacement: 'arbitrator_list'
  }
];

// Add Serde derives for enums
const serdePatterns = [
  {
    pattern: /#\[derive\(Debug, Clone\)\]\s*pub enum CompressionAlgorithm/g,
    replacement: '#[derive(Debug, Clone, Serialize, Deserialize)]\npub enum CompressionAlgorithm'
  },
  {
    pattern: /#\[derive\(Debug, Clone\)\]\s*pub enum CompressionLevel/g,
    replacement: '#[derive(Debug, Clone, Serialize, Deserialize)]\npub enum CompressionLevel'
  }
];

function processRustFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // Apply Rust-specific patterns
    rustPatterns.forEach(({ pattern, replacement }) => {
      const newContent = content.replace(pattern, replacement);
      if (newContent !== content) {
        content = newContent;
        modified = true;
      }
    });
    
    // Apply Serde patterns
    serdePatterns.forEach(({ pattern, replacement }) => {
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

function processRustDirectory(dirPath) {
  let totalFixed = 0;
  
  if (!fs.existsSync(dirPath)) {
    return 0;
  }
  
  const files = fs.readdirSync(dirPath, { withFileTypes: true });
  
  for (const file of files) {
    const fullPath = path.join(dirPath, file.name);
    
    if (file.isDirectory() && !file.name.startsWith('.') && file.name !== 'target') {
      totalFixed += processRustDirectory(fullPath);
    } else if (file.isFile() && file.name.endsWith('.rs')) {
      if (processRustFile(fullPath)) {
        totalFixed++;
      }
    }
  }
  
  return totalFixed;
}

// Main execution
console.log('🦀 Starting Rust SDK configuration fixes...\n');

const rustPath = 'sdk-rust';
let totalFilesFixed = 0;

if (fs.existsSync(rustPath)) {
  console.log(`📁 Processing ${rustPath}...`);
  const fixed = processRustDirectory(rustPath);
  totalFilesFixed += fixed;
  console.log(`   Fixed ${fixed} files\n`);
} else {
  console.log(`⚠️  Directory ${rustPath} not found, skipping...\n`);
}

console.log(`🎉 Rust fixes complete! Fixed ${totalFilesFixed} files total.`);

// Check Rust compilation
console.log('\n🔍 Checking Rust compilation...');
try {
  execSync('cd sdk-rust && cargo check --all', { stdio: 'pipe' });
  console.log('✅ Rust SDK compilation successful!');
} catch (error) {
  console.log('⚠️  Some Rust errors remain, but major patterns are fixed.');
} 