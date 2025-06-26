# PoD Protocol Scripts Directory

**🎉 STREAMLINED & CONSOLIDATED** - Reduced from 44+ scripts to 9 essential files (79% reduction)

This directory contains the core scripts for building, testing, deploying, and developing the PoD Protocol platform.

## 🚀 **CORE SCRIPTS**

### **🛠️ setup.js**
**The Ultimate PoD Protocol Setup Experience**
- **Size**: 32.7KB | **Features**: AI-powered setup intelligence
- Comprehensive system analysis and dependency management
- Interactive wizard with beautiful terminal UI
- Multi-environment support (development, testnet, mainnet)
- Component selection (CLI, SDKs, frontend, agents, etc.)
- Advanced features (ZK compression, analytics, security)
- Performance optimization and smart recommendations

```bash
# Run the complete setup wizard
node scripts/setup.js

# The wizard will guide you through:
# - System requirements check
# - Component selection
# - Environment configuration  
# - Development setup
# - AI agent configuration
```

### **🔨 build.js**
**Master Build Script**
- **Size**: 7.3KB | **Features**: Unified build system
- Builds Rust programs, TypeScript SDK, CLI, and frontend
- Cross-platform compatibility
- Performance optimizations
- Artifact verification

```bash
# Build entire project
node scripts/build.js

# Build specific component
node scripts/build.js --component sdk
```

### **🎮 interactive-playground.js**
**Interactive Development Environment**
- **Size**: 14.3KB | **Features**: Live coding playground
- Interactive testing of PoD Protocol features
- Real-time agent communication demos
- Web3.js v2.0 integration examples
- ZK compression demonstrations

```bash
# Launch interactive playground
node scripts/interactive-playground.js
```

## 📊 **SPECIALIZED SCRIPTS**

### **⚡ performance-benchmark.js**
**Performance Analysis & Benchmarking**
- **Size**: 21.1KB | **Features**: Comprehensive performance testing
- SDK performance benchmarks across languages
- Agent communication latency testing
- ZK compression efficiency analysis
- Memory usage and CPU optimization metrics

```bash
# Run performance benchmarks
node scripts/performance-benchmark.js

# Run specific benchmark
node scripts/performance-benchmark.js --test sdk-comparison
```

### **🛡️ security-audit.js**
**Security Analysis & Audit Tools**
- **Size**: 28.3KB | **Features**: Enterprise-grade security scanning
- Dependency vulnerability scanning
- Smart contract security analysis
- Key management audit
- Best practices validation

```bash
# Run security audit
node scripts/security-audit.js

# Generate security report
node scripts/security-audit.js --report
```

## 🛠️ **UTILITIES**

### **utils/check-dependencies.js**
Quick dependency verification utility (0.6KB)

### **utils/generate-client.ts**
TypeScript client code generator (2.5KB)

### **utils/make-executable.sh**
Make scripts executable with proper permissions (0.1KB)

## 📋 **USAGE PATTERNS**

### **Quick Development Setup**
```bash
# 1. Run setup wizard (choose "Speed Demon" option)
node scripts/setup.js

# 2. Build the project
node scripts/build.js

# 3. Start interactive development
node scripts/interactive-playground.js
```

### **Production Deployment**
```bash
# 1. Run setup wizard (choose "Production Ready" option)
node scripts/setup.js

# 2. Run security audit
node scripts/security-audit.js

# 3. Run performance benchmarks
node scripts/performance-benchmark.js

# 4. Build for production
node scripts/build.js --production
```

### **Development Workflow**
```bash
# Daily development cycle
node scripts/setup.js          # One-time setup
node scripts/build.js          # Build changes
node scripts/interactive-playground.js  # Test features
```

## 🎯 **CONSOLIDATION BENEFITS**

### **Before Consolidation (44+ Scripts)**
- Multiple overlapping setup scripts (unified-setup.js, sdk-setup-wizard.js, pod-installer.js)
- Redundant build/deployment scripts
- Scattered testing and validation scripts
- Obsolete migration/fix scripts
- Confusing navigation and maintenance

### **After Consolidation (9 Essential Files)**
- ✅ **79% reduction** in script count
- ✅ **Zero duplication** - each script has a clear, unique purpose
- ✅ **Logical organization** - setup, build, test, utils
- ✅ **Enhanced functionality** - best features combined
- ✅ **Easy maintenance** - fewer files to track and update
- ✅ **Clear documentation** - obvious purpose and usage

## 🔧 **TECHNICAL REQUIREMENTS**

### **Node.js Dependencies**
- **Node.js**: >=18.0.0
- **Package Manager**: Bun (preferred), Yarn, or npm
- **TypeScript**: >=5.0.0 (for development)

### **System Dependencies**
- **Rust**: >=1.70.0 (for Anchor programs)
- **Solana CLI**: >=1.18.0 (for blockchain operations)
- **Anchor CLI**: >=0.30.0 (for Solana program development)
- **Git**: >=2.30.0 (for version control)

### **Optional Dependencies**
- **Docker**: >=20.0.0 (for containerization)
- **ZK Compression**: Light Protocol tools (for ZK features)

## 🎭 **PoD Protocol Philosophy**

> **"Prompt or Die"** - Where AI Agents Meet Their Destiny

These scripts embody the PoD Protocol ethos:
- **Intelligent Automation**: AI-powered setup and configuration
- **Performance Excellence**: Optimized for speed and efficiency  
- **Developer Experience**: Beautiful, intuitive interfaces
- **Production Ready**: Enterprise-grade reliability and security
- **Future Proof**: Built for the next generation of AI agents

---

**🚀 Ready to build AI agents that change the world?**

Start with `node scripts/setup.js` and let the magic begin! ✨