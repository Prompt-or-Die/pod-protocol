# PoD Protocol Unified CLI Integration Plan

## 🎯 **VISION: Universal CLI for All SDKs**

Create a unified CLI that allows users to:
1. **Choose their preferred SDK implementation** (Rust, TypeScript, Python, JavaScript)
2. **Use the same commands** regardless of underlying implementation
3. **Switch implementations** without changing their workflow
4. **Benefit from performance optimizations** when using Rust core

## 🛠️ **MULTI-CLI ARCHITECTURE**

### **Exoskeleton Pattern Implementation**

Following the [Square Exoskeleton pattern](https://github.com/square/exoskeleton):

```
pod/
├── pod                    # Main CLI router (Node.js)
├── package.json          # CLI package configuration
├── .exoskeleton          # Configuration file
└── libexec/             # SDK-specific implementations
    ├── pod-rust          # Rust SDK CLI (binary)
    ├── pod-typescript    # TypeScript SDK CLI (Node.js)
    ├── pod-python        # Python SDK CLI (Python)
    ├── pod-javascript    # JavaScript SDK CLI (Node.js)
    └── pod-help          # Built-in help system
```

### **Main Router CLI (pod)**

```javascript
#!/usr/bin/env node
// pod/bin/pod.js

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

class PodCLI {
    constructor() {
        this.libexecPath = path.join(__dirname, '..', 'libexec');
        this.defaultSDK = this.getDefaultSDK();
    }

    getDefaultSDK() {
        // Check environment variable first
        if (process.env.POD_DEFAULT_SDK) {
            return process.env.POD_DEFAULT_SDK;
        }
        
        // Check config file
        const configPath = path.join(os.homedir(), '.pod', 'config.json');
        if (fs.existsSync(configPath)) {
            const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            return config.defaultSDK || 'rust';
        }
        
        // Default to Rust for performance
        return 'rust';
    }

    async execute(args) {
        // Parse SDK selection from args
        const sdkCommands = ['rust', 'typescript', 'python', 'javascript'];
        let selectedSDK = this.defaultSDK;
        let commandArgs = [...args];

        // Check if first argument is an SDK selector
        if (args.length > 0 && sdkCommands.includes(args[0])) {
            selectedSDK = args[0];
            commandArgs = args.slice(1);
        }

        // Route to appropriate SDK implementation
        const sdkBinary = path.join(this.libexecPath, `pod-${selectedSDK}`);
        
        if (!fs.existsSync(sdkBinary)) {
            console.error(`SDK '${selectedSDK}' not available. Install: npm install -g @pod-protocol/sdk-${selectedSDK}`);
            process.exit(1);
        }

        // Execute SDK-specific implementation
        const child = spawn(sdkBinary, commandArgs, {
            stdio: 'inherit',
            env: { ...process.env, POD_CLI_SDK: selectedSDK }
        });

        child.on('exit', (code) => {
            process.exit(code);
        });
    }
}

// Usage examples:
// pod agent register --capabilities 1        # Uses default SDK (Rust)
// pod rust agent register --capabilities 1   # Explicitly use Rust SDK
// pod python agent register --capabilities 1 # Explicitly use Python SDK

const cli = new PodCLI();
cli.execute(process.argv.slice(2));
```

## 📦 **SDK-SPECIFIC CLI IMPLEMENTATIONS**

### **1. Rust CLI (pod-rust)**

The Rust CLI provides maximum performance by directly using the Rust SDK core:

```rust
// cli-rust/src/main.rs
use clap::{App, Arg, SubCommand};
use pod_sdk_core::PodComClient;
use tokio;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let matches = App::new("pod-rust")
        .version("1.0.0")
        .author("PoD Protocol Team")
        .about("PoD Protocol CLI - Rust Implementation (High Performance)")
        .subcommand(
            SubCommand::with_name("agent")
                .about("Agent management")
                .subcommand(
                    SubCommand::with_name("register")
                        .about("Register a new agent")
                        .arg(Arg::with_name("capabilities")
                            .long("capabilities")
                            .value_name("CAPS")
                            .help("Agent capabilities bitmask")
                            .required(true))
                        .arg(Arg::with_name("metadata")
                            .long("metadata")
                            .value_name("URI")
                            .help("Metadata URI")
                            .required(true))
                )
        )
        .get_matches();

    match matches.subcommand() {
        ("agent", Some(agent_matches)) => {
            handle_agent_commands(agent_matches).await?;
        }
        _ => {
            eprintln!("Unknown command. Use --help for available commands.");
        }
    }

    Ok(())
}

async fn handle_agent_commands(matches: &clap::ArgMatches<'_>) -> Result<(), Box<dyn std::error::Error>> {
    match matches.subcommand() {
        ("register", Some(register_matches)) => {
            let capabilities: u64 = register_matches.value_of("capabilities")
                .unwrap()
                .parse()?;
            let metadata_uri = register_matches.value_of("metadata").unwrap();

            // Use Rust SDK directly for maximum performance
            let config = pod_sdk_core::PodComConfig::from_env()?;
            let mut client = pod_sdk_core::PodComClient::new(config)?;
            
            let wallet = load_wallet_from_env()?;
            client.initialize(Some(wallet)).await?;
            
            let start = std::time::Instant::now();
            let signature = client.agents.register_agent(
                capabilities,
                metadata_uri.to_string()
            ).await?;
            let duration = start.elapsed();

            println!("✅ Agent registered successfully!");
            println!("📋 Signature: {}", signature);
            println!("🚀 SDK: Rust (High Performance)");
            println!("⚡ Execution time: {:?}", duration);
        }
        _ => {
            eprintln!("Unknown agent command. Use --help for available commands.");
        }
    }
    Ok(())
}
```

## 🔗 **CROSS-SDK INTEGRATION PATTERNS**

### **FFI Layer for Performance Acceleration**

Create a Rust FFI layer that other SDKs can optionally use for performance:

```rust
// sdk-rust/crates/pod-sdk-ffi/src/lib.rs
use std::ffi::{CStr, CString};
use std::os::raw::c_char;
use pod_sdk_core::PodComClient;
use serde_json;

#[no_mangle]
pub extern "C" fn pod_ffi_register_agent(
    capabilities: u64,
    metadata_uri: *const c_char,
) -> *const c_char {
    unsafe {
        let metadata_str = match CStr::from_ptr(metadata_uri).to_str() {
            Ok(s) => s,
            Err(_) => return create_error_response("Invalid metadata URI string"),
        };
        
        // Use Rust core for actual implementation
        let rt = match tokio::runtime::Runtime::new() {
            Ok(rt) => rt,
            Err(_) => return create_error_response("Failed to create async runtime"),
        };
        
        let result = rt.block_on(async {
            let config = pod_sdk_core::PodComConfig::from_env()?;
            let mut client = pod_sdk_core::PodComClient::new(config)?;
            
            client.agents.register_agent(capabilities, metadata_str.to_string()).await
        });
        
        match result {
            Ok(signature) => {
                let response = serde_json::json!({
                    "success": true,
                    "signature": signature.to_string(),
                    "sdk": "rust-core"
                });
                CString::new(response.to_string()).unwrap().into_raw()
            }
            Err(e) => create_error_response(&format!("Registration failed: {}", e)),
        }
    }
}

fn create_error_response(error: &str) -> *const c_char {
    let response = serde_json::json!({
        "success": false,
        "error": error
    });
    CString::new(response.to_string()).unwrap().into_raw()
}

#[no_mangle]
pub extern "C" fn pod_ffi_free_string(ptr: *mut c_char) {
    unsafe {
        if !ptr.is_null() {
            CString::from_raw(ptr);
        }
    }
}
```

### **Enhanced TypeScript SDK with Optional Rust Acceleration**

```typescript
// sdk/src/client.ts - TypeScript SDK with optional Rust FFI
import { PodComConfig } from './config';
import * as ffi from 'ffi-napi';
import * as path from 'path';
import * as fs from 'fs';

export class PodComClient {
    private useRustCore: boolean = false;
    private rustFFI?: any;
    private config: PodComConfig;

    constructor(config: PodComConfig) {
        this.config = config;
        
        // Try to load Rust FFI library for performance acceleration
        this.tryLoadRustCore();
    }

    private tryLoadRustCore(): void {
        try {
            const libPath = this.findRustLibrary();
            if (libPath) {
                this.rustFFI = ffi.Library(libPath, {
                    'pod_ffi_register_agent': ['string', ['uint64', 'string']],
                    'pod_ffi_free_string': ['void', ['string']]
                });
                this.useRustCore = true;
                console.log('🚀 Rust core acceleration enabled');
            } else {
                console.log('📝 Using TypeScript implementation');
            }
        } catch (error) {
            console.log('📝 Rust core not available, using TypeScript implementation');
            this.useRustCore = false;
        }
    }

    async registerAgent(capabilities: number, metadataUri: string): Promise<string> {
        if (this.useRustCore && this.rustFFI) {
            // Use high-performance Rust core
            const start = Date.now();
            const result = this.rustFFI.pod_ffi_register_agent(capabilities, metadataUri);
            const parsed = JSON.parse(result);
            const duration = Date.now() - start;
            
            if (parsed.success) {
                console.log(`⚡ Rust core execution: ${duration}ms`);
                return parsed.signature;
            } else {
                throw new Error(parsed.error);
            }
        } else {
            // Fall back to TypeScript implementation
            console.log('📝 Using TypeScript implementation');
            return this.registerAgentTS(capabilities, metadataUri);
        }
    }

    private findRustLibrary(): string | null {
        const possiblePaths = [
            path.join(__dirname, '../native/libpod_sdk_ffi.so'),    // Linux
            path.join(__dirname, '../native/libpod_sdk_ffi.dylib'), // macOS  
            path.join(__dirname, '../native/pod_sdk_ffi.dll'),      // Windows
        ];

        for (const libPath of possiblePaths) {
            if (fs.existsSync(libPath)) {
                return libPath;
            }
        }
        return null;
    }
}
```

## 🧪 **UNIFIED TESTING FRAMEWORK**

### **Language-Agnostic API Testing**

Following the GoDaddy approach, create a Docker-based test harness:

```yaml
# docker-compose.test.yml
version: "3.8"
services:
  test-harness:
    build: ./test-harness
    environment:
      - API_ENDPOINT=http://sdk-test:3000
    depends_on:
      - sdk-test
      - mock-solana
    volumes:
      - ./test-results:/results

  sdk-test:
    build: 
      context: .
      dockerfile: Dockerfile.test
      args:
        - SDK_IMPLEMENTATION=${TEST_SDK:-rust}
    ports:
      - "3000:3000"
    environment:
      - SOLANA_RPC_URL=http://mock-solana:8899
      - POD_SDK=${TEST_SDK:-rust}

  mock-solana:
    image: solanalabs/solana:stable
    command: >
      bash -c "
        solana-test-validator --reset &
        sleep 10 &&
        solana airdrop 100 --url http://localhost:8899
      "
    ports:
      - "8899:8899"
```

### **Test Specification Format**

```json
{
  "testSuite": "PoD Protocol SDK Compatibility Tests",
  "version": "1.0.0",
  "tests": [
    {
      "name": "agent_registration",
      "description": "Test agent registration across all SDK implementations",
      "method": "POST",
      "endpoint": "/agent/register",
      "input": {
        "capabilities": 7,
        "metadata_uri": "https://example.com/agent-metadata.json"
      },
      "expected": {
        "success": true,
        "signature": "regex:^[A-Za-z0-9]{87,88}$",
        "execution_time_ms": "number"
      },
      "performance_targets": {
        "rust": "< 20ms",
        "typescript": "< 50ms", 
        "python": "< 45ms",
        "javascript": "< 50ms"
      }
    },
    {
      "name": "message_sending",
      "description": "Test P2P message sending",
      "method": "POST", 
      "endpoint": "/message/send",
      "input": {
        "recipient": "11111111111111111111111111111112",
        "payload": "SGVsbG8gZnJvbSBQb0QgUHJvdG9jb2w=",
        "message_type": "text"
      },
      "expected": {
        "success": true,
        "signature": "regex:^[A-Za-z0-9]{87,88}$"
      }
    }
  ]
}
```

## 📊 **PERFORMANCE TARGETS & BENCHMARKING**

### **Expected Performance by SDK Implementation**

| Operation | Rust Core | TypeScript | Python | JavaScript |
|-----------|-----------|------------|---------|------------|
| Agent Registration | **15ms** | 45ms | 38ms | 42ms |
| Message Send | **8ms** | 25ms | 22ms | 24ms |  
| Channel Create | **12ms** | 40ms | 35ms | 38ms |
| Memory Usage (Idle) | **32MB** | 150MB | 85MB | 140MB |
| CPU Usage (Idle) | **2%** | 8% | 6% | 7% |

### **Built-in Performance Monitoring**

```bash
# Performance monitoring mode
pod --benchmark agent register --capabilities 7 --metadata "https://example.com/metadata.json"

# Expected output:
# ✅ Agent registered successfully!
# 📋 Signature: 2Z9B8R7q...
# 🚀 SDK: Rust (High Performance Core)
# ⚡ Execution time: 12ms
# 💾 Memory usage: 28MB peak
# 🎯 Performance: EXCELLENT (target: <20ms)

# SDK comparison mode
pod compare agent register --capabilities 7 --metadata "https://example.com/metadata.json"

# Expected output:
# 🧪 Testing all available SDK implementations...
# 
# ✅ Rust:       12ms ⚡ (fastest, -100% vs target)
# ✅ Python:     35ms 🐍 (+192% vs Rust)  
# ✅ TypeScript: 42ms 📘 (+250% vs Rust)
# ❌ JavaScript: Not installed
# 
# 💡 Recommendation: Use 'pod rust' for optimal performance
```

## 🚀 **IMPLEMENTATION TIMELINE**

### **4-Week Sprint Plan**

#### **Week 1: Foundation & Rust Completion**
- **Day 1-2**: Fix 281 Rust compilation errors
- **Day 3-4**: Complete critical utility implementations  
- **Day 5-7**: Create Rust CLI and FFI layer

#### **Week 2: Multi-CLI Architecture**
- **Day 1-2**: Implement Exoskeleton router pattern
- **Day 3-4**: Create TypeScript/JavaScript CLI wrappers
- **Day 5-7**: Create Python CLI wrapper and integration

#### **Week 3: Performance Integration**
- **Day 1-3**: Integrate FFI acceleration in TypeScript/JavaScript SDKs
- **Day 4-5**: Add WebAssembly support for browser compatibility
- **Day 6-7**: Implement performance monitoring and benchmarking

#### **Week 4: Testing & Documentation** 
- **Day 1-3**: Docker-based testing harness and cross-SDK validation
- **Day 4-5**: Performance benchmarking suite
- **Day 6-7**: Documentation, examples, and release preparation

## 📋 **DEVELOPER EXPERIENCE EXAMPLES**

### **Seamless SDK Switching**

```bash
# Default usage (automatically uses fastest available SDK)
pod agent register --capabilities 7 --metadata "https://my-agent.com/metadata.json"

# Explicit SDK selection for specific needs
pod rust agent register --capabilities 7 --metadata "..."      # Maximum performance
pod python agent register --capabilities 7 --metadata "..."    # Advanced features (Session Keys, Jito)
pod typescript agent register --capabilities 7 --metadata "..." # Full compatibility & debugging

# Configuration management
pod config set-default-sdk rust                    # Set default to Rust
pod config show                                    # Show current configuration
pod config list-sdks                              # List available implementations
```

### **Installation & Setup**

```bash
# Install main CLI
npm install -g @pod-protocol/cli

# Install additional SDK implementations as needed
npm install -g @pod-protocol/cli-rust      # High-performance core
npm install -g @pod-protocol/cli-python    # Advanced features
npm install -g @pod-protocol/cli-typescript # Full compatibility

# Verify installation
pod doctor
# Output:
# ✅ Main CLI installed
# ✅ Rust SDK: Available (recommended for performance)
# ✅ TypeScript SDK: Available  
# ✅ Python SDK: Available
# ❌ JavaScript SDK: Not installed (optional)
# ✅ Solana CLI: Available
# ✅ Configuration: Valid
```

### **Development Workflow**

```bash
# Development with hot reloading and debugging
pod dev agent register --capabilities 7 --metadata "..." --watch

# Production deployment with maximum performance
pod rust agent register --capabilities 7 --metadata "..." --production

# Testing across all implementations
pod test agent register --capabilities 7 --metadata "..." --all-sdks
```

## 🎯 **SUCCESS CRITERIA**

### **Technical Metrics**
- ✅ **Zero compilation errors** across all SDKs
- ✅ **Unified CLI interface** working across all implementations  
- ✅ **Performance targets met**: Rust <20ms, others <50ms
- ✅ **95%+ test coverage** with cross-SDK validation
- ✅ **FFI acceleration** working in TypeScript/JavaScript
- ✅ **Docker-based testing** harness operational

### **Developer Experience Metrics**
- ✅ **One-command installation** for each SDK
- ✅ **Consistent CLI interface** regardless of implementation
- ✅ **Performance transparency** with built-in benchmarking
- ✅ **Easy SDK switching** without workflow changes
- ✅ **Comprehensive documentation** with usage examples

### **Business Impact**
- 🎯 **3-5x performance improvement** when using Rust core
- 🎯 **Zero vendor lock-in** - users can switch implementations
- 🎯 **Reduced support burden** through unified interface
- 🎯 **Enhanced adoption** through language flexibility

This comprehensive approach positions PoD Protocol as having the most flexible and performant multi-language SDK ecosystem in the blockchain space, while maintaining simplicity and consistency for developers.
