# PoD Protocol MCP Server - Publishing Guide

This guide walks through publishing the PoD Protocol MCP Server to NPM and submitting it to the MCP registry.

## 🚀 Publishing to NPM

### Prerequisites

1. **NPM Account**: Ensure you have an NPM account with publishing permissions
2. **Node.js**: Version 18.0.0 or higher
3. **Clean State**: No uncommitted changes in git

### Step 1: Pre-publish Validation

Run the comprehensive validation script:

```bash
npm run validate
```

This will:
- ✅ Validate Node.js version
- 🧹 Clean previous builds  
- 📦 Install dependencies
- 🔍 Run linter
- 🧪 Run tests
- 🔨 Build TypeScript
- 📋 Validate package.json
- 📁 List files to be published
- 🔧 Run smoke tests

### Step 2: Version Management

Update the version in `package.json`:

```bash
# Patch version (bug fixes)
npm version patch

# Minor version (new features)
npm version minor

# Major version (breaking changes)
npm version major
```

### Step 3: Test Package Locally

```bash
# Create package tarball
npm pack

# Install globally for testing
npm install -g ./pod-protocol-mcp-server-*.tgz

# Test the installation
pod-mcp-server --help
pod-mcp-server init
```

### Step 4: Publish to NPM

```bash
# Login to NPM (if not already logged in)
npm login

# Publish the package
npm publish

# For scoped packages, ensure public access
npm publish --access public
```

### Step 5: Verify Publication

```bash
# Check if package is available
npm view @pod-protocol/mcp-server

# Install from NPM to verify
npm install -g @pod-protocol/mcp-server
```

---

## 📋 Submitting to MCP Registry

### Step 1: Prepare Registry Metadata

The `mcp.json` file contains all metadata required for MCP registry submission. Ensure it's up to date:

```json
{
  "name": "@pod-protocol/mcp-server",
  "displayName": "PoD Protocol MCP Server",
  "description": "...",
  "capabilities": {
    "tools": [...],
    "resources": [...],
    "features": [...]
  }
}
```

### Step 2: Submit to MCP Registry

1. **Fork the MCP Registry Repository**:
   ```bash
   git clone https://github.com/modelcontextprotocol/servers.git
   cd servers
   ```

2. **Add Your Server**:
   ```bash
   mkdir -p servers/pod-protocol
   cp /path/to/mcp-server/mcp.json servers/pod-protocol/
   ```

3. **Create Pull Request**:
   - Add entry to main registry index
   - Include comprehensive description
   - Add examples and documentation links

### Step 3: Registry Requirements Checklist

- [ ] **Package published to NPM**: Available via `npm install`
- [ ] **MCP compatibility**: Implements MCP specification correctly
- [ ] **Documentation**: Comprehensive README and examples
- [ ] **Stability**: Production-ready with error handling
- [ ] **Maintenance**: Active maintenance and support
- [ ] **Testing**: Automated tests and validation
- [ ] **Security**: No known vulnerabilities

---

## 🔧 Post-Publication Tasks

### Update Documentation

1. **Update README.md** with installation instructions
2. **Create release notes** documenting changes
3. **Update integration examples** for different frameworks

### Promote the Release

1. **GitHub Release**: Create release with changelog
2. **Social Media**: Announce on Twitter, Discord, etc.
3. **Community**: Share in relevant AI/blockchain communities
4. **Blog Post**: Write about the integration and benefits

### Monitor and Support

1. **NPM Downloads**: Monitor usage statistics
2. **GitHub Issues**: Respond to user issues promptly
3. **Feature Requests**: Collect and prioritize feedback
4. **Updates**: Regular updates for security and features

---

## 📊 Success Metrics

### Technical Metrics
- **NPM Downloads**: Target 1,000+ weekly downloads
- **GitHub Stars**: Community engagement indicator
- **Issue Resolution**: <48 hour response time
- **Test Coverage**: >90% code coverage

### Adoption Metrics
- **Framework Integrations**: ElizaOS, AutoGen, CrewAI usage
- **Agent Registrations**: On-chain agent growth
- **Message Volume**: Cross-agent communication activity
- **Community Size**: Discord/GitHub community growth

---

## 🚨 Troubleshooting

### Common Publishing Issues

**Issue**: "You do not have permission to publish"
```bash
# Solution: Login with correct credentials
npm logout
npm login
```

**Issue**: "Package name already exists"
```bash
# Solution: Use scoped package name
npm publish --access public
```

**Issue**: "Version already published"
```bash
# Solution: Increment version
npm version patch
npm publish
```

### Registry Submission Issues

**Issue**: "MCP validation failed"
- Ensure `mcp.json` follows the schema
- Test with MCP client first
- Validate all required fields

**Issue**: "Documentation insufficient"
- Add comprehensive examples
- Include integration guides
- Provide troubleshooting section

---

## 📈 Maintenance Schedule

### Weekly Tasks
- [ ] Monitor NPM downloads and issues
- [ ] Review and respond to GitHub issues
- [ ] Check dependency updates

### Monthly Tasks
- [ ] Update dependencies
- [ ] Review and update documentation
- [ ] Analyze usage metrics
- [ ] Plan feature roadmap

### Quarterly Tasks
- [ ] Major version planning
- [ ] Security audit
- [ ] Performance optimization
- [ ] Community feedback review

---

## 🎯 Future Roadmap

### v1.1 (Next Release)
- [ ] Enhanced WebSocket events
- [ ] Agent reputation system
- [ ] Multi-signature escrow
- [ ] Performance optimizations

### v1.2 (Future)
- [ ] Plugin system
- [ ] Cross-chain support
- [ ] Advanced analytics
- [ ] Enterprise features

### v2.0 (Long-term)
- [ ] Native AI model integration
- [ ] Decentralized governance
- [ ] Cross-protocol bridges
- [ ] Advanced security features

---

**Ready to bridge the AI agent ecosystem! 🔥**

*For questions or support, reach out via GitHub issues or Discord.* 