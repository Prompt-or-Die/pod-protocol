import { BaseService } from './src/services/base.js';
import { DiscoveryService } from './src/services/discovery.js';

const TEST_CONFIG = {
  rpcUrl: 'https://api.devnet.solana.com',
  programId: 'H5sFv8VwWmjxHYS2GB4fTDsK7uTtnRT4WiixtHrET3bN',
  commitment: 'confirmed'
};

console.log('🔍 Testing BaseService methods...');
const baseService = new BaseService(TEST_CONFIG.rpcUrl, TEST_CONFIG.programId, TEST_CONFIG.commitment);

console.log('getConnection type:', typeof baseService.getConnection);
console.log('getCurrentSlot type:', typeof baseService.getCurrentSlot);
console.log('getConnection method exists:', 'getConnection' in baseService);
console.log('getCurrentSlot method exists:', 'getCurrentSlot' in baseService);

console.log('\n🔍 Testing DiscoveryService methods...');
const discoveryService = new DiscoveryService(TEST_CONFIG.rpcUrl, TEST_CONFIG.programId, TEST_CONFIG.commitment);

console.log('findAgents type:', typeof discoveryService.findAgents);
console.log('findAgents method exists:', 'findAgents' in discoveryService);

console.log('\n🔍 All BaseService methods:');
const allMethods = Object.getOwnPropertyNames(Object.getPrototypeOf(baseService))
  .filter(name => typeof baseService[name] === 'function' && !name.startsWith('_'));
console.log(allMethods);

console.log('\n🔍 All DiscoveryService methods:');
const discoveryMethods = Object.getOwnPropertyNames(Object.getPrototypeOf(discoveryService))
  .filter(name => typeof discoveryService[name] === 'function' && !name.startsWith('_'));
console.log(discoveryMethods); 