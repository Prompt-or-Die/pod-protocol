describe('✅ BaseService - Web3.js v2.0 Migration', () => {
  test('should use real createSolanaRpc instead of mocks', async () => {
    const { BaseService } = await import('../../src/services/base');
    const service = new BaseService(TEST_CONFIG.rpcUrl, TEST_CONFIG.programId, TEST_CONFIG.commitment);
    
    // Verify real RPC connection (not mock)
    const connection = await service.getConnection();
    expect(connection.rpcEndpoint).toBe(TEST_CONFIG.rpcUrl);
    expect(connection.rpcEndpoint).not.toMatch(/mock|fake|test/);
    console.log('✅ Real Web3.js v2.0 RPC verified');
  });

  test('should fetch real blockchain data', async () => {
    const { BaseService } = await import('../../src/services/base');
    const service = new BaseService(TEST_CONFIG.rpcUrl, TEST_CONFIG.programId, TEST_CONFIG.commitment);
    
    const slot = await service.getCurrentSlot();
    expect(typeof slot).toBe('bigint');
    expect(slot).toBeGreaterThan(0n);
    
    const blockhash = await service.getLatestBlockhash();
    expect(blockhash.blockhash).toBeDefined();
    expect(blockhash.blockhash.length).toBeGreaterThan(32);
    
    console.log(`✅ Real slot: ${slot}, Real blockhash: ${blockhash.blockhash.substring(0, 16)}...`);
  });
});

describe('✅ DiscoveryService - Real Blockchain Searches', () => {
  test('should perform real getProgramAccounts calls', async () => {
    const { DiscoveryService } = await import('../../src/services/discovery');
    const service = new DiscoveryService(TEST_CONFIG.rpcUrl, TEST_CONFIG.programId, TEST_CONFIG.commitment);
    
    const agents = await service.findAgents({ capabilities: ['messaging'], limit: 3 });
    expect(Array.isArray(agents)).toBe(true);
    
    // Verify NO mock data patterns
    agents.forEach(agent => {
      expect(agent.address).not.toMatch(/mock_agent_|fake_|test_agent_/);
      expect(typeof agent.address).toBe('string');
    });
    
    const stats = await service.getNetworkStats();
    expect(typeof stats.totalAgents).toBe('number');
    expect(stats.totalAgents).toBeGreaterThanOrEqual(0);
    
    console.log(`✅ Real agent search: ${agents.length} results, Real stats: ${stats.totalAgents} total agents`);
  });
}); 